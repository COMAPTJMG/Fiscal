'use strict';
// ============================================================
// form.js — Formulário de inspeção: iniciar, rFe, rFDados, etc.
// TJMG Fiscal PWA — v78 (Fase 5 da modularização)
// Dependências: S, F, TIPOS, TCOR, MATS, ATVs, EDIFICACOES,
//   SIS, ST, REG, Tt, el, cf, cm, fdt, uid, PhotoStore, DB
// ============================================================

function iniciarProgramada(){
  var osps=filterByReg(S.insp).filter(function(i){return i.tipo==='osp';});
  if(!osps.length){iniciarF('programada');return;}
  var h='<div style="font-size:15px;font-weight:800;color:#2563eb;margin-bottom:6px;">📋 RITP — Programada</div>'
    +'<div style="font-size:11px;color:#64748b;margin-bottom:14px;">Vincule uma OSP existente (dados pré-preenchidos) ou inicie sem vínculo.</div>'
    +'<div style="font-size:11px;font-weight:700;color:#2563eb;margin-bottom:8px;">OSP disponíveis:</div>';
  osps.slice(0,12).forEach(function(osp){
    var st=osp.st==='finalizada'?{l:'Enviada',bg:'#dcfce7',c:'#16a34a'}:{l:'Rascunho',bg:'#fef3c7',c:'#d97706'};
    h+='<div onclick="vincularOSP(\''+osp.id+'\')" style="border:1.5px solid #2563eb;border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer;background:#f0f7ff;display:flex;align-items:center;gap:8px;">'
      +'<div style="flex:1;">'
      +'<div style="font-size:13px;font-weight:700;color:#1e293b;">'+(osp.edif||'Edificação')+'</div>'
      +'<div style="font-size:10px;color:#64748b;">'+(osp.com||'-')+' · '+fdt(osp.dtVistoria||osp.data)+(osp.os?' · <b>'+osp.os+'</b>':'')+'</div>'
      +(osp.descricao?'<div style="font-size:10px;color:#64748b;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px;">'+osp.descricao+'</div>':'')
      +'</div>'
      +'<span style="background:'+st.bg+';color:'+st.c+';border-radius:8px;padding:2px 8px;font-size:10px;font-weight:700;flex-shrink:0;">'+st.l+'</span>'
      +'</div>';
  });
  h+='<button class="btn ba" onclick="cm(\'m-osp-link\');iniciarF(\'programada\',true)" style="margin-top:4px;">+ Iniciar sem OSP vinculada</button>'
    +'<button class="btn bo" onclick="cm(\'m-osp-link\')" style="margin-top:8px;">Cancelar</button>';
  var modal=el('m-osp-link');
  if(!modal){
    modal=document.createElement('div');
    modal.id='m-osp-link';
    modal.className='mdl ctr';
    modal.style.display='none';
    modal.innerHTML='<div class="mdc" style="max-width:400px;max-height:88vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom,12px);"><div id="m-osp-link-body"></div></div>';
    document.getElementById('app').appendChild(modal);
  }
  document.getElementById('m-osp-link-body').innerHTML=h;
  modal.style.display='flex';
}
function vincularOSP(ospId){
  cm('m-osp-link');
  var osp=S.insp.find(function(x){return x.id===ospId;});
  if(!osp){iniciarF('programada');return;}
  var t=TIPOS['programada'];
  var sess=S.sessao||{};
  F={tipo:'programada',et:1,id:uid(),ets:t.e,
     _ospVinculada:ospId,
     d:{com:osp.com||'',edif:osp.edif||'',grp:osp.grupo||'B',polo:osp.polo||'',tv:'trimestral',
        fiscal:osp.fiscal||sess.nome||'',mat:osp.mat||sess.mat||'',reg:osp.reg||sess.reg||'NORTE',
        os:osp.os||'',descricao:osp.descricao||'',
        dtVistoria:new Date().toISOString().slice(0,10),
        dtInicioExec:osp.dtInicioExec||'',diasPrazo:osp.diasPrazo||'',dtFinalExec:osp.dtFinalExec||''},
     itens:{},mats:[],sistemas:JSON.parse(JSON.stringify(osp.sistemas||[])),
     ativSel:JSON.parse(JSON.stringify(osp.ativSel||{})),
     ativ:'',causas:'',lim:'',normas:'NBR 5674',concl:'',pron:{},
     fach:{FR:{obs:'',nc:false,nd:''},LD:{obs:'',nc:false,nd:''},LE:{obs:'',nc:false,nd:''},FU:{obs:'',nc:false,nd:''}},
     schk:{},med:{p1:'',p2:'',p3:'',bep:''},sub:null};
  normalizeFormState(F);
  applyGrupoDaEdificacao(F);
  ensureDraftItems(F);
  autoSaveLastHash='';startAutoSave();syncDraftFromF(true);autoSaveLastHash=computeDraftHash();
  var cor=TCOR['programada']||'#2563eb';el('fhdr').style.background=cor;el('fnxt').style.background=cor;
  Tt('✓ OSP vinculada: '+(osp.os||osp.edif));
  rFe();G('s-form');
}
function iniciarF(tipo,forcar){
  if(tipo==='programada'&&!forcar){var _osps=filterByReg(S.insp).filter(function(i){return i.tipo==='osp';});if(_osps.length){iniciarProgramada();return;}}
  var t=TIPOS[tipo];
  var sess=S.sessao||{};
  var reg=sess.reg||'NORTE';
  var polosSessao=EDIFICACOES[reg]||{};
  var poloPadrao=sess.polo&&polosSessao[sess.polo]?sess.polo:'';
  F={tipo:tipo,et:0,id:uid(),ets:t.e,
     d:{com:'',edif:'',grp:'B',polo:poloPadrao,tv:'trimestral',
        fiscal:sess.nome||'',mat:sess.mat||'',reg:reg,os:'',descricao:'',
        dtVistoria:new Date().toISOString().slice(0,10),
        dtInicioExec:'',diasPrazo:'',dtFinalExec:''},
     itens:{},mats:[],sistemas:[],ativSel:{},
     ativ:'',causas:'',lim:'',normas:'NBR 5674',concl:'',pron:{},
     fach:{FR:{obs:'',nc:false,nd:''},LD:{obs:'',nc:false,nd:''},LE:{obs:'',nc:false,nd:''},FU:{obs:'',nc:false,nd:''}},
     schk:{},med:{p1:'',p2:'',p3:'',bep:''},sub:null};
  if(tipo==='subestacao'){var _sess2=S.sessao||{};F.sub={tipo_sub:'AEREA',tipo_manutencao:'ANUAL',responsavel:_sess2.nome||'',obs_geral:'',nc:'',acoes:'',chk:{},trafos:[subNovoTrafo()],disjs:[subNovoDisj()],secc:[subNovoSecc()]};F.d.tipo_sub='AEREA';F.d.tipo_manutencao='ANUAL';F.d.tem_pvo='NAO';F.ets=subEtapas('AEREA');}
  var cor=TCOR[tipo]||'#003580';el('fhdr').style.background=cor;el('fnxt').style.background=cor;
  autoSaveLastHash='';
  startAutoSave();
  /* v81: GPS + cronômetro */
  if(typeof iniciarGPS==='function') iniciarGPS();
  if(typeof iniciarCrono==='function') iniciarCrono();
  if(typeof haptic==='function') haptic('leve');
  rFe();G('s-form');
}
function rFe(resetScroll){
  var tipo=F.tipo,et=F.et,ets=F.ets;var tn=ets[et];
  var c=el('fbody');
  var prevScroll=resetScroll?0:c.scrollTop;
  /* reset display para flex (padrão .scrl) antes de cada etapa */
  c.style.display='';
  el('ftit').textContent=TIPOS[tipo].l;
  el('fsub').textContent=(F._editando?'✏️ Editando — ':'')+'Etapa '+(et+1)+' de '+ets.length;
  if(F._editando){
    el('fnxt').textContent=et===ets.length-1?'Salvar Edição':'Próximo';
  } else {
    el('fnxt').textContent=et===ets.length-1?'Finalizar':'Proximo';
  }
  var cor=TCOR[tipo]||'#003580';var sbh='';
  for(var si=0;si<ets.length;si++){
    if(si>0){sbh+='<div class="sl"'+(si<=et?' style="background:'+cor+';"':'')+' ></div>';}
    sbh+='<div class="sw"><div class="sc';
    if(si<et)sbh+=' dn" style="background:'+cor+';">';
    else if(si===et)sbh+=' cu">';
    else sbh+='">';
    sbh+=(si<et?'&#10003;':(si+1))+'</div><div class="sn'+(si===et?' on':'')+'">'+ets[si]+'</div></div>';
  }
  el('fsbr').innerHTML=sbh;
  var c=el('fbody');c.innerHTML='';
  if(tn==='Dados'||tn==='Dados/OS'||tn==='Dados OSP'){if(F.tipo==='subestacao')rFSubDados(c);else if(F.tipo==='osp')rFDadosOSP(c);else rFDados(c);}
  else if(tn==='Sistemas')rFSistemas(c);
  else if(tn==='Sel. Atividades')rFSelAtiv(c);
  else if(tn==='Atividades'){if(F.tipo==='ose'||F.tipo==='programada'||F.tipo==='osp')rFAtiv(c);else rFCheck(c);}
  else if(tn==='Checklist')rFCheck(c);
  else if(tn==='Fachadas')rFFach(c);
  else if(tn==='Inspecao Visual')rFSPDAi(c);
  else if(tn==='Medicoes')rFSPDAm(c);
  else if(tn==='Materiais')rFMats(c);
  else if(tn==='Documentos')rFPron(c);
  else if(tn==='Checklist Sub'){rFSubChecklist(c);c.style.display='block';}
  else if(tn==='Medicoes Sub')rFSubMedicoes(c);
  else if(tn==='Concluir'||tn==='Conclusao')rFConc(c);
  else c.innerHTML='<div style="padding:20px;color:#64748b;">'+tn+'</div>';
  if(prevScroll>0){c.scrollTop=prevScroll;}
}


function rFDados(c){
  var d=F.d;
  var reg=d.reg||(S.sessao?S.sessao.reg:'NORTE')||'NORTE';
  // Admin/coord podem trocar a região dentro do formulário
  var _global=isGlobal(S.sessao);
  if(_global&&!d.reg)reg='NORTE'; // default inicial
  var polosReg=EDIFICACOES[reg]||{};
  var poloNames=Object.keys(polosReg);

  // Fiscal vê TODA a região — agrupa todas as edificações independente do polo
  var todasEdifs=[];
  poloNames.forEach(function(p){(polosReg[p]||[]).forEach(function(e){todasEdifs.push({polo:p,com:e.com,edif:e.edif,grp:e.grp});});});

  // Comarcas únicas de toda a região
  var comarcasUnicas=[];var vistas={};
  todasEdifs.forEach(function(e){if(!vistas[e.com]){vistas[e.com]=true;comarcasUnicas.push(e.com);}});
  comarcasUnicas.sort(function(a,b){return a.localeCompare(b,'pt-BR');});

  var comarca=d.com||'';
  var edifsCom=todasEdifs.filter(function(e){return e.com===comarca;});
  var edif=d.edif||'';
  var polo=d.polo||'';

  var R=REG[reg]||{c:'#003580',bg:'#dbeafe',l:reg};

  var h='<div style="font-size:15px;font-weight:800;margin-bottom:12px;">Identificação</div>';
  if(_global){
    h+='<div class="lbl">Região *</div>';
    h+='<select onchange="F.d.reg=this.value;F.d.com=\'\';F.d.edif=\'\';F.d.polo=\'\';F.d.grp=\'B\';rFe()" style="margin-bottom:10px;">';
    Object.keys(REG).forEach(function(rk){h+='<option value="'+rk+'"'+(reg===rk?' selected':'')+'>'+REG[rk].l+'</option>';});
    h+='</select>';
  } else {
    h+='<div style="background:'+R.c+';border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">';
    h+='<div style="background:rgba(255,255,255,.15);border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;color:#fff;">🔒 Região '+R.l+'</div>';
    h+='<div style="font-size:10px;color:rgba(255,255,255,.8);">'+(R.ct||'CT 017/2026')+' – TJMG · Região completa</div></div>';
  }

  // SELECT COMARCA (toda a região, sem filtro de polo)
  h+='<div class="lbl">Comarca *</div>';
  if(F._editando){
    h+='<div style="background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:10px;padding:11px 12px;font-size:14px;color:#64748b;margin-bottom:10px;display:flex;align-items:center;gap:8px;">';
    h+='<span>🔒</span><span>'+comarca+'</span></div>';
  } else {
  h+='<select onchange="F.d.com=this.value;F.d.edif=\'\';F.d.polo=\'\';F.d.grp=\'B\';rFe()" style="margin-bottom:10px;">';
  h+='<option value="">— Selecione a Comarca —</option>';
  comarcasUnicas.forEach(function(com){h+='<option value="'+com+'"'+(comarca===com?' selected':'')+'>'+com+'</option>';});
  h+='</select>';
  }

  // SELECT EDIFICAÇÃO da comarca
  if(comarca&&edifsCom.length){
    h+='<div class="lbl">Edificação *</div>';
    if(F._editando){
      h+='<div style="background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:10px;padding:11px 12px;font-size:14px;color:#64748b;margin-bottom:10px;display:flex;align-items:center;gap:8px;">';
      h+='<span>🔒</span><span>'+edif+'</span></div>';
    } else {
    h+='<select onchange="var idx=this.selectedIndex;if(idx>0){var e=JSON.parse(this.options[idx].dataset.e);F.d.edif=e.edif;F.d.grp=e.grp;F.d.polo=e.polo;rFe();}" style="margin-bottom:10px;">';
    h+='<option value="">— Selecione a Edificação —</option>';
    edifsCom.slice().sort(function(a,b){return a.edif.localeCompare(b.edif,'pt-BR');}).forEach(function(e){
      var label=e.edif+(e.grp?'  [Grupo '+e.grp+']':'');
      var sel=edif===e.edif;
      h+='<option'+(sel?' selected':'')+' data-e=\''+JSON.stringify(e)+'\'>'+label+'</option>';
    });
    h+='</select>';
    }

    if(edif){
      var eObj=edifsCom.find(function(x){return x.edif===edif;})||findEdificacaoMeta(reg,comarca,edif)||{grp:F.d.grp||'B',polo:F.d.polo||''};
      var grpCor={'A':'#003580','B':'#16a34a','C':'#d97706'}[eObj.grp]||'#64748b';
      var grpBg={'A':'#dbeafe','B':'#dcfce7','C':'#fef3c7'}[eObj.grp]||'#f1f5f9';
      h+='<div style="background:'+grpBg+';border-radius:10px;padding:12px;margin-bottom:10px;border-left:4px solid '+grpCor+';">';
      h+='<div style="font-size:12px;font-weight:800;color:'+grpCor+';">✓ Edificação Selecionada</div>';
      h+='<div style="font-size:13px;font-weight:700;margin-top:4px;">'+comarca+' – '+edif+'</div>';
      h+='<div style="font-size:11px;color:#64748b;margin-top:2px;">Polo '+(eObj.polo||polo)+' · Região '+R.l+' · <b>Grupo '+eObj.grp+'</b></div>';
      h+='</div>';
    }
  }

  h+='<div class="lbl">Fiscal Responsável</div>';
  h+='<input value="'+d.fiscal+'" oninput="F.d.fiscal=this.value" style="background:#f0fdf4;border-color:#16a34a;margin-bottom:10px;">';
  h+='<div class="lbl">Matrícula do Fiscal</div>';
  h+='<input value="'+(d.mat||'')+'" placeholder="Ex: T001234-5" oninput="F.d.mat=this.value" style="margin-bottom:10px;">';
  var _todayISO=new Date().toISOString().slice(0,10);
  var _temPer=(F.tipo!=='ose'&&F.tipo!=='programada'&&F.tipo!=='osp');
  h+='<div style="display:grid;grid-template-columns:'+(_temPer?'1fr 1fr':'1fr')+';gap:10px;margin-bottom:10px;">';
  var _lbDt=(F.tipo==='periodica'||F.tipo==='ose'||F.tipo==='programada')?'Data de Início da Vistoria':'Data da Vistoria';
  h+='<div><div class="lbl">'+_lbDt+'</div>';
  h+='<input type="date" value="'+(d.dtVistoria||_todayISO)+'" max="'+_todayISO+'" oninput="F.d.dtVistoria=this.value" style="padding:10px 8px;"></div>';
  if(_temPer){
    h+='<div><div class="lbl">Periodicidade</div>';
    h+='<select oninput="F.d.tv=this.value" style="padding:10px 8px;">';
    h+='<option value="trimestral"'+((d.tv||'trimestral')==='trimestral'?' selected':'')+'>Trimestral</option>';
    h+='<option value="semestral"'+(d.tv==='semestral'?' selected':'')+'>Semestral</option>';
    h+='<option value="anual"'+(d.tv==='anual'?' selected':'')+'>Anual</option>';
    h+='</select></div>';
  }
  h+='</div>';

  if(F.tipo==='ose'||F.tipo==='programada'){
    var _osl=F.tipo==='ose'?'Número da OSE *':'Número da OSP *';
    var _osp2=F.tipo==='ose'?'Ex.: OSE-0042':'Ex.: OSP-0015';
    h+='<div class="lbl">'+_osl+'</div>';
    h+='<input value="'+(d.os||'')+'" placeholder="'+_osp2+'" oninput="F.d.os=this.value" style="font-size:15px;font-weight:700;margin-bottom:10px;">';
    var _dl=F.tipo==='ose'?'Descrição da Ocorrência *':'Descrição dos Serviços *';
    var _dp=F.tipo==='ose'?'Descreva a emergência...':'Descreva o objeto da OS...';
    h+='<div class="lbl">'+_dl+'</div>';
    h+='<textarea placeholder="'+_dp+'" style="min-height:80px;margin-bottom:10px;" oninput="F.d.descricao=this.value">'+((d.descricao||''))+'</textarea>';
  }

  c.innerHTML=h;
  if(edif){var eObj2=edifsCom.find(function(x){return x.edif===edif;})||findEdificacaoMeta(reg,comarca,edif);if(eObj2&&eObj2.grp){F.d.grp=eObj2.grp;F.d.polo=eObj2.polo||F.d.polo||'';}}
}


function rFCheck(c){
  /* CRÍTICO: checklist tem muitas seções com overflow:hidden — o flex do fbody
     comprime seções com muito conteúdo. Forçar block layout resolve. */
  c.style.display='block';
  var g=F.d.grp||'B';
  var ms=F.tipo==='periodica'?12:{trimestral:3,semestral:6,anual:12}[F.d.tv||'trimestral'];

  /* ── Itens permitidos por grupo conforme Anexo B ── */
  var grpCOK={'1.1':1,'1.2':1,'1.3':1,'1.4':1,'1.5':1,'1.6':1,'1.7':1,'1.8':1,'1.9':1,'1.11':1,'1.12':1,'1.13':1,
              '2.1':1,'2.2':1,'2.3':1,'2.4':1,'2.5':1,
              '3.2':1,'3.9':1,'3.10':1,'3.12':1,
              '4.5':1,'4.6':1,'4.7':1};
  var grpCPer={'1.1':6,'1.2':6,'1.3':6,'1.4':6,'1.5':12,'1.6':12,'1.7':6,'1.8':12,'1.9':12,'1.11':12,'1.12':12,'1.13':12,
               '2.1':12,'2.2':12,'2.3':0,'2.4':0,'2.5':12,
               '3.2':6,'3.9':6,'3.10':12,'3.12':6,
               '4.5':6,'4.6':12,'4.7':12};

  function itemOK(a){
    if(g==='C')return !!grpCOK[a.id];
    if(g==='B'&&a.id==='1.10')return false;
    return true;
  }
  function pEf(a){
    if(g==='C'){if(a.p===0)return 0;return grpCPer[a.id]!==undefined?grpCPer[a.id]:a.p;}
    return a.p;
  }
  function isDue(a){var pe=pEf(a);return pe===0||pe<=ms;}

  var sistFiltro=g==='C'?['1','2','3','4']:['1','2','3','4','5','6','7'];
  var ss=SIS.filter(function(s){return sistFiltro.indexOf(s.id)>=0;});

  /* ── Pré-passe: inicializa todos os itens ── */
  var gDue=0,gOk=0,gTotal=0;
  ss.forEach(function(s){
    (ATVs[s.id]||[]).forEach(function(a){
      if(!itemOK(a))return;
      gTotal++;
      var k=F.id+'_'+a.id;var due=isDue(a);
      if(!F.itens[k]){
        F.itens[k]={s:'pendente',obs:'',fotos:[],mats:[],n:a.n,nm:a.nm,d:a.d,sk:s.id,sn:s.nm,snn:s.n};
      }
      if(due){
        gDue++;
        var s2=F.itens[k].s;
        if(s2==='conforme'||s2==='nao_conforme'||s2==='nao_aplicavel')gOk++;
      }
    });
  });

  var gPct=gDue?Math.round(gOk/gDue*100):0;
  var tvLabel=F.tipo==='periodica'?'Todos os itens – Anexo B':(F.d.tv||'trimestral');if(F.tipo!=='periodica'){tvLabel=tvLabel.charAt(0).toUpperCase()+tvLabel.slice(1);}

  /* ── Cabeçalho global ── */
  var h='<div style="background:#003580;border-radius:14px;padding:14px;margin-bottom:12px;flex-shrink:0;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
    +'<div><div style="font-size:14px;font-weight:900;color:#fff;">Checklist – Grupo '+g+'</div>'
    +'<div style="font-size:10px;color:rgba(255,255,255,.75);">'+tvLabel+' · '+gOk+'/'+gDue+' devidos avaliados · '+gTotal+' itens total</div></div>'
    +'<span style="background:rgba(255,255,255,.15);color:#fff;padding:5px 14px;border-radius:20px;font-size:15px;font-weight:900;">'+gPct+'%</span></div>'
    +'<div style="background:rgba(255,255,255,.2);border-radius:4px;height:6px;overflow:hidden;">'
    +'<div style="background:#fff;height:100%;width:'+gPct+'%;border-radius:4px;transition:width .4s;"></div></div>'
    +'</div>';

  /* ── Seções ── */
  ss.forEach(function(s){
    var all=(ATVs[s.id]||[]).filter(itemOK);
    if(!all.length)return;

    var sDue=all.filter(isDue);
    var sOut=all.filter(function(a){return!isDue(a);});
    var sDueOk=sDue.filter(function(a){var k=F.id+'_'+a.id;var it=F.itens[k];return it&&(it.s==='conforme'||it.s==='nao_conforme'||it.s==='nao_aplicavel');}).length;
    var pct=sDue.length?Math.round(sDueOk/sDue.length*100):0;
    /* v81-fix: cores claras no cabeçalho — paleta TJMG legível */
    var cor    = pct===100?'#15803d':pct>0?'#1d4ed8':'#1e3a8a';
    var corBg  = pct===100?'#f0fdf4':pct>0?'#eff6ff':'#eff6ff';
    var corBdr = pct===100?'#86efac':pct>0?'#93c5fd':'#93c5fd';

    h+='<div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);flex-shrink:0;">';

    /* Cabeçalho da seção */
    h+='<div style="background:'+corBg+';border-bottom:2px solid '+corBdr+';padding:11px 14px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:13px;font-weight:800;color:'+cor+';line-height:1.3;">'+s.n+' '+s.nm+'</div>'
      +'<div style="font-size:10px;color:#374151;margin-top:2px;font-weight:600;">'
      +sDueOk+'/'+sDue.length+' desta visita'+(sOut.length?' · '+sOut.length+' outro(s) período(s)':'')
      +'</div></div>'
      +'<span style="background:'+cor+';color:#fff;padding:3px 11px;border-radius:12px;font-size:12px;font-weight:900;margin-left:8px;flex-shrink:0;">'+pct+'%</span>'
      +'</div>'
      +(sDue.length?'<div style="background:'+corBdr+';border-radius:3px;height:4px;margin-top:8px;overflow:hidden;"><div style="background:'+cor+';height:100%;width:'+pct+'%;border-radius:3px;"></div></div>':'')
      +'</div>';

    h+='<div>'; /* corpo — sempre visível */

    /* ── Itens DEVIDOS desta visita ── */
    sDue.forEach(function(a){
      var k=F.id+'_'+a.id;var it=F.itens[k];
      var stv=ST[(it&&it.s)||'pendente']||ST.pendente;
      var pe=pEf(a);
      var ex='';
      if(it&&it.fotos&&it.fotos.length)ex+='<span style="font-size:9px;background:#ede9fe;color:#7c3aed;padding:1px 5px;border-radius:6px;margin-right:2px;">📷'+it.fotos.length+'</span>';
      if(it&&it.mats&&it.mats.length)ex+='<span style="font-size:9px;background:#dbeafe;color:#2563eb;padding:1px 5px;border-radius:6px;">🔧'+it.mats.length+'</span>';
      var avaliado=it&&it.s&&it.s!=='pendente';
      h+='<div onclick="openFormItem(\''+k+'\')" style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;touch-action:manipulation;background:'+(avaliado?stv.bg+'55':'#fff')+';">'
        +'<span style="font-size:22px;flex-shrink:0;padding-top:1px;">'+stv.e+'</span>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:2px;line-height:1.35;">'+a.n+' '+a.nm+'</div>'
        +'<div style="font-size:10px;color:#64748b;line-height:1.5;margin-bottom:5px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">'+a.d+'</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;">'
        +'<span style="background:#dbeafe;color:#1e40af;padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">⏱ '+(pe===0?'Sempre':pe+'m')+'</span>'
        +(avaliado?'<span style="background:'+stv.bg+';color:'+stv.c+';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">'+stv.l+'</span>':'')
        +ex+(it&&it.obs?'<span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:6px;font-size:9px;">💬</span>':'')
        +'</div></div>'
        +'<span style="color:#cbd5e1;font-size:18px;flex-shrink:0;align-self:center;">›</span>'
        +'</div>';
    });

    /* ── Itens de OUTROS PERÍODOS — todos visíveis, apenas com fundo diferente ── */
    if(sOut.length){
      h+='<div style="background:#f8fafc;border-top:2px dashed #e2e8f0;padding:6px 14px 2px;">'
        +'<span style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;">Outros períodos — clique para avaliar</span>'
        +'</div>';
      sOut.forEach(function(a){
        var k=F.id+'_'+a.id;var it=F.itens[k];var pe=pEf(a);
        var stv=ST[(it&&it.s)||'fora_periodo']||ST.fora_periodo;
        var avaliado=it&&it.s&&it.s!=='fora_periodo';
        var ex='';
        if(it&&it.fotos&&it.fotos.length)ex+='<span style="font-size:9px;background:#ede9fe;color:#7c3aed;padding:1px 5px;border-radius:6px;margin-right:2px;">📷'+it.fotos.length+'</span>';
        if(it&&it.mats&&it.mats.length)ex+='<span style="font-size:9px;background:#dbeafe;color:#2563eb;padding:1px 5px;border-radius:6px;">🔧'+it.mats.length+'</span>';
        h+='<div onclick="openFormItem(\''+k+'\')" style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;touch-action:manipulation;background:'+(avaliado?stv.bg+'44':'#f8fafc')+';">'
          +'<span style="font-size:20px;flex-shrink:0;padding-top:1px;'+(avaliado?'':'opacity:.45;')+'">'+stv.e+'</span>'
          +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:11px;font-weight:700;color:'+(avaliado?'#1e293b':'#64748b')+';margin-bottom:2px;line-height:1.35;">'+a.n+' '+a.nm+'</div>'
          +'<div style="font-size:10px;color:#94a3b8;line-height:1.4;margin-bottom:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">'+a.d+'</div>'
          +'<div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;">'
          +'<span style="background:#f1f5f9;color:#94a3b8;padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">⏱ '+pe+'m</span>'
          +(avaliado?'<span style="background:'+stv.bg+';color:'+stv.c+';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">'+stv.l+'</span>':'<span style="background:#f1f5f9;color:#94a3b8;padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">Outro período</span>')
          +ex+(it&&it.obs?'<span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:6px;font-size:9px;">💬</span>':'')
          +'</div></div>'
          +'<span style="color:#e2e8f0;font-size:16px;flex-shrink:0;align-self:center;">›</span>'
          +'</div>';
      });
    }

    h+='</div></div>'; /* fecha corpo + seção */
  });

  c.innerHTML=h;
}
function ciclo(k){if(!F.itens[k])return;var cs=['pendente','conforme','nao_conforme','nao_aplicavel'];var ix=cs.indexOf(F.itens[k].s);F.itens[k].s=cs[(ix+1)%cs.length];rFe();}
/* ── Helpers de tipo ── */
function isTipoOSP(){
  if(_eMode==='form')return F.tipo==='osp';
  var _xi=S.insp.find(function(x){return x.id===_eid;});
  return _xi&&_xi.tipo==='osp';
}
function _getTipoAtual(){
  if(_eMode==='form')return F.tipo;
  var _xi=S.insp.find(function(x){return x.id===_eid;});
  return _xi?_xi.tipo:'';
}
function _getStatusOps(tipo){
  if(tipo==='osp')return null;
  if(tipo==='ose')return['executado','nao_executado'];
  if(tipo==='programada')return['conforme','nao_conforme','em_execucao','pendente'];
  return['conforme','nao_conforme','programado','nao_aplicavel','fora_periodo','em_execucao'];
}

/* ── Etapa: Sistemas (OSE / Programada) ── */
function rFSistemas(c){
  c.style.display='block';
  var _cor=TCOR[F.tipo]||'#003580';
  var _lbl=F.tipo==='ose'?'Sistemas envolvidos na emergência':F.tipo==='osp'?'Sistemas envolvidos na OS Programada':'Sistemas do Anexo B envolvidos na OSP';
  var _icons={'1':'🏗️','2':'🚿','3':'🔥','4':'⚡','5':'📡','6':'⚙️','7':'🔴'};
  var h='';
  /* Exibe faixa de OSP vinculada se aplicável */
  if(F._ospVinculada){
    var _ov=S.insp.find(function(x){return x.id===F._ospVinculada;});
    if(_ov){
      h+='<div style="background:#dbeafe;border-radius:10px;padding:10px 14px;margin-bottom:12px;border-left:4px solid #2563eb;display:flex;align-items:center;gap:8px;">'
        +'<span style="font-size:16px;">🔗</span>'
        +'<div style="flex:1;"><div style="font-size:11px;font-weight:800;color:#2563eb;">OSP Vinculada</div>'
        +'<div style="font-size:11px;color:#1e293b;font-weight:600;">'+(_ov.os?_ov.os+' — ':'')+ (_ov.edif||'') + ' · ' + (_ov.com||'')+'</div>'
        +(_ov.descricao?'<div style="font-size:10px;color:#64748b;">'+_ov.descricao+'</div>':'')
        +'</div></div>';
    }
  }
  h+='<div style="font-size:15px;font-weight:800;margin-bottom:6px;">'+_lbl+'</div>'
    +'<div style="font-size:12px;color:#64748b;margin-bottom:16px;">Selecione os sistemas. As atividades aparecem na próxima etapa.</div>';
  SIS.forEach(function(s){
    var sel=(F.sistemas||[]).indexOf(s.id)>=0;
    h+='<div onclick="toggleSis(\''+s.id+'\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;margin-bottom:8px;border-radius:12px;border:2px solid '+(sel?_cor:'#e2e8f0')+';background:'+(sel?'#f0f7ff':'#fff')+';cursor:pointer;touch-action:manipulation;">'
      +'<div style="width:40px;height:40px;border-radius:10px;background:'+(sel?_cor:'#f1f5f9')+';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">'+_icons[s.id]+'</div>'
      +'<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:'+(sel?_cor:'#1e293b')+';">'+s.n+' '+s.nm+'</div>'
      +'<div style="font-size:10px;color:#64748b;margin-top:2px;">'+(ATVs[s.id]||[]).length+' atividades</div></div>'
      +'<div style="width:24px;height:24px;border-radius:50%;border:2px solid '+(sel?_cor:'#e2e8f0')+';background:'+(sel?_cor:'#fff')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900;flex-shrink:0;">'+(sel?'✓':'')+'</div></div>';
  });
  if(!(F.sistemas||[]).length)h+='<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;font-size:12px;color:#92400e;">⚠️ Selecione ao menos um sistema para continuar.</div>';
  c.innerHTML=h;
}
function toggleSis(id){
  F.sistemas=F.sistemas||[];
  var ix=F.sistemas.indexOf(id);
  if(ix>=0)F.sistemas.splice(ix,1);else F.sistemas.push(id);
  rFe();
}

/* ── Etapa: Atividades por sistema (OSE / Programada) ── */
/* ── Etapa: Seleção de Atividades (OSE / Programada) ── */
function rFSelAtiv(c){
  c.style.display='block';
  var _cor=TCOR[F.tipo]||'#003580';
  var _sis=F.sistemas||[];
  if(!_sis.length){
    c.innerHTML='<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;">⚠️</div><div style="font-size:14px;color:#64748b;margin-top:12px;">Nenhum sistema selecionado.<br>Volte e selecione ao menos um.</div></div>';
    return;
  }
  if(!F.ativSel||typeof F.ativSel!=='object')F.ativSel={};
  var _sel=SIS.filter(function(s){return _sis.indexOf(s.id)>=0;});
  var _total=0,_marcadas=0;
  _sel.forEach(function(s){(ATVs[s.id]||[]).forEach(function(){_total++;});});
  Object.keys(F.ativSel).forEach(function(k){if(F.ativSel[k])_marcadas++;});

  var h='<div style="background:'+_cor+';border-radius:14px;padding:14px;margin-bottom:12px;">'
    +'<div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:2px;">Selecione as atividades da OS</div>'
    +'<div style="font-size:10px;color:rgba(255,255,255,.8);">'+_marcadas+' marcada(s) de '+_total+' disponível(is) · marque as que constam na ordem de serviço</div>'
    +'</div>';

  _sel.forEach(function(s){
    var _ativs=ATVs[s.id]||[];
    if(!_ativs.length)return;
    var _smarcadas=_ativs.filter(function(a){return !!F.ativSel[a.id];}).length;
    h+='<div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);">';
    /* Cabeçalho sistema */
    h+='<div style="background:'+_cor+';padding:11px 14px;display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="flex:1;">'
      +'<div style="font-size:13px;font-weight:800;color:#fff;">'+s.n+' '+s.nm+'</div>'
      +'<div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px;">'+_smarcadas+'/'+_ativs.length+' selecionadas</div>'
      +'</div>'
      /* Botão selecionar/desselecionar tudo */
      +'<button onclick="(function(){'
        +'var _all='+JSON.stringify(_ativs.map(function(a){return a.id;}))+';'
        +'var _allSel=_all.every(function(id){return !!F.ativSel[id];});'
        +'if(!F.ativSel)F.ativSel={};'
        +'_all.forEach(function(id){F.ativSel[id]=!_allSel;});'
        +'rFe();'
      +'})()" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:5px 10px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;flex-shrink:0;">'
      +(_smarcadas===_ativs.length?'Desmarcar todos':'Selecionar todos')
      +'</button>'
      +'</div>';

    /* Lista de atividades com checkbox */
    h+='<div>';
    _ativs.forEach(function(a,ix){
      var _checked=!!F.ativSel[a.id];
      h+='<div onclick="if(!F.ativSel)F.ativSel={};F.ativSel[\''+a.id+'\']=!F.ativSel[\''+a.id+'\'];rFe();" '
        +'style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;background:'+(_checked?_cor+'11':'#fff')+';touch-action:manipulation;">'
        /* Checkbox visual */
        +'<div style="flex-shrink:0;width:22px;height:22px;border-radius:6px;border:2px solid '+(_checked?_cor:'#cbd5e1')+';background:'+(_checked?_cor:'#fff')+';display:flex;align-items:center;justify-content:center;margin-top:2px;">'
        +(_checked?'<span style="color:#fff;font-size:13px;font-weight:900;">✓</span>':'')
        +'</div>'
        /* Conteúdo */
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:12px;font-weight:'+(_checked?'800':'600')+';color:'+(_checked?'#1e293b':'#64748b')+';line-height:1.35;margin-bottom:2px;">'+a.n+' '+a.nm+'</div>'
        +'<div style="font-size:10px;color:#94a3b8;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">'+a.d+'</div>'
        +'</div>'
        +'</div>';
    });
    h+='</div></div>';
  });
  c.innerHTML=h;
}

function rFAtiv(c){
  c.style.display='block';
  var _cor=TCOR[F.tipo]||'#003580';
  var _sis=F.sistemas||[];
  if(!_sis.length){
    c.innerHTML='<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;">⚠️</div><div style="font-size:14px;color:#64748b;margin-top:12px;">Nenhum sistema selecionado.<br>Volte e selecione ao menos um.</div></div>';
    return;
  }
  if(!F.ativSel||typeof F.ativSel!=='object')F.ativSel={};
  var _sel=SIS.filter(function(s){return _sis.indexOf(s.id)>=0;});

  /* Inicializa itens: selecionados=pendente, não selecionados=nao_aplicavel */
  _sel.forEach(function(s){
    (ATVs[s.id]||[]).forEach(function(a){
      var k=F.id+'_'+a.id;
      var _isSel=!!F.ativSel[a.id];
      if(!F.itens[k]){
        F.itens[k]={s:_isSel?'pendente':'nao_aplicavel',obs:'',fotos:[],mats:[],n:a.n,nm:a.nm,d:a.d,sk:s.id,sn:s.nm,snn:s.n};
      } else if(F.itens[k].s==='nao_aplicavel'&&_isSel){
        /* Usuário marcou depois de ter salvo como n/a — reabre */
        F.itens[k].s='pendente';
      }
    });
  });

  /* Conta só os selecionados */
  var _tot=0,_exec=0,_nexec=0;
  _sel.forEach(function(s){
    (ATVs[s.id]||[]).forEach(function(a){
      if(!F.ativSel[a.id])return;
      var _it=F.itens[F.id+'_'+a.id];
      _tot++;
      if(_it&&_it.s==='executado')_exec++;
      else if(_it&&_it.s==='nao_executado')_nexec++;
    });
  });

  if(!_tot){
    c.innerHTML='<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;">📋</div><div style="font-size:14px;color:#64748b;margin-top:12px;">Nenhuma atividade selecionada.<br>Volte à etapa anterior e marque as atividades da OS.</div></div>';
    return;
  }

  var _pG=_tot?Math.round(_exec/_tot*100):0;
  var h='<div style="background:'+_cor+';border-radius:14px;padding:14px;margin-bottom:12px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
    +'<div><div style="font-size:13px;font-weight:900;color:#fff;">'+_tot+' atividade(s) da OS</div>'
    +'<div style="font-size:10px;color:rgba(255,255,255,.75);">'+_exec+' exec. · '+_nexec+' não exec. · '+(_tot-_exec-_nexec)+' pendente(s)</div></div>'
    +'<span style="background:rgba(255,255,255,.2);color:#fff;padding:5px 14px;border-radius:20px;font-size:15px;font-weight:900;">'+_pG+'%</span></div>'
    +'<div style="background:rgba(255,255,255,.2);border-radius:4px;height:6px;overflow:hidden;">'
    +'<div style="background:#fff;height:100%;width:'+_pG+'%;border-radius:4px;transition:width .4s;"></div></div></div>';

  _sel.forEach(function(s){
    var _ativs=(ATVs[s.id]||[]).filter(function(a){return !!F.ativSel[a.id];});
    if(!_ativs.length)return;
    var _sExec=_ativs.filter(function(a){var _it=F.itens[F.id+'_'+a.id];return _it&&_it.s==='executado';}).length;
    var _sP=_ativs.length?Math.round(_sExec/_ativs.length*100):0;
    var _sC=_sP===100?'#16a34a':_sP>0?'#2563eb':_cor;
    h+='<div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);">'
      +'<div style="background:'+_sC+';padding:11px 14px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#fff;">'+s.n+' '+s.nm+'</div>'
      +'<div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px;">'+_sExec+'/'+_ativs.length+' executadas</div></div>'
      +'<span style="background:rgba(255,255,255,.2);color:#fff;padding:3px 11px;border-radius:12px;font-size:12px;font-weight:900;margin-left:8px;">'+_sP+'%</span></div>'
      +(_ativs.length?'<div style="background:rgba(255,255,255,.25);border-radius:3px;height:4px;margin-top:8px;overflow:hidden;"><div style="background:#fff;height:100%;width:'+_sP+'%;border-radius:3px;"></div></div>':'')
      +'</div><div>';
    _ativs.forEach(function(a){
      var k=F.id+'_'+a.id;var _it=F.itens[k];
      var stv=ST[(_it&&_it.s)||'pendente']||ST.pendente;
      var _av=_it&&_it.s&&_it.s!=='pendente';
      var _isOSPForm=(F.tipo==='osp');
      var _ex='';
      if(_it&&_it.fotos&&_it.fotos.length)_ex+='<span style="font-size:9px;background:#ede9fe;color:#7c3aed;padding:1px 5px;border-radius:6px;margin-right:2px;">📷'+_it.fotos.length+'</span>';
      if(_it&&_it.mats&&_it.mats.length)_ex+='<span style="font-size:9px;background:#dbeafe;color:#2563eb;padding:1px 5px;border-radius:6px;">🔧'+_it.mats.length+'</span>';
      h+='<div onclick="openFormItem(\''+k+'\')" style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;touch-action:manipulation;background:'+(_av?stv.bg+'55':'#fff')+';">'
        +'<span style="font-size:22px;flex-shrink:0;padding-top:1px;">'+stv.e+'</span>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:2px;line-height:1.35;">'+a.n+' '+a.nm+'</div>'
        +'<div style="font-size:10px;color:#64748b;line-height:1.5;margin-bottom:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">'+a.d+'</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;">'
        +(_av?'<span style="background:'+stv.bg+';color:'+stv.c+';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">'+stv.l+'</span>':(F.tipo==='osp'?'<span style="background:#ccfbf1;color:#0f766e;padding:1px 7px;border-radius:10px;font-size:9px;">Toque para observar</span>':'<span style="background:#f1f5f9;color:#94a3b8;padding:1px 7px;border-radius:10px;font-size:9px;">Toque para avaliar</span>'))
        +_ex+(_it&&_it.obs?'<span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:6px;font-size:9px;">💬</span>':'')
        +'</div></div><span style="color:#cbd5e1;font-size:18px;flex-shrink:0;align-self:center;">›</span></div>';
    });
    h+='</div></div>';
  });
  c.innerHTML=h;
}
function rFFach(c){
  var FS=[{id:'FR',n:'Fachada Frontal'},{id:'LD',n:'Lateral Direita'},{id:'LE',n:'Lateral Esquerda'},{id:'FU',n:'Fundos'}];
  var h='<div style="font-size:15px;font-weight:800;margin-bottom:12px;">Inspecao das Fachadas</div>';
  FS.forEach(function(fach){
    var df=F.fach[fach.id];
    h+='<div class="fcard" style="border-color:'+(df.nc?'#dc2626':'#e2e8f0')+'">';
    h+='<div class="fhdr" style="'+(df.nc?'background:#fff5f5;':'')+'" onclick="this.nextSibling.style.display=this.nextSibling.style.display===\'none\'?\'block\':\'none\';">';
    h+='<div style="width:32px;height:32px;border-radius:8px;background:'+(df.nc?'#fee2e2':'#ede9fe')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:'+(df.nc?'#dc2626':'#7c3aed')+';">'+fach.id+'</div>';
    h+='<div style="flex:1;font-size:13px;font-weight:700;">'+fach.n+'</div>';
    if(df.nc)h+='<span style="color:#dc2626;font-size:11px;font-weight:700;">NC</span>';
    h+='<span style="color:#94a3b8;font-size:11px;">&#9660;</span></div>';
    h+='<div style="display:block;padding:10px;border-top:1px solid #f8fafc;">';
    h+='<textarea placeholder="Observacoes..." style="min-height:52px;margin-bottom:8px;" oninput="F.fach[\''+fach.id+'\'].obs=this.value">'+df.obs+'</textarea>';
    h+='<button onclick="F.fach[\''+fach.id+'\'].nc=!F.fach[\''+fach.id+'\'].nc;rFe()" style="width:100%;margin-bottom:8px;padding:9px;border:1.5px solid '+(df.nc?'#fff':'#dc2626')+';border-radius:8px;background:'+(df.nc?'#dc2626':'#fff')+';color:'+(df.nc?'#fff':'#dc2626')+';font-size:12px;font-weight:700;cursor:pointer;">'+(df.nc?'NC ativo - clique para remover':'+ Marcar Nao Conforme')+'</button>';
    if(df.nc)h+='<textarea placeholder="Descreva..." style="min-height:52px;border-color:#dc2626;" oninput="F.fach[\''+fach.id+'\'].nd=this.value">'+df.nd+'</textarea>';
    h+='</div></div>';
  });
  c.innerHTML=h;
}
function rFSPDAi(c){
  var items=['Malha de captacao presente','Acessar telhado possivel','Para-raios tipo Franklin','Cabo de cobre','Barra chata','Pontos de oxidacao','Descidas em bom estado','Caixas de inspecao OK','Possui BEP','BEP em bom estado'];
  var h='<div style="font-size:14px;font-weight:800;margin-bottom:10px;">Inspecao Visual</div><div style="font-size:13px;font-weight:700;margin-bottom:8px;">Checklist</div><div class="card" style="padding:4px 12px;">';
  items.forEach(function(item,ix){var v=F.schk[ix]||{s:null};h+='<div style="display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid #f8fafc;"><div style="flex:3;font-size:11px;">'+item+'</div><button onclick="F.schk['+ix+']={s:\'sim\'};rFe()" style="flex:1;border:none;border-radius:6px;padding:5px;font-size:11px;font-weight:700;cursor:pointer;background:'+(v.s==='sim'?'#16a34a':'#f1f5f9')+';color:'+(v.s==='sim'?'#fff':'#64748b')+';">SIM</button><button onclick="F.schk['+ix+']={s:\'nao\'};rFe()" style="flex:1;border:none;border-radius:6px;padding:5px;font-size:11px;font-weight:700;cursor:pointer;background:'+(v.s==='nao'?'#dc2626':'#f1f5f9')+';color:'+(v.s==='nao'?'#fff':'#64748b')+';">NAO</button></div>';});
  h+='</div>';c.innerHTML=h;
}
function rFSPDAm(c){
  var ps=[{id:'p1',n:'P1 - Descida 1',l:1000},{id:'p2',n:'P2 - Descida 2',l:1000},{id:'p3',n:'P3 - Descida 3',l:1000},{id:'bep',n:'BEP',l:200}];
  var h='<div style="font-size:14px;font-weight:800;margin-bottom:10px;">Medicoes (mOhm)</div>';
  ps.forEach(function(p){
    var vl=parseFloat(F.med[p.id]||'');var ok=!isNaN(vl)&&vl<=p.l;var nc=!isNaN(vl)&&vl>p.l;
    h+='<div class="card" style="border-left:4px solid '+(nc?'#dc2626':ok?'#16a34a':'#e2e8f0')+';margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:6px;"><div style="font-size:12px;font-weight:700;">'+p.n+'</div><div style="font-size:10px;color:#64748b;">Limite: le '+p.l+' mOhm</div></div><input type="number" step="0.1" placeholder="0.0" value="'+(F.med[p.id]||'')+'" style="font-size:26px;font-weight:900;text-align:center;border-color:'+(nc?'#dc2626':ok?'#16a34a':'#e2e8f0')+';border-width:2px;margin-bottom:4px;" oninput="F.med[\''+p.id+'\' ]=this.value;rFe()"><div style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:4px;">mOhm</div>'+((!isNaN(vl))?'<div style="text-align:center;"><span style="background:'+(ok?'#dcfce7':'#fee2e2')+';color:'+(ok?'#16a34a':'#dc2626')+';padding:4px 14px;border-radius:20px;font-size:11px;font-weight:800;">'+(ok?'Conforme':'Nao Conforme')+'</span></div>':'')+'</div>';
  });c.innerHTML=h;
}


/* ── MATS Programada (Anexo D – itens 4.x com BDI) ── */
var MATS_PROG=[
{c:'4.1.1.1',d:'Retirada telha fibrocimento, kalhetão e metálica',u:'M2'},
{c:'4.1.1.2',d:'Retirada telha cerâmica',u:'M2'},
{c:'4.1.1.3',d:'Retirada chapa policarbonato',u:'M2'},
{c:'4.1.1.4',d:'Retirada rufo e chapim',u:'M'},
{c:'4.1.1.5',d:'Retirada cumeeira e calha',u:'M'},
{c:'4.1.1.6',d:'Retirada engradamento madeira telha cerâmica',u:'M2'},
{c:'4.1.1.7',d:'Retirada engradamento madeira telha fibrocimento',u:'M2'},
{c:'4.1.1.8',d:'Retirada ripa em madeira',u:'M'},
{c:'4.1.2.1',d:'Retirada forro de madeira',u:'M2'},
{c:'4.1.2.2',d:'Demolição forro de gesso',u:'M2'},
{c:'4.1.3.1',d:'Retirada revestimento melamínico',u:'M2'},
{c:'4.1.3.2',d:'Demolição revestimento pedra (granito/mármore/ardósia)',u:'M2'},
{c:'4.1.3.3',d:'Demolição revestimento cerâmico',u:'M2'},
{c:'4.1.3.4',d:'Demolição de alvenaria',u:'M3'},
{c:'4.1.3.5',d:'Demolição reboco/emboço',u:'M2'},
{c:'4.1.3.6',d:'Retirada manta asfáltica em reservatório de concreto',u:'M2'},
{c:'4.1.4.1',d:'Retirada esquadria metálica',u:'M2'},
{c:'4.1.4.2',d:'Retirada esquadria em madeira',u:'M2'},
{c:'4.1.4.3',d:'Retirada porta em madeira',u:'M2'},
{c:'4.1.4.4',d:'Retirada divisória',u:'M2'},
{c:'4.1.4.5',d:'Retirada vidro em esquadria',u:'M2'},
{c:'4.1.5.1',d:'Retirada piso bloquete/intertravado',u:'M2'},
{c:'4.1.5.2',d:'Retirada piso taco de madeira',u:'M2'},
{c:'4.1.5.3',d:'Demolição piso cerâmico',u:'M2'},
{c:'4.1.5.4',d:'Demolição piso vinílico',u:'M2'},
{c:'4.1.5.5',d:'Demolição piso em pedras',u:'M2'},
{c:'4.1.5.6',d:'Demolição contrapiso',u:'M2'},
{c:'4.1.5.7',d:'Demolição piso em concreto',u:'M2'},
{c:'4.1.6.1',d:'Retirada vaso sanitário',u:'UN'},
{c:'4.1.6.2',d:'Retirada mictório',u:'UN'},
{c:'4.1.6.3',d:'Retirada lavatório/tanque',u:'UN'},
{c:'4.1.7.1',d:'Telha fibrocimento E=6mm',u:'M2'},
{c:'4.1.7.2',d:'Telha fibrocimento E=8mm',u:'M2'},
{c:'4.1.7.3',d:'Telha fibrocimento kalhetão E=8mm',u:'M2'},
{c:'4.1.7.4',d:'Telha cerâmica',u:'M2'},
{c:'4.1.7.5',d:'Telha metálica zincada E=0,65mm',u:'M2'},
{c:'4.1.7.6',d:'Telha metálica sanduíche PU',u:'M2'},
{c:'4.1.7.7',d:'Telha translúcida polipropileno E=1,1mm',u:'M2'},
{c:'4.1.7.8',d:'Chapa policarbonato alveolar E=10mm',u:'M2'},
{c:'4.1.7.9',d:'Cumeeira fibrocimento E=6mm',u:'M'},
{c:'4.1.7.10',d:'Cumeeira fibrocimento E=8mm',u:'M'},
{c:'4.1.7.13',d:'Rufo em fibrocimento E=6mm',u:'M'},
{c:'4.1.7.14',d:'Rufo/contra rufo galvanizado desen.35cm',u:'M'},
{c:'4.1.7.15',d:'Calha galvanizada desen.75cm',u:'M'},
{c:'4.1.7.16',d:'Chapim galvanizado desen.55cm',u:'M'},
{c:'4.1.7.18',d:'Engradamento madeira telha cerâmica',u:'M2'},
{c:'4.1.7.19',d:'Engradamento madeira telha fibrocimento',u:'M2'},
{c:'4.1.7.20',d:'Engradamento metálico aço estrutural',u:'M2'},
{c:'4.1.7.21',d:'Ripa de madeira para telha cerâmica',u:'M'},
{c:'4.1.7.22',d:'Lona impermeável antichama anti-mofo toldo',u:'M2'},
{c:'4.1.7.24',d:'Espícula anti-pombo policarbonato',u:'M'},
{c:'4.1.8.1',d:'Impermeabilização argamassa polimérica',u:'M2'},
{c:'4.1.8.2',d:'Impermeabilização manta asfáltica aluminizada E=3mm',u:'M2'},
{c:'4.1.8.3',d:'Impermeabilização manta asfáltica armada E=4mm',u:'M2'},
{c:'4.1.8.4',d:'Impermeabilização manta líquida acrílica',u:'M2'},
{c:'4.1.8.5',d:'Camada regularização sob impermeabilização E=3cm',u:'M2'},
{c:'4.1.8.6',d:'Camada proteção mecânica sobre impermeabilização E=3cm',u:'M2'},
{c:'4.1.8.8',d:'Manta térmica telhado 2 faces refletividade ≥90%',u:'M2'},
{c:'4.1.9.1',d:'Forro gesso acartonado',u:'M2'},
{c:'4.1.9.2',d:'Forro gesso em placa 60x60cm',u:'M2'},
{c:'4.1.9.3',d:'Forro régua madeira angelim L=10cm',u:'M2'},
{c:'4.1.9.4',d:'Placa forro fibra mineral E=14mm NRC≥0,70',u:'M2'},
{c:'4.1.10.1',d:'Alvenaria tijolo cerâmico furado E=9cm',u:'M2'},
{c:'4.1.10.2',d:'Alvenaria tijolo cerâmico furado E=14cm',u:'M2'},
{c:'4.1.10.3',d:'Alvenaria bloco concreto E=14cm',u:'M2'},
{c:'4.1.10.4',d:'Execução chapisco',u:'M2'},
{c:'4.1.10.6',d:'Execução reboco',u:'M2'},
{c:'4.1.10.7',d:'Revestimento cerâmico',u:'M2'},
{c:'4.1.10.8',d:'Revestimento granito E=2cm',u:'M2'},
{c:'4.1.10.10',d:'Revestimento laminado decorativo alta pressão',u:'M2'},
{c:'4.1.10.12',d:'Parede gesso dry-wall tipo ST (seco)',u:'M2'},
{c:'4.1.10.13',d:'Parede gesso dry-wall tipo RU (úmido)',u:'M2'},
{c:'4.1.10.14',d:'Divisória antichama E=35mm',u:'M2'},
{c:'4.1.10.15',d:'Porta completa divisória painel antichama c/ fechadura',u:'UN'},
{c:'4.1.10.16',d:'Bancada granito incl. testeira e rodabanca',u:'M2'},
{c:'4.1.10.19',d:'Tratamento trinca alvenaria c/ tela galvanizada',u:'M'},
{c:'4.1.11.1',d:'Porta veneziana em alumínio',u:'M2'},
{c:'4.1.11.2',d:'Janela máximo-ar em alumínio',u:'M2'},
{c:'4.1.11.3',d:'Suporte alumínio ar condicionado janela',u:'UN'},
{c:'4.1.11.4',d:'Braço articulado alumínio janela máximo-ar',u:'UN'},
{c:'4.1.11.9',d:'Brise microperfurado 60° inclusive porta painel',u:'M2'},
{c:'4.1.12.1',d:'Grade proteção ferro 15x30cm',u:'M2'},
{c:'4.1.12.4',d:'Guarda-corpo metálico aço pintado H=1,10m',u:'M'},
{c:'4.1.12.5',d:'Corrimão aço pintado 1½"',u:'M'},
{c:'4.1.12.6',d:'Guarda-corpo inox sem corrimão H=110cm',u:'M'},
{c:'4.1.12.7',d:'Corrimão inox',u:'M'},
{c:'4.1.12.8',d:'Escada áreas internas',u:'M'},
{c:'4.1.12.9',d:'Escada marinheiro externa com gaiola',u:'M'},
{c:'4.1.12.10',d:'Alçapão metálico 65x65cm',u:'UN'},
{c:'4.1.12.12',d:'Tampa metálica chapa xadrez galvanizada E=6mm',u:'M2'},
{c:'4.1.13.1',d:'Porta sólida 82x210/80x210cm com marco, alizares e ferragens',u:'UN'},
{c:'4.1.13.2.1',d:'Porta prancheta 60x210cm',u:'UN'},
{c:'4.1.13.2.2',d:'Porta prancheta 70x210cm',u:'UN'},
{c:'4.1.13.2.3',d:'Porta prancheta 80x210cm',u:'UN'},
{c:'4.1.13.2.4',d:'Porta prancheta 90x210cm',u:'UN'},
{c:'4.1.13.2.6',d:'Porta MDF fórmica c/ fecho livre/ocupado',u:'UN'},
{c:'4.1.13.2.7',d:'Alizar madeira L=7cm',u:'M'},
{c:'4.1.13.2.8',d:'Marco madeira ajustável L=14-18cm',u:'UN'},
{c:'4.1.14.1',d:'Fechadura reforçada cromada',u:'UN'},
{c:'4.1.14.2',d:'Fechadura interna simples',u:'UN'},
{c:'4.1.14.3',d:'Trinco latão 50mm',u:'UN'},
{c:'4.1.14.6',d:'Dobradiça aço',u:'CJ'},
{c:'4.1.14.7',d:'Trilho aço',u:'M'},
{c:'4.1.14.8',d:'Guia aço',u:'M'},
{c:'4.1.14.9',d:'Roldana aço 2"',u:'UN'},
{c:'4.1.14.13',d:'Veda-porta',u:'UN'},
{c:'4.1.14.14',d:'Mola hidráulica aérea porta madeira',u:'UN'},
{c:'4.1.15.1',d:'Aplicação fundo preparador',u:'M2'},
{c:'4.1.15.2',d:'Aplicação selador acrílico',u:'M2'},
{c:'4.1.15.3',d:'Emassamento base PVA (massa corrida)',u:'M2'},
{c:'4.1.15.4',d:'Emassamento base acrílica',u:'M2'},
{c:'4.1.15.5',d:'Textura acrílica tipo grafiato',u:'M2'},
{c:'4.1.15.6',d:'Pintura interna acrílica (alvenaria)',u:'M2'},
{c:'4.1.15.7',d:'Pintura interna acrílica (teto)',u:'M2'},
{c:'4.1.15.8',d:'Pintura externa acrílica',u:'M2'},
{c:'4.1.15.11',d:'Pintura esmalte sintético esquadria madeira',u:'M2'},
{c:'4.1.15.12',d:'Pintura esmalte sintético esquadria metálica',u:'M2'},
{c:'4.1.15.13',d:'Fundo anticorrosivo superfície metálica',u:'M2'},
{c:'4.1.15.14',d:'Verniz esquadria madeira',u:'M2'},
{c:'4.1.16.1',d:'Contrapiso E=3cm',u:'M2'},
{c:'4.1.16.2',d:'Piso cimentado natado E=3cm',u:'M2'},
{c:'4.1.16.3',d:'Piso concreto FCK≥15MPA E=10cm',u:'M2'},
{c:'4.1.16.7',d:'Piso elevado monolítico massa autonivelante',u:'M2'},
{c:'4.1.16.8',d:'Piso cerâmico',u:'M2'},
{c:'4.1.16.9',d:'Piso porcelanato',u:'M2'},
{c:'4.1.16.11',d:'Piso granito E=2cm',u:'M2'},
{c:'4.1.16.16',d:'Piso vinílico E=2mm',u:'M2'},
{c:'4.1.16.17',d:'Piso vinílico réguas padrão amadeirado',u:'M2'},
{c:'4.1.16.22',d:'Rodapé madeira H=7cm',u:'M'},
{c:'4.1.16.23',d:'Rodapé cerâmica H=7cm',u:'M'},
{c:'4.1.16.24',d:'Rodapé porcelanato H=10cm',u:'M'},
{c:'4.1.16.28',d:'Soleira granito',u:'M2'},
{c:'4.1.16.33',d:'Raspação, calafetação e sinteco piso madeira',u:'M2'},
{c:'4.1.17.1',d:'Hidrojateamento',u:'M2'},
{c:'4.1.17.4',d:'Tapume compensado resinado E=14mm H=2,20m',u:'M2'},
{c:'4.2.1.1',d:'Registro gaveta bruto 3/4"',u:'UN'},
{c:'4.2.1.2',d:'Registro gaveta bruto 1"',u:'UN'},
{c:'4.2.1.3',d:'Registro gaveta bruto 1¼"',u:'UN'},
{c:'4.2.1.4',d:'Registro gaveta bruto 1½"',u:'UN'},
{c:'4.2.4',d:'Válvula descarga 1½"',u:'UN'},
{c:'4.2.8',d:'Válvula descarga mictório anti-vandalismo 3/4"',u:'UN'},
{c:'4.2.11',d:'Válvula escoamento cromada lavatório',u:'UN'},
{c:'4.2.14',d:'Torneira lavatório mesa cromada ½"',u:'UN'},
{c:'4.2.15',d:'Torneira pressão lavatório anti-vandalismo ½"',u:'UN'},
{c:'4.2.16',d:'Torneira pressão pia parede cromada ½"',u:'UN'},
{c:'4.2.21',d:'Mictório c/ sifão integrado',u:'UN'},
{c:'4.2.22',d:'Bacia sanitária sifonada convencional',u:'UN'},
{c:'4.2.23',d:'Bacia sanitária para caixa acoplada',u:'UN'},
{c:'4.2.24',d:'Bacia sanitária deficiente físico',u:'UN'},
{c:'4.2.26',d:'Caixa acoplada à bacia sanitária',u:'UN'},
{c:'4.2.27',d:'Lavatório louça sem coluna',u:'UN'},
{c:'4.2.28',d:'Lavatório com coluna suspensa',u:'UN'},
{c:'4.2.30',d:'Tanque cerâmico com coluna',u:'UN'},
{c:'4.2.31',d:'Ducha higiênica manual registro ½" 1,20m',u:'UN'},
{c:'4.2.33',d:'Kit reparo descarga caixa acoplada',u:'UN'},
{c:'4.2.37.1',d:'Tubo PVC soldável água fria Ø20mm c/ conexões',u:'M'},
{c:'4.2.37.2',d:'Tubo PVC soldável água fria Ø25mm c/ conexões',u:'M'},
{c:'4.2.37.3',d:'Tubo PVC soldável água fria Ø32mm c/ conexões',u:'M'},
{c:'4.2.37.4',d:'Tubo PVC soldável água fria Ø50mm c/ conexões',u:'M'},
{c:'4.2.38.1',d:'Tubo PVC esgoto/pluvial Ø40mm c/ conexões',u:'M'},
{c:'4.2.38.2',d:'Tubo PVC esgoto/pluvial Ø50mm c/ conexões',u:'M'},
{c:'4.2.38.3',d:'Tubo PVC esgoto/pluvial Ø75mm c/ conexões',u:'M'},
{c:'4.2.38.4',d:'Tubo PVC esgoto/pluvial Ø100mm c/ conexões',u:'M'},
{c:'4.2.46.1',d:'Caixa d\'água polietileno 500L',u:'UN'},
{c:'4.2.46.2',d:'Caixa d\'água polietileno 1000L',u:'UN'},
{c:'4.2.52',d:'Caixa inspeção esgoto 60x60 ferro fundido',u:'UN'},
{c:'4.3.1.7',d:'No-Break 1000-1200VA',u:'UN'},
{c:'4.3.1.10.1',d:'Transformador óleo 150KVA trifásico 13,8/0,22kV',u:'UN'},
{c:'4.3.1.10.2',d:'Transformador óleo 300KVA trifásico 13,8/0,22kV',u:'UN'},
{c:'4.3.3.1.1',d:'Disjuntor monopolar DIN 16A curva C 3kA',u:'UN'},
{c:'4.3.3.1.2',d:'Disjuntor monopolar DIN 20A curva C 3kA',u:'UN'},
{c:'4.3.3.3.1',d:'Disjuntor bipolar DIN 2x20A curva C 3kA',u:'UN'},
{c:'4.3.3.5.1',d:'Disjuntor tripolar DIN 3x40A curva C 5kA',u:'UN'},
{c:'4.3.3.6.1',d:'Disjuntor tripolar DIN 3x80A 10kA',u:'UN'},
{c:'4.3.3.6.2',d:'Disjuntor tripolar DIN 3x100A 10kA',u:'UN'},
{c:'4.3.3.6.3',d:'Disjuntor tripolar DIN 3x125A 10kA',u:'UN'},
{c:'4.3.3.7.1',d:'Disjuntor tripolar caixa moldada 3x160A 65kA',u:'UN'},
{c:'4.3.3.21',d:'QDC sobrepor trifásico 44 pos. monop. 100A',u:'UN'},
{c:'4.3.3.22',d:'QDC sobrepor trifásico 70 pos. monop. 225A',u:'UN'},
{c:'4.3.4.1.1',d:'Cabo cobre flexível 450/750V #2,5mm²',u:'M'},
{c:'4.3.4.1.2',d:'Cabo cobre flexível 450/750V #4,0mm²',u:'M'},
{c:'4.3.4.1.3',d:'Cabo cobre flexível 450/750V #6,0mm²',u:'M'},
{c:'4.3.4.1.4',d:'Cabo cobre flexível 450/750V #10mm²',u:'M'},
{c:'4.3.4.1.5',d:'Cabo cobre flexível 450/750V #16mm²',u:'M'},
{c:'4.3.5.1.1',d:'Eletroduto aço carbono 3/4" c/ acessórios',u:'M'},
{c:'4.3.5.1.2',d:'Eletroduto aço carbono 1" c/ acessórios',u:'M'},
{c:'4.3.5.3.1',d:'Eletroduto PVC rígido rosqueável 3/4"',u:'M'},
{c:'4.3.5.3.2',d:'Eletroduto PVC rígido rosqueável 1"',u:'M'},
{c:'4.3.6.1',d:'Interruptor 1 tecla simples 10A/250V',u:'UN'},
{c:'4.3.6.8',d:'Tomada padrão brasileiro 20A NBR14136',u:'UN'},
{c:'4.3.7.1.1',d:'Luminária sobrepor 2 lâmpadas T8 60cm',u:'UN'},
{c:'4.3.7.1.2',d:'Luminária sobrepor 2 lâmpadas T8 120cm',u:'UN'},
{c:'4.3.7.2.2',d:'Luminária embutir 2 lâmpadas T8 120cm',u:'UN'},
{c:'4.3.7.7',d:'Projetor LED 50W IP65',u:'UN'},
{c:'4.3.7.8',d:'Projetor LED 100W IP65',u:'UN'},
{c:'4.3.7.9',d:'Projetor LED 200W IP65',u:'UN'},
{c:'4.3.7.10',d:'Poste aço galvanizado reto 3m chumbado',u:'UN'},
{c:'4.3.7.11',d:'Poste aço galvanizado reto 6m',u:'UN'},
{c:'4.3.8.6',d:'Lâmpada LED tubular T8 11W base G13',u:'UN'},
{c:'4.3.8.7',d:'Lâmpada LED tubular T8 20W base G13',u:'UN'},
{c:'4.3.8.8',d:'Lâmpada bulbo LED 7W base E27',u:'UN'},
{c:'4.3.8.9',d:'Lâmpada bulbo LED 11W base E27',u:'UN'},
{c:'4.4.1.1',d:'Extintor CO2 6kg',u:'UN'},
{c:'4.4.1.2',d:'Extintor ABC 8kg',u:'UN'},
{c:'4.4.1.3',d:'Extintor sobre rodas BC 50kg',u:'UN'},
{c:'4.4.1.4',d:'Abrigo metálico extintor ≥10kg vermelho',u:'UN'},
{c:'4.4.2.1',d:'Mangueira incêndio NBR11861 tipo 2 Ø1½" 15m',u:'UN'},
{c:'4.4.2.2',d:'Mangueira incêndio NBR11861 tipo 2 Ø1½" 20m',u:'UN'},
{c:'4.4.2.3',d:'Mangueira incêndio NBR11861 tipo 2 Ø2½" 15m',u:'UN'},
{c:'4.4.2.11',d:'Registro globo angular hidrante 45° 2½"',u:'UN'},
{c:'4.4.3.4',d:'Central alarme incêndio endereçável classe B 100 disp.',u:'UN'},
{c:'4.4.4.1',d:'Dobradiça porta corta-fogo',u:'UN'},
{c:'4.4.4.2',d:'Fechadura porta corta-fogo',u:'UN'},
{c:'4.4.5.1',d:'Central iluminação emergência 24Vcc 1800W',u:'UN'},
{c:'4.4.5.2',d:'Luminária emergência LED 24V',u:'UN'},
{c:'4.5.1.1',d:'Bomba centrífuga trifásica 1,5CV 220V vazão mín.9900L/h',u:'UN'},
{c:'4.5.1.2',d:'Bomba centrífuga trifásica 3CV 220V vazão mín.21000L/h',u:'UN'},
{c:'4.5.1.3',d:'Bomba centrífuga trifásica 5CV 220V vazão mín.14600L/h',u:'UN'},
{c:'4.5.1.4',d:'Bomba centrífuga trifásica 7,5CV 220V vazão mín.35000L/h',u:'UN'},
{c:'4.5.1.5',d:'Bomba centrífuga submersível ½CV águas servidas',u:'UN'},
{c:'4.6.1',d:'Kit automatizador portão deslizante',u:'UN'},
{c:'4.6.2',d:'Kit automatizador portão pivotante',u:'UN'},
{c:'4.6.3',d:'Placa motor portão universal bivolt',u:'UN'},
{c:'4.6.4',d:'Cremalheira portão deslizante aço galvanizado',u:'M'},
{c:'4.7.1',d:'Regulador pressão 1° estágio 9kg/h c/ manômetro Ø½" NTP',u:'UN'},
{c:'4.7.2',d:'Regulador pressão 2° estágio 9kg/h Ø½" NTP',u:'UN'},
{c:'4.7.3',d:'Mangote flexível pig tail Ø½"',u:'UN'},
{c:'4.7.4',d:'Mangueira flexível aparelhos 80cm Ø½"',u:'UN'},
{c:'4.8.1',d:'Módulo fotovoltaico 600-720Wp (vida útil 25 anos)',u:'UN'},
{c:'4.8.2',d:'Microinversor trifásico YC1000-3-220 AP Systems',u:'UN'},
{c:'4.1.7.11',d:'Cumeeira cerâmica',u:'M'},
{c:'4.1.7.12',d:'Cumeeira galvanizada trapezoidal E=0,50mm',u:'M'},
{c:'4.1.7.17',d:'Chapim em concreto pré-moldado E=2cm',u:'M'},
{c:'4.1.7.23',d:'Tela para sombrite polietileno cobertura veículos',u:'M2'},
{c:'4.1.8.7',d:'Fita anticorrosiva PVC autoadesiva L≥100mm proteção mecânica/elétrica',u:'M'},
{c:'4.1.10.5',d:'Execução de emboço',u:'M3'},
{c:'4.1.10.9',d:'Revestimento mármore E=2cm',u:'M2'},
{c:'4.1.10.11',d:'Revestimento lambri madeira ipê champanhe réguas 10cm',u:'M2'},
{c:'4.1.10.17',d:'Execução de elementos em concreto armado',u:'M3'},
{c:'4.1.10.18',d:'Recuperação com argamassa fluida alta resistência >40MPa',u:'M3'},
{c:'4.1.10.20',d:'Vedação de vão com espuma de poliéster E=3cm L=3cm',u:'M'},
{c:'4.1.10.21',d:'Bate maca em madeira angelim L=10cm',u:'M'},
{c:'4.1.10.22',d:'Cantoneira de alumínio abas iguais 1" E=3/16"',u:'M'},
{c:'4.1.12.2',d:'Tela para gradil metálico',u:'M'},
{c:'4.1.12.3',d:'Poste (montante) para gradil metálico H=2,43m',u:'UN'},
{c:'4.1.12.11',d:'Bate rodas metálico 1,60m',u:'UN'},
{c:'4.1.12.13',d:'Tela metálica fina tipo passarinho/pinteiro',u:'M2'},
{c:'4.1.12.14',d:'Chapa lisa 16',u:'M2'},
{c:'4.1.12.15',d:'Perfil industrial em aço para esquadrias E=2mm',u:'M'},
{c:'4.1.13.2.5',d:'Porta maciça para verniz 80x210cm',u:'UN'},
{c:'4.1.13.2.9',d:'Porta para shaft em madeira com revestimento laminado',u:'M2'},
{c:'4.1.15.9',d:'Pintura acrílica semi-brilho para parede (barrado)',u:'M2'},
{c:'4.1.15.10',d:'Pintura esmalte sintético para parede (barrado)',u:'M2'},
{c:'4.1.15.15',d:'Pintura em piso de concreto',u:'M2'},
{c:'4.1.15.16',d:'Pintura faixa de demarcação resina acrílica/vinílica',u:'M'},
{c:'4.1.16.4',d:'Piso bloquete de concreto intertravado vazado',u:'M2'},
{c:'4.1.16.5',d:'Piso bloquete de concreto maciço sextavado',u:'M2'},
{c:'4.1.16.6',d:'Placa sistema piso elevado (concreto e aço) 0,60x0,60',u:'M2'},
{c:'4.1.16.10',d:'Piso em ardósia',u:'M2'},
{c:'4.1.16.12',d:'Piso em mármore E=2cm',u:'M2'},
{c:'4.1.16.13',d:'Piso em marmorite E=8mm',u:'M2'},
{c:'4.1.16.14',d:'Piso pedra calçada portuguesa em mosaico',u:'M2'},
{c:'4.1.16.15',d:'Piso pedra São Tomé quartzito E≥2cm',u:'M2'},
{c:'4.1.16.18',d:'Piso em taco 7x21cm',u:'M2'},
{c:'4.1.16.19',d:'Piso podotátil em ladrilho hidráulico alerta/direcional',u:'M2'},
{c:'4.1.16.20',d:'Piso em ladrilho hidráulico E≥2cm',u:'M2'},
{c:'4.1.16.21',d:'Piso de borracha tipo moeda',u:'M2'},
{c:'4.1.16.25',d:'Rodapé em mármore H=10cm',u:'M'},
{c:'4.1.16.26',d:'Rodapé em granito H=10cm',u:'M'},
{c:'4.1.16.27',d:'Rodapé em ardósia H=10cm',u:'M'},
{c:'4.1.16.29',d:'Soleira em mármore',u:'M2'},
{c:'4.1.16.30',d:'Meio fio em concreto armado',u:'M'},
{c:'4.1.16.31',d:'Bate rodas em concreto',u:'UN'},
{c:'4.1.16.34',d:'Piso podotátil de borracha direcional/alerta',u:'M2'},
{c:'4.1.17.2',d:'Escavação manual de vala para inspeção de patologias',u:'M3'},
{c:'4.1.17.3',d:'Reaterro compactado',u:'M3'},
{c:'4.1.17.5',d:'Tela de proteção de fachada',u:'M2'},
{c:'4.2.6',d:'Acabamento metálico cromado para válvula de descarga',u:'UN'},
{c:'4.2.10.1',d:'Válvula retenção horizontal bronze 1"',u:'UN'},
{c:'4.2.10.2',d:'Válvula retenção horizontal bronze 1½"',u:'UN'},
{c:'4.2.10.3',d:'Válvula retenção horizontal bronze 2"',u:'UN'},
{c:'4.2.10.4',d:'Válvula retenção horizontal bronze 2½"',u:'UN'},
{c:'4.2.25',d:'Bacia sanitária turca com sifão integrado',u:'UN'},
{c:'4.2.29',d:'Cuba de embutir oval',u:'UN'},
{c:'4.2.34',d:'Assento plástico para vaso sanitário',u:'UN'},
{c:'4.2.35',d:'Sifão de PVC inteligente para pia/lavatório',u:'UN'},
{c:'4.2.36',d:'Tubo de ligação bacia sanitária cromado DN38',u:'UN'},
{c:'4.2.39.1',d:'Tubo PVC rígido reforçado esgoto/pluvial Ø150mm c/ conexões',u:'M'},
{c:'4.2.40.1',d:'Luva de correr PVC água fria Ø50mm',u:'UN'},
{c:'4.2.40.2',d:'Luva de correr PVC água fria Ø60mm',u:'UN'},
{c:'4.2.41.1',d:'Luva de correr PVC reforçado esgoto Ø75mm',u:'UN'},
{c:'4.2.41.2',d:'Luva de correr PVC reforçado esgoto Ø100mm',u:'UN'},
{c:'4.2.41.3',d:'Luva de correr PVC reforçado esgoto Ø150mm',u:'UN'},
{c:'4.2.42.1',d:'Caixa sifonada PVC 100x100x50mm',u:'UN'},
{c:'4.2.42.2',d:'Caixa sifonada PVC 150x185x75mm',u:'UN'},
{c:'4.2.43',d:'Ralo seco cilíndrico',u:'UN'},
{c:'4.2.44.1',d:'Ralo semi-esférico abacaxi 100mm',u:'UN'},
{c:'4.2.44.2',d:'Ralo semi-esférico abacaxi 150mm',u:'UN'},
{c:'4.2.45',d:'Grelha e porta grelha de piso 15x15cm',u:'UN'},
{c:'4.2.47',d:'Torneira bóia alta pressão 3/4" (DN20)',u:'UN'},
{c:'4.2.48',d:'Torneira bóia alta pressão 1¼" (DN32)',u:'UN'},
{c:'4.2.49',d:'Chave bóia para comando de bombeamento',u:'UN'},
{c:'4.2.50.1',d:'Adaptador soldável com flanges caixa d\'água 25mm',u:'UN'},
{c:'4.2.50.2',d:'Adaptador soldável com flanges caixa d\'água 32mm',u:'UN'},
{c:'4.2.50.3',d:'Adaptador soldável com flanges caixa d\'água 60mm',u:'UN'},
{c:'4.2.51',d:'Mangueira cristal transparente D=25mm c/ conexões',u:'M'},
{c:'4.2.53',d:'Canaleta coletora água pluvial grelha ferro fundido D=80cm',u:'M'},
{c:'4.2.54',d:'Caixa passagem esgoto polipropileno DN100',u:'UN'},
{c:'4.2.55',d:'Aspersor spray emergente pop-up 15cm',u:'UN'},
{c:'4.2.56',d:'Aspersor spray emergente pop-up 30cm',u:'UN'},
{c:'4.2.57',d:'Aspersor rotor 6" emergente por ação d\'água',u:'UN'},
{c:'4.2.58',d:'Aspersor rotor 12" emergente por ação d\'água',u:'UN'},
{c:'4.3.1.1',d:'Transformador de potencial TP 13,8kV TS 230/115V 1000VA classe 0,3P75',u:'UN'},
{c:'4.3.1.2',d:'Transformador de corrente TC 15kV 800A classe 0,3C100 relação 800:5',u:'UN'},
{c:'4.3.1.3',d:'Tapete isolante elétrico classe 2 20kV',u:'UN'},
{c:'4.3.1.4',d:'Luva borracha isolamento elétrico classe 2 20kV',u:'PAR'},
{c:'4.3.1.5',d:'Óleo mineral isolante MT (transformadores/disjuntores)',u:'L'},
{c:'4.3.1.6',d:'Relé sobrecorrente microprocessado 50/50N 51/51N',u:'UN'},
{c:'4.3.1.8',d:'Chave seccionadora tripolar 15kV abertura sem carga 630A',u:'UN'},
{c:'4.3.1.9',d:'Chave seccionadora tripolar 15kV abertura sob carga 630A com base NH',u:'UN'},
{c:'4.3.1.11.1',d:'Cabo cobre MT 20kV NBR7286 25mm²',u:'M'},
{c:'4.3.1.11.2',d:'Cabo cobre MT 20kV NBR7286 35mm²',u:'M'},
{c:'4.3.1.11.3',d:'Cabo cobre MT 20kV NBR7286 50mm²',u:'M'},
{c:'4.3.1.12',d:'Terminal modular MT (mufla) 20kV externo/interno',u:'UN'},
{c:'4.3.1.13.1',d:'Barramento cobre rígido nu MT vergalhão 1/4" (#20mm²)',u:'M'},
{c:'4.3.1.13.2',d:'Barramento cobre rígido nu MT vergalhão 3/8" (#50mm²)',u:'M'},
{c:'4.3.2.1.1',d:'Caixa padrão entrada energia BT CM-2',u:'UN'},
{c:'4.3.2.1.2',d:'Caixa padrão entrada energia BT CM-3',u:'UN'},
{c:'4.3.2.1.3',d:'Caixa padrão entrada energia BT CM-14',u:'UN'},
{c:'4.3.2.2.1',d:'Poste metálico padrão entrada energia PA2',u:'UN'},
{c:'4.3.2.2.2',d:'Poste metálico padrão entrada energia PA3',u:'UN'},
{c:'4.3.2.2.3',d:'Poste metálico padrão entrada energia PA5',u:'UN'},
{c:'4.3.2.2.4',d:'Poste metálico padrão entrada energia PA6',u:'UN'},
{c:'4.3.2.3',d:'TC padrão entrada BT relação 200:5 classe 1% 600V',u:'UN'},
{c:'4.3.3.2.1',d:'Disjuntor monopolar NEMA 15A 5kA',u:'UN'},
{c:'4.3.3.2.2',d:'Disjuntor monopolar NEMA 20A 5kA',u:'UN'},
{c:'4.3.3.4.1',d:'Disjuntor bipolar NEMA 2x20A 5kA',u:'UN'},
{c:'4.3.3.4.2',d:'Disjuntor bipolar NEMA 2x25A 5kA',u:'UN'},
{c:'4.3.3.7.2',d:'Disjuntor tripolar caixa moldada 3x300A 65kA IEC60947-2',u:'UN'},
{c:'4.3.3.8.1',d:'Disjuntor tripolar caixa moldada 3x160A 10kA IEC60947',u:'UN'},
{c:'4.3.3.8.2',d:'Disjuntor tripolar caixa moldada 3x200A 10kA IEC60947',u:'UN'},
{c:'4.3.3.9.1',d:'Disjuntor tripolar NEMA 3x40A 5kA',u:'UN'},
{c:'4.3.3.9.2',d:'Disjuntor tripolar NEMA 3x60A 5kA',u:'UN'},
{c:'4.3.3.10.1',d:'Disjuntor tripolar NEMA 3x120A 10kA',u:'UN'},
{c:'4.3.3.10.2',d:'Disjuntor tripolar NEMA 3x150A 10kA',u:'UN'},
{c:'4.3.3.10.3',d:'Disjuntor tripolar NEMA 3x200A 10kA',u:'UN'},
{c:'4.3.3.11.1',d:'IDR bipolar 2x40A 30mA',u:'UN'},
{c:'4.3.3.12.1',d:'IDR tetrapolar 4x40A 30mA',u:'UN'},
{c:'4.3.3.12.2',d:'IDR tetrapolar 4x63A 30mA',u:'UN'},
{c:'4.3.3.12.3',d:'IDR tetrapolar 4x80A 30mA',u:'UN'},
{c:'4.3.3.13',d:'Caixa sobrepor PVC 4 disjuntores DIN',u:'UN'},
{c:'4.3.3.15',d:'DPS trilho DIN 40kA 275V classe 2',u:'UN'},
{c:'4.3.3.16',d:'DPS trilho DIN 25kA 275V classe 1',u:'UN'},
{c:'4.3.3.17',d:'Pente barramento trifásico 100A 20 posições monopolares',u:'UN'},
{c:'4.3.3.18',d:'Kit barramento trifásico N+T 150A 44 posições monopolares',u:'UN'},
{c:'4.3.3.19',d:'Kit barramento trifásico N+T 225A 70 posições monopolares',u:'UN'},
{c:'4.3.3.20',d:'Barramento cobre neutro/terra 20 posições 150A',u:'UN'},
{c:'4.3.3.23',d:'QDC sobrepor trifásico 269A 18 pinos barramentos neutro por linha',u:'UN'},
{c:'4.3.3.24',d:'Programador horário 20 memórias trilho DIN 1 saída relé',u:'UN'},
{c:'4.3.3.28',d:'Relé térmico sobrecarga tripolar 25A para contator',u:'UN'},
{c:'4.3.3.29',d:'Botão de comando 22mm IP40 1NA+1NF',u:'UN'},
{c:'4.3.3.30',d:'Multimedidor grandezas elétricas para painel com memória de massa',u:'UN'},
{c:'4.3.3.31',d:'Sinaleiro LED 22mm 220V IP65',u:'UN'},
{c:'4.3.3.33',d:'Relé proteção falta de fase e inversão trilho DIN',u:'UN'},
{c:'4.3.3.34',d:'Ventilador painéis elétricos venezianas ABS filtros IP54',u:'UN'},
{c:'4.3.3.35',d:'Fusível cartucho porcelana 10x38 20A',u:'UN'},
{c:'4.3.3.36',d:'Fusível diazed 4A',u:'UN'},
{c:'4.3.4.2.4',d:'Cabo cobre unipolar flexível 1kV 90°C #50mm²',u:'M'},
{c:'4.3.4.2.5',d:'Cabo cobre unipolar flexível 1kV 90°C #70mm²',u:'M'},
{c:'4.3.4.2.6',d:'Cabo cobre unipolar flexível 1kV 90°C #120mm²',u:'M'},
{c:'4.3.4.2.7',d:'Cabo cobre unipolar flexível 1kV 90°C #240mm²',u:'M'},
{c:'4.3.4.5.1',d:'Cabo lógico UTP 4 pares LSZH categoria 5E (instalação)',u:'M'},
{c:'4.3.4.5.2',d:'Cabo lógico UTP 4 pares LSZH categoria 6 (instalação)',u:'M'},
{c:'4.3.4.6.1',d:'Patch-cord UTP 2m categoria 5E',u:'UN'},
{c:'4.3.4.6.2',d:'Patch-cord UTP 2m categoria 6',u:'UN'},
{c:'4.3.4.7.1',d:'Cabo telefônico externo CTP-APL 10 pares',u:'M'},
{c:'4.3.4.7.2',d:'Cabo telefônico externo CTP-APL 20 pares',u:'M'},
{c:'4.3.4.7.3',d:'Cabo telefônico externo CTP-APL 50 pares',u:'M'},
{c:'4.3.4.8.1',d:'Cabo telefônico interno CI 10 pares',u:'M'},
{c:'4.3.4.8.2',d:'Cabo telefônico interno CI 20 pares',u:'M'},
{c:'4.3.4.8.3',d:'Cabo telefônico interno CI 50 pares',u:'M'},
{c:'4.3.5.1.3',d:'Eletroduto aço carbono 1¼" c/ acessórios (instalação)',u:'M'},
{c:'4.3.5.2.1',d:'Eletroduto aço galvanizado fogo 1½" c/ acessórios',u:'M'},
{c:'4.3.5.2.2',d:'Eletroduto aço galvanizado fogo 2" c/ acessórios',u:'M'},
{c:'4.3.5.2.3',d:'Eletroduto aço galvanizado fogo 2½" c/ acessórios',u:'M'},
{c:'4.3.5.4.1',d:'Eletroduto flexível sealtube 3/4" (instalação)',u:'M'},
{c:'4.3.5.4.2',d:'Eletroduto flexível sealtube 1" (instalação)',u:'M'},
{c:'4.3.5.9.2',d:'Canaleta PVC antichama 50x20x2100mm',u:'UN'},
{c:'4.3.5.9.3',d:'Canaleta PVC antichama 110x20x2100mm',u:'UN'},
{c:'4.3.6.6',d:'Interruptor 1 tecla paralela three way c/ placa 10A/250V (instalação)',u:'UN'},
{c:'4.3.6.13',d:'Placa PVC 2x4" 2 teclas interruptor simples/paralelo (instalação)',u:'UN'},
{c:'4.3.6.14',d:'Placa PVC 2x4" 3 teclas interruptor simples/paralelo (instalação)',u:'UN'},
{c:'4.3.7.2.1',d:'Luminária embutir 2 lâmpadas T8 60cm soquete antivibratório',u:'UN'},
{c:'4.3.7.3',d:'Luminária embutir forro modulado 2 lâmpadas tubo LED c/ cabo 1,5mm²',u:'UN'},
{c:'4.3.7.4',d:'Luminária pétala uso externo em poste IP66 LED 100W bivolt',u:'UN'},
{c:'4.3.7.5',d:'Luminária embutir forro modular 2 lâmpadas tubo LED 1,5mm²',u:'UN'},
{c:'4.3.7.6',d:'Luminária embutir forro modular 4 lâmpadas tubo LED 1,5mm²',u:'UN'},
{c:'4.3.8.1',d:'Lâmpada multi vapor metálico 150W/220V base E40',u:'UN'},
{c:'4.3.8.2',d:'Lâmpada vapor de sódio 250W/220V base E40',u:'UN'},
{c:'4.3.8.3',d:'Lâmpada vapor de sódio 400W/220V base E40',u:'UN'},
{c:'4.3.8.13',d:'Reator lâmpada vapor metálico 150W/220V externo',u:'UN'},
{c:'4.3.8.14',d:'Reator lâmpada vapor sódio 250W/220V poste/projetor',u:'UN'},
{c:'4.3.8.15',d:'Reator lâmpada vapor sódio 400W/220V poste/projetor',u:'UN'},
{c:'4.3.8.20',d:'Relé temporizador partida estrela-triângulo 220V 3-30s',u:'UN'},
{c:'4.3.8.21',d:'Base acoplamento relé fotoelétrico suporte aço galvanizado',u:'UN'},
{c:'4.3.9.1',d:'Certificação ponto cabeamento estruturado cat5e/cat6 c/ identificações',u:'UN'},
{c:'4.3.9.2',d:'Patch panel 1U 24 posições cat.5E',u:'UN'},
{c:'4.3.9.3',d:'Patch panel 1U 24 posições cat.6',u:'UN'},
{c:'4.3.9.4',d:'Guia cabos horizontal alta densidade 1U 19" 24 cabos',u:'UN'},
{c:'4.3.9.5',d:'Régua tomadas 2P+T 10A 250V para rack 8 saídas NBR14136',u:'UN'},
{c:'4.4.2.4',d:'Mangueira incêndio NBR11861 tipo 2 Ø2½" 20m (instalação)',u:'UN'},
{c:'4.4.2.5',d:'Adaptador Storz 2½"x1½" latão (instalação)',u:'UN'},
{c:'4.4.2.6',d:'Adaptador Storz 2½"x2½" latão (instalação)',u:'UN'},
{c:'4.4.2.7',d:'Esguicho tronco cônico 1½" (instalação)',u:'UN'},
{c:'4.4.2.8',d:'Esguicho tronco cônico 2½" (instalação)',u:'UN'},
{c:'4.4.2.14',d:'Pressostato IP-30 (instalação)',u:'UN'},
{c:'4.4.2.15',d:'Manômetro de processo (instalação)',u:'UN'},
{c:'4.4.2.16.1',d:'Tubulação aço galvanizado NBR5580 2½" DN65mm',u:'M'},
{c:'4.4.2.16.2',d:'Tubulação aço galvanizado NBR5580 4" DN100mm',u:'M'},
{c:'4.4.2.17',d:'Tampa ferro fundido hidrante de recalque',u:'UN'},
{c:'4.4.2.18',d:'Chuveiro automático tipo pendente resposta rápida',u:'UN'},
{c:'4.4.2.19',d:'Chuveiro automático tipo em pé resposta rápida',u:'UN'},
{c:'4.8.3',d:'ECU-R AP Systems unidade comunicação microinversores',u:'UN'},
{c:'4.1.11.5',d:'Fecho alumínio janela máximo-ar',u:'UN'},
{c:'4.1.11.6',d:'Chapa alumínio escovado E=1mm',u:'M2'},
{c:'4.1.11.7',d:'Perfil L alumínio 5,6x3,0cm junta dilatação E=3,5mm',u:'M'},
{c:'4.1.11.8',d:'Perfil alumínio para esquadrias E=1,5mm',u:'M'},
{c:'4.1.12.16',d:'Mola reforçada 50mm porta enrolar aço até 4,50m',u:'UN'},
{c:'4.1.14.4',d:'Cremona latão 110mm',u:'UN'},
{c:'4.1.14.5',d:'Acionador basculante ferro 125mm',u:'UN'},
{c:'4.1.14.10',d:'Fechadura fecho tarjeta livre/ocupado',u:'UN'},
{c:'4.1.14.11',d:'Fechadura porta divisória tubular aço latão+plástico',u:'UN'},
{c:'4.1.14.12',d:'Fixador de porta',u:'UN'},
{c:'4.1.16.32',d:'Fita adesiva antiderrapante',u:'M'},
{c:'4.2.1.5',d:'Registro gaveta bruto 2"',u:'UN'},
{c:'4.2.1.6',d:'Registro gaveta bruto 2½"',u:'UN'},
{c:'4.2.2.1',d:'Base registro pressão ½"',u:'UN'},
{c:'4.2.2.2',d:'Base registro pressão ¾"',u:'UN'},
{c:'4.2.3',d:'Acabamento cromado para registro',u:'UN'},
{c:'4.2.5',d:'Acabamento cromado anti-vandalismo válvula descarga',u:'UN'},
{c:'4.2.7',d:'Reparo para válvula de descarga 1¼"-1½"',u:'UN'},
{c:'4.2.9',d:'Válvula descarga eletrônica mictório cromada 3/4"',u:'UN'},
{c:'4.2.12',d:'Válvula escoamento cromada pia',u:'UN'},
{c:'4.2.13',d:'Válvula escoamento cromada tanque',u:'UN'},
{c:'4.2.17',d:'Torneira pressão tanque parede cromada ½"',u:'UN'},
{c:'4.2.18',d:'Torneira jardim parede ½"',u:'UN'},
{c:'4.2.19',d:'Reparo para torneira',u:'UN'},
{c:'4.2.20',d:'Ligação cromada flexível malha aço 40cm',u:'UN'},
{c:'4.2.32',d:'Gatilho ducha higiênica manual',u:'UN'},
{c:'4.2.37.5',d:'Tubo PVC soldável água fria Ø60mm c/ conexões',u:'M'},
{c:'4.3.3.1.3',d:'Disjuntor monopolar DIN 32A curva C 3kA',u:'UN'},
{c:'4.3.3.3.2',d:'Disjuntor bipolar DIN 2x25A curva C 3kA',u:'UN'},
{c:'4.3.3.3.3',d:'Disjuntor bipolar DIN 2x63A curva C 3kA',u:'UN'},
{c:'4.3.3.5.2',d:'Disjuntor tripolar DIN 3x50A curva C 5kA',u:'UN'},
{c:'4.3.3.5.3',d:'Disjuntor tripolar DIN 3x63A curva C 5kA',u:'UN'},
{c:'4.3.3.14.1',d:'Contator tripolar AC-3 220V ICC 10kA 32A',u:'UN'},
{c:'4.3.3.14.2',d:'Contator tripolar AC-3 220V ICC 10kA 40A',u:'UN'},
{c:'4.3.3.14.3',d:'Contator tripolar AC-3 220V ICC 10kA 63A',u:'UN'},
{c:'4.3.3.14.4',d:'Contator tripolar AC-3 220V ICC 10kA 80A',u:'UN'},
{c:'4.3.3.14.5',d:'Contator tripolar AC-3 220V ICC 10kA 125A',u:'UN'},
{c:'4.3.3.25',d:'Espelho policarbonato ≥3mm p/ quadro elétrico',u:'M2'},
{c:'4.3.3.26',d:'Fecho 25mm chave yale p/ quadro elétrico',u:'UN'},
{c:'4.3.3.27',d:'Trilho DIN 35x7,5mm aço galvanizado ou alumínio',u:'M'},
{c:'4.3.3.32',d:'Chave comutadora tripolar 3 posições mín. 63A',u:'UN'},
{c:'4.3.4.2.1',d:'Cabo cobre flexível 1kV 90°C #4,0mm²',u:'M'},
{c:'4.3.4.2.2',d:'Cabo cobre flexível 1kV 90°C #16mm²',u:'M'},
{c:'4.3.4.2.3',d:'Cabo cobre flexível 1kV 90°C #25mm²',u:'M'},
{c:'4.3.4.3.1',d:'Cabo tripolar flexível 70°C 1kV #3x2,5mm²',u:'M'},
{c:'4.3.4.3.2',d:'Cabo tripolar flexível 70°C 1kV #3x4mm²',u:'M'},
{c:'4.3.4.4.1',d:'Cabo cobre nú 35mm²',u:'M'},
{c:'4.3.4.4.2',d:'Cabo cobre nú 50mm²',u:'M'},
{c:'4.3.5.3.3',d:'Eletroduto PVC rígido rosqueável 1¼" c/ curvas/luvas',u:'M'},
{c:'4.3.5.3.4',d:'Eletroduto PVC rígido rosqueável 1½" c/ curvas/luvas',u:'M'},
{c:'4.3.5.3.5',d:'Eletroduto PVC rígido rosqueável 2" c/ curvas/luvas',u:'M'},
{c:'4.3.5.5.1',d:'Conector box giratório sealtube 3/4"',u:'UN'},
{c:'4.3.5.5.2',d:'Conector box giratório sealtube 1"',u:'UN'},
{c:'4.3.5.6.1',d:'Condulete tipo X alumínio 3/4" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.6.2',d:'Condulete tipo X alumínio 1" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.6.3',d:'Condulete tipo X alumínio 1¼" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.6.4',d:'Condulete tipo X alumínio 1½" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.6.5',d:'Condulete tipo X alumínio 2" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.7.1',d:'Condulete tipo L alumínio 3/4" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.7.2',d:'Condulete tipo L alumínio 1" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.7.3',d:'Condulete tipo L alumínio 1¼" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.7.4',d:'Condulete tipo L alumínio 1½" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.7.5',d:'Condulete tipo L alumínio 2" c/ tampões e adaptadores',u:'UN'},
{c:'4.3.5.8.1',d:'Placa cega condulete alumínio 3/4"',u:'UN'},
{c:'4.3.5.8.2',d:'Placa cega condulete alumínio 1"',u:'UN'},
{c:'4.3.5.8.3',d:'Placa cega condulete alumínio 1¼"',u:'UN'},
{c:'4.3.5.8.4',d:'Placa cega condulete alumínio 1½"',u:'UN'},
{c:'4.3.5.8.5',d:'Placa cega condulete alumínio 2"',u:'UN'},
{c:'4.3.5.9.1',d:'Canaleta PVC antichama 20x10x2100mm',u:'UN'},
{c:'4.3.5.10.1',d:'Caixa passagem piso liga Al-Si 15x15x10cm c/ tampa',u:'UN'},
{c:'4.3.5.10.2',d:'Caixa passagem piso liga Al-Si 30x30x12cm c/ tampa',u:'UN'},
{c:'4.3.5.11.1',d:'Caixa passagem sobrepor chapa galv. 15x15x10cm',u:'UN'},
{c:'4.3.5.11.2',d:'Caixa passagem sobrepor chapa galv. 30x30x12cm',u:'UN'},
{c:'4.3.5.12.1',d:'Caixa passagem sobrepor termoplástico 15x15x8cm',u:'UN'},
{c:'4.3.5.12.2',d:'Caixa passagem sobrepor termoplástico 30x22x12cm',u:'UN'},
{c:'4.3.5.13',d:'Caixa modular PVC antichama 75x75mm p/ canaleta',u:'UN'},
{c:'4.3.5.14',d:'Tampa cega 4x4" aço inox p/ caixa de piso',u:'UN'},
{c:'4.3.5.15',d:'Tampa 4x4" aço inox 2 tomadas 2P+T p/ caixa piso',u:'UN'},
{c:'4.3.5.16',d:'Tampa 4x4" aço inox 2 tomadas RJ45 p/ caixa piso',u:'UN'},
{c:'4.3.6.2',d:'Interruptor 2 teclas simples 10A/250V',u:'UN'},
{c:'4.3.6.3',d:'Interruptor 3 teclas simples 10A/250V',u:'UN'},
{c:'4.3.6.4',d:'Interruptor bipolar 10A/250V',u:'UN'},
{c:'4.3.6.5',d:'Interruptor bipolar 20A/250V',u:'UN'},
{c:'4.3.6.7',d:'Interruptor monopolar minuteria pulsador 10A-250V',u:'UN'},
{c:'4.3.6.9',d:'Tomada RJ45 categoria 5E',u:'UN'},
{c:'4.3.6.10',d:'Tomada RJ45 categoria 6',u:'UN'},
{c:'4.3.6.11',d:'Tomada telefonia RJ11',u:'UN'},
{c:'4.3.6.12',d:'Placa PVC 2x4" 1 tecla interruptor simples/paralelo',u:'UN'},
{c:'4.3.6.15',d:'Placa PVC 2x4" 1 tecla interruptor bipolar',u:'UN'},
{c:'4.3.6.16',d:'Placa PVC 2x4" 1 tomada elétrica',u:'UN'},
{c:'4.3.6.17',d:'Placa PVC 4x4" 2 tomadas elétricas',u:'UN'},
{c:'4.3.6.18',d:'Placa PVC 2x4" 1 tomada RJ45',u:'UN'},
{c:'4.3.6.19',d:'Placa PVC 2x4" com furo central',u:'UN'},
{c:'4.3.6.20',d:'Placa cega 2x4" PVC',u:'UN'},
{c:'4.3.6.21',d:'Placa cega 4x4" PVC',u:'UN'},
{c:'4.3.6.22',d:'Placa cega PVC p/ caixa octogonal',u:'UN'},
{c:'4.3.6.23',d:'Caixa 2x4" de embutir PVC antichamas',u:'UN'},
{c:'4.3.6.24',d:'Caixa 4x4" de embutir PVC antichamas',u:'UN'},
{c:'4.3.6.25',d:'Interruptor bipolar 25A em caixa PVC p/ canaleta',u:'UN'},
{c:'4.3.6.26',d:'Tomada fêmea 20A NBR14136 em caixa PVC p/ canaleta',u:'UN'},
{c:'4.3.6.27',d:'Caixa PVC 75x75mm c/ espelho tomada RJ45 em canaleta',u:'UN'},
{c:'4.3.6.28.1',d:'Placa interruptor simples/paralelo p/ condulete 3/4"',u:'UN'},
{c:'4.3.6.28.2',d:'Placa interruptor simples/paralelo p/ condulete 1"',u:'UN'},
{c:'4.3.6.29.1',d:'Placa interruptor bipolar p/ condulete 3/4"',u:'UN'},
{c:'4.3.6.29.2',d:'Placa interruptor bipolar p/ condulete 1"',u:'UN'},
{c:'4.3.6.30.1',d:'Placa tomada elétrica p/ condulete 3/4"',u:'UN'},
{c:'4.3.6.30.2',d:'Placa tomada elétrica p/ condulete 1"',u:'UN'},
{c:'4.3.6.31.1',d:'Placa tomada RJ45 p/ condulete 1"',u:'UN'},
{c:'4.3.6.32',d:'Tampa caixa inspeção aterramento circular DN25cm ferro fundido',u:'UN'},
{c:'4.3.7.12',d:'Sinalizador entrada/saída veículos luminoso LED',u:'UN'},
{c:'4.3.8.4',d:'Lâmpada LED T5 11W base G5',u:'UN'},
{c:'4.3.8.5',d:'Lâmpada LED T5 20W base G5',u:'UN'},
{c:'4.3.8.10',d:'Lâmpada ultra bulbo LED 40W E27',u:'UN'},
{c:'4.3.8.11',d:'Lâmpada ultra bulbo LED 80W E40',u:'UN'},
{c:'4.3.8.12',d:'Lâmpada LED tubular HO 240cm T8 40W',u:'UN'},
{c:'4.3.8.16',d:'Reator driver LED 14-18W bivolt',u:'UN'},
{c:'4.3.8.17',d:'Reator driver LED 19-24W bivolt',u:'UN'},
{c:'4.3.8.18',d:'Reator driver LED 25-36W bivolt',u:'UN'},
{c:'4.3.8.19',d:'Relé fotoelétrico 1000W bivolt uso externo',u:'UN'},
{c:'4.3.8.22',d:'Sensor presença bivolt 360° uso interno',u:'UN'},
{c:'4.4.1.5',d:'Suporte piso para extintor',u:'UN'},
{c:'4.4.1.6',d:'Suporte parede para extintor',u:'UN'},
{c:'4.4.2.9',d:'Chave para conexão engate Storz dupla',u:'UN'},
{c:'4.4.2.10',d:'Tampão cego c/ corrente hidrante passeio 2½"',u:'UN'},
{c:'4.4.2.12.1',d:'Válvula retenção vertical portinhola 2" DN50mm',u:'UN'},
{c:'4.4.2.12.2',d:'Válvula retenção vertical portinhola 2½" DN65mm',u:'UN'},
{c:'4.4.2.13.1',d:'Válvula retenção horizontal portinhola 1" 25mm',u:'UN'},
{c:'4.4.2.13.2',d:'Válvula retenção horizontal portinhola 2½" 65mm',u:'UN'},
{c:'4.4.3.1',d:'Acionador manual endereçável central alarme incêndio',u:'UN'},
{c:'4.4.3.2',d:'Avisador audiovisual 100dB endereçável',u:'UN'},
{c:'4.4.3.3',d:'Sirene alta potência 24Vcc 120dB',u:'UN'},
{c:'4.9',d:'Diária (conforme índice ICD)',u:'DIÁRIA'}
];

/* ── MATS Emergencial (Planilha Emergencial – itens 3.x + 6.x) ── */
var MATS_EMG=[
{c:'3.1',d:'Atendimento corretivo emergencial em comarca polo',u:'UN'},
{c:'3.2',d:'Atendimento corretivo emergencial nas demais comarcas',u:'UN'}
].concat(MATS);

/* ── Retorna a lista de materiais correta conforme o tipo de formulário ou inspeção ── */
function getMATSForTipo(){
  var _tipo=F.tipo;
  /* Quando modal aberto a partir de inspeção salva, pega tipo da inspeção */
  if(_eMode==='insp'&&_eid){var _xi=S.insp.find(function(x){return x.id===_eid;});if(_xi)_tipo=_xi.tipo;}
  if(_tipo==='programada'||_tipo==='osp')return MATS_PROG;
  if(_tipo==='ose')return MATS_EMG;
  return MATS; // periódica, fachada, spda, prontuario, subestacao
}


/* ════════════════════════════════════════════════
   OSP — Formulário Dados da Ordem de Serviço
   ════════════════════════════════════════════════ */
function rFDadosOSP(c){
  var d=F.d;
  var reg=d.reg||(S.sessao?S.sessao.reg:'NORTE')||'NORTE';
  var _global=isGlobal(S.sessao);
  if(_global&&!d.reg)reg='NORTE';
  var polosReg=EDIFICACOES[reg]||{};
  var todasEdifs=[];
  Object.keys(polosReg).forEach(function(p){
    (polosReg[p]||[]).forEach(function(e){todasEdifs.push({polo:p,com:e.com,edif:e.edif,grp:e.grp});});
  });
  var comarcasUnicas=[];var _vistas={};
  todasEdifs.forEach(function(e){if(!_vistas[e.com]){_vistas[e.com]=true;comarcasUnicas.push(e.com);}});
  comarcasUnicas.sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  var comarca=d.com||'';
  var edifsCom=todasEdifs.filter(function(e){return e.com===comarca;});
  var edif=d.edif||'';
  var _todayISO=new Date().toISOString().slice(0,10);

  var h='<div style="font-size:15px;font-weight:800;margin-bottom:4px;color:#0f766e;">📋 Ordem de Serviço Programada</div>';
  h+='<div style="font-size:10px;color:#64748b;margin-bottom:14px;">Preencha os dados da OSP para abertura</div>';

  if(_global){
    h+='<div class="lbl">Região *</div>';
    h+='<select onchange="F.d.reg=this.value;F.d.com=\'\';F.d.edif=\'\';F.d.polo=\'\';F.d.grp=\'B\';rFe()" style="margin-bottom:10px;">';
    Object.keys(REG).forEach(function(rk){h+='<option value="'+rk+'"'+(reg===rk?' selected':'')+'>'+REG[rk].l+'</option>';});
    h+='</select>';
  }

  h+='<div class="lbl">Comarca *</div>';
  h+='<select onchange="applyComarcaDefaults(this.value)" style="margin-bottom:10px;">';
  h+='<option value="">— Selecione —</option>';
  comarcasUnicas.forEach(function(com){h+='<option value="'+com+'"'+(comarca===com?' selected':'')+'>'+com+'</option>';});
  h+='</select>';

  if(comarca){
    h+='<div class="lbl">Edificação *</div>';
    if(edifsCom.length){
      h+='<select onchange="var _si=this.selectedIndex;if(_si>0){var _ed=JSON.parse(this.options[_si].dataset.e);F.d.edif=_ed.edif;F.d.grp=_ed.grp;F.d.polo=_ed.polo;rFe();}else{F.d.edif=\'\';rFe();}" style="margin-bottom:10px;">';
      h+='<option value="">— Selecione —</option>';
      edifsCom.slice().sort(function(a,b){return a.edif.localeCompare(b.edif,'pt-BR');}).forEach(function(e){
        var _lbl=e.edif+(e.grp?' [Grupo '+e.grp+']':'');
        h+='<option'+(edif===e.edif?' selected':'')+' data-e=\''+JSON.stringify(e)+'\'>'+ _lbl+'</option>';
      });
      h+='</select>';
    }else{
      h+='<input value="'+(edif||'')+'" placeholder="Nome da edificação" oninput="F.d.edif=this.value" style="margin-bottom:10px;">';
    }
    /* Card verde edificacao selecionada */
    if(edif){
      var _eObjO=edifsCom.find(function(x){return x.edif===edif;})||findEdificacaoMeta(reg,comarca,edif)||{grp:F.d.grp||'B',polo:F.d.polo||''};
      var _gCor={'A':'#003580','B':'#16a34a','C':'#d97706'}[_eObjO.grp]||'#64748b';
      var _gBg={'A':'#dbeafe','B':'#dcfce7','C':'#fef3c7'}[_eObjO.grp]||'#f1f5f9';
      var _R2=REG[reg]||{l:reg};
      h+='<div style="background:'+_gBg+';border-radius:10px;padding:12px;margin-bottom:10px;border-left:4px solid '+_gCor+';">';
      h+='<div style="font-size:12px;font-weight:800;color:'+_gCor+';">✓ Edificação Selecionada</div>';
      h+='<div style="font-size:13px;font-weight:700;margin-top:4px;">'+comarca+' – '+edif+'</div>';
      h+='<div style="font-size:11px;color:#64748b;margin-top:2px;">Polo '+(_eObjO.polo||'')+' · Região '+_R2.l+' · <b>Grupo '+_eObjO.grp+'</b></div>';
      h+='</div>';
    }
  }

  h+='<div class="lbl">Fiscal Responsável</div>';
  h+='<input value="'+(d.fiscal||'')+'" placeholder="Nome do fiscal" oninput="F.d.fiscal=this.value" style="margin-bottom:10px;" autocapitalize="words">';
  h+='<div class="lbl">Matrícula do Fiscal</div>';
  h+='<input value="'+(d.mat||'')+'" placeholder="Ex: T001234-5" oninput="F.d.mat=this.value" style="margin-bottom:10px;" autocapitalize="characters">';

  h+='<div style="margin-bottom:10px;">';
  h+='<div class="lbl">Data de Abertura *</div>';
  h+='<input type="date" value="'+(d.dtVistoria||_todayISO)+'" max="'+_todayISO+'" oninput="F.d.dtVistoria=this.value" style="padding:10px 8px;width:100%;">';
  h+='</div>';

  h+='<div class="lbl">Número da OSP *</div>';
  h+='<input value="'+(d.os||'')+'" placeholder="Ex: OSP-0042" oninput="F.d.os=this.value" style="font-size:15px;font-weight:700;letter-spacing:1px;margin-bottom:10px;">';

  h+='<div class="lbl">Descrição dos Serviços *</div>';
  h+='<textarea placeholder="Descreva o objeto da OS..." style="min-height:72px;margin-bottom:12px;" oninput="F.d.descricao=this.value">'+(d.descricao||'')+'</textarea>';

  /* ── Bloco de Prazos ── */
  h+='<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px;margin-bottom:8px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#0f766e;margin-bottom:10px;">📅 Prazo de Execução</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">';
  h+='<div><div class="lbl">Data Início Execução *</div>';
  h+='<input type="date" id="osp-dtini" value="'+(d.dtInicioExec||'')+'" oninput="F.d.dtInicioExec=this.value;var _df=ospCalcFinal();F.d.dtFinalExec=_df;var _el=document.getElementById(\'osp-dtfinal\');if(_el)_el.value=_df;" style="padding:10px 8px;"></div>';
  h+='<div><div class="lbl">Prazo (dias) *</div>';
  h+='<input type="number" id="osp-dias" value="'+(d.diasPrazo||'')+'" min="1" max="730" placeholder="Ex: 30" oninput="F.d.diasPrazo=this.value;var _df=ospCalcFinal();F.d.dtFinalExec=_df;var _el=document.getElementById(\'osp-dtfinal\');if(_el)_el.value=_df;" style="padding:10px 8px;"></div></div>';
  var _dfv=d.dtFinalExec||'';
  h+='<div><div class="lbl">Data Final (calculada automaticamente)</div>';
  h+='<input type="date" id="osp-dtfinal" value="'+ _dfv +'" readonly style="padding:10px 8px;background:#dcfce7;color:#15803d;font-weight:700;cursor:default;"></div>';
  h+='</div>';

  c.innerHTML=h;
  var eObj2=edifsCom.find(function(x){return x.edif===edif;})||findEdificacaoMeta(reg,comarca,edif);
  if(eObj2&&eObj2.grp){F.d.grp=eObj2.grp;F.d.polo=eObj2.polo||F.d.polo||'';}
}
function ospCalcFinal(){
  var _ini=F.d.dtInicioExec||'';
  var _dias=parseInt(F.d.diasPrazo||'0');
  if(!_ini||!_dias||isNaN(_dias))return '';
  var _d=new Date(_ini+'T00:00:00');
  _d.setDate(_d.getDate()+_dias);
  return _d.toISOString().slice(0,10);
}

/* ── Sincroniza materiais adicionados nos itens para a lista global ── */
function sincronizarMatsGlobais(itens, matsGlobal){
  var mapa={};
  /* Primeiro: preserva todos os que já estão na lista global (adicionados manualmente) */
  (matsGlobal||[]).forEach(function(m){
    if(!m||!m.c)return;
    if(!mapa[m.c])mapa[m.c]={c:m.c,d:m.d,u:m.u,q:parseFloat(m.q)||1,_origem:'manual'};
    else mapa[m.c].q=parseFloat(mapa[m.c].q||0)+parseFloat(m.q||0);
  });
  /* Segundo: adiciona/acumula os materiais de cada item do checklist */
  Object.keys(itens||{}).forEach(function(k){
    var it=itens[k];
    (it&&it.mats||[]).forEach(function(m){
      if(!m||!m.c)return;
      if(!mapa[m.c]){
        mapa[m.c]={c:m.c,d:m.d,u:m.u,q:parseFloat(m.q)||1,_origem:'item'};
      } else {
        /* Se já existe (manual), soma apenas se veio de item (evita duplicar) */
        if(mapa[m.c]._origem==='item'){
          mapa[m.c].q=parseFloat(mapa[m.c].q||0)+parseFloat(m.q||0);
        }
        /* Se _origem==='manual', mantém a quantidade manual e não soma item */
      }
    });
  });
  return Object.keys(mapa).map(function(k){return mapa[k];});
}

/* ── Etapa de Materiais (sem preços) ── */
function rFMats(c){
  c.style.display='block';
  /* Sincroniza materiais dos itens na lista global antes de exibir */
  var _matsAntes=JSON.parse(JSON.stringify(F.mats||[]));
  F.mats=sincronizarMatsGlobais(F.itens, _matsAntes);

  /* Conta materiais vindos de itens */
  var _matsDeItens={};
  Object.keys(F.itens||{}).forEach(function(k){
    var it=F.itens[k];
    (it&&it.mats||[]).forEach(function(m){
      if(!m||!m.c)return;
      if(!_matsDeItens[m.c])_matsDeItens[m.c]={c:m.c,d:m.d,u:m.u,q:0,items:[]};
      _matsDeItens[m.c].q+=parseFloat(m.q)||1;
      _matsDeItens[m.c].items.push(it.nm||k);
    });
  });
  var _nDeItens=Object.keys(_matsDeItens).length;

  var label=(F.tipo==='programada'||F.tipo==='osp')?'Programada (Anexo D)':F.tipo==='ose'?'Emergencial':'Periódica (Anexo H)';
  var _cor=TCOR[F.tipo]||'#003580';
  var _ospNote=F.tipo==='osp'
    ?'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-top:12px;font-size:11px;color:#166534;line-height:1.6;"><b>* Observação:</b> Quantitativo e qualitativo podem variar conforme necessidade e conforme execução.</div>'
    :'';

  var _infoItens=_nDeItens>0
    ?'<div style="background:#dbeafe;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:11px;color:#1d4ed8;display:flex;align-items:center;gap:8px;">'
     +'<span style="font-size:18px;">🔧</span>'
     +'<div><b>'+_nDeItens+' material(is) importado(s) automaticamente</b> das atividades avaliadas.<br>'
     +'Você pode ajustar as quantidades ou adicionar mais itens manualmente abaixo.</div>'
     +'</div>'
    :'<div style="background:#f8fafc;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:11px;color:#64748b;">'
     +'Nenhum material adicionado nas atividades. Adicione manualmente se necessário.'
     +'</div>';

  var h=_infoItens
    +(( F.tipo==='periodica'||F.tipo==='ose'||F.tipo==='programada')
      ? '<div class="card" style="margin-bottom:12px;"><div class="lbl">Data Final da Vistoria</div>'
        +'<input type="date" value="'+(F.d.dtVistoriaFim||new Date().toISOString().slice(0,10))+'" oninput="F.d.dtVistoriaFim=this.value" style="padding:10px 8px;width:100%;"></div>'
      : '')
    +'<div style="font-size:15px;font-weight:800;margin-bottom:4px;">Materiais e Peças</div>'
    +'<div style="font-size:10px;color:#64748b;margin-bottom:12px;">Lista: <b>'+label+'</b></div>'
    +'<div class="card" style="margin-bottom:8px;">'
    +'<div class="lbl">Buscar por código ou descrição</div>'
    +'<input id="mbsr" placeholder="Ex.: telha, disjuntor, 6.1.1..." oninput="bmats(this.value)" style="margin-bottom:6px;" autocomplete="off">'
    +'<div id="mr" style="max-height:220px;overflow-y:auto;border-radius:8px;border:1px solid #e2e8f0;display:none;"></div>'
    +'</div>'
    +'<div id="mlf"></div>'
    +_ospNote;

  c.innerHTML=h;
  rML();
}
function bmats(t){
  var el2=document.getElementById('mr');if(!el2)return;
  if(!t||t.trim().length<2){el2.style.display='none';el2.innerHTML='';return;}
  var ter=t.toLowerCase();
  var src=getMATSForTipo();
  var r=src.filter(function(m){return(m.d+m.c).toLowerCase().indexOf(ter)>=0;}).slice(0,8);
  if(!r.length){el2.style.display='none';el2.innerHTML='';return;}
  el2.style.display='block';
  el2.innerHTML=r.map(function(m){
    var already=F.mats.find(function(x){return x.c===m.c;});
    return'<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #f8fafc;background:'+(already?'#f0fdf4':'#fff')+'">'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:10px;font-weight:700;color:#003580;font-family:monospace;">'+m.c+'</div>'
      +'<div style="font-size:12px;font-weight:600;line-height:1.3;">'+m.d+'</div>'
      +'<div style="font-size:10px;color:#64748b;">'+m.u+'</div>'
      +'</div>'
      +'<button onclick="amat(\''+m.c.replace(/'/g,"\\'")+'\')" style="background:'+(already?'#16a34a':'#003580')+';color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">'+(already?'✓':'+')+'</button>'
      +'</div>';
  }).join('');
}
function amat(c){
  var src=getMATSForTipo();
  var m=src.find(function(x){return x.c===c;});if(!m)return;
  if(!F.mats.find(function(x){return x.c===c;})){
    F.mats.push({c:m.c,d:m.d,u:m.u,q:1,_origem:'manual'});
    rML();Tt('✓ '+m.d.slice(0,30)+'... adicionado');
    var inp=document.getElementById('mbsr');if(inp&&inp.value.length>=2)bmats(inp.value);
  }
}
function rML(){
  var el2=document.getElementById('mlf');if(!el2)return;

  /* Coleta materiais que vieram de itens para mostrar origem */
  var _matsDeItens={};
  Object.keys(F.itens||{}).forEach(function(k){
    var it=F.itens[k];
    (it&&it.mats||[]).forEach(function(m){
      if(!m||!m.c)return;
      if(!_matsDeItens[m.c])_matsDeItens[m.c]={q:0,nms:[]};
      _matsDeItens[m.c].q+=parseFloat(m.q)||1;
      var _nm=it.nm||it.n||k;
      if(_matsDeItens[m.c].nms.indexOf(_nm)<0)_matsDeItens[m.c].nms.push(_nm);
    });
  });

  if(!F.mats.length){
    el2.innerHTML='<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">Nenhum material adicionado ainda</div>';
    return;
  }

  /* Separa por grupo: vindos de atividades e adicionados manualmente */
  var _deAtiv=F.mats.filter(function(m){return _matsDeItens[m.c];});
  var _manuais=F.mats.filter(function(m){return !_matsDeItens[m.c];});

  var h='';

  /* Grupo: importados de atividades */
  if(_deAtiv.length){
    h+='<div style="font-size:11px;font-weight:800;color:#1d4ed8;margin-bottom:6px;display:flex;align-items:center;gap:6px;">'
      +'<span style="background:#dbeafe;color:#1d4ed8;border-radius:6px;padding:2px 8px;font-size:10px;">🔧 Das atividades ('+_deAtiv.length+')</span></div>';
    _deAtiv.forEach(function(m,ix){
      var _realIx=F.mats.indexOf(m);
      var _info=_matsDeItens[m.c]||{nms:[]};
      var _q=parseFloat(m.q||_info.q||1);
      h+='<div class="card" style="border-left:4px solid #2563eb;padding:10px;margin-bottom:6px;">'
        +'<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:8px;">'
        +'<span style="font-family:monospace;font-size:10px;background:#eff6ff;color:#2563eb;padding:2px 7px;border-radius:4px;flex-shrink:0;margin-top:2px;">'+m.c+'</span>'
        +'<div style="flex:1;font-size:12px;font-weight:700;line-height:1.4;">'+m.d+'</div>'
        +'</div>'
        +(_info.nms.length?'<div style="font-size:10px;color:#64748b;margin-bottom:8px;">📌 '+_info.nms.slice(0,2).join(', ')+(_info.nms.length>2?' +'+(_info.nms.length-2)+'...':'')+'</div>':'')
        +'<div style="display:flex;align-items:center;gap:10px;">'
        +'<div class="lbl" style="margin-bottom:0;white-space:nowrap;">Qtd.:</div>'
        +'<input type="number" step="0.01" min="0.01" value="'+_q+'" '
        +'style="width:80px;text-align:center;font-size:16px;font-weight:800;padding:8px;border-radius:8px;border:1.5px solid #2563eb;" '
        +'oninput="F.mats['+_realIx+'].q=parseFloat(this.value)||1">'
        +'<span style="font-size:12px;font-weight:600;color:#64748b;flex:1;">'+m.u+'</span>'
        +'<button onclick="F.mats.splice('+_realIx+',1);rML();" '
        +'style="border:none;background:#fee2e2;color:#dc2626;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;flex-shrink:0;">✕</button>'
        +'</div></div>';
    });
  }

  /* Grupo: adicionados manualmente */
  if(_manuais.length){
    h+='<div style="font-size:11px;font-weight:800;color:#16a34a;margin-bottom:6px;margin-top:'+(_deAtiv.length?'12px':'0')+';">'
      +'<span style="background:#dcfce7;color:#16a34a;border-radius:6px;padding:2px 8px;font-size:10px;">➕ Adicionados manualmente ('+_manuais.length+')</span></div>';
    _manuais.forEach(function(m){
      var _realIx=F.mats.indexOf(m);
      var _q=parseFloat(m.q||1);
      h+='<div class="card" style="border-left:4px solid #16a34a;padding:10px;margin-bottom:6px;">'
        +'<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:8px;">'
        +'<span style="font-family:monospace;font-size:10px;background:#f0fdf4;color:#16a34a;padding:2px 7px;border-radius:4px;flex-shrink:0;margin-top:2px;">'+m.c+'</span>'
        +'<div style="flex:1;font-size:12px;font-weight:700;line-height:1.4;">'+m.d+'</div>'
        +'<button onclick="F.mats.splice('+_realIx+',1);rML();var inp=document.getElementById(\'mbsr\');if(inp&&inp.value.length>=2)bmats(inp.value);" '
        +'style="border:none;background:#fee2e2;color:#dc2626;border-radius:6px;padding:3px 8px;font-size:13px;cursor:pointer;flex-shrink:0;">✕</button>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:10px;">'
        +'<div class="lbl" style="margin-bottom:0;white-space:nowrap;">Qtd.:</div>'
        +'<input type="number" step="0.01" min="0.01" value="'+_q+'" '
        +'style="width:80px;text-align:center;font-size:16px;font-weight:800;padding:8px;border-radius:8px;border:1.5px solid #16a34a;" '
        +'oninput="F.mats['+_realIx+'].q=parseFloat(this.value)||1">'
        +'<span style="font-size:12px;font-weight:600;color:#64748b;">'+m.u+'</span>'
        +'</div></div>';
    });
  }

  el2.innerHTML=h;
}
// ── MÓDULO SUBESTAÇÃO — Anexo B.1 TJMG ──────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO SUBESTAÇÃO — Anexo B.1 TJMG
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO SUBESTAÇÃO — Anexo B.1 TJMG  (v3)
// ══════════════════════════════════════════════════════════════════════════════

// ── Etapas dinâmicas ──────────────────────────────────────────────────────────
function subEtapas(tipoSub){
  if(tipoSub==='ABRIGADA')
    return ['Dados','Checklist Sub','Medicoes Sub','Concluir'];
  return ['Dados','Checklist Sub','Concluir'];
}
function subAtualizaEtapas(){
  var ts=(F.sub&&F.sub.tipo_sub)||'AEREA';
  var novas=subEtapas(ts);
  // Reposicionar et se estava em Medicoes Sub e mudou para AEREA
  var tnAtual=F.ets&&F.ets[F.et];
  F.ets=novas;
  var novoIdx=novas.indexOf(tnAtual);
  if(novoIdx<0){
    // etapa sumiu (ex. Medicoes Sub removida) — vai para Concluir ou recua
    F.et=Math.min(F.et,novas.length-1);
  }
}

/* v70: SUB_SECOES movido para data.js — Bug 2/4 fix */

function subSecoesVisiveis(){
  var d=F.d||{};
  var tipoSub=d.tipo_sub||'AEREA';
  var tipoMan=d.tipo_manutencao||'ANUAL';
  var abrigada=tipoSub==='ABRIGADA';
  var anual=tipoMan==='ANUAL';
  var temPVO=d.tem_pvo==='SIM';
  return SUB_SECOES.filter(function(s){
    if(s.sempre)return true;
    if(s.anual&&!anual)return false;
    if(s.abrigada&&!abrigada)return false;
    return true;
  }).map(function(s){
    return Object.assign({},s,{itens:s.itens.filter(function(it){
      if(it.anual&&!anual)return false;
      if(it.pvo&&!temPVO)return false;
      return true;
    })});
  });
}

// ── Structs ───────────────────────────────────────────────────────────────────
function subDefaultData(sess){
  sess=sess||{};
  return {tipo_sub:'AEREA',tipo_manutencao:'ANUAL',responsavel:sess.nome||'',
    obs_geral:'',nc:'',acoes:'',chk:{},
    trafos:[subNovoTrafo()],disjs:[subNovoDisj()],secc:[subNovoSecc()]};
}
function subNovoTrafo(){
  return {ref:'',kva:'',at:'',bt:'',obs:'',
    ttr_x1:'',ttr_x2:'',ttr_x3:'',fotos_ttr:[],
    iso_x1t:'',iso_x2t:'',iso_x3t:'',iso_h1t:'',iso_h2t:'',iso_h3t:'',iso_h1x1:'',iso_h2x2:'',iso_h3x3:'',fotos_iso:[],
    ohm_x1x0:'',ohm_x2x0:'',ohm_x3x0:'',ohm_h1h2:'',ohm_h1h3:'',ohm_h2h3:'',fotos_ohm:[]};
}
function subNovoDisj(){
  return {obs:'',tipo:'VACUO',
    ab_r:'',ab_s:'',ab_t:'',fe_r:'',fe_s:'',fe_t:'',fotos_iso:[],
    cr:'',cs:'',ct:'',fotos_cr:[]};
}
function subNovoSecc(){
  return {obs:'',
    ab_r:'',ab_s:'',ab_t:'',fe_r:'',fe_s:'',fe_t:'',fotos_iso:[],
    cr:'',cs:'',ct:'',fotos_cr:[]};
}

function subInit(){
  if(!F.sub)F.sub=subDefaultData(S.sessao||{});
  if(!F.sub.trafos||!F.sub.trafos.length)F.sub.trafos=[subNovoTrafo()];
  if(!F.sub.disjs||!F.sub.disjs.length)F.sub.disjs=[subNovoDisj()];
  if(!F.sub.secc||!F.sub.secc.length)F.sub.secc=[subNovoSecc()];
  F.sub.trafos.forEach(function(t){if(!t.fotos_ttr)t.fotos_ttr=[];if(!t.fotos_iso)t.fotos_iso=[];if(!t.fotos_ohm)t.fotos_ohm=[];});
  F.sub.disjs.forEach(function(d){if(!d.fotos_iso)d.fotos_iso=[];if(!d.fotos_cr)d.fotos_cr=[];});
  F.sub.secc.forEach(function(s){if(!s.fotos_iso)s.fotos_iso=[];if(!s.fotos_cr)s.fotos_cr=[];});
  // F.d tem prioridade se usuário já configurou
  if(F.d.tipo_sub&&F.d.tipo_sub!==F.sub.tipo_sub)F.sub.tipo_sub=F.d.tipo_sub;
  else F.d.tipo_sub=F.sub.tipo_sub;
  if(F.d.tipo_manutencao&&F.d.tipo_manutencao!==F.sub.tipo_manutencao)F.sub.tipo_manutencao=F.d.tipo_manutencao;
  else F.d.tipo_manutencao=F.sub.tipo_manutencao;
}

function subAddTrafo(){subInit();F.sub.trafos.push(subNovoTrafo());rFe();}
function subAddDisj(){subInit();F.sub.disjs.push(subNovoDisj());rFe();}
function subAddSecc(){subInit();F.sub.secc.push(subNovoSecc());rFe();}

// ── Fotos checklist ───────────────────────────────────────────────────────────
function subToggleItem(id){
  subInit();
  if(!F.sub.chk[id])F.sub.chk[id]={v:false,obs:'',fotos:[],_obsOpen:false};
  F.sub.chk[id].v=!F.sub.chk[id].v;rFe();
}
function subToggleObs(id){
  subInit();
  if(!F.sub.chk[id])F.sub.chk[id]={v:false,obs:'',fotos:[],_obsOpen:false};
  F.sub.chk[id]._obsOpen=!F.sub.chk[id]._obsOpen;rFe();
}
function subAddFoto(id,inp){
  subInit();
  if(!F.sub.chk[id])F.sub.chk[id]={v:false,obs:'',fotos:[],_obsOpen:false};
  subProcessarFotos(inp.files,function(b64){F.sub.chk[id].fotos.push({b64:b64});});
}
function subVerFotos(id){
  var fotos=(F.sub.chk[id]||{}).fotos||[];
  subAbrirVisor(fotos,'Item: '+id);
}

// ── Fotos medições ────────────────────────────────────────────────────────────
function subAddFotoMed(arr,idx,campo,inp){
  subInit();
  var lista=F.sub[arr];
  if(!lista||!lista[idx])return;
  if(!lista[idx][campo])lista[idx][campo]=[];
  subProcessarFotos(inp.files,function(b64){lista[idx][campo].push({b64:b64});});
}
function subDelFotoMed(arr,idx,campo,fi){
  subInit();
  var lista=F.sub[arr];
  if(lista&&lista[idx]&&lista[idx][campo])lista[idx][campo].splice(fi,1);
  rFe();
}
function subVerFotosMed(arr,idx,campo,titulo){
  subInit();
  var lista=F.sub[arr];
  var fotos=(lista&&lista[idx])?lista[idx][campo]||[]:[];
  subAbrirVisor(fotos,titulo);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function subProcessarFotos(files,cb){
  var arr=Array.from(files);var pending=arr.length;
  if(!pending)return;
  arr.forEach(function(f){
    var reader=new FileReader();
    reader.onload=function(e){
      var img=new Image();
      img.onload=function(){
        var cv=document.createElement('canvas');
        var MAX=900;var sc=Math.min(1,MAX/Math.max(img.width,img.height));
        cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
        cb(cv.toDataURL('image/webp',0.78)||cv.toDataURL('image/jpeg',0.78));
        pending--;if(pending===0)rFe();
      };img.src=e.target.result;
    };reader.readAsDataURL(f);
  });
}
function subAbrirVisor(fotos,titulo){
  if(!fotos||!fotos.length)return;
  var w=window.open('','_blank','width=760,height=660');
  var h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+titulo+'</title><style>body{margin:0;background:#111;padding:12px;font-family:sans-serif;}h2{color:#fff;font-size:14px;margin:0 0 10px;}div.g{display:flex;flex-wrap:wrap;gap:8px;}figure{margin:0;cursor:pointer;}img{max-width:calc(50% - 8px);min-width:160px;border-radius:8px;display:block;}figcaption{color:#888;font-size:10px;padding:3px 0 8px;}img.full{max-width:100%;min-width:0;}</style></head><body>';
  h+='<h2>'+titulo+'</h2><div class="g">';
  fotos.forEach(function(f,i){h+='<figure onclick="var im=this.querySelector(\'img\');im.classList.toggle(\'full\');"><img src="'+f.b64+'"><figcaption>Foto '+(i+1)+'</figcaption></figure>';});
  h+='</div></body></html>';
  w.document.write(h);w.document.close();
}

function subFotosBarra(fotos,arrName,idx,campo,rotulo){
  var n=fotos?fotos.length:0;
  var lidCam='sfcam_'+arrName+'_'+idx+'_'+campo;
  var lidGal='sfgal_'+arrName+'_'+idx+'_'+campo;
  var h='<div style="margin-top:10px;">';
  // Linha de botões Câmera + Galeria
  h+='<div style="display:flex;gap:8px;margin-bottom:6px;">';
  h+='<label for="'+lidCam+'" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#003580;color:#fff;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;">📷 Câmera</label>';
  h+='<input id="'+lidCam+'" type="file" accept="image/*" capture="environment" multiple style="display:none" onchange="subAddFotoMed(\''+arrName+'\','+idx+',\''+campo+'\',this)">';
  h+='<label for="'+lidGal+'" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#7c3aed;color:#fff;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;">🖼 Galeria</label>';
  h+='<input id="'+lidGal+'" type="file" accept="image/*" multiple style="display:none" onchange="subAddFotoMed(\''+arrName+'\','+idx+',\''+campo+'\',this)">';
  h+='</div>';
  // Estado das fotos
  if(!n){
    h+='<div style="text-align:center;font-size:11px;color:#94a3b8;padding:6px 0;">Nenhuma foto adicionada</div>';
  } else {
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    for(var fi=0;fi<n;fi++){
      h+='<div style="position:relative;">';
      h+='<img src="'+fotos[fi].b64+'" onclick="subVerFotosMed(\''+arrName+'\','+idx+',\''+campo+'\',\''+rotulo+'\')" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:2px solid #e2e8f0;cursor:pointer;">';
      h+='<button type="button" onclick="subDelFotoMed(\''+arrName+'\','+idx+',\''+campo+'\','+fi+')" style="position:absolute;top:-5px;right:-5px;background:#dc2626;color:#fff;border:none;border-radius:50%;width:17px;height:17px;font-size:10px;cursor:pointer;line-height:17px;text-align:center;padding:0;font-weight:700;">×</button>';
      h+='</div>';
    }
    h+='</div>';
    h+='<div style="text-align:right;margin-top:4px;"><button type="button" onclick="subVerFotosMed(\''+arrName+'\','+idx+',\''+campo+'\',\''+rotulo+'\')" style="font-size:10px;background:#dcfce7;color:#16a34a;border:none;border-radius:6px;padding:3px 10px;cursor:pointer;font-weight:700;">Ver todas ('+n+')</button></div>';
  }
  h+='</div>';
  return h;
}

// ── rFDados para subestação: seletor tipo ─────────────────────────────────────
function rFSubDados(c){
  subInit();
  var sub=F.sub;
  var d=F.d;
  var tipoSub=sub.tipo_sub||'AEREA';
  var tipoMan=sub.tipo_manutencao||'ANUAL';
  var reg=d.reg||(S.sessao?S.sessao.reg:'NORTE')||'NORTE';
  var sess=S.sessao||{};

  var h='';

  // ── Seletor principal: AÉREA / ABRIGADA ──
  h+='<div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;">';
  h+='<div style="font-size:11px;font-weight:800;color:rgba(255,255,255,.6);letter-spacing:.08em;margin-bottom:10px;">TIPO DE SUBESTAÇÃO</div>';
  h+='<div style="display:flex;gap:10px;">';
  [{v:'AEREA',ico:'🏗',desc:'Sem medições elétricas'},{v:'ABRIGADA',ico:'🏭',desc:'Com medições elétricas'}].forEach(function(op){
    var sel=tipoSub===op.v;
    h+='<button type="button" onclick="subSetTipo(\''+op.v+'\')" style="flex:1;border:2.5px solid '+(sel?'#f59e0b':'rgba(255,255,255,.15)')+';background:'+(sel?'#f59e0b':'rgba(255,255,255,.05)')+';color:'+(sel?'#1e293b':'#fff')+';border-radius:10px;padding:14px 8px;cursor:pointer;text-align:center;">';
    h+='<div style="font-size:20px;margin-bottom:4px;">'+op.ico+'</div>';
    h+='<div style="font-size:13px;font-weight:800;">'+op.v+'</div>';
    h+='<div style="font-size:9px;opacity:.8;margin-top:2px;">'+op.desc+'</div>';
    h+='</button>';
  });
  h+='</div>';
  h+='</div>';

  // ── Tipo de manutenção ──
  h+='<div class="card" style="margin-bottom:10px;">';
  h+='<div class="lbl">Tipo de Manutenção</div>';
  h+='<div style="display:flex;gap:8px;">';
  [{v:'ANUAL',l:'Preventiva Anual'},{v:'CORRETIVA',l:'Corretiva'}].forEach(function(op){
    var sel=tipoMan===op.v;
    h+='<button type="button" onclick="F.sub.tipo_manutencao=\''+op.v+'\';F.d.tipo_manutencao=\''+op.v+'\';rFe()" style="flex:1;border:2px solid '+(sel?'#b45309':'#e2e8f0')+';background:'+(sel?'#b45309':'#fff')+';color:'+(sel?'#fff':'#64748b')+';border-radius:8px;padding:10px;font-weight:700;font-size:12px;cursor:pointer;">'+op.l+'</button>';
  });
  h+='</div>';
  h+='</div>';

  // ── PVO (só ABRIGADA + ANUAL) ──
  if(tipoSub==='ABRIGADA'&&tipoMan==='ANUAL'){
    var pvo=d.tem_pvo||'NAO';
    h+='<div class="card" style="margin-bottom:10px;">';
    h+='<div class="lbl">Possui Disjuntor PVO?</div>';
    h+='<div style="display:flex;gap:8px;">';
    ['SIM','NAO'].forEach(function(op){
      var sel=pvo===op;
      h+='<button type="button" onclick="F.d.tem_pvo=\''+op+'\';rFe()" style="flex:1;border:2px solid '+(sel?'#b45309':'#e2e8f0')+';background:'+(sel?'#b45309':'#fff')+';color:'+(sel?'#fff':'#64748b')+';border-radius:8px;padding:8px;font-weight:700;font-size:12px;cursor:pointer;">'+op+'</button>';
    });
    h+='</div>';
    h+='</div>';
  }

  // ── Comarca / Edificação ──
  var polos=EDIFICACOES[reg]||{};
  var poloNames=Object.keys(polos).sort();
  var polo=d.polo||'';
  var edifs=polo&&polos[polo]?polos[polo]:[];

  h+='<div class="card" style="margin-bottom:10px;">';
  h+='<div class="lbl">Polo</div>';
  h+='<select onchange="F.d.polo=this.value;F.d.com=\'\';F.d.edif=\'\';rFe()" style="margin-bottom:8px;">';
  h+='<option value="">Selecione o polo...</option>';
  poloNames.forEach(function(p){h+='<option value="'+p+'"'+(polo===p?' selected':'')+'>'+p+'</option>';});
  h+='</select>';

  if(polo){
    var coms=[...new Set(edifs.map(function(e){return e.com;}))].sort();
    var com=d.com||'';
    h+='<div class="lbl">Comarca</div>';
    h+='<select onchange="F.d.com=this.value;F.d.edif=\'\';rFe()" style="margin-bottom:8px;">';
    h+='<option value="">Selecione a comarca...</option>';
    coms.forEach(function(x){h+='<option value="'+x+'"'+(com===x?' selected':'')+'>'+x+'</option>';});
    h+='</select>';
    if(com){
      var edificsLocal=edifs.filter(function(e){return e.com===com;});
      var edif=d.edif||'';
      h+='<div class="lbl">Edificação</div>';
      h+='<select onchange="F.d.edif=this.value;rFe()" style="margin-bottom:8px;">';
      h+='<option value="">Selecione a edificação...</option>';
      edificsLocal.forEach(function(e){h+='<option value="'+e.edif+'"'+(edif===e.edif?' selected':'')+'>'+e.edif+'</option>';});
      h+='</select>';
    }
  }
  h+='</div>';

  // ── Responsável + OS ──
  h+='<div class="card" style="margin-bottom:10px;">';
  h+='<div class="lbl">Responsável Técnico</div>';
  h+='<input value="'+(sub.responsavel||'')+'" oninput="F.sub.responsavel=this.value" placeholder="Nome do engenheiro responsável..." style="margin-bottom:8px;">';
  h+='<div class="lbl">Número da OS / Contrato</div>';
  h+='<input value="'+(d.os||'')+'" oninput="F.d.os=this.value" placeholder="Ex.: OS-0042 / Contrato 017/2026...">';
  h+='</div>';

  // ── Observações ──
  h+='<div class="card" style="margin-bottom:10px;">';
  h+='<div class="lbl">Observações Gerais</div>';
  h+='<textarea id="sub-obs-geral" oninput="F.sub.obs_geral=this.value" placeholder="Condições gerais da subestação..." style="min-height:60px;">'+(sub.obs_geral||'')+'</textarea>';
  h+='<button onclick="initVoice(el(\'sub-obs-geral\'),this)" style="border:none;border-radius:8px;padding:5px 10px;font-size:11px;background:#003580;color:#fff;cursor:pointer;margin-top:4px;width:100%;font-weight:700;">🎙️ Ditar por Voz</button>';
  h+='</div>';

  c.innerHTML=h;
}

// Função para mudar tipo e recalcular etapas
function subSetTipo(tipo){
  subInit();
  F.sub.tipo_sub=tipo;
  F.d.tipo_sub=tipo;
  subAtualizaEtapas();
  rFe();
}

// ── Checklist ─────────────────────────────────────────────────────────────────
function rFSubChecklist(c){
  subInit();
  var sub=F.sub;
  var tipoSub=sub.tipo_sub||'AEREA';
  var secoes=subSecoesVisiveis();
  var chk=sub.chk||{};
  var total=0,marcados=0;
  secoes.forEach(function(s){s.itens.forEach(function(it){total++;if(chk[it.id]&&chk[it.id].v)marcados++;});});
  var pct=total?Math.round(marcados/total*100):0;
  var pCor=pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626';

  var h='';

  // Badge tipo + progresso
  h+='<div style="background:#1e293b;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">';
  h+='<span style="background:'+(tipoSub==='ABRIGADA'?'#f59e0b':'#64748b')+';color:#fff;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800;">'+(tipoSub==='ABRIGADA'?'🏭 ABRIGADA':'🏗 AÉREA')+'</span>';
  h+='<div style="flex:1;">';
  h+='<div class="pb" style="margin:0;"><div class="pf" style="width:'+pct+'%;background:'+pCor+';"></div></div>';
  h+='<div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:3px;">'+marcados+'/'+total+' itens verificados ('+pct+'%)</div>';
  h+='</div>';
  h+='<span style="font-size:18px;font-weight:900;color:'+pCor+';">'+pct+'%</span>';
  h+='</div>';

  // Seções
  secoes.forEach(function(s){
    var sm=s.itens.filter(function(it){return chk[it.id]&&chk[it.id].v;}).length;
    var sOk=sm===s.itens.length;
    h+='<div style="background:#fff;border-radius:12px;border:1.5px solid '+(sOk?'#16a34a':'#e2e8f0')+';margin-bottom:14px;flex-shrink:0;">';
    // Header seção
    /* v92: badge de foto obrigatória por seção */
    var _fotoReq = typeof SUB_CHECKLIST !== 'undefined' ? SUB_CHECKLIST.find(function(sc){return sc.sec===s.id;}) : null;
    var _temFotoReq = _fotoReq && _fotoReq.fotoObrigatoria && _fotoReq.fotoObrigatoria.length;
    var _fotosCont = s.itens.reduce(function(t,it){var ck=chk[it.id]||{};return t+((ck.fotos||[]).length);},0);
    h+='<div style="background:'+(sOk?'#f0fdf4':'#f8fafc')+';padding:10px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid '+(sOk?'#bbf7d0':'#e2e8f0')+'">';
    h+='<div style="background:#b45309;color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:800;">'+s.id+'</div>';
    h+='<div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#1e293b;">'+s.n+'</div>';
    if(_temFotoReq) h+='<div style="font-size:9px;color:#dc2626;font-weight:700;margin-top:2px;">📸 Foto obrigatória: '+_fotoReq.fotoObrigatoria.join(', ')+(_fotosCont>0?' — '+_fotosCont+' foto(s)':'')+'</div>';
    h+='</div>';
    h+='<span style="font-size:11px;font-weight:700;color:'+(sOk?'#16a34a':'#94a3b8')+';">'+sm+'/'+s.itens.length+'</span>';
    if(sOk)h+='<span style="font-size:14px;">✅</span>';
    h+='</div>';
    // Itens — todos expandidos
    s.itens.forEach(function(it){
      var ck=chk[it.id]||{v:false,obs:'',fotos:[],_obsOpen:false};
      var nf=ck.fotos?ck.fotos.length:0;
      var vOk=ck.v;
      var chkBg=vOk?'#16a34a':'#fff';
      var chkBd=vOk?'#16a34a':'#cbd5e1';
      var fidCam='chkfc_'+it.id.replace(/[^a-z0-9]/gi,'_');
      var fidGal='chkfg_'+it.id.replace(/[^a-z0-9]/gi,'_');
      h+='<div style="padding:10px 14px;border-bottom:1px solid #f0f4f8;background:'+(vOk?'#f0fdf4':'#fff')+';display:block;">';

      // ── Linha 1: checkbox + texto ──
      h+='<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">';
      h+='<button type="button" onclick="subToggleItem(\''+it.id+'\')" style="width:26px;height:26px;min-width:26px;border-radius:7px;border:2.5px solid '+chkBd+';background:'+chkBg+';display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:#fff;margin-top:1px;flex-shrink:0;">'+(vOk?'&#10003;':'')+'</button>';
      h+='<div style="flex:1;font-size:13px;font-weight:600;color:'+(vOk?'#16a34a':'#1e293b')+';line-height:1.5;'+(vOk?'text-decoration:line-through;opacity:.7;':'')+'">'+it.d+'</div>';
      h+='</div>';

      // ── Linha 2: textarea Obs ──
      h+='<textarea oninput="if(!F.sub.chk[\''+it.id+'\'])F.sub.chk[\''+it.id+'\']={}; F.sub.chk[\''+it.id+'\'].obs=this.value" placeholder="Observações..." style="width:100%;min-height:44px;max-height:120px;font-size:12px;border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;resize:vertical;background:#f8fafc;color:#374151;margin-bottom:8px;">'+(ck.obs||'')+'</textarea>';

      // ── Linha 3: botões câmera/galeria + miniaturas ──
      h+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
      h+='<label for="'+fidCam+'" style="display:flex;align-items:center;gap:5px;background:#003580;color:#fff;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">📷 Câmera</label>';
      h+='<input id="'+fidCam+'" type="file" accept="image/*" capture="environment" multiple style="display:none" onchange="subAddFoto(\''+it.id+'\',this)">';
      h+='<label for="'+fidGal+'" style="display:flex;align-items:center;gap:5px;background:#7c3aed;color:#fff;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">🖼 Galeria</label>';
      h+='<input id="'+fidGal+'" type="file" accept="image/*" multiple style="display:none" onchange="subAddFoto(\''+it.id+'\',this)">';
      if(!nf){
        h+='<span style="font-size:11px;color:#94a3b8;font-style:italic;">Nenhuma foto</span>';
      } else {
        for(var fi2=0;fi2<nf;fi2++){
          h+='<div style="position:relative;flex-shrink:0;">';
          h+='<img src="'+ck.fotos[fi2].b64+'" onclick="subVerFotos(\''+it.id+'\')" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:2px solid #e2e8f0;cursor:pointer;display:block;">';
          h+='<button type="button" onclick="if(F.sub.chk[\''+it.id+'\']&&F.sub.chk[\''+it.id+'\'].fotos)F.sub.chk[\''+it.id+'\'].fotos.splice('+fi2+',1);rFe()" style="position:absolute;top:-5px;right:-5px;background:#dc2626;color:#fff;border:none;border-radius:50%;width:16px;height:16px;font-size:10px;cursor:pointer;line-height:16px;text-align:center;padding:0;font-weight:700;">×</button>';
          h+='</div>';
        }
        if(nf>1)h+='<button type="button" onclick="subVerFotos(\''+it.id+'\')" style="font-size:10px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:7px;padding:5px 9px;cursor:pointer;font-weight:700;flex-shrink:0;">Ver '+nf+'</button>';
      }
      h+='</div>';

      h+='</div>';
    });
    h+='</div>';
  });

  // NCs
  h+='<div style="background:#fff;border-radius:12px;border:1.5px solid #fca5a5;padding:12px;margin-bottom:8px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#dc2626;margin-bottom:8px;">⚠️ Não Conformidades e Ações Corretivas</div>';
  h+='<div class="lbl">Não Conformidades Identificadas</div>';
  h+='<textarea oninput="F.sub.nc=this.value" placeholder="Anomalias, pontos de atenção, irregularidades encontradas..." style="margin-bottom:8px;min-height:72px;">'+(sub.nc||'')+'</textarea>';
  h+='<div class="lbl">Ações Corretivas Tomadas / Programadas</div>';
  h+='<textarea oninput="F.sub.acoes=this.value" placeholder="Ações executadas ou agendadas para correção..." style="min-height:72px;">'+(sub.acoes||'')+'</textarea>';
  h+='</div>';

  // Empacotar em wrapper block para sair do flex column do .scrl
  c.innerHTML='<div style="display:block;width:100%;">'+h+'</div>';
}

// ── Medições Elétricas (só ABRIGADA) ─────────────────────────────────────────
function rFSubMedicoes(c){
  subInit();
  var sub=F.sub;
  var h='<div style="font-size:15px;font-weight:800;margin-bottom:14px;">⚡ Medições Elétricas</div>';

  // 1. Transformadores
  h+='<div style="background:#003580;border-radius:12px 12px 0 0;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;">';
  h+='<span style="color:#fff;font-size:13px;font-weight:800;">1. TRANSFORMADORES</span>';
  h+='<button type="button" onclick="subAddTrafo()" style="border:1.5px solid rgba(255,255,255,.4);background:transparent;color:#fff;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">+ ADD</button>';
  h+='</div>';
  h+='<div style="background:#fff;border-radius:0 0 12px 12px;border:1.5px solid #e2e8f0;border-top:none;margin-bottom:12px;">';
  for(var ti=0;ti<sub.trafos.length;ti++)h+=subRenderTrafo(sub.trafos[ti],ti);
  h+='</div>';

  // 2. Disjuntores
  h+='<div style="background:#1e3a5f;border-radius:12px 12px 0 0;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;">';
  h+='<span style="color:#fff;font-size:13px;font-weight:800;">2. DISJUNTORES DE MÉDIA TENSÃO</span>';
  h+='<button type="button" onclick="subAddDisj()" style="border:1.5px solid rgba(255,255,255,.4);background:transparent;color:#fff;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">+ ADD</button>';
  h+='</div>';
  h+='<div style="background:#fff;border-radius:0 0 12px 12px;border:1.5px solid #e2e8f0;border-top:none;margin-bottom:12px;">';
  for(var di=0;di<sub.disjs.length;di++)h+=subRenderDisj(sub.disjs[di],di);
  h+='</div>';

  // 3. Seccionadoras
  h+='<div style="background:#1a4731;border-radius:12px 12px 0 0;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;">';
  h+='<span style="color:#fff;font-size:13px;font-weight:800;">3. CHAVES SECCIONADORAS</span>';
  h+='<button type="button" onclick="subAddSecc()" style="border:1.5px solid rgba(255,255,255,.4);background:transparent;color:#fff;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">+ ADD</button>';
  h+='</div>';
  h+='<div style="background:#fff;border-radius:0 0 12px 12px;border:1.5px solid #e2e8f0;border-top:none;margin-bottom:12px;">';
  for(var si=0;si<sub.secc.length;si++)h+=subRenderSecc(sub.secc[si],si);
  h+='</div>';

  c.innerHTML=h;
}

// ── Helpers de inputs numéricos ───────────────────────────────────────────────
/* v92-fix: _iCor, _iLbl, _iCorMax, _iLblMax — DEFINIDOS AQUI (nunca chegaram ao utils.js) */
function _iCor(val,min){
  if(!val&&val!==0)return '#e2e8f0';
  var n=parseFloat(val);
  if(isNaN(n))return '#e2e8f0';
  return n>=min?'#16a34a':'#dc2626';
}
function _iLbl(val,min){
  if(!val&&val!==0)return 'medir';
  var n=parseFloat(val);
  if(isNaN(n))return 'medir';
  return n>=min?'✓ OK (≥'+min+')':'✗ ABAIXO (mín. '+min+')';
}
function _iCorMax(val,warn,crit){
  if(!val&&val!==0)return '#e2e8f0';
  var n=parseFloat(val);
  if(isNaN(n))return '#e2e8f0';
  if(n>crit)return '#dc2626';
  if(n>warn)return '#d97706';
  return '#16a34a';
}
function _iLblMax(val,warn,crit){
  if(!val&&val!==0)return 'medir';
  var n=parseFloat(val);
  if(isNaN(n))return 'medir';
  if(n>crit)return '✗ CRÍTICO (>'+crit+')';
  if(n>warn)return '⚠ ATENÇÃO (>'+warn+')';
  return '✓ OK (≤'+warn+')';
}
function _inp(label,val,path,unit){
  return '<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">'+label+'</div><div style="display:flex;align-items:center;gap:4px;"><input value="'+(val||'')+'" oninput="'+path+'=this.value;rFe()" type="text" inputmode="decimal" style="flex:1;border-radius:6px;border:1px solid #e2e8f0;padding:7px 6px;font-size:13px;font-weight:700;min-width:0;"><span style="font-size:10px;color:#64748b;font-weight:700;flex-shrink:0;">'+unit+'</span></div></div>';
}
function _inpMin(label,val,path,unit,min){
  var cor=_iCor(val,min);
  return '<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">'+label+'</div><div style="display:flex;align-items:center;gap:4px;"><input value="'+(val||'')+'" oninput="'+path+'=this.value;rFe()" type="text" inputmode="decimal" style="flex:1;border-radius:6px;border:1px solid '+cor+';padding:7px 6px;font-size:13px;font-weight:700;min-width:0;"><span style="font-size:10px;color:#64748b;font-weight:700;flex-shrink:0;">'+unit+'</span></div><div style="font-size:9px;color:'+cor+';margin-top:2px;font-weight:700;">'+_iLbl(val,min)+'</div></div>';
}
function _inpMax(label,val,path,unit,warn,crit){
  var cor=_iCorMax(val,warn,crit);
  return '<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">'+label+'</div><div style="display:flex;align-items:center;gap:4px;"><input value="'+(val||'')+'" oninput="'+path+'=this.value;rFe()" type="text" inputmode="decimal" style="flex:1;border-radius:6px;border:1px solid '+cor+';padding:7px 6px;font-size:13px;font-weight:700;min-width:0;"><span style="font-size:10px;color:#64748b;font-weight:700;flex-shrink:0;">'+unit+'</span></div><div style="font-size:9px;color:'+cor+';margin-top:2px;font-weight:700;">'+_iLblMax(val,warn,crit)+'</div></div>';
}
function _secHdr(titulo,cor){
  return '<div style="font-size:11px;font-weight:800;color:'+cor+';background:#f8fafc;border-radius:8px;padding:8px 12px;margin-bottom:8px;border-left:3px solid '+cor+';">'+titulo+'</div>';
}

// ── Render Transformador ──────────────────────────────────────────────────────
function subRenderTrafo(tr,idx){
  var p='F.sub.trafos['+idx+']';
  var at=_spf(tr.at),bt=_spf(tr.bt);
  var teo=at&&bt?(at*1000/bt):0;
  var h='<div style="padding:14px;border-bottom:1px solid #f0f4f8;">';
  h+='<div style="font-size:12px;font-weight:800;color:#b45309;border-bottom:2px solid #b45309;padding-bottom:6px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">';
  h+='TRANSFORMADOR #'+(idx+1);
  if(idx>0)h+='<button type="button" onclick="F.sub.trafos.splice('+idx+',1);rFe()" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;font-size:10px;color:#dc2626;cursor:pointer;">Remover</button>';
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
  h+='<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">REF</div><input value="'+(tr.ref||'')+'" oninput="'+p+'.ref=this.value" style="border:1px solid #e2e8f0;border-radius:6px;padding:7px 8px;font-size:13px;font-weight:700;width:100%;"></div>';
  h+='<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">POTÊNCIA (kVA)</div><input value="'+(tr.kva||'')+'" oninput="'+p+'.kva=this.value" type="text" inputmode="decimal" style="border:1px solid #e2e8f0;border-radius:6px;padding:7px 8px;font-size:13px;font-weight:700;width:100%;"></div>';
  h+='<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">AT (kV)</div><input value="'+(tr.at||'')+'" oninput="'+p+'.at=this.value;rFe()" type="text" inputmode="decimal" style="border:1px solid #e2e8f0;border-radius:6px;padding:7px 8px;font-size:13px;font-weight:700;width:100%;"></div>';
  h+='<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">BT (V)</div><input value="'+(tr.bt||'')+'" oninput="'+p+'.bt=this.value;rFe()" type="text" inputmode="decimal" style="border:1px solid #e2e8f0;border-radius:6px;padding:7px 8px;font-size:13px;font-weight:700;width:100%;"></div>';
  h+='</div>';
  if(teo){
    h+='<div style="background:linear-gradient(135deg,#003580,#1d4ed8);border-radius:10px;padding:12px 14px;margin-bottom:12px;">';
    h+='<div style="font-size:10px;font-weight:800;color:rgba(255,255,255,.7);letter-spacing:.06em;margin-bottom:6px;">RELAÇÃO TEÓRICA — IEC 60076</div>';
    h+='<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">';
    h+='<span style="font-size:20px;font-weight:900;color:#fff;">a = '+teo.toFixed(4)+'</span>';
    h+='<span style="font-size:11px;color:rgba(255,255,255,.7);">= '+(at*1000).toFixed(0)+' V ÷ '+bt+' V</span>';
    h+='</div>';
    h+='<div style="background:rgba(255,255,255,.12);border-radius:6px;padding:6px 10px;">';
    h+='<span style="font-size:10px;color:rgba(255,255,255,.8);font-weight:600;">Faixa ±0,5%: </span>';
    h+='<span style="font-size:12px;font-weight:800;color:#fbbf24;">'+(teo*0.995).toFixed(4)+' até '+(teo*1.005).toFixed(4)+'</span>';
    h+='</div></div>';
  }
  h+=_secHdr('RELAÇÃO DE TRANSFORMAÇÃO (TTR) — DESVIO MÁX. ±0,5% (IEC 60076)','#1d4ed8');
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">';
  var pts=['x1','x2','x3'];
  for(var pi=0;pi<pts.length;pi++){
    var pt=pts[pi];var vRaw=tr['ttr_'+pt]||'';var v=_spf(vRaw);
    var ok=!v||!teo?null:(Math.abs((v-teo)/teo)<=0.005);
    var desvio=v&&teo?((v-teo)/teo*100).toFixed(3)+'%':'—';
    var cor=ok===null?'#e2e8f0':ok?'#16a34a':'#dc2626';
    h+='<div><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:3px;">X'+(pi+1)+'-T</div>';
    h+='<input value="'+vRaw+'" oninput="'+p+'.ttr_'+pt+'=this.value;rFe()" type="text" inputmode="decimal" style="border:1px solid '+cor+';border-radius:6px;padding:7px 8px;font-size:13px;font-weight:700;width:100%;">';
    h+='<div style="font-size:9px;margin-top:2px;display:flex;gap:4px;"><span style="color:'+cor+';font-weight:700;">'+(ok===null?'medir':ok?'✓ OK':'✗ FORA')+'</span>'+(v&&teo?'<span style="color:#64748b;">desvio: '+desvio+'</span>':'')+'</div></div>';
  }
  h+='</div>';
  h+=subFotosBarra(tr.fotos_ttr,'trafos',idx,'fotos_ttr','TTR — Trafo #'+(idx+1));
  h+=_secHdr('ISOLAÇÃO MEGÔMETRO — AT ≥ 100 MΩ | BT ≥ 10 MΩ (NBR 5356)','#0369a1');
  h+='<div style="font-size:10px;font-weight:700;color:#0369a1;margin-bottom:4px;">BT → Terra (X-T)</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">';
  h+=_inpMin('X1-T',tr.iso_x1t,p+'.iso_x1t','MΩ',10);
  h+=_inpMin('X2-T',tr.iso_x2t,p+'.iso_x2t','MΩ',10);
  h+=_inpMin('X3-T',tr.iso_x3t,p+'.iso_x3t','MΩ',10);
  h+='</div>';
  h+='<div style="font-size:10px;font-weight:700;color:#0369a1;margin-bottom:4px;">AT → Terra (H-T)</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">';
  h+=_inpMin('H1-T',tr.iso_h1t,p+'.iso_h1t','MΩ',100);
  h+=_inpMin('H2-T',tr.iso_h2t,p+'.iso_h2t','MΩ',100);
  h+=_inpMin('H3-T',tr.iso_h3t,p+'.iso_h3t','MΩ',100);
  h+='</div>';
  h+='<div style="font-size:10px;font-weight:700;color:#0369a1;margin-bottom:4px;">AT → BT (H-X)</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">';
  h+=_inpMin('H1-X1',tr.iso_h1x1,p+'.iso_h1x1','MΩ',10);
  h+=_inpMin('H2-X2',tr.iso_h2x2,p+'.iso_h2x2','MΩ',10);
  h+=_inpMin('H3-X3',tr.iso_h3x3,p+'.iso_h3x3','MΩ',10);
  h+='</div>';
  h+=subFotosBarra(tr.fotos_iso,'trafos',idx,'fotos_iso','Isolação — Trafo #'+(idx+1));
  h+=_secHdr('RESISTÊNCIA ÔHMICA — VARIAÇÃO MÁX. 3% (NBR 5356)','#7c3aed');
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px;">';
  h+=_inp('X1-X0',tr.ohm_x1x0,p+'.ohm_x1x0','µΩ');h+=_inp('X2-X0',tr.ohm_x2x0,p+'.ohm_x2x0','µΩ');h+=_inp('X3-X0',tr.ohm_x3x0,p+'.ohm_x3x0','µΩ');
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">';
  h+=_inp('H1-H2',tr.ohm_h1h2,p+'.ohm_h1h2','µΩ');h+=_inp('H1-H3',tr.ohm_h1h3,p+'.ohm_h1h3','µΩ');h+=_inp('H2-H3',tr.ohm_h2h3,p+'.ohm_h2h3','µΩ');
  h+='</div>';
  var h12=_spf(tr.ohm_h1h2),h13=_spf(tr.ohm_h1h3),h23=_spf(tr.ohm_h2h3);
  if(h12&&h13&&h23){
    var mx=Math.max(h12,h13,h23),mn=Math.min(h12,h13,h23);
    var vp=mn>0?((mx/mn-1)*100).toFixed(2):null;
    var vo=vp!==null&&parseFloat(vp)<=3;
    h+='<div style="background:'+(vo?'#dcfce7':'#fee2e2')+';border-radius:8px;padding:10px 12px;margin-bottom:6px;font-weight:800;color:'+(vo?'#16a34a':'#dc2626')+';">Variação ôhmica: '+(vp!==null?vp+'%':'—')+' '+(vo?'✓ Conforme':'✗ FORA (> 3%)')+'</div>';
  } else {
    h+='<div style="background:#f8fafc;border-radius:8px;padding:8px 12px;font-size:11px;color:#94a3b8;margin-bottom:6px;">Preencha H1-H2, H1-H3 e H2-H3 para calcular variação</div>';
  }
  h+=subFotosBarra(tr.fotos_ohm,'trafos',idx,'fotos_ohm','Ôhmica — Trafo #'+(idx+1));
  h+='</div>';
  return h;
}

// ── Render Disjuntor ──────────────────────────────────────────────────────────
function subRenderDisj(dj,idx){
  var p='F.sub.disjs['+idx+']';
  var h='<div style="padding:14px;border-bottom:1px solid #f0f4f8;">';
  h+='<div style="font-size:12px;font-weight:800;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:6px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">DISJUNTOR #'+(idx+1);
  if(idx>0)h+='<button type="button" onclick="F.sub.disjs.splice('+idx+',1);rFe()" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;font-size:10px;color:#dc2626;cursor:pointer;">Remover</button>';
  h+='</div>';
  h+='<div class="lbl" style="margin-bottom:6px;">TIPO</div><div style="display:flex;gap:6px;margin-bottom:12px;">';
  var tps=['VACUO','PVO','SF6'];
  for(var ti=0;ti<tps.length;ti++){var t=tps[ti];var sel=(dj.tipo||'VACUO')===t;h+='<button type="button" onclick="'+p+'.tipo=\''+t+'\';rFe()" style="flex:1;border:2px solid '+(sel?'#1e3a5f':'#e2e8f0')+';background:'+(sel?'#1e3a5f':'#fff')+';color:'+(sel?'#fff':'#64748b')+';border-radius:8px;padding:6px;font-weight:700;font-size:11px;cursor:pointer;">'+t+'</button>';}
  h+='</div>';
  h+='<input value="'+(dj.obs||'')+'" oninput="'+p+'.obs=this.value" placeholder="Observações..." style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;padding:8px;width:100%;font-size:13px;">';
  h+=_secHdr('ISOLAÇÃO — ABERTO (mín. 1000 MΩ) e FECHADO fase-terra (mín. 1000 MΩ) — IEC 62271-100','#1e3a5f');
  h+='<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">ABERTO</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">';
  h+=_inpMin('R',dj.ab_r,p+'.ab_r','MΩ',1000);h+=_inpMin('S',dj.ab_s,p+'.ab_s','MΩ',1000);h+=_inpMin('T',dj.ab_t,p+'.ab_t','MΩ',1000);
  h+='</div>';
  h+='<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">FECHADO</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">';
  h+=_inpMin('R',dj.fe_r,p+'.fe_r','MΩ',1000);h+=_inpMin('S',dj.fe_s,p+'.fe_s','MΩ',1000);h+=_inpMin('T',dj.fe_t,p+'.fe_t','MΩ',1000);
  h+='</div>';
  h+=subFotosBarra(dj.fotos_iso,'disjs',idx,'fotos_iso','Isolação — Disj. #'+(idx+1));
  h+=_secHdr('RESISTÊNCIA DE CONTATO — ≤ 200 µΩ (atenção) | ≤ 300 µΩ (crítico) — IEC 62271-100','#dc2626');
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">';
  h+=_inpMax('R1-R2',dj.cr,p+'.cr','µΩ',200,300);h+=_inpMax('S1-S2',dj.cs,p+'.cs','µΩ',200,300);h+=_inpMax('T1-T2',dj.ct,p+'.ct','µΩ',200,300);
  h+='</div>';
  h+=subFotosBarra(dj.fotos_cr,'disjs',idx,'fotos_cr','Resistência Contato — Disj. #'+(idx+1));
  h+='</div>';return h;
}

// ── Render Seccionadora ───────────────────────────────────────────────────────
function subRenderSecc(sc,idx){
  var p='F.sub.secc['+idx+']';
  var h='<div style="padding:14px;border-bottom:1px solid #f0f4f8;">';
  h+='<div style="font-size:12px;font-weight:800;color:#1a4731;border-bottom:2px solid #1a4731;padding-bottom:6px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">CHAVE SECCIONADORA #'+(idx+1);
  if(idx>0)h+='<button type="button" onclick="F.sub.secc.splice('+idx+',1);rFe()" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;font-size:10px;color:#dc2626;cursor:pointer;">Remover</button>';
  h+='</div>';
  h+='<input value="'+(sc.obs||'')+'" oninput="'+p+'.obs=this.value" placeholder="Observações..." style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;padding:8px;width:100%;font-size:13px;">';
  h+=_secHdr('ISOLAÇÃO — ABERTA (mín. 1000 MΩ) e FECHADA fase-terra (mín. 1000 MΩ) — IEC 62271-102','#1a4731');
  h+='<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">ABERTA</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">';
  h+=_inpMin('R1-R2',sc.ab_r,p+'.ab_r','MΩ',1000);h+=_inpMin('S1-S2',sc.ab_s,p+'.ab_s','MΩ',1000);h+=_inpMin('T1-T2',sc.ab_t,p+'.ab_t','MΩ',1000);
  h+='</div>';
  h+='<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">FECHADA</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">';
  h+=_inpMin('R1-R2',sc.fe_r,p+'.fe_r','MΩ',1000);h+=_inpMin('S1-S2',sc.fe_s,p+'.fe_s','MΩ',1000);h+=_inpMin('T1-T2',sc.fe_t,p+'.fe_t','MΩ',1000);
  h+='</div>';
  h+=subFotosBarra(sc.fotos_iso,'secc',idx,'fotos_iso','Isolação — Chave #'+(idx+1));
  h+=_secHdr('RESISTÊNCIA DE CONTATO — ≤ 200 µΩ (atenção) | ≤ 500 µΩ (crítico) — IEC 62271-102','#dc2626');
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">';
  h+=_inpMax('R1-R2',sc.cr,p+'.cr','µΩ',200,500);h+=_inpMax('S1-S2',sc.cs,p+'.cs','µΩ',200,500);h+=_inpMax('T1-T2',sc.ct,p+'.ct','µΩ',200,500);
  h+='</div>';
  h+=subFotosBarra(sc.fotos_cr,'secc',idx,'fotos_cr','Resistência Contato — Chave #'+(idx+1));
  h+='</div>';return h;
}

// ── Export HTML ───────────────────────────────────────────────────────────────

function rFConc(c){
  if(F.tipo==='subestacao'){
    var sub=F.sub||{};var secoes=SUB_SECOES.filter(function(s){if(s.sempre)return true;var anual=(sub.tipo_manutencao||'ANUAL')==='ANUAL',abrigada=(sub.tipo_sub||'ABRIGADA')==='ABRIGADA',trimestral=(sub.tipo_manutencao||'ANUAL')==='TRIMESTRAL';if(s.anual&&!anual)return false;if(s.abrigada&&!abrigada)return false;if(s.trimestral&&!trimestral)return false;return true;});
    var totalItens=0,marcados=0;var chk=sub.chk||{};secoes.forEach(function(s){s.itens.forEach(function(it){totalItens++;if(chk[it.id]&&chk[it.id].v)marcados++;});});
    var pct=totalItens?Math.round(marcados/totalItens*100):0;var pctCor=pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626';
    var h='<div style="font-size:14px;font-weight:800;margin-bottom:12px;">Concluir Inspecao de Subestacao</div>';
    if(!F.d.com||!F.d.com.trim())h+='<div style="background:#fee2e2;border-radius:10px;padding:10px;margin-bottom:10px;font-size:12px;color:#b91c1c;">Comarca nao selecionada — volte a aba Dados</div>';
    h+='<div class="card" style="margin-bottom:12px;border-left:4px solid '+pctCor+';"><div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:4px;">CHECKLIST ANEXO B.1</div><div style="font-size:26px;font-weight:900;color:'+pctCor+';">'+pct+'% <span style="font-size:12px;font-weight:600;color:#64748b;">('+marcados+'/'+totalItens+' itens)</span></div><div class="pb" style="margin-top:8px;"><div class="pf" style="width:'+pct+'%;background:'+pctCor+';"></div></div></div>';
    h+='<div class="card" style="margin-bottom:12px;"><div style="font-size:12px;color:#374151;margin-bottom:3px;"><b>Tipo:</b> '+(sub.tipo_sub||'—')+' | <b>Manutencao:</b> '+(sub.tipo_manutencao||'—')+'</div><div style="font-size:12px;color:#374151;"><b>Responsavel:</b> '+(sub.responsavel||'—')+'</div></div>';
    h+='<button class="btn" style="background:#b45309;color:#fff;margin-bottom:8px;" onclick="exportHTMLSub(\''+F.id+'\')">Exportar HTML</button>';
    h+='<button class="btn" style="background:#1a2332;color:#fff;margin-bottom:8px;" onclick="exportPDFSub(\''+F.id+'\')">📄 Exportar PDF</button>';
    if(F.d.com&&F.d.com.trim())h+='<button class="btn bg2" onclick="finalizarI(\''+F.id+'\')">Finalizar e Salvar</button>';
    c.innerHTML=h;return;
  }
  var erros=[];
  var _regComPolo=['NORTE','CENTRAL','LESTE','ZONA_MATA'];if(!F.d.polo&&_regComPolo.indexOf(F.d.reg||'')>=0)erros.push('Polo não selecionado');
  if(!F.d.com.trim())erros.push('Comarca não selecionada');
  if(!F.d.edif.trim())erros.push('Edificação não selecionada');
  var _ospC=F.tipo==='ose'||F.tipo==='programada'||F.tipo==='osp';
  var _isPron=F.tipo==='prontuario';
  if(_ospC){
    if(!F.d.os.trim())erros.push(F.tipo==='ose'?'Número da OSE obrigatório':'Número da OSP obrigatório');
    if(F.tipo==='osp'&&!F.d.dtInicioExec)erros.push('Data de Início de Execução obrigatória');
    if(F.tipo==='osp'&&!F.d.diasPrazo)erros.push('Prazo de execução (dias) obrigatório');
    if(!F.d.descricao.trim())erros.push('Descrição obrigatória');
    if(!(F.sistemas||[]).length)erros.push('Selecione ao menos um sistema');
  }
  var ok=!erros.length;
  var _resumo='';
  if(_ospC){
    var _ativSelKeys=F.ativSel||{};
    var _hasSel=Object.keys(_ativSelKeys).some(function(k){return !!_ativSelKeys[k];});
    /* Filtra só os itens das atividades selecionadas na etapa Sel. Atividades */
    /* key format: "<inspId>_<sistId>.<ativNum>" ex: "abc123_1.1" */
    var _its=oentries(F.itens).filter(function(e){
      var _key=e[0]; var _it=e[1];
      if(!_hasSel) return _it.s!=='nao_aplicavel';
      /* Remove o prefixo do id da inspeção: tudo antes do primeiro "_" seguido de dígito */
      var _aid=_key.replace(/^[^_]*_/,'');
      return !!_ativSelKeys[_aid];
    }).map(function(e){return e[1];});
    var _ex2=_its.filter(function(x){return x.s==='executado';}).length;
    var _ne=_its.filter(function(x){return x.s==='nao_executado';}).length;
    var _pe=_its.filter(function(x){return x.s==='pendente';}).length;
    var _pc=_its.length?Math.round(_ex2/_its.length*100):0;
    _resumo='<div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:14px;">'
      +'<div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;">Resumo das Atividades</div>'
      +'<div style="display:flex;gap:8px;">'
      +'<div style="flex:1;text-align:center;background:#dcfce7;border-radius:8px;padding:8px;"><div style="font-size:18px;font-weight:900;color:#16a34a;">'+_ex2+'</div><div style="font-size:9px;color:#64748b;">Executadas</div></div>'
      +'<div style="flex:1;text-align:center;background:#fee2e2;border-radius:8px;padding:8px;"><div style="font-size:18px;font-weight:900;color:#dc2626;">'+_ne+'</div><div style="font-size:9px;color:#64748b;">Não Exec.</div></div>'
      +'<div style="flex:1;text-align:center;background:#fef3c7;border-radius:8px;padding:8px;"><div style="font-size:18px;font-weight:900;color:#d97706;">'+_pe+'</div><div style="font-size:9px;color:#64748b;">Pendentes</div></div>'
      +'<div style="flex:1;text-align:center;background:#dbeafe;border-radius:8px;padding:8px;"><div style="font-size:18px;font-weight:900;color:#2563eb;">'+_pc+'%</div><div style="font-size:9px;color:#64748b;">Execução</div></div>'
      +'</div></div>';
  }
  var h='<div style="font-size:15px;font-weight:800;margin-bottom:12px;">Concluir</div>';
  if(F.tipo==='osp'&&(F.d.dtInicioExec||F.d.dtFinalExec)){
    h+='<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:12px 14px;margin-bottom:12px;">';
    h+='<div style="font-size:11px;font-weight:800;color:#0f766e;margin-bottom:6px;">📅 Prazos da OS</div>';
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    if(F.d.dtInicioExec)h+='<div style="flex:1;background:#fff;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:10px;color:#64748b;">Início Execução</div><div style="font-size:12px;font-weight:700;color:#0f766e;">'+fdt(F.d.dtInicioExec)+'</div></div>';
    if(F.d.diasPrazo)h+='<div style="flex:1;background:#fff;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:10px;color:#64748b;">Prazo</div><div style="font-size:12px;font-weight:700;color:#0f766e;">'+F.d.diasPrazo+' dias</div></div>';
    if(F.d.dtFinalExec)h+='<div style="flex:1;background:#fff;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:10px;color:#64748b;">Data Final</div><div style="font-size:12px;font-weight:700;color:#15803d;">'+fdt(F.d.dtFinalExec)+'</div></div>';
    h+='</div></div>';
  }
  if(ok){h+='<div style="background:#dcfce7;border-radius:14px;padding:20px;text-align:center;margin-bottom:16px;"><div style="font-size:36px;margin-bottom:8px;">&#9989;</div><div style="font-size:15px;font-weight:800;color:#16a34a;">'+( F.tipo==='osp' ? 'Ordem de Serviço Programada Completa!' : 'Relatório completo!' )+'</div></div>';}
  else{h+='<div style="background:#fff7ed;border-radius:14px;padding:14px;margin-bottom:16px;border:1.5px solid #fed7aa;"><div style="font-size:13px;font-weight:800;color:#d97706;margin-bottom:8px;">Pendências</div>';erros.forEach(function(e){h+='<div style="font-size:12px;color:#92400e;margin-bottom:4px;">• '+e+'</div>';});h+='</div>';}
  h+=_resumo;
  /* v79: campos de texto livre com voz na etapa Concluir */
  if(!_isPron&&F.tipo!=='osp'&&F.tipo!=='subestacao'){
    h+='<div class="card" style="margin-bottom:10px;">';
    h+='<div class="lbl">Atividades Realizadas</div>';
    h+='<textarea id="fc-ativ" oninput="F.ativ=this.value" placeholder="Descreva as atividades realizadas..." style="min-height:60px;">'+((F.ativ)||'')+'</textarea>';
    h+='<button onclick="initVoice(el(\'fc-ativ\'),this)" style="border:none;border-radius:8px;padding:5px 10px;font-size:11px;background:#003580;color:#fff;cursor:pointer;margin-top:4px;width:100%;font-weight:700;">🎙️ Ditar</button>';
    h+='</div>';
    h+='<div class="card" style="margin-bottom:10px;">';
    h+='<div class="lbl">Causas / Observações</div>';
    h+='<textarea id="fc-causas" oninput="F.causas=this.value" placeholder="Causas identificadas, observações técnicas..." style="min-height:60px;">'+((F.causas)||'')+'</textarea>';
    h+='<button onclick="initVoice(el(\'fc-causas\'),this)" style="border:none;border-radius:8px;padding:5px 10px;font-size:11px;background:#003580;color:#fff;cursor:pointer;margin-top:4px;width:100%;font-weight:700;">🎙️ Ditar</button>';
    h+='</div>';
    h+='<div class="card" style="margin-bottom:10px;">';
    h+='<div class="lbl">Conclusão / Parecer Técnico</div>';
    h+='<textarea id="fc-concl" oninput="F.concl=this.value" placeholder="Conclusão técnica da inspeção..." style="min-height:80px;">'+((F.concl)||'')+'</textarea>';
    h+='<button onclick="initVoice(el(\'fc-concl\'),this)" style="border:none;border-radius:8px;padding:5px 10px;font-size:11px;background:#003580;color:#fff;cursor:pointer;margin-top:4px;width:100%;font-weight:700;">🎙️ Ditar</button>';
    h+='</div>';
  }
  h+='<button class="btn" style="background:'+(ok?'#16a34a':'#94a3b8')+';color:#fff;margin-bottom:8px;" onclick="'+(ok?'salvarF()':'void(0)')+'">Finalizar e Salvar</button>';
  h+='<button class="btn bo" onclick="salvarR()">Salvar e continuar depois</button>';
  c.innerHTML=h;
}

/* ── Editar relatório finalizado (bloqueia comarca e edificação) ── */
function editarRelatorio(id){
  var i=S.insp.find(function(x){return x.id===id;});if(!i)return;
  var t=TIPOS[i.tipo]||TIPOS.periodica;
  var sess=S.sessao||{};
  if(i.snap){
    try{F=JSON.parse(JSON.stringify(i.snap));}catch(e){F=i.snap;}
    /* v91-fix: snap pode ter fotos vazias — recuperar do IDB */
  }else{
    ensureDraftItems(i);
    F={tipo:i.tipo,et:0,id:i.id,ets:t.e,
       d:{com:i.com||'',edif:i.edif||'',grp:i.grupo||'B',polo:i.polo||'',tv:i.tv||'trimestral',
          fiscal:i.fiscal||sess.nome||'',mat:i.mat||sess.mat||'',reg:i.reg||sess.reg||'NORTE',os:i.os||'',descricao:i.descricao||'',
          dtVistoria:i.dtVistoria||new Date().toISOString().slice(0,10)},
       itens:JSON.parse(JSON.stringify(i.itens||{})),mats:JSON.parse(JSON.stringify(i.mats||[])),
       sistemas:JSON.parse(JSON.stringify(i.sistemas||[])),
       ativSel:JSON.parse(JSON.stringify(i.ativSel||{})),
       ativ:i.ativ||'',causas:i.causas||'',lim:i.lim||'',normas:i.normas||'NBR 5674',concl:i.concl||'',
       pron:JSON.parse(JSON.stringify(i.pron||{})),
       fach:JSON.parse(JSON.stringify(i.fach||{FR:{obs:'',nc:false,nd:''},LD:{obs:'',nc:false,nd:''},LE:{obs:'',nc:false,nd:''},FU:{obs:'',nc:false,nd:''}})),
       schk:JSON.parse(JSON.stringify(i.schk||{})),
       med:JSON.parse(JSON.stringify(i.med||{p1:'',p2:'',p3:'',bep:''})),
       sub:i.sub?JSON.parse(JSON.stringify(i.sub)):null};
  }
  F.tipo=F.tipo||i.tipo;
  F.id=F.id||i.id;
  F.ets=(TIPOS[F.tipo]||TIPOS.periodica).e;
  if(!F.d)F.d={};
  F.d.com=F.d.com||i.com||'';
  F.d.edif=F.d.edif||i.edif||'';
  F.d.grp=F.d.grp||i.grupo||'B';
  F.d.polo=F.d.polo||i.polo||'';
  F.d.tv=F.d.tv||i.tv||'trimestral';
  F.d.fiscal=F.d.fiscal||i.fiscal||sess.nome||'';
  F.d.mat=F.d.mat||i.mat||sess.mat||'';
  F.d.reg=F.d.reg||i.reg||sess.reg||'NORTE';
  F.d.os=F.d.os||i.os||'';
  F.d.descricao=F.d.descricao||i.descricao||'';
  F.d.dtInicioExec=F.d.dtInicioExec||i.dtInicioExec||'';
  F.d.diasPrazo=F.d.diasPrazo||i.diasPrazo||'';
  F.d.dtFinalExec=F.d.dtFinalExec||i.dtFinalExec||'';
  if(!F.itens)F.itens={};
  if(!Array.isArray(F.mats))F.mats=[];
  if(!Array.isArray(F.sistemas))F.sistemas=[];
  if(!F.pron)F.pron={};
  if(!F.ativSel||typeof F.ativSel!=='object')F.ativSel={};
  if(!F.fach)F.fach={FR:{obs:'',nc:false,nd:''},LD:{obs:'',nc:false,nd:''},LE:{obs:'',nc:false,nd:''},FU:{obs:'',nc:false,nd:''}};
  if(!F.schk)F.schk={};
  if(!F.med)F.med={p1:'',p2:'',p3:'',bep:''};
  ensureDraftItems(F);
  F._editando=true;
  F.et=0;
  normalizeFormState(F);
  /* v91-fix: recuperar fotos do IndexedDB para todos os itens do F */
  _recuperarFotosDoIDB(F.id).then(function(){
    autoSaveLastHash='';
    startAutoSave();
    syncDraftFromF(true);
    autoSaveLastHash=computeDraftHash();
    var cor=TCOR[F.tipo]||'#003580';
    el('fhdr').style.background=cor;el('fnxt').style.background=cor;
    rFe();
    G('s-form');
  });
}
function salvarEdicao(){
  salvarR();
  stopAutoSave();
  var i=S.insp.find(function(x){return x.id===F.id;});
  if(i){
    i.st='finalizada';
    i.updated_at=new Date().toISOString();
    if(!i.protocolo)i.protocolo=gerarProtocolo(i);
    DB.sv();
  }
  F._editando=false;
  Tt('✅ Relatório atualizado com sucesso!');
  setTimeout(function(){openDet(F.id);},600);
}

function fnxt(){
  /* Bloqueia avanço da etapa Sistemas se nenhum sistema foi selecionado */
  if(F.ets[F.et]==='Sistemas'&&!(F.sistemas||[]).length){
    Tt('⚠️ Selecione ao menos um sistema para continuar!');
    return;
  }
  /* Bloqueia avanço da etapa Dados se campos obrigatórios OSE/OSP ausentes */
  if((F.ets[F.et]==='Dados'||F.ets[F.et]==='Dados OSP')&&(F.tipo==='ose'||F.tipo==='programada'||F.tipo==='osp')){
    if(!F.d.com.trim()){Tt('⚠️ Selecione a Comarca!');return;}
    if(!F.d.edif.trim()){Tt('⚠️ Selecione a Edificação!');return;}
    if(!F.d.os.trim()){Tt('⚠️ Informe o Nº '+(F.tipo==='ose'?'OSE':'OSP')+'!');return;}
    if(F.tipo==='osp'&&!F.d.dtInicioExec){Tt('⚠️ Informe a Data de Início de Execução!');return;}
    if(F.tipo==='osp'&&!F.d.diasPrazo){Tt('⚠️ Informe o Prazo (dias)!');return;}
    if(!F.d.descricao.trim()){Tt('⚠️ Preencha a Descrição!');return;}
  }
  if(F.et>=F.ets.length-1){if(F._editando){salvarEdicao();}else{salvarF();}return;}
  F.et++;rFe(true);
}
function fprv(){if(F.et>0){F.et--;rFe(true);}else fback();}
function fback(){
  if(F._editando){
    cf('X','Sair','Descartar alterações e voltar ao relatório?',function(){
      stopAutoSave();
      if(typeof pararCrono==='function') pararCrono();
      if(typeof pararGPS==='function') pararGPS();
      F._editando=false;openDet(F.id);G('s-det');
    });
  }else{
    cf('X','Sair','Salvar rascunho e sair?',function(){
      salvarR();stopAutoSave();
      if(typeof pararCrono==='function') pararCrono();
      if(typeof pararGPS==='function') pararGPS();
      Gb('s-home');rHome();
    });
  }
}
function salvarR(){
  normalizeFormState(F);
  saveRascunhoAuto(true);
  setTimeout(function(){Tt('Rascunho salvo');},50);
}
function salvarF(){
  salvarR();stopAutoSave();var i=S.insp.find(function(x){return x.id===F.id;});
  if(i){
    i.st='finalizada';
    /* Grava campos OSP */
    if(F.tipo==='osp'){i.dtInicioExec=F.d.dtInicioExec||'';i.diasPrazo=F.d.diasPrazo||'';i.dtFinalExec=F.d.dtFinalExec||'';}
    /* Grava data final de vistoria para RITMP/RITE/RITP */
    if(F.tipo==='periodica'||F.tipo==='ose'||F.tipo==='programada'){i.dtVistoriaFim=F.d.dtVistoriaFim||'';}
    /* Grava protocolo definitivo no momento da finalização (Fix #2) */
    if(!i.protocolo)i.protocolo=gerarProtocolo(i);
    DB.sv();
  }
  F._editando=false;
  var _prot=i&&i.protocolo?i.protocolo:'';
  var _isOSP=F.tipo==='osp';
  el('st').textContent=_isOSP?'OS Programada Registrada!':'Relatório Finalizado!';
  var _edifStr=i&&i.edif?'<strong>'+i.edif+'</strong>':(_isOSP?'Ordem de Serviço':'Inspeção');
  el('ss').innerHTML=_edifStr+(_isOSP?' registrada com sucesso.':' salvo com sucesso.')
    +(_prot?'<br><span style="font-family:monospace;font-size:12px;background:'+(_isOSP?'#f0fdf4':'#f1f5f9')+';padding:4px 10px;border-radius:8px;display:inline-block;margin-top:10px;color:'+(_isOSP?'#0f766e':'#003580')+';font-weight:700;">'+_prot+'</span>':'');
  G('s-suc');
}


function updNet(){var on=navigator.onLine;var d=el('dot');var b=el('offbar');if(d){d.style.background=on?'#22c55e':'#f97316';d.textContent=on?'Online':'Offline';}if(b)b.style.display=on?'none':'block';}
window.addEventListener('online',updNet);window.addEventListener('offline',updNet);
window.addEventListener('beforeunload',function(){saveRascunhoAuto(true);});
document.addEventListener('visibilitychange',function(){if(document.hidden)saveRascunhoAuto(true);});
/* SW registrado em index.html — não registrar aqui para evitar conflito */

/* ── Captura evento de instalação Chrome (Android / PC) ── */

/* ── Itens do Prontuário Elétrico ───────────────────────────── */
var PRON_ITENS=[
  {id:'PE01',n:'1',nm:'Prontuário de Instalações Elétricas',validade:12},
  {id:'PE02',n:'2',nm:'Laudo de SPDA (ABNT NBR 5419)',validade:12},
  {id:'PE03',n:'3',nm:'Laudo de Fachada (NBR 5674)',validade:12},
  {id:'PE04',n:'4',nm:'Diagrama Unifilar',validade:12}
];



/* ══════════════════════════════════════════════════════════════
   PRONTUÁRIO ELÉTRICO — Etapa de Documentos
   ══════════════════════════════════════════════════════════════ */
function rFPron(c){
  c.style.display='block';
  var cor='#0369a1';
  var today=new Date();today.setHours(0,0,0,0);
  var ms30=30*24*60*60*1000;

  function calcVig(dtStr){
    if(!dtStr)return null;
    var d=new Date(dtStr+'T00:00:00');
    d.setFullYear(d.getFullYear()+1);
    return d;
  }
  function vigBadge(dtVal){
    if(!dtVal)return '';
    var diff=dtVal-today;
    if(diff<0) return '<span style="background:#fee2e2;color:#dc2626;border-radius:20px;padding:2px 9px;font-size:9px;font-weight:800;">VENCIDO</span>';
    if(diff<=ms30) return '<span style="background:#fef3c7;color:#d97706;border-radius:20px;padding:2px 9px;font-size:9px;font-weight:800;">Vence em '+Math.ceil(diff/86400000)+'d</span>';
    return '<span style="background:#dcfce7;color:#16a34a;border-radius:20px;padding:2px 9px;font-size:9px;font-weight:800;">Vigente</span>';
  }

  var h='<div style="font-size:15px;font-weight:800;color:#0369a1;margin-bottom:4px;">⚡ Documentos</div>'
    +'<div style="font-size:11px;color:#64748b;margin-bottom:14px;">Informe as datas ou marque N/A quando não se aplica.</div>';

  PRON_ITENS.forEach(function(item){
    var p=F.pron[item.id]||{st:'',dtRel:'',dtExec:'',obs:'',fotos:[]};
    var isNA=(p.st==='na');
    var isEnt=(p.st==='entregue');
    var dtVal=isEnt?calcVig(p.dtRel||p.dtExec):null;

    h+='<div style="background:#fff;border-radius:13px;padding:12px 14px;margin-bottom:10px;border:1.5px solid '+(isNA?'#cbd5e1':isEnt?cor:'#e2e8f0')+';box-shadow:0 1px 4px rgba(0,0,0,.07);">';

    /* Header row */
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
    h+='<div style="width:28px;height:28px;border-radius:50%;background:'+(isNA?'#f1f5f9':isEnt?cor:'#e2e8f0')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:'+(isEnt?'#fff':'#64748b')+';flex-shrink:0;">'+item.n+'</div>';
    h+='<div style="flex:1;font-size:12px;font-weight:700;color:'+(isNA?'#94a3b8':'#1e293b')+';line-height:1.3;">'+item.nm+'</div>';
    if(dtVal)h+=vigBadge(dtVal);
    h+='</div>';

    /* Status buttons */
    h+='<div style="display:flex;gap:6px;margin-bottom:'+(isEnt?'10px':'0')+'">';
    h+='<button onclick="if(!F.pron[\''+item.id+'\'])F.pron[\''+item.id+'\']={}; F.pron[\''+item.id+'\'].st=\'entregue\';rFe()" '
      +'style="flex:1;padding:7px;border:1.5px solid '+(isEnt?cor:'#e2e8f0')+';border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;background:'+(isEnt?cor:'#fff')+';color:'+(isEnt?'#fff':'#64748b')+';">✅ Entregue</button>';
    h+='<button onclick="if(!F.pron[\''+item.id+'\'])F.pron[\''+item.id+'\']={}; F.pron[\''+item.id+'\'].st=\'na\';F.pron[\''+item.id+'\'].dtRel=\'\';F.pron[\''+item.id+'\'].dtExec=\'\';rFe()" '
      +'style="flex:1;padding:7px;border:1.5px solid '+(isNA?'#94a3b8':'#e2e8f0')+';border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;background:'+(isNA?'#f1f5f9':'#fff')+';color:'+(isNA?'#64748b':'#94a3b8')+';">➖ N/A</button>';
    h+='</div>';

    if(isEnt){
      /* Date fields */
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">';

      /* Data do Relatório */
      var dtRelVal=calcVig(p.dtRel);
      h+='<div>'
        +'<div style="font-size:10px;font-weight:700;color:#0369a1;margin-bottom:3px;">Data do Relatório *</div>'
        +'<input type="date" value="'+(p.dtRel||'')+'" max="'+new Date().toISOString().slice(0,10)+'" '
        +'onchange="F.pron[\''+item.id+'\'].dtRel=this.value;rFe()" '
        +'style="width:100%;padding:6px 8px;border:1.5px solid '+(p.dtRel?cor:'#e2e8f0')+';border-radius:8px;font-size:12px;font-weight:700;color:#0369a1;">'
        +(p.dtRel?'<div style="font-size:9px;color:#16a34a;margin-top:2px;">Vigência: '+( calcVig(p.dtRel)?calcVig(p.dtRel).toLocaleDateString('pt-BR'):'' )+'</div>':'')
        +'</div>';

      /* Data de Execução */
      h+='<div>'
        +'<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px;">Data de Execução</div>'
        +'<input type="date" value="'+(p.dtExec||'')+'" max="'+new Date().toISOString().slice(0,10)+'" '
        +'onchange="F.pron[\''+item.id+'\'].dtExec=this.value;rFe()" '
        +'style="width:100%;padding:6px 8px;border:1.5px solid '+(p.dtExec?'#64748b':'#e2e8f0')+';border-radius:8px;font-size:12px;font-weight:700;color:#64748b;">'
        +'</div>';

      h+='</div>';

      /* Vigência calculada banner */
      if(p.dtRel){
        var dvf=calcVig(p.dtRel);
        var diff=dvf-today;
        var bg=diff<0?'#fee2e2':diff<=ms30?'#fef3c7':'#f0f9ff';
        var tc=diff<0?'#dc2626':diff<=ms30?'#d97706':'#0369a1';
        h+='<div style="background:'+bg+';border-radius:8px;padding:7px 10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">'
          +'<span style="font-size:10px;font-weight:700;color:'+tc+';">📅 Vigente até: '+dvf.toLocaleDateString('pt-BR')+'</span>'
          +vigBadge(dvf)
          +'</div>';
      }

      /* Observação + foto só para Fachada */
      if(item.id==='PE03'){
        h+='<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px;">Observação (opcional)</div>';
        h+='<textarea placeholder="Condições da fachada, pendências..." '
          +'oninput="if(!F.pron[\''+item.id+'\'])F.pron[\''+item.id+'\']={}; F.pron[\''+item.id+'\'].obs=this.value" '
          +'style="width:100%;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;min-height:52px;resize:none;margin-bottom:6px;">'+(p.obs||'')+'</textarea>';
      }
    }

    if(isNA){
      h+='<div style="margin-top:6px;">'
        +'<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:3px;">Motivo (opcional)</div>'
        +'<textarea placeholder="Ex: edificação não possui este sistema..." '
        +'oninput="if(!F.pron[\''+item.id+'\'])F.pron[\''+item.id+'\']={}; F.pron[\''+item.id+'\'].obs=this.value" '
        +'style="width:100%;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;min-height:44px;resize:none;">'+(p.obs||'')+'</textarea>'
        +'</div>';
    }

    h+='</div>';
  });
  c.innerHTML=h;
}

/* ── Detalhe do Prontuário salvo — TABELA ── */
function renderDetPron(insp){
  var today=new Date();today.setHours(0,0,0,0);
  var ms30=30*24*60*60*1000;
  var pron=insp.pron||{};

  function calcVig(dtStr){
    if(!dtStr)return null;
    var d=new Date(dtStr+'T00:00:00');
    d.setFullYear(d.getFullYear()+1);
    return d;
  }
  function stInfo(p){
    if(p.st==='na')return{label:'N/A',bg:'#f1f5f9',tc:'#64748b',ord:3};
    var dtRel=p.dtRel||'';
    if(!dtRel)return{label:'Pendente',bg:'#f1f5f9',tc:'#94a3b8',ord:4};
    var dtVal=calcVig(dtRel);
    var diff=dtVal-today;
    if(diff<0)return{label:'VENCIDO',bg:'#fee2e2',tc:'#dc2626',ord:0};
    if(diff<=ms30)return{label:'Vence em '+Math.ceil(diff/86400000)+'d',bg:'#fef3c7',tc:'#d97706',ord:1};
    return{label:'Vigente',bg:'#dcfce7',tc:'#16a34a',ord:2};
  }

  /* Summary counters */
  var cnt={vencido:0,quase:0,vigente:0,na:0,pendente:0};
  PRON_ITENS.forEach(function(item){
    var p=pron[item.id]||{};
    var s=stInfo(p);
    if(s.label==='VENCIDO')cnt.vencido++;
    else if(s.label.indexOf('Vence')===0)cnt.quase++;
    else if(s.label==='Vigente')cnt.vigente++;
    else if(s.label==='N/A')cnt.na++;
    else cnt.pendente++;
  });

  var h='';

  /* ── Summary cards ── */
  h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:14px;">';
  var cards=[
    {n:cnt.vencido,  l:'Vencidos',      bg:'#fee2e2',tc:'#dc2626',show:true},
    {n:cnt.quase,    l:'Vencem 30d',    bg:'#fef3c7',tc:'#d97706',show:true},
    {n:cnt.vigente,  l:'Vigentes',      bg:'#dcfce7',tc:'#16a34a',show:true},
    {n:cnt.na+cnt.pendente,l:'N/A / Pend.',bg:'#f1f5f9',tc:'#64748b',show:true}
  ];
  cards.forEach(function(c){
    h+='<div style="background:'+c.bg+';border-radius:10px;padding:10px;text-align:center;">'
      +'<div style="font-size:22px;font-weight:900;color:'+c.tc+';">'+c.n+'</div>'
      +'<div style="font-size:9px;color:'+c.tc+';font-weight:700;">'+c.l+'</div>'
      +'</div>';
  });
  h+='</div>';

  /* ── Table ── */
  h+='<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:12px;">';
  /* Table header */
  h+='<div style="background:#0369a1;display:grid;grid-template-columns:1fr 80px 80px 80px;gap:0;">';
  ['Documento','Relatório','Execução','Vigência até'].forEach(function(col,ci){
    h+='<div style="padding:8px '+(ci===0?'12px':'6px')+';font-size:9px;font-weight:800;color:#fff;text-align:'+(ci===0?'left':'center')+';">'+col+'</div>';
  });
  h+='</div>';

  /* Table rows */
  var sorted=PRON_ITENS.slice().sort(function(a,b){
    var sa=stInfo(pron[a.id]||{}).ord;
    var sb=stInfo(pron[b.id]||{}).ord;
    return sa-sb;
  });

  sorted.forEach(function(item,ix){
    var p=pron[item.id]||{};
    var s=stInfo(p);
    var dtVal=p.dtRel?calcVig(p.dtRel):null;
    var dtRelFmt=p.dtRel?new Date(p.dtRel+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
    var dtExecFmt=p.dtExec?new Date(p.dtExec+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
    var dtValFmt=dtVal?dtVal.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
    var rowBg=ix%2===0?'#fff':'#f8fafc';
    h+='<div style="background:'+rowBg+';display:grid;grid-template-columns:1fr 80px 80px 80px;border-top:1px solid #f1f5f9;">';
    /* Document name + badge */
    h+='<div style="padding:9px 12px;">'
      +'<div style="font-size:11px;font-weight:700;color:#1e293b;line-height:1.3;">'+item.nm+'</div>'
      +(p.obs?'<div style="font-size:9px;color:#94a3b8;margin-top:1px;font-style:italic;">'+p.obs+'</div>':'')
      +'<span style="display:inline-block;margin-top:3px;background:'+s.bg+';color:'+s.tc+';border-radius:20px;padding:1px 7px;font-size:8px;font-weight:800;">'+s.label+'</span>'
      +'</div>';
    /* Dates */
    ['dtRelFmt','dtExecFmt','dtValFmt'].forEach(function(dk,di){
      var val={dtRelFmt:dtRelFmt,dtExecFmt:dtExecFmt,dtValFmt:dtValFmt}[dk];
      var isVig=(dk==='dtValFmt');
      var vigCor=isVig&&dtVal?(dtVal-today<0?'#dc2626':dtVal-today<=ms30?'#d97706':'#16a34a'):'#64748b';
      h+='<div style="padding:9px 6px;text-align:center;font-size:10px;font-weight:'+(isVig?'700':'400')+';color:'+(isVig?vigCor:'#64748b')+';">'+val+'</div>';
    });
    h+='</div>';
  });
  h+='</div>';

  h+='<button class="btn" style="background:#0f766e;color:#fff;margin-bottom:8px;" onclick="editarPron(\''+insp.id+'\')">✏️ Editar Documentos</button>';
  h+='<button class="btn" style="background:#0369a1;color:#fff;" onclick="exportHTML(\''+insp.id+'\')">📄 Exportar HTML</button>';
  h+='<button class="btn" style="background:#1a2332;color:#fff;margin-top:6px;" onclick="exportPDF(\''+insp.id+'\')">📄 Exportar PDF</button>';
  h+='<div style="height:16px;"></div>';
  return h;
}
/* ── Editar Prontuário já finalizado ── */
function editarPron(id){
  var i=S.insp.find(function(x){return x.id===id;});if(!i)return;
  var t=TIPOS[i.tipo]||TIPOS.prontuario;
  var sess=S.sessao||{};
  /* Recompõe F a partir dos dados salvos na inspeção */
  F={
    tipo:i.tipo,
    id:i.id,
    et:1,                        /* etapa "Documentos" (índice 1) */
    ets:t.e,
    d:{com:i.com||'',edif:i.edif||'',grp:i.grupo||'B',polo:i.polo||'',
       tv:i.tv||'trimestral',fiscal:i.fiscal||sess.nome||'',
       mat:i.mat||sess.mat||'',reg:i.reg||sess.reg||'NORTE',
       os:i.os||'',descricao:i.descricao||''},
    itens:JSON.parse(JSON.stringify(i.itens||{})),
    mats:JSON.parse(JSON.stringify(i.mats||[])),
    sistemas:JSON.parse(JSON.stringify(i.sistemas||[])),
    ativSel:JSON.parse(JSON.stringify(i.ativSel||{})),
    ativ:i.ativ||'',causas:i.causas||'',lim:i.lim||'',
    normas:i.normas||'',concl:i.concl||'',
    pron:JSON.parse(JSON.stringify(i.pron||{})),
    fach:JSON.parse(JSON.stringify(i.fach||{FR:{obs:'',nc:false,nd:''},LD:{obs:'',nc:false,nd:''},LE:{obs:'',nc:false,nd:''},FU:{obs:'',nc:false,nd:''}})),
    schk:JSON.parse(JSON.stringify(i.schk||{})),
    med:JSON.parse(JSON.stringify(i.med||{p1:'',p2:'',p3:'',bep:''}))
  };
  /* Mantém status finalizada — salva automaticamente sem reverter */
  var cor=TCOR[F.tipo]||'#0369a1';
  el('fhdr').style.background=cor;el('fnxt').style.background=cor;
  autoSaveLastHash='';
  startAutoSave();
  syncDraftFromF(true);
  autoSaveLastHash=computeDraftHash();
  rFe();
  G('s-form');
}
/* ──────────────────────────────────────────────────────────── */


var _installPrompt=null;
window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();
  _installPrompt=e;
  /* Mostra botão de instalar no perfil se já estiver na tela */
  var btn=document.getElementById('btn-instalar');
  if(btn)btn.style.display='flex';
});
window.addEventListener('appinstalled',function(){
  _installPrompt=null;
  var btn=document.getElementById('btn-instalar');
  if(btn)btn.style.display='none';
  Tt('✅ App instalado com sucesso!');
});
function instalarApp(){
  if(!_installPrompt){Tt('Instalação não disponível neste navegador');return;}
  _installPrompt.prompt();
  _installPrompt.userChoice.then(function(r){
    if(r.outcome==='accepted'){Tt('✅ Instalando TJMG Fiscal...');}
    _installPrompt=null;
    var btn=document.getElementById('btn-instalar');
    if(btn)btn.style.display='none';
  });
}

var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
var isSA=(window.navigator.standalone===true)||window.matchMedia('(display-mode:standalone)').matches;
if(isIOS&&!isSA){
  var ban=document.createElement('div');
  ban.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#003580;color:#fff;padding:11px 16px;z-index:400;display:flex;align-items:center;gap:10px;padding-bottom:calc(env(safe-area-inset-bottom,0px)+11px);';
  ban.innerHTML='<span style="font-size:20px;flex-shrink:0;">&#9878;</span><div style="flex:1;"><div style="font-size:12px;font-weight:700;">Instalar TJMG Fiscal</div><div style="font-size:10px;opacity:.8;">Toque em compartilhar e depois Adicionar a Tela de Inicio</div></div><button onclick="this.parentElement.remove()" style="border:none;background:rgba(255,255,255,.2);color:#fff;border-radius:6px;padding:5px 8px;font-size:12px;cursor:pointer;">X</button>';
  document.body.appendChild(ban);
}


// ── Exports ────────────────────────────────────────────────
window.iniciarProgramada = typeof iniciarProgramada!=='undefined'?iniciarProgramada:function(){};
window.vincularOSP = typeof vincularOSP!=='undefined'?vincularOSP:function(){};
window.iniciarF = typeof iniciarF!=='undefined'?iniciarF:function(){};
window.rFe = typeof rFe!=='undefined'?rFe:function(){};
window.rFDados = typeof rFDados!=='undefined'?rFDados:function(){};
window.rFCheck = typeof rFCheck!=='undefined'?rFCheck:function(){};
window.rFSistemas = typeof rFSistemas!=='undefined'?rFSistemas:function(){};
window.toggleSis = typeof toggleSis!=='undefined'?toggleSis:function(){};
window.rFSelAtiv = typeof rFSelAtiv!=='undefined'?rFSelAtiv:function(){};
window.rFAtiv = typeof rFAtiv!=='undefined'?rFAtiv:function(){};
window.rFFach = typeof rFFach!=='undefined'?rFFach:function(){};
window.rFSPDAi = typeof rFSPDAi!=='undefined'?rFSPDAi:function(){};
window.rFSPDAm = typeof rFSPDAm!=='undefined'?rFSPDAm:function(){};
window.getMATSForTipo = typeof getMATSForTipo!=='undefined'?getMATSForTipo:function(){};
window.rFDadosOSP = typeof rFDadosOSP!=='undefined'?rFDadosOSP:function(){};
window.ospCalcFinal = typeof ospCalcFinal!=='undefined'?ospCalcFinal:function(){};
window.sincronizarMatsGlobais = typeof sincronizarMatsGlobais!=='undefined'?sincronizarMatsGlobais:function(){};
window.rFMats = typeof rFMats!=='undefined'?rFMats:function(){};
window.bmats = typeof bmats!=='undefined'?bmats:function(){};
window.amat = typeof amat!=='undefined'?amat:function(){};
window.rML = typeof rML!=='undefined'?rML:function(){};
window.subEtapas = typeof subEtapas!=='undefined'?subEtapas:function(){};
window.subAtualizaEtapas = typeof subAtualizaEtapas!=='undefined'?subAtualizaEtapas:function(){};
window.subSecoesVisiveis = typeof subSecoesVisiveis!=='undefined'?subSecoesVisiveis:function(){};
window.subDefaultData = typeof subDefaultData!=='undefined'?subDefaultData:function(){};
window.subNovoTrafo = typeof subNovoTrafo!=='undefined'?subNovoTrafo:function(){};
window.subNovoDisj = typeof subNovoDisj!=='undefined'?subNovoDisj:function(){};
window.subNovoSecc = typeof subNovoSecc!=='undefined'?subNovoSecc:function(){};
window.subInit = typeof subInit!=='undefined'?subInit:function(){};
window.subAddTrafo = typeof subAddTrafo!=='undefined'?subAddTrafo:function(){};
window.subAddDisj = typeof subAddDisj!=='undefined'?subAddDisj:function(){};
window.subAddSecc = typeof subAddSecc!=='undefined'?subAddSecc:function(){};
window.subToggleItem = typeof subToggleItem!=='undefined'?subToggleItem:function(){};
window.subToggleObs = typeof subToggleObs!=='undefined'?subToggleObs:function(){};
window.subAddFoto = typeof subAddFoto!=='undefined'?subAddFoto:function(){};
window.subVerFotos = typeof subVerFotos!=='undefined'?subVerFotos:function(){};
window.subAddFotoMed = typeof subAddFotoMed!=='undefined'?subAddFotoMed:function(){};
window.subDelFotoMed = typeof subDelFotoMed!=='undefined'?subDelFotoMed:function(){};
window.subVerFotosMed = typeof subVerFotosMed!=='undefined'?subVerFotosMed:function(){};
window.subProcessarFotos = typeof subProcessarFotos!=='undefined'?subProcessarFotos:function(){};
window.subAbrirVisor = typeof subAbrirVisor!=='undefined'?subAbrirVisor:function(){};
window.subFotosBarra = typeof subFotosBarra!=='undefined'?subFotosBarra:function(){};
window.rFSubDados = typeof rFSubDados!=='undefined'?rFSubDados:function(){};
window.subSetTipo = typeof subSetTipo!=='undefined'?subSetTipo:function(){};
window.rFSubChecklist = typeof rFSubChecklist!=='undefined'?rFSubChecklist:function(){};
window.rFSubMedicoes = typeof rFSubMedicoes!=='undefined'?rFSubMedicoes:function(){};
window._inp = typeof _inp!=='undefined'?_inp:function(){};
window._inpMin = typeof _inpMin!=='undefined'?_inpMin:function(){};
window._inpMax = typeof _inpMax!=='undefined'?_inpMax:function(){};
window._secHdr = typeof _secHdr!=='undefined'?_secHdr:function(){};
window.subRenderTrafo = typeof subRenderTrafo!=='undefined'?subRenderTrafo:function(){};
window.subRenderDisj = typeof subRenderDisj!=='undefined'?subRenderDisj:function(){};
window.subRenderSecc = typeof subRenderSecc!=='undefined'?subRenderSecc:function(){};
window.rFConc = typeof rFConc!=='undefined'?rFConc:function(){};
window.editarRelatorio = typeof editarRelatorio!=='undefined'?editarRelatorio:function(){};
window.salvarEdicao = typeof salvarEdicao!=='undefined'?salvarEdicao:function(){};
window.fnxt = typeof fnxt!=='undefined'?fnxt:function(){};
window.fprv = typeof fprv!=='undefined'?fprv:function(){};
window.fback = typeof fback!=='undefined'?fback:function(){};
window.salvarR = typeof salvarR!=='undefined'?salvarR:function(){};
window.salvarF = typeof salvarF!=='undefined'?salvarF:function(){};
window.rFPron = typeof rFPron!=='undefined'?rFPron:function(){};
window.renderDetPron = typeof renderDetPron!=='undefined'?renderDetPron:function(){};
window.editarPron = typeof editarPron!=='undefined'?editarPron:function(){};
window.ciclo = typeof ciclo!=='undefined'?ciclo:function(){};
window.isTipoOSP = typeof isTipoOSP!=='undefined'?isTipoOSP:function(){};
window._getTipoAtual = typeof _getTipoAtual!=='undefined'?_getTipoAtual:function(){};
window._getStatusOps = typeof _getStatusOps!=='undefined'?_getStatusOps:function(){};
