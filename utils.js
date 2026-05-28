'use strict';
// ============================================================
// utils.js — Helpers globais: DOM, modais, toast, formatação
// TJMG Fiscal PWA — v79c
// ============================================================

/* ── DOM ────────────────────────────────────────────────────── */
function el(id){ return document.getElementById(id); }

/* ── Toast ──────────────────────────────────────────────────── */
var _ttT=null;
function Tt(msg,dur){
  var t=el('toast');if(!t)return;
  t.textContent=msg;t.classList.add('show');
  clearTimeout(_ttT);
  _ttT=setTimeout(function(){t.classList.remove('show');},dur||3000);
}

/* ── Confirm dialog ─────────────────────────────────────────── */
function cf(okLbl,title,msg,onOk,onCan){
  var m=el('m-cf');
  if(!m)return;
  var mt=el('ct');    /* título */
  var mb=el('cm_t');  /* mensagem */
  var mok=el('cok');  /* botão OK */
  var ci=el('ci');    /* ícone */
  if(ci)ci.textContent='?';
  if(mt)mt.textContent=title||'Confirmar';
  if(mb)mb.textContent=msg||'';
  if(mok){
    mok.textContent=okLbl||'OK';
    mok.onclick=function(){cm('m-cf');if(typeof onOk==='function')onOk();};
  }
  /* botão Cancelar usa onclick inline no HTML, mas também registra callback */
  var mca=m.querySelector('.btn.bo');
  if(mca){
    mca.onclick=function(){cm('m-cf');if(typeof onCan==='function')onCan();};
  }
  m.style.display='flex';
}

/* ── Fechar modal ────────────────────────────────────────────── */
function cm(id){var m=el(id);if(m)m.style.display='none';}

/* ── Online/Offline indicator ───────────────────────────────── */
function updNet(){
  var on=navigator.onLine;
  var d=el('dot');var b=el('offbar');
  if(d){d.style.background=on?'#22c55e':'#f97316';d.textContent=on?'Online':'Offline';}
  if(b)b.style.display=on?'none':'block';
}


function fdt(d){if(!d)return'—';var p=d.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d;}
function fdth(d){if(!d)return'—';try{var dt=new Date(d+'T12:00:00');var ms=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];return dt.getDate()+' '+ms[dt.getMonth()];}catch(e){return fdt(d);}}
function ini(n){if(!n)return'?';var ps=n.trim().split(' ').filter(Boolean);return ps.length===1?ps[0][0].toUpperCase():(ps[0][0]+ps[ps.length-1][0]).toUpperCase();}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function ovals(o){return Object.values(o||{});}
function oentries(o){return Object.entries(o||{});}
function debounce(fn,ms){var t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}
function _escA(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _spf(v,dec){var n=parseFloat(v);return isNaN(n)?'—':n.toFixed(dec===undefined?2:dec);}
function _fmtLastSync(){
  if(!Sync||!Sync.lastSync)return'Nunca sincronizado';
  var d=new Date(Sync.lastSync);var ag=Math.round((Date.now()-Sync.lastSync)/60000);
  if(ag<1)return'Agora mesmo';if(ag<60)return'há '+ag+' min';
  if(ag<1440)return'há '+Math.round(ag/60)+'h';
  return fdt(d.toISOString().slice(0,10));
}
function isGlobal(s){return s&&(s.tipo==='admin'||s.tipo==='coord');}
function canDelInsp(i){if(!S.sessao)return false;var s=S.sessao;if(isGlobal(s))return true;return i.fiscal===s.nome&&i.st!=='finalizada';}

/* ── Filtros ─────────────────────────────────────────────── */
function filterByReg(arr){
  var s=S.sessao;if(!s||isGlobal(s))return arr||[];
  return(arr||[]).filter(function(i){return i.reg===s.reg;});
}

/* ── PCI por região ─────────────────────────────────────────── */
var PCI_BY_REG={
  NORTE:   typeof PCI_DATA!=='undefined'?PCI_DATA:[],
  CENTRAL: [], LESTE: [], ZONA_MATA: [], TRIANGULO: [], SUL: [], SUDOESTE: []
};

/* ── Swipe handler (mobile — swipe esquerda abre ações rápidas) ────────────
   v79: zero dependências externas
   Uso: enableSwipe(el, onLeft, onRight)                                     */
function enableSwipe(el, onLeft, onRight){
  var sx=0,sy=0,moving=false;
  el.addEventListener('touchstart',function(e){
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;moving=false;
  },{passive:true});
  el.addEventListener('touchmove',function(e){
    var dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
    if(!moving&&Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>12)moving=true;
  },{passive:true});
  el.addEventListener('touchend',function(e){
    var dx=e.changedTouches[0].clientX-sx;
    if(!moving)return;
    if(dx<-50&&onLeft)onLeft();
    if(dx>50&&onRight)onRight();
    moving=false;
  },{passive:true});
}

/* ── Ditado por voz (Web Speech API) ──────────────────────────
   v79: adiciona botão 🎙️ em qualquer textarea
   Uso: initVoice(textarea, btnEl)                                            */
var _voiceRecognizer=null;
var _voiceActive=false;
function initVoice(textarea,btn){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){if(btn)btn.style.display='none';return;}
  if(_voiceRecognizer&&_voiceActive){
    _voiceRecognizer.stop();_voiceActive=false;
    if(btn){btn.textContent='🎙️';btn.style.background='#64748b';}
    return;
  }
  var r=new SR();
  _voiceRecognizer=r;
  r.lang='pt-BR';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;
  r.onstart=function(){_voiceActive=true;if(btn){btn.textContent='⏹';btn.style.background='#dc2626';}Tt('Fale agora...');};
  r.onresult=function(e){
    var txt=e.results[0][0].transcript;
    var cur=textarea.value;
    textarea.value=(cur?cur+' ':'')+txt;
    textarea.dispatchEvent(new Event('input'));
  };
  r.onerror=function(e){Tt('Voz: '+e.error);};
  r.onend=function(){_voiceActive=false;if(btn){btn.textContent='🎙️';btn.style.background='#003580';}};
  r.start();
}
/* Injeta botão de voz em uma textarea pelo ID */
function addVoiceBtn(taId){
  var ta=el(taId);if(!ta)return;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return;
  if(ta.parentNode.querySelector('._vbtn'))return;
  var btn=document.createElement('button');
  btn._vbtn=true;btn.className='_vbtn';
  btn.textContent='🎙️';
  btn.style.cssText='border:none;border-radius:8px;padding:6px 10px;font-size:14px;background:#003580;color:#fff;cursor:pointer;margin-top:4px;width:100%;font-weight:700;font-family:inherit;';
  btn.onclick=function(e){e.preventDefault();initVoice(ta,btn);};
  ta.parentNode.insertBefore(btn,ta.nextSibling);
}

/* ── GC de fotos órfãs ─────────────────────────────────────────
   v79: roda semanal; cruza chaves IDB com IDs de inspeções existentes       */
function gcFotosOrfas(){
  var LS_KEY='_gcLastRun';
  var last=parseInt(localStorage.getItem(LS_KEY)||'0');
  if(Date.now()-last<7*24*3600000)return; /* só uma vez por semana */
  PhotoStore.listKeys().then(function(keys){
    var inspIds={};
    (S.insp||[]).forEach(function(i){inspIds[i.id]=1;});
    var orfas=keys.filter(function(k){
      var parts=k.split('::');
      if(parts[0]==='form')return false; /* rascunho ativo */
      return !inspIds[parts[0]];
    });
    if(!orfas.length)return;
    Promise.all(orfas.map(function(k){return PhotoStore.del(k);})).then(function(){
      console.log('[GC] Fotos órfãs removidas:',orfas.length);
    });
  });
  localStorage.setItem(LS_KEY,Date.now().toString());
}

/* ── Telemetria de erros (error boundary) ─────────────────────
   v79: captura erros JS globais e envia para Supabase           */
function initErrorBoundary(){
  var _errBuf=[];var _errFlushT=null;
  function _flush(){
    if(!_errBuf.length)return;
    var payload=_errBuf.splice(0);
    try{
      var url=(typeof EDGE_SYNC_URL!=='undefined'&&EDGE_SYNC_URL)?EDGE_SYNC_URL+'/log-error':null;
      if(!url)return;
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({errors:payload,u:(S&&S.sessao)?S.sessao.id:'anon',v:typeof APP_VERSION!=='undefined'?APP_VERSION:'?'})
      }).catch(function(){});
    }catch(e){}
  }
  function _queue(msg,src,line,col,err){
    _errBuf.push({msg:String(msg).slice(0,300),src:String(src||'').slice(0,100),
      line:line,col:col,stack:err&&err.stack?String(err.stack).slice(0,600):'',t:Date.now()});
    clearTimeout(_errFlushT);_errFlushT=setTimeout(_flush,5000);
  }
  window.onerror=function(msg,src,line,col,err){_queue(msg,src,line,col,err);return false;};
  window.addEventListener('unhandledrejection',function(e){
    _queue('UnhandledRejection: '+(e.reason&&e.reason.message?e.reason.message:String(e.reason)),'promise',0,0,e.reason);
  });
}

/* ── Background Sync registration ────────────────────────────
   v79: registra sync tag para o SW executar quando voltar online           */
function registrarBackgroundSync(){
  if(!('serviceWorker' in navigator)||!('SyncManager' in window))return;
  navigator.serviceWorker.ready.then(function(reg){
    reg.sync.register('tjmg-sync').catch(function(e){console.warn('[BgSync]',e);});
  }).catch(function(){});
}

/* ── Alerta de prazo OSP ─────────────────────────────────────
   v79: verifica OSPs com prazo vencendo em ≤3 dias             */
function alertarPrazosOSP(){
  var osps=filterByReg(S.insp).filter(function(i){
    return i.tipo==='osp'&&i.st!=='finalizada'&&i.dtFinalExec;
  });
  var hoje=new Date();hoje.setHours(0,0,0,0);
  osps.forEach(function(osp){
    var dt=new Date(osp.dtFinalExec+'T12:00:00');
    var diff=Math.round((dt-hoje)/86400000);
    if(diff<=3&&diff>=0){
      setTimeout(function(){
        Tt('⚠️ OSP '+osp.os+' vence em '+(diff===0?'HOJE':diff+'d')+': '+osp.edif);
      },2000);
    }else if(diff<0){
      setTimeout(function(){
        Tt('🚨 OSP '+osp.os+' VENCIDA há '+Math.abs(diff)+'d: '+osp.edif);
      },2500);
    }
  });
}

/* ── Web Share API ───────────────────────────────────────────
   v79: compartilha blob (HTML/PDF) via sheet nativo do Android/iOS
   Uso: shareFile(blob, filename, title)                        */
async function shareFile(blob, filename, title){
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([blob],'test.html',{type:blob.type})]})){
    try{
      await navigator.share({files:[new File([blob],filename,{type:blob.type})],title:title||'TJMG Fiscal'});
      return true;
    }catch(e){if(e.name!=='AbortError')console.warn('[Share]',e);}
  }
  /* Fallback: download direto */
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(a.href);},5000);
  return false;
}

/* ── Duplicar inspeção como modelo ──────────────────────────
   v79: cria novo rascunho pré-preenchido com dados de uma inspeção existente */
function duplicarComoModelo(id){
  var i=S.insp.find(function(x){return x.id===id;});if(!i)return;
  var t=TIPOS[i.tipo]||TIPOS.periodica;
  var sess=S.sessao||{};
  var novo={
    id:uid(),tipo:i.tipo,st:'em_andamento',
    reg:i.reg||sess.reg||'NORTE',
    com:i.com||'',edif:i.edif||'',
    grupo:i.grupo||'B',polo:i.polo||'',
    tv:i.tv||'trimestral',
    fiscal:sess.nome||i.fiscal||'',
    mat:sess.mat||i.mat||'',
    os:'',descricao:'',
    data:new Date().toISOString().slice(0,10),
    dtVistoria:new Date().toISOString().slice(0,10),
    itens:JSON.parse(JSON.stringify(i.itens||{})),
    mats:[],sistemas:JSON.parse(JSON.stringify(i.sistemas||[])),
    ativSel:JSON.parse(JSON.stringify(i.ativSel||{})),
    ativ:'',causas:'',lim:'',normas:i.normas||'NBR 5674',concl:'',
    pron:JSON.parse(JSON.stringify(i.pron||{})),
    fach:JSON.parse(JSON.stringify(i.fach||{})),
    schk:{},med:{p1:'',p2:'',p3:'',bep:''}
  };
  /* Resetar status dos itens para pendente */
  Object.keys(novo.itens||{}).forEach(function(k){
    novo.itens[k].s='pendente';novo.itens[k].obs='';novo.itens[k].fotos=[];novo.itens[k].mats=[];
  });
  S.insp.unshift(novo);
  DB.sv();
  Sync.schedulePush(1000);
  Tt('✅ Novo rascunho criado com base em '+i.edif);
  if(typeof rHome==='function')rHome();
}

/* ── Alertas de periodicidade vencida ─────────────────────────
   v79: cruza data última inspeção de cada edif com ATVs[p]      */
function alertarPeriodiciasVencidas(){
  if(!S.insp||!S.insp.length)return null;
  var hoje=new Date();hoje.setHours(0,0,0,0);
  /* Última inspeção periódica por edificação */
  var ultPorEdif={};
  filterByReg(S.insp).filter(function(i){return i.tipo==='periodica'&&i.st==='finalizada';})
    .forEach(function(i){
      var k=(i.reg||'')+'::'+i.edif;
      var dt=new Date((i.dtVistoria||i.data)+'T12:00:00');
      if(!ultPorEdif[k]||dt>ultPorEdif[k].dt)ultPorEdif[k]={dt:dt,grp:i.grupo||'B'};// v83-fix: guarda grupo
    });
  var vencidas=[];
  Object.keys(ultPorEdif).forEach(function(k){
    var ultima=ultPorEdif[k].dt;
    var grp=ultPorEdif[k].grp||'B';
    var meses=grp==='C'?6:3;/* v83-fix: Grupo C = 6 meses, A e B = 3 meses */
    var proxima=new Date(ultima);proxima.setMonth(proxima.getMonth()+meses);
    var diffDias=Math.round((proxima-hoje)/86400000);
    if(diffDias<=7){/* vence em ≤7 dias ou já venceu */
      var parts=k.split('::');
      vencidas.push({edif:parts[1],reg:parts[0],grp:grp,meses:meses,diffDias:diffDias,proxima:proxima});
    }
  });
  return vencidas;
}

/* ── Mini dashboard fiscal (KPIs mensais) ──────────────────────
   v79: retorna objeto com métricas do mês atual                 */
function calcDashboardFiscal(){
  var hoje=new Date();
  var mesAtual=hoje.getFullYear()+'-'+(String(hoje.getMonth()+1).padStart(2,'0'));
  var base=filterByReg(S.insp);
  var domes=base.filter(function(i){return(i.dtVistoria||i.data||'').startsWith(mesAtual);});
  var fin=base.filter(function(i){return i.st==='finalizada';});
  var finMes=domes.filter(function(i){return i.st==='finalizada';});
  /* Conformidade média */
  var soma=0;var cnt=0;
  fin.slice(0,20).forEach(function(i){
    var its=ovals(i.itens||{}).filter(function(v){return v.s&&v.s!=='fora_periodo'&&v.s!=='nao_aplicavel';});
    if(!its.length)return;
    var conf=its.filter(function(v){return v.s==='conforme'||v.s==='executado';}).length;
    soma+=Math.round(conf/its.length*100);cnt++;
  });
  var confMedia=cnt?Math.round(soma/cnt):0;
  /* Por tipo no mês */
  var porTipo={};
  domes.forEach(function(i){porTipo[i.tipo]=(porTipo[i.tipo]||0)+1;});
  /* OSPs com prazo vencendo */
  var ospCrit=base.filter(function(i){
    if(i.tipo!=='osp'||i.st==='finalizada'||!i.dtFinalExec)return false;
    var d=new Date(i.dtFinalExec+'T12:00:00');
    return Math.round((d-hoje)/86400000)<=3;
  }).length;
  return{total:base.length,finalizados:fin.length,mes:domes.length,finMes:finMes.length,confMedia:confMedia,porTipo:porTipo,ospCrit:ospCrit};
}

/* ── Comparativo entre inspeções da mesma edificação ───────────
   v79: retorna objeto diff para exibição no relatório           */
function compararInspecoes(edif,reg){
  var hist=S.insp.filter(function(i){
    return i.edif===edif&&(reg?i.reg===reg:true)&&i.st==='finalizada'&&i.tipo==='periodica';
  }).sort(function(a,b){
    return (a.dtVistoria||a.data)<(b.dtVistoria||b.data)?1:-1;
  });
  if(hist.length<2)return null;
  var atual=hist[0],anterior=hist[1];
  var calcConf=function(i){
    var its=ovals(i.itens||{}).filter(function(v){return v.s&&v.s!=='fora_periodo'&&v.s!=='nao_aplicavel';});
    if(!its.length)return null;
    // v83-fix: denominador = apenas itens aplicáveis (exclui nao_aplicavel)
    var aplic=its.filter(function(v){return v.s!=='pendente';});
    if(!aplic.length)return null;
    return Math.round(aplic.filter(function(v){return v.s==='conforme';}).length/aplic.length*100);
  };
  var confAtual=calcConf(atual),confAnt=calcConf(anterior);
  /* Itens que mudaram de status */
  var mudancas=[];
  Object.keys(atual.itens||{}).forEach(function(k){
    var ita=atual.itens[k],itp=anterior.itens&&anterior.itens[k];
    if(itp&&ita.s!==itp.s)mudancas.push({nm:ita.nm||k,de:itp.s,para:ita.s});
  });
  return{atual:atual,anterior:anterior,confAtual:confAtual,confAnt:confAnt,
    delta:confAtual!==null&&confAnt!==null?confAtual-confAnt:null,mudancas:mudancas};
}

/* ── Histórico de snapshots para undo ───────────────────────────
   v79: guarda últimos 5 estados do rascunho F                   */
var _undoStack=[];
var _undoMaxSize=5;
function undoPush(){
  if(!F||!F.id)return;
  try{
    var snap=JSON.parse(JSON.stringify(F));
    _undoStack.push(snap);
    if(_undoStack.length>_undoMaxSize)_undoStack.shift();
  }catch(e){}
}
function undoPop(){
  if(!_undoStack.length){Tt('Nada para desfazer.');return;}
  var snap=_undoStack.pop();
  try{
    Object.assign(F,snap);
    syncDraftFromF(true);DB.sv();
    if(typeof rFe==='function')rFe();
    Tt('↩️ Última alteração desfeita.');
  }catch(e){Tt('Erro ao desfazer.');}
}

/* ── Calendário de vistorias (Agenda) ───────────────────────────
   v79: retorna lista de próximas vistorias obrigatórias          */
function calcAgenda(){
  var hoje=new Date();hoje.setHours(0,0,0,0);
  var base=filterByReg(S.insp).filter(function(i){return i.st==='finalizada'&&i.tipo==='periodica';});
  /* Agrupar por edificação: última por edif */
  var ultPorEdif={};
  base.forEach(function(i){
    var k=i.edif+'::'+i.reg;var dt=new Date((i.dtVistoria||i.data)+'T12:00:00');
    if(!ultPorEdif[k]||dt>ultPorEdif[k].dt)ultPorEdif[k]={dt:dt,insp:i};
  });
  var agenda=[];
  Object.values(ultPorEdif).forEach(function(obj){
    var grp=obj.insp.grupo||'B';
    var meses=grp==='C'?6:3;/* v83-fix: Grupo C=6m, A/B=3m */
    var proxima=new Date(obj.dt);proxima.setMonth(proxima.getMonth()+meses);
    var diffDias=Math.round((proxima-hoje)/86400000);
    if(diffDias>=0&&diffDias<=60){/* próximos 60 dias */
      agenda.push({edif:obj.insp.edif,com:obj.insp.com,reg:obj.insp.reg,grp:grp,
        proxima:proxima,diffDias:diffDias,periodoMeses:meses,ultima:obj.dt});
    }
  });
  return agenda.sort(function(a,b){return a.diffDias-b.diffDias;});
}

/* ── Número sequencial de registro por região ───────────────────
   v79: contador local por região/ano; sincronizar com Supabase   */
function gerarNumRegistro(reg,tipo){
  var ano=new Date().getFullYear();
  var chave='_nreg_'+reg+'_'+ano+'_'+tipo;
  var n=parseInt(localStorage.getItem(chave)||'0')+1;
  localStorage.setItem(chave,String(n));
  return (reg||'NORTE').slice(0,3)+'-'+ano+'-'+String(n).padStart(4,'0');
}

/* ── Gerador NOT-INA ───────────────────────────────────────────
   v79: gera HTML da notificação de inadequação                   */
function gerarNOTINA(inspId){
  var i=S.insp.find(function(x){return x.id===inspId;});
  if(!i){Tt('Inspeção não encontrada.');return;}
  var ncs=ovals(i.itens||{}).filter(function(v){return v.s==='nao_conforme';});
  if(!ncs.length){Tt('Nenhuma não-conformidade encontrada.');return;}
  var s=S.sessao||{};var R=REG[i.reg]||{l:i.reg||'',ct:'CT 017/2026'};
  var numDoc=gerarNumRegistro(i.reg,'NOT');
  var dtHoje=fdt(new Date().toISOString().slice(0,10));
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'+
    '<title>NOT-INA '+numDoc+'</title>'+
    '<style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2cm;color:#000;}'+
    'h1{font-size:13pt;text-align:center;text-transform:uppercase;margin-bottom:4px;}'+
    '.sub{text-align:center;font-size:10pt;margin-bottom:20px;color:#333;}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:12px;}'+
    'td,th{border:1px solid #000;padding:6px 8px;font-size:10pt;}'+
    'th{background:#dbeafe;font-weight:700;text-align:left;}'+
    '.footer{margin-top:40px;display:flex;justify-content:space-between;}'+
    '.ass{text-align:center;border-top:1px solid #000;width:220px;padding-top:4px;font-size:9pt;}'+
    '@media print{body{margin:1.5cm;}}</style></head><body>'+
    '<h1>NOTIFICAÇÃO DE INADEQUAÇÃO — NOT-INA</h1>'+
    '<div class="sub">'+R.ct+' | Região '+R.l+' | N.º '+numDoc+'</div>'+
    '<table><tr><th colspan="2">DADOS DO DOCUMENTO</th></tr>'+
    '<tr><td><b>Data:</b></td><td>'+dtHoje+'</td></tr>'+
    '<tr><td><b>Edificação:</b></td><td>'+_escA(i.edif)+'</td></tr>'+
    '<tr><td><b>Comarca:</b></td><td>'+_escA(i.com||'—')+'</td></tr>'+
    '<tr><td><b>Fiscal:</b></td><td>'+_escA(i.fiscal||s.nome||'—')+'</td></tr>'+
    '<tr><td><b>Data da Vistoria:</b></td><td>'+fdt(i.dtVistoria||i.data)+'</td></tr>'+
    '</table>'+
    '<table><tr><th>#</th><th>Item</th><th>Periodicidade</th><th>Observação</th></tr>'+
    ncs.map(function(nc,ix){
      return '<tr><td>'+(ix+1)+'</td><td>'+_escA(nc.nm||nc.k||'—')+'</td>'+
        '<td>'+_escA(nc.tv||'—')+'</td><td>'+_escA(nc.obs||'—')+'</td></tr>';
    }).join('')+
    '</table>'+
    /* v84-fix: empresa correta por região — RENOVA é apenas o NORTE */
    var _emp = R.empresa && R.empresa !== 'A definir' ? R.empresa : null;
    '<p>Em virtude das inadequações constatadas acima, notificamos a empresa <b>'+(_emp?_escA(_emp):'contratada ('+_escA(R.ct||'—')+')')+'</b> '+
    'a regularizar as pendências no prazo de <b>30 (trinta) dias corridos</b>, conforme '+_escA(R.ct||'o contrato')+'.</p>'+
    '<div class="footer">'+
    '<div class="ass">'+_escA(i.fiscal||s.nome||'—')+'<br>Fiscal de Contrato — TJMG/COMAP-GEMAP-DENGEP</div>'+
    '<div class="ass">_______________________<br>Representante da Contratada<br>'+(_emp?_escA(_emp):_escA(R.ct||'—'))+'</div>'+
    '</div></body></html>';
  var blob=new Blob([html],{type:'text/html'});
  shareFile(blob,'NOT-INA_'+numDoc+'.html','NOT-INA '+numDoc);
  Tt('✅ NOT-INA '+numDoc+' gerada!');
}

/* ── Gerador ROC (Registro de Ocorrência Contratual) ─────────── */
function gerarROC(inspId){
  var i=S.insp.find(function(x){return x.id===inspId;});
  if(!i){Tt('Inspeção não encontrada.');return;}
  var s=S.sessao||{};var R=REG[i.reg]||{l:i.reg||'',ct:'CT 017/2026'};
  var numDoc=gerarNumRegistro(i.reg,'ROC');
  var dtHoje=fdt(new Date().toISOString().slice(0,10));
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'+
    '<title>ROC '+numDoc+'</title>'+
    '<style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2cm;color:#000;}'+
    'h1{font-size:13pt;text-align:center;text-transform:uppercase;margin-bottom:4px;}'+
    '.sub{text-align:center;font-size:10pt;margin-bottom:20px;color:#555;}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:14px;}'+
    'td,th{border:1px solid #000;padding:6px 8px;font-size:10pt;}'+
    'th{background:#fef3c7;font-weight:700;text-align:left;}'+
    '.footer{margin-top:40px;display:flex;justify-content:space-between;}'+
    '.ass{text-align:center;border-top:1px solid #000;width:220px;padding-top:4px;font-size:9pt;}'+
    '@media print{body{margin:1.5cm;}}</style></head><body>'+
    '<h1>REGISTRO DE OCORRÊNCIA CONTRATUAL — ROC</h1>'+
    '<div class="sub">'+R.ct+' | Região '+R.l+' | N.º '+numDoc+'</div>'+
    '<table><tr><th colspan="2">IDENTIFICAÇÃO</th></tr>'+
    '<tr><td><b>Data:</b></td><td>'+dtHoje+'</td></tr>'+
    '<tr><td><b>Edificação:</b></td><td>'+_escA(i.edif)+'</td></tr>'+
    '<tr><td><b>Comarca:</b></td><td>'+_escA(i.com||'—')+'</td></tr>'+
    '<tr><td><b>Tipo de Inspeção:</b></td><td>'+(TIPOS[i.tipo]||TIPOS.periodica).l+'</td></tr>'+
    '<tr><td><b>Fiscal Responsável:</b></td><td>'+_escA(i.fiscal||s.nome||'—')+'</td></tr>'+
    '</table>'+
    '<table><tr><th>Descrição da Ocorrência</th></tr>'+
    '<tr><td style="min-height:80px;vertical-align:top;">'+_escA(i.concl||i.descricao||'Preencher manualmente.')+'</td></tr>'+
    '</table>'+
    '<table><tr><th>Providência Determinada</th><th>Prazo</th><th>Responsável</th></tr>'+
    '<tr><td style="width:60%;"></td><td style="width:20%;"></td><td style="width:20%;"></td></tr>'+
    '</table>'+
    '<div class="footer">'+
    '<div class="ass">'+_escA(i.fiscal||s.nome||'—')+'<br>Fiscal TJMG</div>'+
    '<div class="ass">_______________________<br>Coordenador</div>'+
    '</div></body></html>';
  var blob=new Blob([html],{type:'text/html'});
  shareFile(blob,'ROC_'+numDoc+'.html','ROC '+numDoc);
  Tt('✅ ROC '+numDoc+' gerado!');
}

window.enableSwipe       = enableSwipe;
window.initVoice         = initVoice;
window.addVoiceBtn       = addVoiceBtn;
window.gcFotosOrfas      = gcFotosOrfas;
window.initErrorBoundary = initErrorBoundary;
window.registrarBackgroundSync = registrarBackgroundSync;
window.alertarPrazosOSP  = alertarPrazosOSP;
window.shareFile          = shareFile;
window.duplicarComoModelo = duplicarComoModelo;
window.alertarPeriodiciasVencidas = alertarPeriodiciasVencidas;
window.calcDashboardFiscal= calcDashboardFiscal;
window.compararInspecoes  = compararInspecoes;
window.undoPush           = undoPush;
window.undoPop            = undoPop;
window.calcAgenda         = calcAgenda;
window.gerarNumRegistro   = gerarNumRegistro;
window.gerarNOTINA        = gerarNOTINA;
window.gerarROC           = gerarROC;
