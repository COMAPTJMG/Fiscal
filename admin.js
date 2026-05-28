'use strict';
// ============================================================
// admin.js — Painel Admin: SOMENTE gestão de senhas/PINs
// TJMG Fiscal PWA — v85
// Admin só pode: alterar PIN dos fiscais e senha do coordenador.
// Nada mais.
// ============================================================

/* ── Senha do coordenador: lida do localStorage (override de COORD.p) ── */
function _getCoordSenha() {
  return localStorage.getItem('_coordSenha') || (typeof COORD !== 'undefined' ? COORD.p : '2026');
}
function _setCoordSenha(nova) {
  localStorage.setItem('_coordSenha', nova);
  /* Atualiza o objeto COORD em memória para que o login já funcione */
  if (typeof COORD !== 'undefined') COORD.p = nova;
}

/* ══════════════════════════════════════════════════════════════
   rAdm — Tela principal do Admin: lista fiscais + botão coord
   ══════════════════════════════════════════════════════════════ */
function rAdm() {
  var ab = el('abody'); if (!ab) return;

  /* Agrupar fiscais por região */
  var por = {};
  US.forEach(function(u) {
    var r = u.reg || 'SEM_REGIAO';
    if (!por[r]) por[r] = [];
    por[r].push(u);
  });

  var h = '';

  /* ── Senha do Coordenador ── */
  h += '<div style="background:#f5f3ff;border:1.5px solid #c4b5fd;border-radius:12px;padding:14px 16px;margin-bottom:18px;">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">';
  h += '<div style="width:40px;height:40px;border-radius:50%;background:#7c3aed;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🔑</div>';
  h += '<div style="flex:1;">';
  h += '<div style="font-size:14px;font-weight:800;color:#4c1d95;">Senha do Coordenador</div>';
  h += '<div style="font-size:11px;color:#6d28d9;margin-top:1px;">Login: <b>coord</b> · Senha atual: <b>' + _getCoordSenha() + '</b></div>';
  h += '</div>';
  h += '<button onclick="abrirTrocarSenhaCoord()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Alterar</button>';
  h += '</div>';
  h += '</div>';

  /* ── Lista de Fiscais ── */
  h += '<div style="font-size:11px;font-weight:800;color:#003580;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">';
  h += '👤 Fiscais (' + US.length + ') — Alterar PIN</div>';

  if (!US.length) {
    h += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px;">Nenhum fiscal cadastrado.</div>';
  } else {
    Object.keys(por).forEach(function(regKey) {
      var R = (typeof REG !== 'undefined' && REG[regKey]) ? REG[regKey] : { l: regKey, c: '#64748b', bg: '#f1f5f9' };
      h += '<div style="font-size:10px;font-weight:700;color:' + R.c + ';text-transform:uppercase;letter-spacing:.08em;';
      h += 'border-left:3px solid ' + R.c + ';padding-left:8px;margin:14px 0 8px;">';
      h += 'Região ' + R.l + '</div>';

      por[regKey].forEach(function(u) {
        var inativo = !u.ativo;
        h += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;';
        h += 'margin-bottom:8px;display:flex;align-items:center;gap:10px;opacity:' + (inativo ? '.5' : '1') + ';">';

        /* Avatar */
        h += '<div style="width:38px;height:38px;border-radius:50%;background:' + R.c + ';color:#fff;';
        h += 'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;">';
        h += ini(u.nome) + '</div>';

        /* Info */
        h += '<div style="flex:1;min-width:0;">';
        h += '<div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _escA(u.nome) + '</div>';
        h += '<div style="font-size:10px;color:#64748b;margin-top:2px;">' + (u.cargo || 'Fiscal');
        if (u.mat) h += ' · Mat. ' + _escA(u.mat);
        h += '</div>';
        h += '<div style="font-size:10px;margin-top:3px;">';
        h += '<span style="background:' + (inativo ? '#fee2e2' : '#dcfce7') + ';color:' + (inativo ? '#dc2626' : '#16a34a') + ';';
        h += 'border-radius:20px;padding:1px 8px;font-weight:700;">' + (inativo ? 'Inativo' : 'Ativo') + '</span>';
        h += '</div></div>';

        /* Botão alterar PIN */
        h += '<button onclick="abrirTrocarPIN(\'' + u.id + '\')" ';
        h += 'style="background:#003580;color:#fff;border:none;border-radius:8px;';
        h += 'padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;white-space:nowrap;">🔑 PIN</button>';

        h += '</div>';
      });
    });
  }

  ab.innerHTML = '<div style="padding:14px;">' + h + '</div>';
}

/* ══════════════════════════════════════════════════════════════
   Modal: Alterar PIN do Fiscal
   ══════════════════════════════════════════════════════════════ */
function abrirTrocarPIN(userId) {
  var u = US.find(function(x) { return x.id === userId; });
  if (!u) return;

  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:flex-end;';
  ov.innerHTML = '<div style="background:#fff;width:100%;border-radius:16px 16px 0 0;padding:20px 16px 32px;">'
    + '<div style="font-size:16px;font-weight:800;color:#003580;margin-bottom:4px;">🔑 Alterar PIN</div>'
    + '<div style="font-size:12px;color:#64748b;margin-bottom:16px;">' + _escA(u.nome) + ' · PIN atual: <b>' + u.pin + '</b></div>'
    + '<div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:5px;">Novo PIN (4 dígitos)</div>'
    + '<input id="_pin_novo" type="password" inputmode="numeric" maxlength="4" placeholder="••••" '
    + 'style="font-size:28px;letter-spacing:12px;text-align:center;border:2px solid #e2e8f0;border-radius:10px;padding:12px;width:100%;box-sizing:border-box;margin-bottom:6px;">'
    + '<div id="_pin_err" style="color:#dc2626;font-size:12px;min-height:18px;margin-bottom:12px;text-align:center;"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    + '<button onclick="this.closest(\'div\').parentNode.remove()" '
    + 'style="background:#f1f5f9;color:#64748b;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;">Cancelar</button>'
    + '<button onclick="_salvarPIN(\'' + userId + '\')" '
    + 'style="background:#003580;color:#fff;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;">✓ Salvar</button>'
    + '</div></div>';

  document.body.appendChild(ov);
  setTimeout(function() { var inp = document.getElementById('_pin_novo'); if (inp) inp.focus(); }, 80);
}

function _salvarPIN(userId) {
  var pin = (document.getElementById('_pin_novo') || {}).value || '';
  var errEl = document.getElementById('_pin_err');

  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    if (errEl) errEl.textContent = 'PIN deve ter exatamente 4 dígitos.';
    return;
  }
  /* Verificar duplicidade */
  var dup = US.find(function(x) { return x.pin === pin && x.id !== userId; });
  if (dup) {
    if (errEl) errEl.textContent = 'PIN já em uso por ' + dup.nome.split(' ')[0] + '. Escolha outro.';
    return;
  }

  var u = US.find(function(x) { return x.id === userId; });
  if (u) {
    u.pin = pin;
    u.updated_at = new Date().toISOString();
    DB.sv();
    Tt('✅ PIN de ' + u.nome.split(' ')[0] + ' alterado com sucesso!');
    /* Fechar modal */
    var ov = document.getElementById('_pin_novo');
    if (ov) { var parent = ov.closest('div[style*="position:fixed"]'); if (parent) parent.remove(); }
    rAdm();
  }
}

/* ══════════════════════════════════════════════════════════════
   Modal: Alterar Senha do Coordenador
   ══════════════════════════════════════════════════════════════ */
function abrirTrocarSenhaCoord() {
  var senhaAtual = _getCoordSenha();

  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:flex-end;';
  ov.innerHTML = '<div style="background:#fff;width:100%;border-radius:16px 16px 0 0;padding:20px 16px 32px;">'
    + '<div style="font-size:16px;font-weight:800;color:#7c3aed;margin-bottom:4px;">🔑 Alterar Senha — Coordenador</div>'
    + '<div style="font-size:12px;color:#64748b;margin-bottom:16px;">Login: <b>coord</b> · Senha atual: <b>' + senhaAtual + '</b></div>'
    + '<div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:5px;">Nova Senha</div>'
    + '<input id="_coord_senha_nova" type="password" placeholder="Nova senha" autocomplete="new-password" '
    + 'style="font-size:18px;border:2px solid #e2e8f0;border-radius:10px;padding:12px;width:100%;box-sizing:border-box;margin-bottom:6px;">'
    + '<div style="font-size:11px;font-weight:700;color:#374151;margin:6px 0 5px;">Confirmar Senha</div>'
    + '<input id="_coord_senha_conf" type="password" placeholder="Confirmar senha" autocomplete="new-password" '
    + 'style="font-size:18px;border:2px solid #e2e8f0;border-radius:10px;padding:12px;width:100%;box-sizing:border-box;margin-bottom:6px;">'
    + '<div id="_coord_senha_err" style="color:#dc2626;font-size:12px;min-height:18px;margin-bottom:12px;"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    + '<button onclick="this.closest(\'div\').parentNode.remove()" '
    + 'style="background:#f1f5f9;color:#64748b;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;">Cancelar</button>'
    + '<button onclick="_salvarSenhaCoord()" '
    + 'style="background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;">✓ Salvar</button>'
    + '</div></div>';

  document.body.appendChild(ov);
  setTimeout(function() { var inp = document.getElementById('_coord_senha_nova'); if (inp) inp.focus(); }, 80);
}

function _salvarSenhaCoord() {
  var nova = (document.getElementById('_coord_senha_nova') || {}).value || '';
  var conf = (document.getElementById('_coord_senha_conf') || {}).value || '';
  var errEl = document.getElementById('_coord_senha_err');

  if (!nova || nova.length < 3) {
    if (errEl) errEl.textContent = 'Senha deve ter pelo menos 3 caracteres.';
    return;
  }
  if (nova !== conf) {
    if (errEl) errEl.textContent = 'As senhas não coincidem.';
    return;
  }

  _setCoordSenha(nova);
  Tt('✅ Senha do Coordenador alterada com sucesso!');
  /* Fechar modal */
  var inp = document.getElementById('_coord_senha_nova');
  if (inp) { var parent = inp.closest('div[style*="position:fixed"]'); if (parent) parent.remove(); }
  rAdm();
}

/* ── Manter compatibilidade: funções que podem ser chamadas de onclick inline ── */
/* openUserModal ainda existe pois o modal m-usr ainda está no HTML — mas não
   é mais chamado pelo admin. Mantemos para não quebrar outros pontos. */
function openUserModal(id) { abrirTrocarPIN(id || ''); }
function usrToggleAtivo() {}
function saveUser() {}
function deleteUser() {}
function admToggleSel() {}
function admSelAll() {}
function admDelSel() {}
function admExpSel() {}
function admExpSelPDF() {}
function coordExpSelPDF() {
  var ids = (S._coordSel || []).filter(function(id) {
    var i = S.insp.find(function(x) { return x.id === id; });
    return i && i.st === 'finalizada';
  });
  if (!ids.length) { Tt('Nenhuma finalizada selecionada para PDF.'); return; }
  if (typeof exportPDFBatch === 'function') exportPDFBatch(ids);
}

// ── Exports ────────────────────────────────────────────────
window.rAdm                = rAdm;
window.abrirTrocarPIN      = abrirTrocarPIN;
window._salvarPIN          = _salvarPIN;
window.abrirTrocarSenhaCoord = abrirTrocarSenhaCoord;
window._salvarSenhaCoord   = _salvarSenhaCoord;
window.openUserModal       = openUserModal;
window.usrToggleAtivo      = usrToggleAtivo;
window.saveUser            = saveUser;
window.deleteUser          = deleteUser;
window.admToggleSel        = admToggleSel;
window.admSelAll           = admSelAll;
window.admDelSel           = admDelSel;
window.admExpSel           = admExpSel;
window.admExpSelPDF        = admExpSelPDF;
window.admExpSelZip        = function() {};
window.coordExpSelPDF      = coordExpSelPDF;
window.coordExpSelZip      = function() {
  if (typeof _exportZipIds === 'function') _exportZipIds(S._coordSel || [], 'TJMG_COORD');
};
