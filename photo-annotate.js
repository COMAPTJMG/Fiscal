'use strict';
// ============================================================
// photo-annotate.js — Anotação em canvas sobre fotos capturadas
// TJMG Fiscal PWA — v79
// ============================================================

var _annotCanvas = null, _annotCtx = null;
var _annotImg    = null, _annotOnSave = null;
var _annotTool   = 'seta'; /* seta | circulo | texto | apagar */
var _annotColor  = '#dc2626';
var _annotSize   = 4;
var _annotDrawing = false;
var _annotStartX = 0, _annotStartY = 0;
var _annotHistory = []; /* snapshots para undo */

/* ── Abrir editor de anotação ─────────────────────────────────── */
function abrirAnnot(b64, onSave) {
  _annotOnSave = onSave;
  _annotHistory = [];

  var modal = el('m-annot');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'm-annot';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:600;display:flex;flex-direction:column;';
    modal.innerHTML = ''
      /* Barra superior */
      + '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1e293b;flex-shrink:0;">'
      + '<div style="flex:1;font-size:13px;font-weight:700;color:#fff;">✏️ Anotar Foto</div>'
      + '<button id="annot-undo" onclick="_annotUndo()" style="border:none;background:#374151;color:#fff;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;">↩️</button>'
      + '<button onclick="cm(\'m-annot\')" style="border:none;background:#374151;color:#fff;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;">✕</button>'
      + '</div>'
      /* Ferramentas */
      + '<div id="annot-tools" style="display:flex;gap:6px;padding:8px 12px;background:#111827;flex-shrink:0;overflow-x:auto;">'
      + _annotToolBtn('seta',   '→', true)
      + _annotToolBtn('circulo','○', false)
      + _annotToolBtn('texto',  'T', false)
      + _annotToolBtn('apagar', '✕', false)
      + '<div style="width:1px;background:#374151;margin:0 2px;"></div>'
      + ['#dc2626','#f59e0b','#16a34a','#2563eb','#fff'].map(function(c) {
          return '<button onclick="_annotSetColor(\'' + c + '\')" style="width:28px;height:28px;border-radius:50%;background:' + c + ';border:2px solid '
            + (c==='#dc2626'?'#fff':'transparent') + ';cursor:pointer;flex-shrink:0;" id="acol_' + c.replace('#','') + '"></button>';
        }).join('')
      + '</div>'
      /* Canvas */
      + '<div style="flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:8px;">'
      + '<canvas id="annot-cv" style="max-width:100%;max-height:100%;touch-action:none;cursor:crosshair;border-radius:8px;"></canvas>'
      + '</div>'
      /* Ações */
      + '<div style="display:flex;gap:8px;padding:10px 12px;background:#1e293b;flex-shrink:0;">'
      + '<button onclick="_annotSave()" style="flex:1;border:none;background:#16a34a;color:#fff;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">✅ Salvar</button>'
      + '</div>';
    document.getElementById('app').appendChild(modal);
  }

  modal.style.display = 'flex';
  _annotTool = 'seta';
  _annotColor = '#dc2626';
  _annotCanvas = el('annot-cv');
  _annotCtx = _annotCanvas.getContext('2d');

  var img = new Image();
  img.onload = function() {
    _annotImg = img;
    /* Escalar para caber na tela */
    var maxW = window.innerWidth - 24;
    var maxH = window.innerHeight - 200;
    var scale = Math.min(1, maxW / img.width, maxH / img.height);
    _annotCanvas.width  = Math.round(img.width  * scale);
    _annotCanvas.height = Math.round(img.height * scale);
    _annotCtx.drawImage(img, 0, 0, _annotCanvas.width, _annotCanvas.height);
    _annotSaveHistory();
    _annotBindEvents();
  };
  img.src = b64;
}

function _annotToolBtn(id, label, active) {
  return '<button id="atool_' + id + '" onclick="_annotSetTool(\'' + id + '\')" '
    + 'style="border:none;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;'
    + 'background:' + (active ? '#003580' : '#374151') + ';color:#fff;">' + label + '</button>';
}

function _annotSetTool(t) {
  _annotTool = t;
  ['seta','circulo','texto','apagar'].forEach(function(id) {
    var b = el('atool_' + id);
    if (b) b.style.background = id === t ? '#003580' : '#374151';
  });
}

function _annotSetColor(c) {
  _annotColor = c;
  ['dc2626','f59e0b','16a34a','2563eb','fff'].forEach(function(hex) {
    var b = el('acol_' + hex);
    if (b) b.style.borderColor = ('#' + hex === c) ? '#fff' : 'transparent';
  });
}

function _annotSaveHistory() {
  _annotHistory.push(_annotCanvas.toDataURL());
  if (_annotHistory.length > 10) _annotHistory.shift();
}

function _annotUndo() {
  if (_annotHistory.length <= 1) return;
  _annotHistory.pop();
  var prev = _annotHistory[_annotHistory.length - 1];
  var img = new Image();
  img.onload = function() {
    _annotCtx.clearRect(0, 0, _annotCanvas.width, _annotCanvas.height);
    _annotCtx.drawImage(img, 0, 0);
  };
  img.src = prev;
}

function _annotBindEvents() {
  var cv = _annotCanvas;
  /* Remove listeners antigos */
  cv.onpointerdown = cv.onpointermove = cv.onpointerup = null;

  function _pt(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  }

  cv.onpointerdown = function(e) {
    e.preventDefault();
    var p = _pt(e);
    _annotStartX = p.x; _annotStartY = p.y;
    _annotDrawing = true;
    cv.setPointerCapture(e.pointerId);
    if (_annotTool === 'texto') {
      var txt = prompt('Texto da anotação:');
      if (txt) {
        _annotCtx.font = 'bold ' + (_annotSize * 5) + 'px Arial';
        _annotCtx.fillStyle = _annotColor;
        _annotCtx.strokeStyle = '#000';
        _annotCtx.lineWidth = 1;
        _annotCtx.strokeText(txt, p.x, p.y);
        _annotCtx.fillText(txt, p.x, p.y);
        _annotSaveHistory();
      }
      _annotDrawing = false;
    }
    if (_annotTool === 'apagar') {
      _annotCtx.save();
      _annotCtx.globalCompositeOperation = 'destination-out';
      _annotCtx.beginPath();
    }
  };

  cv.onpointermove = function(e) {
    if (!_annotDrawing) return;
    e.preventDefault();
    var p = _pt(e);
    if (_annotTool === 'apagar') {
      _annotCtx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      _annotCtx.fill();
      return;
    }
    if (_annotTool === 'seta') {
      /* Redesenha sobre snapshot */
      if (_annotHistory.length) {
        var snap = new Image();
        snap.onload = function() {
          _annotCtx.clearRect(0, 0, cv.width, cv.height);
          _annotCtx.drawImage(snap, 0, 0);
          _drawArrow(_annotStartX, _annotStartY, p.x, p.y);
        };
        snap.src = _annotHistory[_annotHistory.length - 1];
      }
    }
    if (_annotTool === 'circulo') {
      if (_annotHistory.length) {
        var snap2 = new Image();
        snap2.onload = function() {
          _annotCtx.clearRect(0, 0, cv.width, cv.height);
          _annotCtx.drawImage(snap2, 0, 0);
          _drawCircle(_annotStartX, _annotStartY, p.x, p.y);
        };
        snap2.src = _annotHistory[_annotHistory.length - 1];
      }
    }
  };

  cv.onpointerup = function(e) {
    if (!_annotDrawing) return;
    _annotDrawing = false;
    if (_annotTool === 'apagar') { _annotCtx.restore(); }
    _annotSaveHistory();
  };
}

function _drawArrow(x1, y1, x2, y2) {
  var ctx = _annotCtx;
  ctx.save();
  ctx.strokeStyle = _annotColor;
  ctx.fillStyle   = _annotColor;
  ctx.lineWidth   = _annotSize;
  ctx.lineCap     = 'round';
  var ang = Math.atan2(y2 - y1, x2 - x1);
  var len = 12;
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.stroke();
  /* Ponta da seta */
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(ang - 0.4), y2 - len * Math.sin(ang - 0.4));
  ctx.lineTo(x2 - len * Math.cos(ang + 0.4), y2 - len * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function _drawCircle(x1, y1, x2, y2) {
  var ctx = _annotCtx;
  var rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
  var cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  ctx.save();
  ctx.strokeStyle = _annotColor;
  ctx.lineWidth   = _annotSize;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function _annotSave() {
  var b64 = _annotCanvas.toDataURL('image/jpeg', 0.88);
  cm('m-annot');
  if (_annotOnSave) _annotOnSave(b64);
}

window.abrirAnnot   = abrirAnnot;
window._annotSetTool = _annotSetTool;
window._annotSetColor= _annotSetColor;
window._annotUndo    = _annotUndo;
window._annotSave    = _annotSave;
