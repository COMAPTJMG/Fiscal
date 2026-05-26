'use strict';
// ============================================================
function _escA(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// auth.js — Autenticação, Logout e Telas de Coordenação
// TJMG Fiscal PWA — Fase 4 da modularização
// Dependências: state.js (S, US, ADM, COORD, REG, TIPOS),
//               utils.js (el, cm, cf, Tt, fdt, oentries, ini),
//               router.js (G, Gb, BNS, bH),
//               db.js (DB), report-html.js (exportHTML)
// window-exports: rLogin, openPin, kp, kpOK, openAdm, loginAdm,
//                 logout, openCoord, loginCoord, rCoord,
//                 coordToggleSel, coordSelAll, coordExpSel,
//                 openDetCoord
// ============================================================

function rLogin(){
  var por={};
  US.filter(function(u){return u.ativo;}).forEach(function(u){
    if(!por[u.reg])por[u.reg]=[];
    por[u.reg].push(u);
  });
  var h='';
  Object.keys(por).forEach(function(r){
    var us=por[r];
    var R=REG[r]||{l:r,c:'#64748b',bg:'#f1f5f9'};
    h+='<div style="border-left:4px solid '+R.c+';padding-left:10px;margin:10px 0 6px;">';
    h+='<div style="font-size:10px;font-weight:700;color:'+R.c+';text-transform:uppercase;letter-spacing:1px;">';
    h+='Regiao '+R.l+'</div></div>';
    us.forEach(function(u){
      h+='<div class="card" onclick="openPin(\''+u.id+'\')" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer;">';
      h+='<div class="av" style="width:42px;height:42px;font-size:14px;background:'+R.c+';">'+ini(u.nome)+'</div>';
      h+='<div style="flex:1;">';
      h+='<div style="font-size:13px;font-weight:700;">'+_escA(u.nome)+'</div>';
      h+='<div style="font-size:11px;color:#64748b;">'+_escA(u.cargo)+' - '+_escA(u.polo)+'</div>';
      h+='</div>';
      h+='<span class="bdg" style="background:'+R.bg+';color:'+R.c+';">'+R.l+'</span>';
      h+='</div>';
    });
  });
  el('ll').innerHTML=h;
}
var _pid='',_pbuf='';
function openPin(id){
  var u=US.find(function(x){return x.id===id;});if(!u)return;
  var R=REG[u.reg]||{c:'#003580'};_pid=id;_pbuf='';
  el('mav').textContent=ini(u.nome);el('mav').style.background=R.c;
  el('mnm').textContent=u.nome;el('mcg').textContent=u.cargo;
  el('perr').textContent='';rpd();el('m-pin').style.display='flex';
}
function rpd(){for(var i=0;i<4;i++)el('pd'+i).classList.toggle('on',i<_pbuf.length);}
function cancelPin(){_pbuf="";_pid="";rpd();cm("m-pin");}
function kp(n){if(n===-1){_pbuf=_pbuf.slice(0,-1);rpd();el('perr').textContent='';return;}if(_pbuf.length<4){_pbuf+=String(n);rpd();if(_pbuf.length===4)setTimeout(doLogin,120);}}
function kpOK(){doLogin();}
function doLogin(){
  var u=US.find(function(x){return x.id===_pid;});if(!u)return;
  if(_pbuf!==u.pin){el('perr').textContent='PIN incorreto. Tente novamente.';_pbuf='';rpd();return;}
  S.sessao={tipo:'usuario',userId:u.id,nome:u.nome,mat:u.mat,reg:u.reg,cargo:u.cargo,polo:u.polo||'',_t:Date.now()};
  /* v81: cor por região, Realtime, mural, tutorial, lock, crono */
  if(typeof aplicarCorRegiao==='function') aplicarCorRegiao(u.reg);
  if(typeof iniciarRealtime==='function') iniciarRealtime();
  if(typeof resetLockTimer==='function') resetLockTimer();
  DB.sv();cm('m-pin');rHome();G('s-home');BNS.forEach(function(id){var e=el(id);if(e)e.innerHTML=bH('home');});
  setTimeout(function(){
    if(typeof carregarMural==='function') carregarMural();
    if(typeof iniciarTutorial==='function') iniciarTutorial(false);
    if(typeof processarQRPendente==='function') processarQRPendente();
    haptic('sucesso');
  },500);
}
function openAdm(){el('au').value='';el('ap').value='';el('ae').textContent='';el('m-adm').style.display='flex';}
function loginAdm(){
  var u=el('au').value.trim();var p=el('ap').value.trim();
  if(u===ADM.u&&p===ADM.p){S.sessao={tipo:'admin',userId:'admin',nome:'Administrador',reg:null,cargo:'Admin',polo:'',_t:Date.now()};DB.sv();cm('m-adm');rAdm();G('s-admin');}
  else el('ae').textContent='Usuario ou PIN incorretos.';
}
function logout(){cf('X','Sair','Encerrar sua sessao?',function(){S.sessao=null;localStorage.removeItem('ts');rLogin();Gb('s-login');});}
function openCoord(){el('cu').value='';el('cp').value='';el('ce').textContent='';el('m-coord').style.display='flex';}
function loginCoord(){
  var u=el('cu').value.trim();var p=el('cp').value.trim();
  if(u===COORD.u&&p===COORD.p){
    S.sessao={tipo:'coordenador',userId:'coord',nome:'Coordenador',reg:null,cargo:'Coordenador',polo:'',_t:Date.now()};
    DB.sv();cm('m-coord');rCoord();G('s-coord');
  } else el('ce').textContent='Usuário ou PIN incorretos.';
}
function rCoord(){
  var sub=el('coord-sub');
  if(sub)sub.textContent=S.insp.length+' relatório(s) no sistema';
  /* ── Filtro de REGIÃO ── */
  S._coordReg=S._coordReg||'todos';
  var regFlt=el('coord-reg-flt');
  if(regFlt){
    var rh='<button onclick="S._coordReg=\'todos\';S._coordSel=[];rCoord()" style="border:none;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;background:'+(S._coordReg==='todos'?'#7c3aed':'#f1f5f9')+';color:'+(S._coordReg==='todos'?'#fff':'#64748b')+';margin-bottom:2px;">Todas</button>';
    Object.keys(REG).forEach(function(rk){var R=REG[rk];rh+='<button onclick="S._coordReg=\''+rk+'\';S._coordSel=[];rCoord()" style="border:none;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;background:'+(S._coordReg===rk?R.c:'#f1f5f9')+';color:'+(S._coordReg===rk?'#fff':'#64748b')+';margin-bottom:2px;">'+R.l+'</button>';});
    regFlt.innerHTML=rh;
  }
  /* ── Filtro de TIPO ── */
  var tipos_keys=['todos'].concat(Object.keys(TIPOS));
  var nl={todos:'Todos',periodica:'RITMP',ose:'RITE – Emergencial',programada:'RITP – Programada',osp:'OSP – Abertura',fachada:'Fachada',spda:'SPDA',prontuario:'Laudos',subestacao:'Subestação'};
  var fltEl=el('coord-flt');
  if(fltEl)fltEl.innerHTML=tipos_keys.map(function(f){var sel=S.rflt===f;return'<button onclick="S.rflt=\''+f+'\';rCoord()" style="border:none;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;background:'+(sel?'#7c3aed':'#f1f5f9')+';color:'+(sel?'#fff':'#64748b')+';">'+( nl[f]||f)+'</button>';}).join('');
  /* ── Base filtrada ── */
  var _cbEl=el('coord-busca');var _cb=_cbEl?_cbEl.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''):'';
  S._coordSel=S._coordSel||[];
  var _cReg=S._coordReg||'todos';
  var base=S.insp.filter(function(i){
    if(_cReg!=='todos'&&i.reg!==_cReg)return false;
    if(S.rflt!=='todos'&&i.tipo!==S.rflt)return false;
    if(_cb){var txt=((i.com||'')+' '+(i.edif||'')+' '+(i.fiscal||'')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(txt.indexOf(_cb)<0)return false;}
    return true;
  });
  var r2=base.filter(function(i){return i.st==='em_andamento';});
  var e2=base.filter(function(i){return i.st==='finalizada';});
  var allIds=base.map(function(i){return i.id;});
  var nSel=S._coordSel.length;
  var todosSelected=allIds.length>0&&allIds.every(function(id){return S._coordSel.indexOf(id)!==-1;});
  /* ── Barra de seleção ── */
  var selBar=el('coord-sel-bar');
  if(selBar){
    if(nSel>0){
      selBar.style.display='block';
      selBar.innerHTML='<div style="background:#7c3aed;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
        +'<span style="font-size:12px;font-weight:800;color:#fff;flex:1;">'+nSel+' selecionada(s)</span>'
        +'<button onclick="coordExpSel()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;">📄 HTML</button>'
        +'<button onclick="coordExpSelPDF()" style="background:#1a2332;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;margin-left:4px;">📄 PDF</button>'
        +'<button onclick="coordExpSelZip()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;margin-left:4px;">📦 ZIP</button>'
        +'<button onclick="S._coordSel=[];rCoord()" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;padding:7px 10px;font-size:11px;cursor:pointer;">✕ Limpar</button>'
        +'</div>';
    }else{selBar.style.display='none';selBar.innerHTML='';}
  }
  var lstEl=el('coord-lst');
  if(!lstEl)return;
  if(!base.length){lstEl.innerHTML='<div style="text-align:center;padding:48px;"><div style="font-size:48px;">📋</div><div style="font-size:14px;color:#94a3b8;margin-top:12px;font-weight:600;">Nenhum relatório encontrado</div></div>';return;}
  /* ── Botão selecionar todos ── */
  var h='<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff;border-bottom:1px solid #f1f5f9;">'
    +'<button onclick="coordSelAll()" style="border:1px solid #e2e8f0;background:'+(todosSelected?'#7c3aed':'#f8fafc')+';color:'+(todosSelected?'#fff':'#64748b')+';border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">'+(todosSelected?'☑ Desmarcar todos':'☐ Selecionar todos')+'</button>';
  if(nSel>0)h+='<span style="font-size:11px;color:#7c3aed;font-weight:700;">'+nSel+' de '+allIds.length+' selecionada(s)</span>';
  h+='</div>';
  /* ── Card ── */
  function _crd(i){
    var t=TIPOS[i.tipo]||TIPOS.periodica;
    var st=i.st==='finalizada'?{l:'Enviado',bg:'#dcfce7',c:'#16a34a'}:{l:'Rascunho',bg:'#fef3c7',c:'#d97706'};
    var reg=i.reg||'';var R=REG[reg]||{c:'#64748b',bg:'#f1f5f9',l:reg};
    var sel=S._coordSel.indexOf(i.id)!==-1;
    var fin=i.st==='finalizada';
    var _synced=!!(i.synced_at);
    var _syncIcon=fin?(_synced?'<span style="font-size:10px;color:#16a34a;font-weight:700;">☁✓</span>':'<span style="font-size:10px;color:#d97706;font-weight:700;">☁⏳</span>'):'';
    return'<div class="card" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;border:2px solid '+(sel?'#7c3aed':'transparent')+';cursor:pointer;" onclick="coordToggleSel(\''+i.id+'\')">'
      +'<div style="width:22px;height:22px;border-radius:6px;border:2px solid '+(sel?'#7c3aed':'#cbd5e1')+';background:'+(sel?'#7c3aed':'#fff')+';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;color:#fff;">'+(sel?'✓':'')+'</div>'
      +'<div style="width:34px;height:34px;border-radius:9px;background:'+t.bg+';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">'+t.i+'</div>'
      +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_escA(i.edif)+'</div>'
        +'<div style="font-size:10px;color:#64748b;">'+_escA(i.com||'-')+' · '+fdt(i.dtVistoria||i.data)+(i.fiscal?' · '+i.fiscal:'')+'</div>'
        +'<div style="display:flex;gap:3px;margin-top:3px;flex-wrap:wrap;align-items:center;">'
          +'<span class="bdg" style="background:'+t.bg+';color:'+t.c+';">'+t.l+'</span>'
          +'<span class="bdg" style="background:'+st.bg+';color:'+st.c+';">'+st.l+'</span>'
          +(reg?'<span class="bdg" style="background:'+R.bg+';color:'+R.c+';">'+R.l+'</span>':'')
          +_syncIcon
        +'</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation();">'
        +'<button class="btn bo" style="padding:5px 10px;width:auto;font-size:11px;" onclick="openDetCoord(\''+i.id+'\')">👁 Ver</button>'
        +(fin?'<button class="btn" style="padding:5px 10px;width:auto;font-size:11px;background:#003580;color:#fff;" onclick="exportHTML(\''+i.id+'\')">📄 HTML</button>':'')
        +(fin?'<button class="btn" style="padding:5px 10px;width:auto;font-size:11px;background:#1a2332;color:#fff;" onclick="exportPDF(\''+i.id+'\')">📄 PDF</button>':'')
      +'</div>'
    +'</div>';
  }
  if(r2.length){h+='<div class="sec" style="padding:10px 12px 4px;">Rascunhos ('+r2.length+')</div>';h+=r2.map(_crd).join('');}
  if(e2.length){h+='<div class="sec" style="padding:10px 12px 4px;margin-top:'+(r2.length?'8':'0')+'px">Enviados ('+e2.length+')</div>';h+=e2.map(_crd).join('');}
  lstEl.innerHTML=h;
}
function coordToggleSel(id){
  S._coordSel=S._coordSel||[];
  var idx=S._coordSel.indexOf(id);
  if(idx===-1)S._coordSel.push(id);else S._coordSel.splice(idx,1);
  rCoord();
}
function coordSelAll(){
  var _cReg=S._coordReg||'todos';
  var base=S.insp.filter(function(i){return _cReg==='todos'||i.reg===_cReg;});
  if(S.rflt!=='todos')base=base.filter(function(i){return i.tipo===S.rflt;});
  var allIds=base.map(function(i){return i.id;});
  S._coordSel=S._coordSel||[];
  var todosSelected=allIds.every(function(id){return S._coordSel.indexOf(id)!==-1;});
  S._coordSel=todosSelected?[]:allIds.slice();
  rCoord();
}
function coordExpSel(){
  S._coordSel=S._coordSel||[];
  var ids=S._coordSel.filter(function(id){var i=S.insp.find(function(x){return x.id===id;});return i&&i.st==='finalizada';});
  if(!ids.length){Tt('Nenhuma finalizada selecionada para exportar');return;}
  Tt('Exportando '+ids.length+' relatório(s)...');
  ids.forEach(function(id,idx){setTimeout(function(){exportHTML(id);},idx*600);});
}
/* ── v78-fix: seleção múltipla fiscal (tela Relatórios) ── */
function fiscToggleSel(id){
  S._fiscSel=S._fiscSel||[];
  var idx=S._fiscSel.indexOf(id);
  if(idx===-1)S._fiscSel.push(id);
  else S._fiscSel.splice(idx,1);
  rRel();
}
function fiscSelAll(){
  var base=filterByReg(S.rflt==='todos'?S.insp:S.insp.filter(function(i){return i.tipo===S.rflt;}));
  var allIds=base.map(function(i){return i.id;});
  S._fiscSel=S._fiscSel||[];
  var todos=allIds.length>0&&allIds.every(function(id){return S._fiscSel.indexOf(id)!==-1;});
  S._fiscSel=todos?[]:allIds.slice();
  rRel();
}
function fiscExpSel(){
  var ids=(S._fiscSel||[]).filter(function(id){
    var i=S.insp.find(function(x){return x.id===id;});
    return i&&i.st==='finalizada';
  });
  if(!ids.length){Tt('Nenhuma finalizada selecionada para HTML.');return;}
  Tt('Exportando '+ids.length+' relatório(s)...');
  ids.forEach(function(id,idx){setTimeout(function(){exportHTML(id);},idx*600);});
}
function fiscExpSelPDF(){
  var ids=(S._fiscSel||[]).filter(function(id){
    var i=S.insp.find(function(x){return x.id===id;});
    return i&&i.st==='finalizada';
  });
  if(!ids.length){Tt('Nenhuma finalizada selecionada para PDF.');return;}
  exportPDFBatch(ids);
}
/* v78-fix: ZIP coordenador */
function coordExpSelZip(){
  var ids=(S._coordSel||[]).filter(function(id){var i=S.insp.find(function(x){return x.id===id;});return i&&i.st==='finalizada';});
  if(typeof _exportZipIds==='function')_exportZipIds(ids,'TJMG_COORD');
  else Tt('Função ZIP indisponível.');
}
/* ══════════════════════════════════════════════════════════════
   DASHBOARD — Painel do Coordenador (v78-fix)
   ══════════════════════════════════════════════════════════════ */
function rPainel(){
  var ab=el('coord-ab');if(!ab)return;
  var base=S.insp.filter(function(i){
    var _cReg=S._coordReg||'todos';
    return _cReg==='todos'||i.reg===_cReg;
  });
  var fin=base.filter(function(i){return i.st==='finalizada';});
  var rasc=base.filter(function(i){return i.st==='em_andamento';});
  /* Contagem por tipo */
  var porTipo={};
  Object.keys(TIPOS).forEach(function(k){porTipo[k]=0;});
  fin.forEach(function(i){if(porTipo[i.tipo]!==undefined)porTipo[i.tipo]++;});
  /* Contagem por fiscal */
  var porFiscal={};
  fin.forEach(function(i){var f=i.fiscal||'Sem nome';porFiscal[f]=(porFiscal[f]||0)+1;});
  var topFiscais=Object.keys(porFiscal).sort(function(a,b){return porFiscal[b]-porFiscal[a];}).slice(0,8);
  /* Conformidade média */
  var somaPct=0;var cntPct=0;
  fin.forEach(function(i){
    var its=Object.values(i.itens||{}).filter(function(v){return v.s&&v.s!=='fora_periodo'&&v.s!=='nao_aplicavel';});
    if(!its.length)return;
    var conf=its.filter(function(v){return v.s==='conforme'||v.s==='executado';}).length;
    somaPct+=Math.round(conf/its.length*100);cntPct++;
  });
  var mediaConf=cntPct?Math.round(somaPct/cntPct):0;
  var corConf=mediaConf>=80?'#16a34a':mediaConf>=50?'#d97706':'#dc2626';
  /* Sync pendente */
  var semSync=fin.filter(function(i){return !i.synced_at;}).length;

  /* ── Barra de max para gráficos ── */
  var maxTipo=Math.max.apply(null,Object.values(porTipo).concat([1]));
  var maxFisc=topFiscais.length?porFiscal[topFiscais[0]]:1;

  var h='<div style="padding:12px;">';
  /* ── KPIs ── */
  h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px;">';
  h+='<div class="card" style="text-align:center;border-left:4px solid #003580;"><div style="font-size:26px;font-weight:900;color:#003580;">'+base.length+'</div><div style="font-size:10px;color:#64748b;font-weight:700;">TOTAL</div></div>';
  h+='<div class="card" style="text-align:center;border-left:4px solid #16a34a;"><div style="font-size:26px;font-weight:900;color:#16a34a;">'+fin.length+'</div><div style="font-size:10px;color:#64748b;font-weight:700;">FINALIZADOS</div></div>';
  h+='<div class="card" style="text-align:center;border-left:4px solid #d97706;"><div style="font-size:26px;font-weight:900;color:#d97706;">'+rasc.length+'</div><div style="font-size:10px;color:#64748b;font-weight:700;">RASCUNHOS</div></div>';
  h+='<div class="card" style="text-align:center;border-left:4px solid '+corConf+';"><div style="font-size:26px;font-weight:900;color:'+corConf+';">'+mediaConf+'%</div><div style="font-size:10px;color:#64748b;font-weight:700;">CONFORMIDADE</div></div>';
  h+='</div>';
  if(semSync>0)h+='<div style="background:#fef3c7;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#92400e;font-weight:700;">☁⏳ '+semSync+' finalizado(s) aguardando sincronização com Supabase</div>';
  /* ── Relatórios por tipo ── */
  h+='<div class="card" style="margin-bottom:10px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:10px;">Relatórios por tipo (finalizados)</div>';
  Object.keys(TIPOS).forEach(function(k){
    var n=porTipo[k]||0;if(!n)return;
    var t=TIPOS[k];
    var pct=Math.round(n/maxTipo*100);
    h+='<div style="margin-bottom:8px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px;"><span>'+t.l+'</span><span style="color:'+t.c+';">'+n+'</span></div>'
      +'<div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden;">'
        +'<div style="width:'+pct+'%;height:100%;background:'+t.c+';border-radius:4px;transition:width .4s;"></div>'
      +'</div></div>';
  });
  h+='</div>';
  /* ── Por fiscal ── */
  if(topFiscais.length){
    h+='<div class="card" style="margin-bottom:10px;">';
    h+='<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:10px;">Top fiscais (relatórios finalizados)</div>';
    topFiscais.forEach(function(f){
      var n=porFiscal[f];
      var pct=Math.round(n/maxFisc*100);
      h+='<div style="margin-bottom:8px;">'
        +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;">'+f+'</span><span style="color:#003580;">'+n+'</span></div>'
        +'<div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden;">'
          +'<div style="width:'+pct+'%;height:100%;background:#003580;border-radius:4px;transition:width .4s;"></div>'
        +'</div></div>';
    });
    h+='</div>';
  }
  /* ── Ativar push ── */
  h+='<div class="card" style="margin-bottom:10px;border-left:4px solid #7c3aed;">';
  h+='<div style="font-size:12px;font-weight:800;color:#7c3aed;margin-bottom:8px;">🔔 Notificações Push</div>';
  h+='<div style="font-size:11px;color:#64748b;margin-bottom:10px;">Receba notificação quando um fiscal finalizar um relatório.</div>';
  h+='<button class="btn bp" onclick="registrarPush()" style="font-size:12px;">Ativar Notificações</button>';
  h+='</div>';
  h+='</div>';
  ab.innerHTML=h;
}
function openDetCoord(id){
  S.did=id;
  var i=S.insp.find(function(x){return x.id===id;});if(!i)return;
  var t=TIPOS[i.tipo]||TIPOS.periodica;
  el('dt').textContent=i.edif;
  el('ds').textContent=t.l+' - '+(i.com||'-')+' - '+fdt(i.dtVistoria||i.data);
  var _osp=i.tipo==='ose'||i.tipo==='programada'||i.tipo==='osp';
  var _cor=TCOR[i.tipo]||'#7c3aed';

  /* Filtra por ativSel para OSE/Programada */
  var _ativSelKeys=i.ativSel||{};
  var _hasSel=_osp&&Object.keys(_ativSelKeys).some(function(k){return !!_ativSelKeys[k];});
  var its=oentries(i.itens||{}).filter(function(e){
    if(!_osp)return true;
    if(!_hasSel)return e[1].s!=='nao_aplicavel';
    var _aid=e[0].replace(/^[^_]*_/,'');
    return !!_ativSelKeys[_aid];
  });

  var atv=its.filter(function(e){return e[1].s!=='fora_periodo'&&e[1].s!=='nao_aplicavel';});
  var fet=_osp?its.filter(function(e){return e[1].s==='executado';})
              :its.filter(function(e){return e[1].s==='conforme'||e[1].s==='nao_conforme';});
  var prb=_osp?its.filter(function(e){return e[1].s==='nao_executado';}).length
              :its.filter(function(e){return e[1].s==='nao_conforme';}).length;
  var pct=atv.length?Math.round(fet.length/atv.length*100):0;

  var sim={};
  its.forEach(function(e){
    var v=e[1];var sk=v.sk||'?';
    if(!sim[sk])sim[sk]={nm:v.sn||'',nn:v.snn||'',its:[]};
    sim[sk].its.push({s:v.s,nm:v.nm,obs:v.obs,_k:e[0]});
  });

  var h='<div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
    +'<div style="font-size:28px;font-weight:900;color:'+_cor+';">'+pct+'%</div>'
    +'<div style="flex:1;"><div class="pb"><div class="pf" style="width:'+pct+'%;background:'+_cor+';"></div></div>'
    +'<div style="font-size:10px;color:#64748b;margin-top:3px;">'+fet.length+'/'+atv.length+' itens'+(prb?' - '+prb+' problema(s)':'')+'</div>'
    +'</div></div><div style="display:flex;justify-content:space-around;">';
  Object.keys(ST).forEach(function(k){var v=ST[k];h+='<div style="text-align:center;"><div>'+v.e+'</div><div style="font-size:10px;font-weight:700;">'+its.filter(function(e){return e[1].s===k;}).length+'</div></div>';});
  h+='</div></div>';

  Object.keys(sim).forEach(function(sk){
    var s=sim[sk];
    if(!s.its.length)return;
    var a=s.its.filter(function(x){return x.s!=='fora_periodo'&&x.s!=='nao_aplicavel';});
    var f=_osp?s.its.filter(function(x){return x.s==='executado';})
              :s.its.filter(function(x){return x.s==='conforme'||x.s==='nao_conforme';});
    var p=a.length?Math.round(f.length/a.length*100):0;
    h+='<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.09);margin-bottom:10px;">';
    h+='<div style="background:'+_cor+';color:#fff;padding:9px 12px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;">';
    h+='<div><div style="font-size:12px;font-weight:700;">'+s.nn+' '+s.nm+'</div><div style="font-size:10px;opacity:.8;">'+f.length+'/'+a.length+'</div></div>';
    h+='<span style="background:'+(p>=100?'#dcfce7':p>=50?'#fef9c3':'#fee2e2')+';color:'+(p>=100?'#16a34a':p>=50?'#d97706':'#dc2626')+';padding:3px 10px;border-radius:20px;font-size:12px;font-weight:800;">'+p+'%</span></div>';
    /* Sempre expandido — sem toggle */
    h+='<div style="display:block;">';
    s.its.forEach(function(it){
      var stv=ST[it.s||'pendente']||ST.pendente;
      h+='<div class="prow"><div style="flex:1;">'+it.nm+'</div>'
        +'<span class="pst" style="background:'+stv.bg+';color:'+stv.c+';">'+stv.e+' '+stv.l+'</span>'
        +(it.obs?'<div style="font-size:10px;color:#64748b;margin-top:2px;">'+it.obs+'</div>':'')
        +'</div>';
    });
    h+='</div></div>';
  });

  if(i.tipo==='osp'&&(i.dtInicioExec||i.dtFinalExec)){
    h+='<div class="card" style="border-left:4px solid #0f766e;margin-bottom:8px;">';
    h+='<div style="font-size:11px;font-weight:800;color:#0f766e;margin-bottom:8px;">📅 Prazos da OS Programada</div>';
    h+='<div style="display:flex;gap:8px;">';
    if(i.dtInicioExec)h+='<div style="flex:1;text-align:center;"><div style="font-size:9px;color:#64748b;">Início</div><div style="font-size:12px;font-weight:700;color:#0f766e;">'+fdt(i.dtInicioExec)+'</div></div>';
    if(i.diasPrazo)h+='<div style="flex:1;text-align:center;"><div style="font-size:9px;color:#64748b;">Prazo</div><div style="font-size:12px;font-weight:700;color:#0f766e;">'+i.diasPrazo+'d</div></div>';
    if(i.dtFinalExec)h+='<div style="flex:1;text-align:center;"><div style="font-size:9px;color:#64748b;">Final</div><div style="font-size:12px;font-weight:700;color:#15803d;">'+fdt(i.dtFinalExec)+'</div></div>';
    h+='</div></div>';
  }
  h+='<button class="btn" style="background:'+_cor+';color:#fff;" onclick="exportHTML(\''+id+'\')">&#128196; Exportar HTML</button>';
  h+='<button class="btn" style="background:#1a2332;color:#fff;margin-top:6px;" onclick="exportPDF(\''+id+'\')">📄 Exportar PDF</button>';
  /* v80: botões extras */
  h+='<button class="btn" style="background:#1e40af;color:#fff;margin-top:6px;" onclick="perguntarAssinatura(\''+id+'\',null)">🔏 Assinar Digitalmente</button>';
  h+='<button class="btn" style="background:#003580;color:#fff;margin-top:6px;" onclick="abrirSEI(\''+id+'\')">🏛️ Vincular ao SEI</button>';
  if(Object.values(i.itens||{}).filter(function(v){return v.s==='nao_conforme';}).length>0)
    h+='<button class="btn" style="background:#25d366;color:#fff;margin-top:6px;" onclick="alertarNcCriticaWhatsApp(\''+id+'\')">📱 Alertar Coord. (WhatsApp)</button>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">';
  h+='<button class="btn" style="background:#0f766e;color:#fff;font-size:11px;padding:10px;" onclick="gerarNOTINA(\''+id+'\')">⚠️ NOT-INA</button>';
  h+='<button class="btn" style="background:#d97706;color:#fff;font-size:11px;padding:10px;" onclick="gerarROC(\''+id+'\')">📋 ROC</button>';
  h+='</div>';
  h+='<div style="height:16px;"></div>';
  el('dbody').innerHTML=h;
  if(i.tipo==='prontuario'){el('dbody').innerHTML=renderDetPron(i);}
  var dd=el('det-del');if(dd)dd.style.display='none';
  G('s-det');
}

// ── Expor para onclick inline ─────────────────────────────────────────────
window.rLogin         = rLogin;
window.openPin        = openPin;
window.kp             = kp;
window.kpOK           = kpOK;
window.openAdm        = openAdm;
window.loginAdm       = loginAdm;
window.logout         = logout;
window.openCoord      = openCoord;
window.loginCoord     = loginCoord;
window.rCoord         = rCoord;
window.coordToggleSel = coordToggleSel;
window.coordSelAll    = coordSelAll;
window.coordExpSel    = coordExpSel;
window.openDetCoord   = openDetCoord;
window.cancelPin      = cancelPin;
/* v79b-fix: coordExpSelPDF e admExpSelPDF definidas em admin.js (carregado depois)
   — usar wrapper para não quebrar se admin.js ainda não carregou */
window.coordExpSelPDF = function(){ if(typeof coordExpSelPDF==='function') coordExpSelPDF(); };
window.coordExpSelZip = coordExpSelZip;
window.fiscToggleSel  = fiscToggleSel;
window.fiscSelAll     = fiscSelAll;
window.fiscExpSel     = fiscExpSel;
window.fiscExpSelPDF  = fiscExpSelPDF;
window.fiscExpSelZip  = function(){ if(typeof fiscExpSelZip==='function') fiscExpSelZip(); };
window.admExpSelPDF   = function(){ if(typeof admExpSelPDF==='function') admExpSelPDF(); };
window.admExpSelZip   = function(){ if(typeof admExpSelZip==='function') admExpSelZip(); };
window.rPainel        = rPainel;
window.rPainel        = rPainel;
window.coordTabSwitch = function(tab){
  var views = {
    lista:    'coord-view-lista',
    painel:   'coord-view-painel',
    mapa:     'coord-view-mapa',
    execucao: 'coord-view-execucao'
  };
  var tabs = {
    lista:    'ctab-lista',
    painel:   'ctab-painel',
    mapa:     'ctab-mapa',
    execucao: 'ctab-execucao'
  };
  var COR = '#7c3aed';

  Object.keys(views).forEach(function(k){
    var v = el(views[k]);
    var t = el(tabs[k]);
    var on = k === tab;
    if(v){ v.style.display = on ? 'flex' : 'none'; if(on) v.style.flexDirection = 'column'; }
    if(t){
      t.style.color = on ? COR : '#94a3b8';
      t.style.borderBottomColor = on ? COR : 'transparent';
      t.style.fontWeight = on ? '800' : '700';
    }
  });

  if(tab === 'painel')  rPainel();
  if(tab === 'mapa')    rCoordMapa();
  if(tab === 'execucao') rCoordExecucao();
};

/* ── Mapa do coordenador ─────────────────────────────────────── */
function rCoordMapa(){
  var ctrl = el('coord-mapa-ctrl');
  var body = el('coord-mapa-body');
  if(!ctrl || !body) return;

  /* Usar mesmo mecanismo do rMapa mas fixado na view do coord */
  if(!window.L){ _injetarLeaflet(function(){ _renderCoordMapa(); }); }
  else { _renderCoordMapa(); }
}

function _renderCoordMapa(){
  var ctrl = el('coord-mapa-ctrl');
  var body = el('coord-mapa-body');
  body.innerHTML = '';

  /* Filtros */
  var reg = S._coordReg || 'todos';
  var tipoOpts = '<option value="todos">Todos os tipos</option>'
    + Object.keys(TIPOS).map(function(k){ return '<option value="'+k+'">'+TIPOS[k].l+'</option>'; }).join('');
  ctrl.innerHTML = '<div style="display:flex;gap:8px;padding:8px 12px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0;">'
    +'<select id="coord-mapa-tipo" onchange="_plotarCoordMapa()" style="flex:1;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;">'+tipoOpts+'</select>'
    +'<select id="coord-mapa-st" onchange="_plotarCoordMapa()" style="flex:1;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;">'
    +'<option value="todos">Todos</option><option value="finalizada">Enviados</option><option value="em_andamento">Rascunhos</option>'
    +'</select>'
    +'<span id="coord-mapa-info" style="font-size:10px;color:#94a3b8;align-self:center;white-space:nowrap;flex-shrink:0;"></span>'
    +'</div>';

  var div = document.createElement('div');
  div.id = 'lf-coord-map';
  div.style.cssText = 'width:100%;height:100%;min-height:350px;z-index:1;';
  body.appendChild(div);

  setTimeout(function(){
    if(window._coordMapInst){ window._coordMapInst.remove(); window._coordMapInst = null; }
    window._coordMapInst = L.map('lf-coord-map',{zoomControl:true,attributionControl:false}).setView([-18.5,-44.0],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(window._coordMapInst);
    _plotarCoordMapa();
    setTimeout(function(){ if(window._coordMapInst) window._coordMapInst.invalidateSize(); },300);
  },80);
}

function _plotarCoordMapa(){
  if(!window._coordMapInst) return;
  window._coordMapInst.eachLayer(function(l){ if(l._isTjmgMarker) window._coordMapInst.removeLayer(l); });

  var filtroTipo = (el('coord-mapa-tipo') && el('coord-mapa-tipo').value) || 'todos';
  var filtroSt   = (el('coord-mapa-st')   && el('coord-mapa-st').value)   || 'todos';
  var filtroReg  = S._coordReg || 'todos';

  var base = S.insp.filter(function(i){
    if(filtroReg !== 'todos' && i.reg !== filtroReg) return false;
    if(filtroTipo !== 'todos' && i.tipo !== filtroTipo) return false;
    if(filtroSt   !== 'todos' && i.st   !== filtroSt)   return false;
    return true;
  });

  /* Última inspeção por edif */
  var porEdif = {};
  base.forEach(function(i){
    var k=(i.com||'')+'::'+i.edif;
    if(!porEdif[k]||(i.dtVistoria||i.data)>(porEdif[k].dtVistoria||porEdif[k].data)) porEdif[k]=i;
  });

  var bounds=[]; var semCoord=0;
  Object.values(porEdif).forEach(function(i){
    var coords=COMARCA_COORDS[i.com];
    if(!coords){semCoord++;return;}
    var jit=(Math.random()-.5)*.04;
    var lat=coords[0]+jit, lon=coords[1]+jit;
    bounds.push([lat,lon]);
    var tp=TIPOS[i.tipo]||TIPOS.periodica;
    var stc=i.st==='finalizada'?'#16a34a':'#d97706';
    var ncs=Object.values(i.itens||{}).filter(function(v){return v.s==='nao_conforme';}).length;
    var corBorda=ncs>0?'#dc2626':stc;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">'
      +'<path d="M18 0C8.1 0 0 8.1 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.1 27.9 0 18 0Z" fill="'+corBorda+'"/>'
      +'<circle cx="18" cy="18" r="12" fill="white" opacity=".95"/>'
      +'<text x="18" y="22" text-anchor="middle" font-size="13">'+tp.i+'</text>'
      +(ncs>0?'<circle cx="28" cy="8" r="8" fill="#dc2626"/><text x="28" y="12" text-anchor="middle" font-size="9" fill="white" font-weight="bold">'+ncs+'</text>':'')
      +'</svg>';
    var icon=L.divIcon({className:'',html:svg,iconSize:[36,44],iconAnchor:[18,44],popupAnchor:[0,-46]});
    var mk=L.marker([lat,lon],{icon:icon});
    mk._isTjmgMarker=true;
    var imrVal=typeof calcIMRInsp==='function'?calcIMRInsp(i):null;
    var imrStr=imrVal!==null?Math.round(imrVal*100)+'%':'—';
    var imrCor=imrVal!==null?(imrVal>=.8?'#16a34a':imrVal>=.6?'#d97706':'#dc2626'):'#94a3b8';
    var popup='<div style="font-family:system-ui;min-width:200px;">'
      +'<div style="font-size:13px;font-weight:800;margin-bottom:3px;">'+_escA(i.edif)+'</div>'
      +'<div style="font-size:11px;color:#64748b;margin-bottom:6px;">'+_escA(i.com||'—')+' · '+fdt(i.dtVistoria||i.data)+'</div>'
      +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">'
      +'<span style="background:'+tp.bg+';color:'+tp.c+';padding:2px 7px;border-radius:12px;font-size:10px;font-weight:700;">'+tp.l+'</span>'
      +'<span style="background:#f1f5f9;color:'+imrCor+';padding:2px 7px;border-radius:12px;font-size:10px;font-weight:800;">IMR '+imrStr+'</span>'
      +(ncs>0?'<span style="background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:12px;font-size:10px;font-weight:700;">'+ncs+' NC</span>':'')
      +'</div>'
      +'<button onclick="openDetCoord(\''+i.id+'\')" style="width:100%;border:none;background:#7c3aed;color:#fff;border-radius:8px;padding:7px;font-size:12px;font-weight:700;cursor:pointer;">Ver Relatório ›</button>'
      +'</div>';
    mk.bindPopup(popup,{maxWidth:240});
    mk.addTo(window._coordMapInst);
  });

  if(bounds.length>0){
    try{window._coordMapInst.fitBounds(bounds,{padding:[30,30],maxZoom:12});}catch(e){}
  }
  var info=el('coord-mapa-info');
  if(info) info.textContent=bounds.length+' localidades'+(semCoord>0?' ('+semCoord+' s/ coord.)':'');
}

/* ── Execução / Averiguação por atividade ────────────────────── */
function rCoordExecucao(){
  var eb=el('coord-exec-body');if(!eb)return;
  var reg=S._coordReg||'todos';
  var base=S.insp.filter(function(i){
    if(reg!=='todos'&&i.reg!==reg)return false;
    return i.st==='finalizada';
  });

  if(!base.length){
    eb.innerHTML='<div style="text-align:center;padding:40px;"><div style="font-size:48px;">📋</div><div style="font-size:14px;color:#94a3b8;margin-top:12px;">Nenhum relatório finalizado ainda.</div></div>';
    return;
  }

  /* Conformidade por atividade (ATVs) */
  var atvsConf={}; // {atv_id: {nm, conf, total, ncs}}
  base.forEach(function(insp){
    oentries(insp.itens||{}).forEach(function(pair){
      var k=pair[0],v=pair[1];
      if(!v.nm)return;
      var aid=v._atv||k;
      if(!atvsConf[aid]) atvsConf[aid]={nm:v.nm,conf:0,total:0,ncs:0,tipo:insp.tipo};
      if(v.s&&v.s!=='fora_periodo'&&v.s!=='nao_aplicavel'&&v.s!=='pendente'){
        atvsConf[aid].total++;
        if(v.s==='conforme'||v.s==='executado') atvsConf[aid].conf++;
        if(v.s==='nao_conforme'||v.s==='nao_executado') atvsConf[aid].ncs++;
      }
    });
  });

  /* Ordenar por maior número de NCs */
  var atvsArr=Object.keys(atvsConf).map(function(k){
    var a=atvsConf[k];
    a.pct=a.total?Math.round(a.conf/a.total*100):0;
    a.id=k;
    return a;
  }).filter(function(a){return a.total>0;})
    .sort(function(a,b){return b.ncs-a.ncs||a.pct-b.pct;});

  /* Conformidade por fiscal */
  var porFiscal={};
  base.forEach(function(i){
    var f=i.fiscal||'Sem nome';
    if(!porFiscal[f]) porFiscal[f]={nome:f,soma:0,cnt:0,total:0};
    var imr=typeof calcIMRInsp==='function'?calcIMRInsp(i):null;
    if(imr!==null){porFiscal[f].soma+=imr;porFiscal[f].cnt++;}
    porFiscal[f].total++;
  });
  var fiscaisArr=Object.values(porFiscal).filter(function(f){return f.cnt>0;})
    .map(function(f){f.media=Math.round(f.soma/f.cnt*100);return f;})
    .sort(function(a,b){return a.media-b.media;});

  var h='<div style="padding:12px;">';

  /* KPIs rápidos */
  var totalFin=base.length;
  var totalNCs=base.reduce(function(acc,i){return acc+Object.values(i.itens||{}).filter(function(v){return v.s==='nao_conforme';}).length;},0);
  var mediaGeral=base.length?Math.round(base.reduce(function(acc,i){var imr=typeof calcIMRInsp==='function'?calcIMRInsp(i):null;return acc+(imr||0);},0)/base.length*100):0;

  h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
  h+='<div class="card" style="text-align:center;border-left:4px solid #003580;padding:10px;"><div style="font-size:22px;font-weight:900;color:#003580;">'+totalFin+'</div><div style="font-size:9px;color:#64748b;">FINALIZADOS</div></div>';
  h+='<div class="card" style="text-align:center;border-left:4px solid #dc2626;padding:10px;"><div style="font-size:22px;font-weight:900;color:#dc2626;">'+totalNCs+'</div><div style="font-size:9px;color:#64748b;">NÃO CONFORMES</div></div>';
  var cmg=mediaGeral>=80?'#16a34a':mediaGeral>=60?'#d97706':'#dc2626';
  h+='<div class="card" style="text-align:center;border-left:4px solid '+cmg+';padding:10px;"><div style="font-size:22px;font-weight:900;color:'+cmg+';">'+mediaGeral+'%</div><div style="font-size:9px;color:#64748b;">CONFORMIDADE</div></div>';
  h+='</div>';

  /* Atividades com mais NCs */
  if(atvsArr.length){
    h+='<div class="card" style="margin-bottom:12px;">';
    h+='<div style="font-size:12px;font-weight:800;color:#dc2626;margin-bottom:10px;">⚠️ Atividades com mais Não-Conformidades</div>';
    atvsArr.slice(0,15).forEach(function(a){
      var cor=a.pct>=80?'#16a34a':a.pct>=60?'#d97706':'#dc2626';
      h+='<div style="margin-bottom:10px;">';
      h+='<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px;">';
      h+='<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72%;">'+_escA(a.nm)+'</span>';
      h+='<span style="flex-shrink:0;color:'+cor+';">'+a.pct+'% '+(a.ncs>0?'<span style="color:#dc2626;">('+a.ncs+' NC)</span>':'')+'</span>';
      h+='</div>';
      h+='<div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden;">';
      h+='<div style="width:'+a.pct+'%;height:100%;background:'+cor+';border-radius:4px;transition:width .4s;"></div></div></div>';
    });
    h+='</div>';
  }

  /* Ranking de fiscais por conformidade */
  if(fiscaisArr.length){
    h+='<div class="card" style="margin-bottom:12px;">';
    h+='<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:10px;">👥 Fiscais — Conformidade Média</div>';
    fiscaisArr.forEach(function(f){
      var cor=f.media>=80?'#16a34a':f.media>=60?'#d97706':'#dc2626';
      h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">';
      h+='<div style="width:34px;height:34px;border-radius:50%;background:'+cor+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex-shrink:0;">'+ini(f.nome)+'</div>';
      h+='<div style="flex:1;min-width:0;">';
      h+='<div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_escA(f.nome)+'</div>';
      h+='<div style="background:#f1f5f9;border-radius:4px;height:6px;margin-top:4px;overflow:hidden;">';
      h+='<div style="width:'+f.media+'%;height:100%;background:'+cor+';border-radius:4px;"></div></div></div>';
      h+='<span style="font-size:13px;font-weight:900;color:'+cor+';flex-shrink:0;">'+f.media+'%</span>';
      h+='<span style="font-size:10px;color:#94a3b8;flex-shrink:0;">'+f.total+' rel.</span>';
      h+='</div>';
    });
    h+='</div>';
  }

  /* SEI Link de acesso direto */
  h+='<div class="card" style="margin-bottom:12px;border-left:4px solid #003580;">';
  h+='<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:8px;">🏛️ SEI — Processos</div>';
  h+='<div style="font-size:11px;color:#64748b;margin-bottom:10px;">Acesse diretamente os processos do TJMG no SEI para vincular documentos gerados.</div>';
  h+='<button class="btn ba" style="font-size:12px;" onclick="window.open(\'https://sei.tjmg.jus.br/sei/controlador.php?acao=procedimento_controlar&reset=1&id_bloco=78497&infra_sistema=100000100&infra_unidade_atual=100003385&infra_hash=93870dae72177047243c2bfb29d63815b1014bee1ea2307ba90382eb1a5ebbb5\',\'_blank\')">🔗 Abrir SEI TJMG</button>';
  h+='</div>';

  h+='</div>';
  eb.innerHTML=h;
}

window.rCoordMapa       = rCoordMapa;
window._plotarCoordMapa = _plotarCoordMapa;
window.rCoordExecucao   = rCoordExecucao;
window._renderCoordMapa = _renderCoordMapa;
