'use strict';
// ============================================================
// map.js — Mapa interativo de edificações (Leaflet)
// TJMG Fiscal PWA — v79
// Dependências: coords.js (COMARCA_COORDS), state.js (S),
//   utils.js (filterByReg, fdt, _escA), router.js (Gb)
// ============================================================

var _mapInst = null;   /* instância Leaflet */
var _mapReady = false;

/* ── Inicializa / atualiza mapa ────────────────────────────── */
function rMapa() {
  var mb = el('mapa-body'); if (!mb) return;

  /* Carrega Leaflet CSS + JS se ainda não carregado */
  if (!window.L) {
    _injetarLeaflet(function() { _renderMapa(); });
  } else {
    _renderMapa();
  }
}

function _injetarLeaflet(cb) {
  if (document.getElementById('_lf_css')) { cb(); return; }
  var css = document.createElement('link');
  css.id = '_lf_css'; css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(css);

  var js = document.createElement('script');
  js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  js.onload = cb;
  document.head.appendChild(js);
}

function _renderMapa() {
  var mb = el('mapa-body'); if (!mb) return;
  mb.innerHTML = '';

  /* Container do mapa */
  var div = document.createElement('div');
  div.id = 'lf-map';
  div.style.cssText = 'width:100%;height:100%;min-height:400px;border-radius:0;z-index:1;';
  mb.appendChild(div);

  /* Filtros */
  var ctrl = el('mapa-ctrl');
  if (ctrl) _renderMapaCtrl(ctrl);

  /* Aguarda DOM montar */
  setTimeout(function() {
    if (_mapInst) { _mapInst.remove(); _mapInst = null; }

    _mapInst = L.map('lf-map', { zoomControl: true, attributionControl: false })
      .setView([-18.5, -44.0], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(_mapInst);

    _mapReady = true;
    _plotarMarcadores();

    /* Fix para telas mobile: invalida tamanho depois de render */
    setTimeout(function() { if (_mapInst) _mapInst.invalidateSize(); }, 300);
  }, 80);
}

/* ── Marcadores ─────────────────────────────────────────────── */
function _plotarMarcadores() {
  if (!_mapInst || !_mapReady) return;

  /* Remove camadas antigas */
  _mapInst.eachLayer(function(l) {
    if (l._isTjmgMarker) _mapInst.removeLayer(l);
  });

  var filtroTipo = (el('mapa-tipo') && el('mapa-tipo').value) || 'todos';
  var filtroSt   = (el('mapa-st')   && el('mapa-st').value)   || 'todos';

  /* Agrupar inspeções por comarca — última por comarca+edif */
  var base = filterByReg(S.insp).filter(function(i) {
    if (filtroTipo !== 'todos' && i.tipo !== filtroTipo) return false;
    if (filtroSt   !== 'todos' && i.st   !== filtroSt)   return false;
    return true;
  });

  /* Agrupar: última insp por edificação */
  var porEdif = {};
  base.forEach(function(i) {
    var k = (i.com || '') + '::' + (i.edif || '');
    if (!porEdif[k] || (i.dtVistoria || i.data) > (porEdif[k].dtVistoria || porEdif[k].data)) {
      porEdif[k] = i;
    }
  });

  var bounds = [];
  var semCoord = 0;

  Object.values(porEdif).forEach(function(i) {
    var coords = COMARCA_COORDS[i.com];
    if (!coords) { semCoord++; return; }

    /* Pequena variação para evitar sobreposição na mesma comarca */
    var jit = (Math.random() - 0.5) * 0.04;
    var lat = coords[0] + jit;
    var lon = coords[1] + jit;
    bounds.push([lat, lon]);

    var tp = TIPOS[i.tipo] || TIPOS.periodica;
    var st = i.st === 'finalizada'
      ? { c: '#16a34a', l: 'Enviado' }
      : { c: '#d97706', l: 'Rascunho' };

    /* Ícone SVG customizado */
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">'
      + '<ellipse cx="16" cy="38" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>'
      + '<path d="M16 0 C7.2 0 0 7.2 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7.2 24.8 0 16 0Z" fill="' + st.c + '"/>'
      + '<circle cx="16" cy="16" r="10" fill="white" opacity="0.95"/>'
      + '<text x="16" y="20" text-anchor="middle" font-size="12">' + tp.i + '</text>'
      + '</svg>';

    var icon = L.divIcon({
      className: '',
      html: svg,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -42]
    });

    var marker = L.marker([lat, lon], { icon: icon });
    marker._isTjmgMarker = true;

    var popup = '<div style="font-family:system-ui;min-width:200px;">'
      + '<div style="font-size:13px;font-weight:800;margin-bottom:4px;">' + _escA(i.edif) + '</div>'
      + '<div style="font-size:11px;color:#64748b;margin-bottom:6px;">' + _escA(i.com || '—') + ' · ' + fdt(i.dtVistoria || i.data) + '</div>'
      + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">'
      + '<span style="background:' + tp.bg + ';color:' + tp.c + ';padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">' + tp.l + '</span>'
      + '<span style="background:' + (i.st === 'finalizada' ? '#dcfce7' : '#fef3c7') + ';color:' + st.c + ';padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">' + st.l + '</span>'
      + '</div>'
      + '<button onclick="el(\'lf-map\').style.display=\'none\';openDet(\'' + i.id + '\')" '
      + 'style="width:100%;border:none;background:#003580;color:#fff;border-radius:8px;padding:7px;font-size:12px;font-weight:700;cursor:pointer;">Ver Relatório ›</button>'
      + '</div>';

    marker.bindPopup(popup, { maxWidth: 240 });
    marker.addTo(_mapInst);
  });

  /* Ajusta viewport */
  if (bounds.length > 0) {
    try { _mapInst.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 }); }
    catch(e) {}
  }

  /* Aviso de sem coordenadas */
  var info = el('mapa-info');
  if (info) {
    info.textContent = bounds.length + ' localidades no mapa'
      + (semCoord > 0 ? ' · ' + semCoord + ' sem coordenada' : '');
  }
}

/* ── Controles de filtro ────────────────────────────────────── */
function _renderMapaCtrl(ctrl) {
  var tipoOpts = '<option value="todos">Todos os tipos</option>'
    + Object.keys(TIPOS).map(function(k) {
      return '<option value="' + k + '">' + TIPOS[k].l + '</option>';
    }).join('');

  ctrl.innerHTML = '<div style="display:flex;gap:8px;padding:8px 12px;background:#fff;'
    + 'border-bottom:1px solid #e2e8f0;flex-shrink:0;flex-wrap:wrap;">'
    + '<select id="mapa-tipo" onchange="_plotarMarcadores()" style="flex:1;min-width:120px;'
    + 'padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;font-weight:600;">'
    + tipoOpts + '</select>'
    + '<select id="mapa-st" onchange="_plotarMarcadores()" style="flex:1;min-width:100px;'
    + 'padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;font-weight:600;">'
    + '<option value="todos">Todos</option>'
    + '<option value="finalizada">Enviados</option>'
    + '<option value="em_andamento">Rascunhos</option>'
    + '</select>'
    + '<span id="mapa-info" style="font-size:11px;color:#94a3b8;align-self:center;white-space:nowrap;"></span>'
    + '</div>';
}

window.rMapa          = rMapa;
window._plotarMarcadores = _plotarMarcadores;
