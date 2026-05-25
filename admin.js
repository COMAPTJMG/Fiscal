'use strict';
// ============================================================
// admin.js — Painel Admin: rAdm, gestão de usuários
// TJMG Fiscal PWA — v78 (Fase 5 da modularização)
// Dependências: S, US, TIPOS, REG, ST, Tt, el, cf, cm, fdt, uid
//   exportHTML, exportPDF, exportPDFBatch, _exportZipIds, PhotoStore
// ============================================================

function rAdm(){
  var abs=[{id:'usuarios',l:'Usuários'},{id:'relatorios',l:'Relatórios'},{id:'emergencial',l:'Emergencial'},{id:'config',l:'Config'}];
  el('aabs').innerHTML=abs.map(function(a){var sel=S.dadm===a.id;return'<button onclick="S.dadm=\''+a.id+'\';rAdm()" style="flex:1;padding:10px;border:none;border-bottom:3px solid '+(sel?'#003580':'transparent')+';background:#fff;font-size:10px;font-weight:700;color:'+(sel?'#003580':'#64748b')+';cursor:pointer;">'+a.l+'</button>';}).join('');
  var ab=el('abody');
  if(S.dadm==='usuarios'){
    var h='<button class="btn ba" onclick="openUserModal(null)" style="margin-bottom:12px;">＋ Adicionar Engenheiro / Usuário</button>';
    h+='<div style="font-size:12px;color:#64748b;margin-bottom:10px;">'+US.length+' usuário(s) cadastrado(s)</div>';
    var por={};
    US.forEach(function(u){if(!por[u.reg])por[u.reg]=[];por[u.reg].push(u);});
    Object.keys(por).forEach(function(r){
      var R=REG[r]||{c:'#64748b',bg:'#f1f5f9',l:r};
      h+='<div style="border-left:4px solid '+R.c+';padding-left:10px;margin:12px 0 6px;">';
      h+='<div style="font-size:10px;font-weight:700;color:'+R.c+';text-transform:uppercase;letter-spacing:1px;">Região '+R.l+'</div></div>';
      por[r].forEach(function(u){
        var inativo=!u.ativo;
        h+='<div class="card" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;opacity:'+(inativo?'.5':'1')+'">';
        h+='<div class="av" style="width:40px;height:40px;font-size:13px;background:'+R.c+';">'+ini(u.nome)+'</div>';
        h+='<div style="flex:1;min-width:0;">';
        h+='<div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+u.nome+'</div>';
        h+='<div style="font-size:10px;color:#64748b;">'+u.cargo+'</div>';
        h+='<div style="display:flex;gap:4px;margin-top:3px;">';
        h+='<span class="bdg" style="background:'+R.bg+';color:'+R.c+';">'+R.l+'</span>';
        h+='<span class="bdg" style="background:'+(inativo?'#fee2e2':'#dcfce7')+';color:'+(inativo?'#dc2626':'#16a34a')+'">'+(inativo?'Inativo':'Ativo')+'</span>';
        h+='</div></div>';
        h+='<div style="display:flex;flex-direction:column;gap:5px;">';
        h+='<button onclick="openUserModal(\''+u.id+'\')" style="background:#003580;color:#fff;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">✏️ Editar</button>';
        h+='<button onclick="deleteUser(\''+u.id+'\')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">🗑️ Excluir</button>';
        h+='</div></div>';
      });
    });
    ab.innerHTML=h;
  }
  else if(S.dadm==='relatorios'){
    S._admSel=S._admSel||[];
    var _admReg=S._admReg||'todos';
    var _admBase=_admReg==='todos'?S.insp:S.insp.filter(function(i){return i.reg===_admReg;});
    var r2=_admBase.filter(function(i){return i.st==='em_andamento';});
    var e2=_admBase.filter(function(i){return i.st==='finalizada';});
    var allIds=_admBase.map(function(i){return i.id;});
    var nSel=S._admSel.length;
    var todosSelected=allIds.length>0&&allIds.every(function(id){return S._admSel.indexOf(id)!==-1;});

    var h2='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">';
    h2+='<button onclick="S._admReg=\'todos\';rAdm()" style="border:none;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;background:'+(_admReg==='todos'?'#003580':'#f1f5f9')+';color:'+(_admReg==='todos'?'#fff':'#64748b')+';">Todas</button>';
    Object.keys(REG).forEach(function(rk){var R=REG[rk];h2+='<button onclick="S._admReg=\''+rk+'\';rAdm()" style="border:none;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;background:'+(_admReg===rk?R.c:'#f1f5f9')+';color:'+(_admReg===rk?'#fff':'#64748b')+';">'+R.l+'</button>';});
    h2+='</div>';

    /* Barra de ação de seleção */
    if(nSel>0){
      h2+='<div style="position:sticky;top:0;z-index:10;background:#003580;border-radius:12px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
      h2+='<span style="font-size:12px;font-weight:800;color:#fff;flex:1;">'+nSel+' selecionada(s)</span>';
      h2+='<button onclick="admExpSel()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;">📄 HTML</button>';
      h2+='<button onclick="admExpSelPDF()" style="background:#1a2332;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;margin-left:4px;">📄 PDF</button>';
      h2+='<button onclick="admExpSelZip()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;margin-left:4px;">📦 ZIP</button>';
      h2+='<button onclick="admDelSel()" style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;">🗑 Excluir</button>';
      h2+='<button onclick="S._admSel=[];rAdm()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:8px;padding:7px 10px;font-size:11px;cursor:pointer;">✕ Limpar</button>';
      h2+='</div>';
    }

    /* Botão selecionar todos */
    h2+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
    h2+='<button onclick="admSelAll()" style="border:1px solid #e2e8f0;background:'+(todosSelected?'#003580':'#f8fafc')+';color:'+(todosSelected?'#fff':'#64748b')+';border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">'+(todosSelected?'☑ Desmarcar todos':'☐ Selecionar todos')+'</button>';
    if(nSel>0)h2+='<span style="font-size:11px;color:#003580;font-weight:700;">'+nSel+' de '+allIds.length+' selecionada(s)</span>';
    h2+='</div>';

    /* Rascunhos */
    h2+='<div class="sec">Rascunhos ('+r2.length+')</div>';
    r2.forEach(function(i){
      var t=TIPOS[i.tipo]||TIPOS.periodica;
      var sel=S._admSel.indexOf(i.id)!==-1;
      h2+='<div class="card" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;border:2px solid '+(sel?'#003580':'transparent')+';cursor:pointer;" onclick="admToggleSel(\''+i.id+'\')">'
        +'<div style="width:22px;height:22px;border-radius:6px;border:2px solid '+(sel?'#003580':'#cbd5e1')+';background:'+(sel?'#003580':'#fff')+';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;color:#fff;">'+(sel?'✓':'')+'</div>'
        +'<div style="width:32px;height:32px;border-radius:8px;background:'+t.bg+';display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">'+t.i+'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:12px;font-weight:700;">'+i.edif+'</div>'
        +'<div style="font-size:10px;color:#64748b;">'+(i.com||'-')+' - '+fdt(i.dtVistoria||i.data)+'</div>'
        +'<span class="bdg" style="background:'+t.bg+';color:'+t.c+';">'+t.l+'</span>'
        +'</div>'
        +'<div style="display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation();">'
        +'<button class="btn br" style="padding:6px 10px;width:auto;font-size:11px;" onclick="retomarF(\''+i.id+'\')">Retomar</button>'
        +'<button class="btn bo" style="padding:6px 10px;width:auto;font-size:11px;" onclick="openDet(\''+i.id+'\')">Ver</button>'
        +'</div></div>';
    });

    /* Enviados */
    h2+='<div class="sec" style="margin-top:12px;">Enviados ('+e2.length+')</div>';
    e2.forEach(function(i){
      var t=TIPOS[i.tipo]||TIPOS.periodica;
      var sel=S._admSel.indexOf(i.id)!==-1;
      h2+='<div class="card" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;border:2px solid '+(sel?'#003580':'transparent')+';cursor:pointer;" onclick="admToggleSel(\''+i.id+'\')">'
        +'<div style="width:22px;height:22px;border-radius:6px;border:2px solid '+(sel?'#003580':'#cbd5e1')+';background:'+(sel?'#003580':'#fff')+';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;color:#fff;">'+(sel?'✓':'')+'</div>'
        +'<div style="width:32px;height:32px;border-radius:8px;background:'+t.bg+';display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">'+t.i+'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:12px;font-weight:700;">'+i.edif+'</div>'
        +'<div style="font-size:10px;color:#64748b;">'+(i.com||'-')+' - '+fdt(i.dtVistoria||i.data)+'</div>'
        +'<span class="bdg" style="background:'+t.bg+';color:'+t.c+';">'+t.l+'</span>'
        +'</div>'
        +'<div style="display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation();">'
        +'<button class="btn bo" style="padding:6px 10px;width:auto;font-size:11px;" onclick="openDet(\''+i.id+'\')">👁 Ver</button>'
        +'<button class="btn" style="padding:6px 10px;width:auto;font-size:11px;background:#003580;color:#fff;" onclick="exportHTML(\''+i.id+'\')">📄 HTML</button>'
        +'<button class="btn" style="padding:6px 10px;width:auto;font-size:11px;background:#1a2332;color:#fff;margin-left:4px;" onclick="exportPDF(\''+i.id+'\')">📄 PDF</button>'
        +'</div></div>';
    });

    ab.innerHTML=h2;
  }
  else if(S.dadm==='emergencial'){
    var ph='<div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:16px;">⚡ Ordem de Serviço Emergencial</div>';
    ph+='<div class="card" style="margin-bottom:12px;border-left:4px solid #dc2626;">'
      +'<div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px;">Abertura de OSE</div>'
      +'<div style="font-size:11px;color:#64748b;margin-bottom:12px;line-height:1.6;">Registre uma nova ordem de serviço emergencial através do formulário oficial TJMG.</div>'
      +'<button class="btn" style="background:#dc2626;color:#fff;font-size:13px;" onclick="window.open(\'https://docs.google.com/forms/d/e/1FAIpQLSdFA3STupTnP3qFWX_3MXYhWXBl04VEBp4JbaPpfjIkT2QsDg/viewform\',\'_blank\')">⚡ Abrir Formulário OSE</button>'
      +'</div>';
    ph+='<div class="card" style="border-left:4px solid #0369a1;">'
      +'<div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:8px;">Dashboard Emergencial</div>'
      +'<div style="font-size:11px;color:#64748b;margin-bottom:12px;line-height:1.6;">Acompanhe o status e histórico de todas as ordens de serviço emergenciais.</div>'
      +'<button class="btn" style="background:#0369a1;color:#fff;font-size:13px;" onclick="window.open(\'https://script.google.com/a/macros/tjmg.jus.br/s/AKfycbw6mdSZgqgx6QXzaJHicq-kOkfFiHgIuwyIpkJ5AceVNhPx3407DPA6S4aLImPD6iyz/exec\',\'_blank\')">📊 Abrir Dashboard</button>'
      +'</div>';
    ab.innerHTML=ph;
  }
  else{
  var _cfgH='<div class="card" style="margin-bottom:8px;"><div style="font-size:13px;font-weight:800;margin-bottom:12px;">&#9881; Sistema — TJMG Fiscal v53</div>';
  var _tot=S.insp.length,_fin=S.insp.filter(function(i){return i.st==='finalizada';}).length,_rasc=_tot-_fin;
  _cfgH+='<div style="display:flex;gap:8px;margin-bottom:12px;">';
  _cfgH+='<div class="stat" style="border-color:#16a34a;"><div style="font-size:18px;font-weight:900;color:#16a34a;">'+_fin+'</div><div style="font-size:9px;color:#64748b;">Finalizados</div></div>';
  _cfgH+='<div class="stat" style="border-color:#d97706;"><div style="font-size:18px;font-weight:900;color:#d97706;">'+_rasc+'</div><div style="font-size:9px;color:#64748b;">Rascunhos</div></div>';
  _cfgH+='<div class="stat" style="border-color:#2563eb;"><div style="font-size:18px;font-weight:900;color:#2563eb;">'+_tot+'</div><div style="font-size:9px;color:#64748b;">Total</div></div>';
  _cfgH+='</div>';
  _cfgH+='<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">POR REGIÃO</div>';
  Object.keys(REG).forEach(function(rk){
    var R=REG[rk];
    var _ru=US.filter(function(u){return u.reg===rk&&u.ativo;}).length;
    var _ri=S.insp.filter(function(i){return i.reg===rk;}).length;
    var _rif=S.insp.filter(function(i){return i.reg===rk&&i.st==='finalizada';}).length;
    _cfgH+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f8fafc;">';
    _cfgH+='<span class="bdg" style="background:'+R.bg+';color:'+R.c+';">'+R.l+'</span>';
    _cfgH+='<span style="font-size:11px;color:#64748b;flex:1;">'+_ru+' fiscal(is)</span>';
    _cfgH+='<span style="font-size:11px;font-weight:700;color:'+((_ri>0)?'#16a34a':'#94a3b8')+';">'+_rif+'/'+_ri+' inspeções</span>';
    _cfgH+='</div>';
  });
  _cfgH+='</div>';
  _cfgH+='<div class="card"><div style="font-size:12px;font-weight:700;margin-bottom:8px;">Dados e PCI</div>';
  _cfgH+='<div style="font-size:12px;margin-bottom:4px;"><b>PCI Norte:</b> '+PCI_DATA.length+' registros &#9989;</div>';
  _cfgH+='<div style="font-size:12px;margin-bottom:8px;color:#64748b;">NORTE 71 &middot; LESTE 61 &middot; ZONA_MATA 67 &middot; CENTRAL 37 edif.</div>';
  _cfgH+='<button class="btn bo" style="color:#dc2626;border-color:#dc2626;" onclick="cf(\'X\',\'Limpar\',\'Apagar todos os FINALIZADOS? Rascunhos serão mantidos.\',function(){var _del=S.insp.filter(function(i){return canDelInsp(i);});_del.forEach(function(i){var _dk=Object.keys(i.itens||{});PhotoStore.delInsp(i.id,_dk);Sync.queueDeleteInspection(i.id);});S.insp=S.insp.filter(function(i){return!canDelInsp(i);});DB.sv();Tt(\'Finalizados removidos — rascunhos mantidos\');rAdm();})">&#128465; Apagar todas as inspeções</button></div>';
  ab.innerHTML=_cfgH;
}
}


/* v70: TCOR movido para config.js — Bug 2 fix */

var _uEditId=null;
var _uAtivo=true;

function openUserModal(id){
  _uEditId=id;
  _uAtivo=true;
  el('u-err').textContent='';
  if(id){
    var u=US.find(function(x){return x.id===id;});if(!u)return;
    el('usr-title').textContent='✏️ Editar Usuário';
    el('u-nome').value=u.nome;
    el('u-mat').value=u.mat||'';
    el('u-pin').value=u.pin;
    el('u-cargo').value=u.cargo||'';
    el('u-reg').value=u.reg||'';
    _uAtivo=u.ativo!==false;
  } else {
    el('usr-title').textContent='👤 Adicionar Usuário';
    el('u-nome').value='';el('u-mat').value='';el('u-pin').value='';
    el('u-cargo').value='Fiscal';el('u-reg').value='';
    _uAtivo=true;
  }
  usrToggleAtivo(true);
  el('m-usr').style.display='flex';
}

function usrToggleAtivo(noToggle){
  if(!noToggle)_uAtivo=!_uAtivo;
  var btn=el('u-ativo-btn');
  if(_uAtivo){btn.style.borderColor='#16a34a';btn.style.color='#16a34a';btn.style.background='#dcfce7';btn.textContent='✓ Ativo';}
  else{btn.style.borderColor='#dc2626';btn.style.color='#dc2626';btn.style.background='#fee2e2';btn.textContent='✕ Inativo';}
}

function saveUser(){
  var nome=el('u-nome').value.trim();
  var pin=el('u-pin').value.trim();
  var reg=el('u-reg').value;
  el('u-err').textContent='';
  if(!nome){el('u-err').textContent='Nome é obrigatório.';return;}
  if(!pin||pin.length!==4||!/^\d{4}$/.test(pin)){el('u-err').textContent='PIN deve ter exatamente 4 dígitos.';return;}
  if(!reg){el('u-err').textContent='Selecione a região.';return;}
  // Check PIN unique (except self)
  var dup=US.find(function(x){return x.pin===pin&&x.id!==_uEditId;});
  if(dup){el('u-err').textContent='PIN já em uso por '+dup.nome.split(' ')[0]+'. Use outro.';return;}
  var _now=new Date().toISOString();
  if(_uEditId){
    var u=US.find(function(x){return x.id===_uEditId;});
    if(u){u.nome=nome;u.mat=el('u-mat').value.trim();u.pin=pin;u.cargo=el('u-cargo').value.trim()||'Fiscal';u.polo='';u.reg=reg;u.ativo=_uAtivo;u.updated_at=_now;}
    Tt('✓ Usuário atualizado!');
  } else {
    US.push({id:'u'+Date.now(),nome:nome,mat:el('u-mat').value.trim(),pin:pin,reg:reg,cargo:el('u-cargo').value.trim()||'Fiscal',polo:'',ativo:_uAtivo,updated_at:_now});
    Tt('✓ Usuário adicionado!');
  }
  DB.sv();cm('m-usr');rAdm();rLogin();
}

function deleteUser(id){
  var u=US.find(function(x){return x.id===id;});if(!u)return;
  cf('🗑️','Excluir Usuário','Remover '+u.nome.split(' ')[0]+'? Esta ação não pode ser desfeita.',function(){
    var idx=US.findIndex(function(x){return x.id===id;});
    if(idx>-1)US.splice(idx,1);
    Sync.queueDeleteUser(id);
    DB.sv();rAdm();rLogin();Tt('Usuário removido.');
  });
}
/* ── Seleção múltipla no painel admin ── */
function admToggleSel(id){
  S._admSel=S._admSel||[];
  var idx=S._admSel.indexOf(id);
  if(idx===-1)S._admSel.push(id);
  else S._admSel.splice(idx,1);
  rAdm();
}
function admSelAll(){
  var _admReg=S._admReg||'todos';
  var base=_admReg==='todos'?S.insp:S.insp.filter(function(i){return i.reg===_admReg;});
  var allIds=base.map(function(i){return i.id;});
  S._admSel=S._admSel||[];
  var todosSelected=allIds.every(function(id){return S._admSel.indexOf(id)!==-1;});
  if(todosSelected){S._admSel=[];}
  else{S._admSel=allIds.slice();}
  rAdm();
}
function admDelSel(){
  S._admSel=S._admSel||[];
  if(!S._admSel.length)return;
  var _perm=S._admSel.filter(function(id){var _i=S.insp.find(function(x){return x.id===id;});return canDelInsp(_i);});
  var _bloq=S._admSel.length-_perm.length;
  if(!_perm.length){Tt('Sem permissão: somente finalizados podem ser excluídos pelo admin.');return;}
  var n=_perm.length;
  var aviso=_bloq>0?' ('+_bloq+' rascunho(s) ignorado(s))':'';
  cf('🗑','Excluir selecionados','Excluir '+n+' finalizado(s)?'+aviso,function(){
    _perm.forEach(function(id){Sync.queueDeleteInspection(id);});
    S.insp=S.insp.filter(function(i){return _perm.indexOf(i.id)===-1;});
    S._admSel=[];
    DB.sv();rAdm();Tt(n+' excluído(s)'+(_bloq>0?', '+_bloq+' rascunho(s) mantido(s)':''));
  });
}
function admExpSel(){
  S._admSel=S._admSel||[];
  var ids=S._admSel.filter(function(id){var i=S.insp.find(function(x){return x.id===id;});return i&&i.st==='finalizada';});
  if(!ids.length){Tt('Nenhuma finalizada selecionada');return;}
  ids.forEach(function(id,idx){setTimeout(function(){exportHTML(id);},idx*600);});
}
/* v78-fix: exportação PDF em massa para admin */
function admExpSelPDF(){
  S._admSel=S._admSel||[];
  var ids=S._admSel.filter(function(id){var i=S.insp.find(function(x){return x.id===id;});return i&&i.st==='finalizada';});
  if(!ids.length){Tt('Nenhuma finalizada selecionada para PDF.');return;}
  exportPDFBatch(ids);
}
/* v78-fix: coordExpSelPDF filtra rascunhos */
function coordExpSelPDF(){
  var ids=(S._coordSel||[]).filter(function(id){var i=S.insp.find(function(x){return x.id===id;});return i&&i.st==='finalizada';});
  if(!ids.length){Tt('Nenhuma finalizada selecionada para PDF.');return;}
  exportPDFBatch(ids);
}

// ── Exports ────────────────────────────────────────────────
window.rAdm           = rAdm;
window.openUserModal  = openUserModal;
window.usrToggleAtivo = usrToggleAtivo;
window.saveUser       = saveUser;
window.deleteUser     = deleteUser;
window.admToggleSel   = admToggleSel;
window.admSelAll      = admSelAll;
window.admDelSel      = admDelSel;
