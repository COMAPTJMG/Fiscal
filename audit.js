'use strict';
// ============================================================
// audit.js — Log de auditoria de ações sensíveis
// TJMG Fiscal PWA — v79
// Grava localmente + envia para Supabase (tabela audit_log)
// ============================================================

var _auditBuf = [];
var _auditFlushT = null;
var AUDIT_KEY = '_tjmg_audit';

/* ── Registrar ação ─────────────────────────────────────────── */
function auditLog(acao, dados) {
  var s = S && S.sessao;
  var entry = {
    id:      uid(),
    ts:      new Date().toISOString(),
    user_id: s ? (s.id || s.mat || s.nome) : 'anon',
    user_nm: s ? s.nome : 'anon',
    reg:     s ? s.reg : '',
    acao:    acao,
    dados:   dados || {},
    online:  navigator.onLine
  };

  /* Salva local */
  _auditBuf.push(entry);
  _persistLocal();

  /* Envia para Supabase em background (não bloqueia) */
  clearTimeout(_auditFlushT);
  _auditFlushT = setTimeout(_flushAudit, 5000);
}

function _persistLocal() {
  try {
    var all = _getLocalAudit();
    all.push(_auditBuf[_auditBuf.length - 1]);
    /* Mantém só os últimos 500 registros localmente */
    if (all.length > 500) all = all.slice(all.length - 500);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(all));
  } catch(e) {}
}

function _getLocalAudit() {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch(e) { return []; }
}

async function _flushAudit() {
  if (!_auditBuf.length || !navigator.onLine) return;
  var payload = _auditBuf.splice(0);

  /* Tenta enviar via Edge Function */
  try {
    if (typeof EDGE_SYNC_URL !== 'undefined' && EDGE_SYNC_URL) {
      await fetch(EDGE_SYNC_URL + '/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: payload })
      });
    } else if (typeof SB !== 'undefined' && SB) {
      await SB.from('audit_log').insert(payload);
    }
  } catch(e) {
    /* Recoloca no buffer se falhar — tentará na próxima */
    _auditBuf.unshift.apply(_auditBuf, payload);
    console.warn('[Audit] flush falhou:', e.message);
  }
}

/* ── Tela de audit log ────────────────────────────────────────── */
function rAudit() {
  var ab = el('audit-body'); if (!ab) return;
  var logs = _getLocalAudit().reverse().slice(0, 100);

  if (!logs.length) {
    ab.innerHTML = '<div style="text-align:center;padding:40px;">'
      + '<div style="font-size:48px;">📋</div>'
      + '<div style="font-size:14px;color:#94a3b8;margin-top:12px;">Nenhuma ação registrada ainda.</div>'
      + '</div>';
    return;
  }

  var ICONS = {
    'exportar_html':    '📄',
    'exportar_pdf':     '📄',
    'exportar_zip':     '📦',
    'finalizar':        '✅',
    'deletar':          '🗑️',
    'login':            '🔑',
    'logout':           '🚪',
    'not_ina':          '⚠️',
    'roc':              '📋',
    'sync_push':        '☁️',
    'sync_pull':        '☁️',
    'duplicar':         '📋',
    'editar':           '✏️'
  };

  var h = '<div style="padding:12px;">';
  h += '<div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">Últimas ' + logs.length + ' ações registradas neste dispositivo.</div>';

  logs.forEach(function(e) {
    var icon = ICONS[e.acao] || '🔵';
    var dt = e.ts ? new Date(e.ts) : null;
    var dtStr = dt ? String(dt.getDate()).padStart(2,'0') + '/' + String(dt.getMonth()+1).padStart(2,'0') + ' ' + String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0') : '—';
    var dadosStr = e.dados && e.dados.edif ? ' · ' + e.dados.edif : (e.dados && e.dados.tipo ? ' · ' + e.dados.tipo : '');

    h += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">';
    h += '<span style="font-size:16px;flex-shrink:0;margin-top:2px;">' + icon + '</span>';
    h += '<div style="flex:1;min-width:0;">';
    h += '<div style="font-size:12px;font-weight:700;">' + _escA(e.acao) + dadosStr + '</div>';
    h += '<div style="font-size:10px;color:#94a3b8;">' + dtStr + ' · ' + _escA(e.user_nm || '—') + '</div>';
    h += '</div></div>';
  });

  h += '</div>';
  ab.innerHTML = h;
}

/* ── Hooks automáticos nas ações principais ──────────────────── */
/* Chamados pelos respectivos módulos */
function _hookFinalizarI(id, insp) {
  auditLog('finalizar', { insp_id: id, edif: insp && insp.edif, tipo: insp && insp.tipo });
}
function _hookExportHTML(id, insp) {
  auditLog('exportar_html', { insp_id: id, edif: insp && insp.edif });
}
function _hookExportPDF(id, insp) {
  auditLog('exportar_pdf', { insp_id: id, edif: insp && insp.edif });
}
function _hookExportZip(ids) {
  auditLog('exportar_zip', { count: ids && ids.length });
}
function _hookLogin(nome, reg) {
  auditLog('login', { nome: nome, reg: reg });
}
function _hookLogout(nome) {
  auditLog('logout', { nome: nome });
}
function _hookDeleteInsp(id, edif) {
  auditLog('deletar', { insp_id: id, edif: edif });
}
function _hookNotINA(inspId, edif) {
  auditLog('not_ina', { insp_id: inspId, edif: edif });
}
function _hookROC(inspId, edif) {
  auditLog('roc', { insp_id: inspId, edif: edif });
}

window.auditLog       = auditLog;
window.rAudit         = rAudit;
window._hookLogin     = _hookLogin;
window._hookLogout    = _hookLogout;
window._hookFinalizarI= _hookFinalizarI;
window._hookExportHTML= _hookExportHTML;
window._hookExportPDF = _hookExportPDF;
window._hookExportZip = _hookExportZip;
window._hookDeleteInsp= _hookDeleteInsp;
window._hookNotINA    = _hookNotINA;
window._hookROC       = _hookROC;
