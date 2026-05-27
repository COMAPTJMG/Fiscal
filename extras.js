'use strict';
// ============================================================
// extras.js — Funcionalidades extras: SEI, Gov.br, QR, SINAPI,
//   WhatsApp, pré-cache campo, estoque MATS, voz navegação
// TJMG Fiscal PWA — v80
// ============================================================

/* ══════════════════════════════════════════════════════════════
   SEI — Sistema Eletrônico de Informação TJMG
   ══════════════════════════════════════════════════════════════ */
var SEI_URL = 'https://sei.tjmg.jus.br/sei/controlador.php?acao=procedimento_controlar&reset=1&id_bloco=78497&infra_sistema=100000100&infra_unidade_atual=100003385&infra_hash=93870dae72177047243c2bfb29d63815b1014bee1ea2307ba90382eb1a5ebbb5';

/* Abre SEI e mostra modal para o usuário copiar e colar o número do processo */
function abrirSEI(inspId){
  var i=S.insp.find(function(x){return x.id===inspId;});
  if(!i)return;
  var m=el('m-sei');if(!m){
    m=document.createElement('div');m.id='m-sei';
    m.className='mdl ctr';m.style.display='none';m.style.zIndex='600';
    m.innerHTML='<div class="mdc" style="max-width:400px;">'
      +'<div style="font-size:15px;font-weight:800;color:#003580;margin-bottom:12px;">🏛️ Vincular ao SEI</div>'
      +'<div style="font-size:12px;color:#64748b;margin-bottom:12px;">Cole o número do processo SEI para vincular a este relatório:</div>'
      +'<input id="sei-proc" placeholder="Ex: 0700016-12.2026.8.13.0000" style="margin-bottom:10px;">'
      +'<div id="sei-atual" style="font-size:11px;color:#003580;margin-bottom:10px;"></div>'
      +'<div style="display:flex;gap:8px;">'
      +'<button class="btn bo" style="flex:1;" onclick="cm(\'m-sei\')">Cancelar</button>'
      +'<button class="btn ba" style="flex:2;" onclick="salvarSEIProc(\''+inspId+'\')">💾 Salvar</button>'
      +'</div>'
      +'<button class="btn" style="background:#003580;color:#fff;margin-top:8px;" onclick="window.open(SEI_URL,\'_blank\')">🔗 Abrir SEI TJMG</button>'
      +'</div>';
    document.getElementById('app').appendChild(m);
  }
  var atual=el('sei-atual');if(atual) atual.textContent=i.seiProc?'Processo atual: '+i.seiProc:'';
  var inp=el('sei-proc');if(inp) inp.value=i.seiProc||'';
  m.style.display='flex';
}

function salvarSEIProc(inspId){
  var inp=el('sei-proc');if(!inp)return;
  var proc=inp.value.trim();
  var i=S.insp.find(function(x){return x.id===inspId;});
  if(!i)return;
  i.seiProc=proc;
  DB.sv();Sync.schedulePush(1000);
  Tt('✅ Processo SEI vinculado: '+proc);
  cm('m-sei');
}

/* ══════════════════════════════════════════════════════════════
   ASSINATURA DIGITAL GOV.BR (ICP-Brasil)
   Opcional — pergunta antes de assinar
   ══════════════════════════════════════════════════════════════ */
var GOVBR_CLIENT_ID = ''; /* ⚠ Registrar aplicação no Gov.br Developer (gratuito) */
var GOVBR_REDIRECT  = window.location.origin + window.location.pathname;

function perguntarAssinatura(inspId, onDecision){
  var m=el('m-assinar');if(!m){
    m=document.createElement('div');m.id='m-assinar';
    m.className='mdl ctr';m.style.display='none';m.style.zIndex='601';
    m.innerHTML='<div class="mdc" style="max-width:380px;">'
      +'<div style="font-size:32px;text-align:center;margin-bottom:10px;">🔏</div>'
      +'<div style="font-size:15px;font-weight:800;text-align:center;margin-bottom:8px;">Assinar Digitalmente?</div>'
      +'<div style="font-size:12px;color:#64748b;text-align:center;margin-bottom:16px;line-height:1.6;">Você pode assinar este relatório com seu certificado digital ICP-Brasil via Gov.br — ou exportar sem assinatura.</div>'
      +'<button class="btn" style="background:#1351b4;color:#fff;margin-bottom:8px;" id="btn-assinar-gov">🏛️ Assinar com Gov.br (ICP-Brasil)</button>'
      +'<button class="btn" style="background:#003580;color:#fff;margin-bottom:8px;" id="btn-assinar-icp">📱 Assinar com Token/Cartão A3</button>'
      +'<button class="btn bo" id="btn-assinar-nao">Exportar sem assinatura</button>'
      +'</div>';
    document.getElementById('app').appendChild(m);
  }
  m.style.display='flex';
  el('btn-assinar-gov').onclick=function(){cm('m-assinar');assinarComGovBr(inspId,onDecision);};
  el('btn-assinar-icp').onclick=function(){cm('m-assinar');assinarComICP(inspId,onDecision);};
  el('btn-assinar-nao').onclick=function(){cm('m-assinar');if(onDecision)onDecision(null);};
}

function assinarComGovBr(inspId, cb){
  if(!GOVBR_CLIENT_ID){
    Tt('⚠️ Client ID do Gov.br não configurado. Contate o administrador.');
    if(cb)cb(null);return;
  }
  /* Salvar contexto para retorno do OAuth */
  localStorage.setItem('_govbr_insp',inspId);
  var state=uid();
  localStorage.setItem('_govbr_state',state);
  var scope=encodeURIComponent('openid profile email govbr_confiabilidades govbr_assinatura');
  var url='https://sso.acesso.gov.br/authorize'
    +'?response_type=code'
    +'&client_id='+encodeURIComponent(GOVBR_CLIENT_ID)
    +'&scope='+scope
    +'&redirect_uri='+encodeURIComponent(GOVBR_REDIRECT)
    +'&state='+state
    +'&nonce='+uid();
  window.open(url,'_blank');
  Tt('Janela Gov.br aberta. Conclua o login e retorne ao app.');
  if(cb)cb(null); /* Assinatura assíncrona — export normal por ora */
}

function assinarComICP(inspId, cb){
  Tt('Para assinar com A3: exporte o HTML, abra no Acrobat/LibreOffice e assine com seu token.');
  if(cb)cb(null);
}

/* Verificar retorno OAuth Gov.br */
function verificarRetornoGovBr(){
  var params=new URLSearchParams(window.location.search);
  var code=params.get('code');var state=params.get('state');
  if(!code)return;
  var savedState=localStorage.getItem('_govbr_state');
  if(state!==savedState){Tt('Erro: state inválido.');return;}
  var inspId=localStorage.getItem('_govbr_insp');
  localStorage.removeItem('_govbr_state');localStorage.removeItem('_govbr_insp');
  /* Limpar URL */
  window.history.replaceState({},'',window.location.pathname);
  Tt('✅ Login Gov.br OK! Assinatura em processamento...');
  /* Registrar assinatura no relatório */
  if(inspId){
    var i=S.insp.find(function(x){return x.id===inspId;});
    if(i){
      i.assinatura={tipo:'govbr',ts:new Date().toISOString(),code_recebido:true};
      DB.sv();Sync.schedulePush(1000);
      Tt('✅ Assinatura Gov.br registrada no relatório.');
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   QR CODE POR EDIFICAÇÃO
   ══════════════════════════════════════════════════════════════ */
function gerarQRCodeEdif(edif,com,reg){
  /* URL que abre o formulário pré-preenchido */
  var url=window.location.origin+window.location.pathname
    +'?qr=1&edif='+encodeURIComponent(edif)+'&com='+encodeURIComponent(com||'')+'&reg='+encodeURIComponent(reg||'');

  var m=el('m-qr');if(!m){
    m=document.createElement('div');m.id='m-qr';
    m.className='mdl ctr';m.style.display='none';m.style.zIndex='600';
    m.innerHTML='<div class="mdc" style="max-width:340px;text-align:center;">'
      +'<div style="font-size:15px;font-weight:800;color:#003580;margin-bottom:12px;">📱 QR Code — '+_escA(edif)+'</div>'
      +'<div id="qr-canvas" style="margin:0 auto 12px;"></div>'
      +'<div style="font-size:10px;color:#64748b;margin-bottom:14px;word-break:break-all;">'+_escA(url)+'</div>'
      +'<div style="display:flex;gap:8px;">'
      +'<button class="btn bo" onclick="cm(\'m-qr\')" style="flex:1;">Fechar</button>'
      +'<button class="btn ba" onclick="imprimirQR()" style="flex:1;">🖨️ Imprimir</button>'
      +'</div></div>';
    document.getElementById('app').appendChild(m);
  }
  m.style.display='flex';
  /* Gerar QR */
  var qcDiv=el('qr-canvas');qcDiv.innerHTML='';
  if(typeof qrcode!=='undefined'){
    var qr=qrcode(0,'M');qr.addData(url);qr.make();
    qcDiv.innerHTML=qr.createImgTag(5,8);
  }else{
    qcDiv.innerHTML='<div style="color:#94a3b8;font-size:12px;">Lib QR não carregada</div>';
  }
}

function gerarQRCodesTodos(){
  /* Gerar PDF com QR de todas as edificações da região */
  var s=S.sessao||{};
  var reg=s.reg||'NORTE';
  var edifs=[];
  if(typeof EDIFICACOES!=='undefined'){
    var polos=EDIFICACOES[reg]||{};
    Object.keys(polos).forEach(function(polo){
      var coms=polos[polo]||{};
      Object.keys(coms).forEach(function(idx){
        var e=coms[idx];
        if(e&&e.edif&&e.com) edifs.push({edif:e.edif,com:e.com,reg:reg});
      });
    });
  }
  if(!edifs.length){Tt('Nenhuma edificação encontrada para a região.');return;}

  var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Codes — '+reg+'</title>'
    +'<style>body{font-family:Arial,sans-serif;margin:1cm;}h1{font-size:14pt;color:#003580;margin-bottom:20px;}'
    +'.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}'
    +'.item{border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;page-break-inside:avoid;}'
    +'.nm{font-size:10pt;font-weight:700;margin-top:8px;}.cm{font-size:8pt;color:#64748b;}'
    +'@media print{.grid{grid-template-columns:repeat(3,1fr);}}</style></head><body>'
    +'<h1>QR Codes de Edificações — Região '+reg+'</h1>'
    +'<div class="grid">';

  edifs.forEach(function(e){
    var url=window.location.origin+window.location.pathname
      +'?qr=1&edif='+encodeURIComponent(e.edif)+'&com='+encodeURIComponent(e.com)+'&reg='+encodeURIComponent(e.reg);
    var qrImg='';
    if(typeof qrcode!=='undefined'){
      try{var qr=qrcode(0,'M');qr.addData(url);qr.make();qrImg=qr.createImgTag(4,6);}catch(ex){}
    }
    html+='<div class="item">'+qrImg+'<div class="nm">'+_escA(e.edif)+'</div><div class="cm">'+_escA(e.com)+'</div></div>';
  });
  html+='</div></body></html>';
  var blob=new Blob([html],{type:'text/html'});
  shareFile(blob,'QR_Edificacoes_'+reg+'.html','QR Codes '+reg);
  Tt('✅ QR Codes gerados: '+edifs.length+' edificações');
}

window.imprimirQR=function(){ window.print(); };

/* Detectar abertura por QR Code */
function verificarQRCode(){
  var params=new URLSearchParams(window.location.search);
  if(!params.get('qr'))return;
  var edif=decodeURIComponent(params.get('edif')||'');
  var com=decodeURIComponent(params.get('com')||'');
  if(!edif)return;
  /* Limpar URL */
  window.history.replaceState({},'',window.location.pathname);
  /* Aguardar login e depois iniciar formulário */
  S._qrPendente={edif:edif,com:com};
  Tt('📱 QR Code detectado: '+edif+'. Faça login para iniciar a vistoria.');
}

function processarQRPendente(){
  if(!S._qrPendente||!S.sessao)return;
  var qr=S._qrPendente;S._qrPendente=null;
  if(typeof iniciarF==='function'){
    /* Pré-selecionar edificação no formulário */
    setTimeout(function(){
      iniciarF('periodica');
      setTimeout(function(){
        var el_edif=el('f-edif')||document.querySelector('[name="edif"]');
        var el_com=el('f-com')||document.querySelector('[name="com"]');
        if(el_edif)el_edif.value=qr.edif;
        if(el_com)el_com.value=qr.com;
        Tt('✅ Edificação pré-preenchida pelo QR Code!');
      },500);
    },800);
  }
}

/* ══════════════════════════════════════════════════════════════
   WEBP NAS FOTOS (substituir JPEG)
   ══════════════════════════════════════════════════════════════ */
/* Override global: comprimir em WebP ao invés de JPEG */
var _webpSupported=null;
function _verificarWebP(cb){
  if(_webpSupported!==null){cb(_webpSupported);return;}
  var img=new Image();
  img.onload=function(){_webpSupported=(img.width>0);cb(_webpSupported);};
  img.onerror=function(){_webpSupported=false;cb(false);};
  img.src='data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
}

/* Exportado para photo-store.js e form.js usarem */
function compressToWebP(file,maxLado,quality,cb){
  var r=new FileReader();
  r.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var MAX=maxLado||1280;
      var w=img.width,h=img.height;
      var sc=Math.min(1,MAX/Math.max(w,h));
      w=Math.round(w*sc);h=Math.round(h*sc);
      var cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      _verificarWebP(function(ok){
        var fmt=ok?'image/webp':'image/jpeg';
        cb(cv.toDataURL(fmt,quality||0.78));
      });
    };
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
}

/* ══════════════════════════════════════════════════════════════
   EXCEL SINAPI — exportar materiais em planilha
   ══════════════════════════════════════════════════════════════ */
function exportarExcelSINAPI(ids){
  var alvo=ids||[S.did];
  alvo=alvo.filter(Boolean);
  if(!alvo.length){Tt('Nenhuma inspeção selecionada.');return;}

  if(typeof XLSX==='undefined'){
    Tt('Carregando SheetJS...');
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=function(){_gerarExcelSINAPI(alvo);};
    document.head.appendChild(s);return;
  }
  _gerarExcelSINAPI(alvo);
}

function _gerarExcelSINAPI(ids){
  var rows=[['Código SINAPI','Descrição','Unidade','Qtde','Edificação','Comarca','Data','Fiscal','OS']];
  ids.forEach(function(id){
    var i=S.insp.find(function(x){return x.id===id;});if(!i)return;
    (i.mats||[]).forEach(function(m){
      rows.push([m.c||'—',m.d||m.nm||'—',m.u||'un',m.q||1,i.edif||'—',i.com||'—',fdt(i.dtVistoria||i.data),i.fiscal||'—',i.os||'—']);
    });
  });
  if(rows.length<=1){Tt('Nenhum material registrado nas inspeções selecionadas.');return;}

  var wb=XLSX.utils.book_new();
  var ws=XLSX.utils.aoa_to_sheet(rows);
  /* Larguras de coluna */
  ws['!cols']=[{wch:16},{wch:60},{wch:8},{wch:8},{wch:35},{wch:25},{wch:12},{wch:25},{wch:15}];
  XLSX.utils.book_append_sheet(wb,ws,'Materiais SINAPI');
  var buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  var blob=new Blob([buf],{type:'application/octet-stream'});
  shareFile(blob,'Materiais_SINAPI_'+new Date().toISOString().slice(0,10)+'.xlsx','Materiais SINAPI');
  Tt('✅ Planilha SINAPI gerada com '+(rows.length-1)+' materiais!');
}

/* ══════════════════════════════════════════════════════════════
   ALERTA WHATSAPP PARA NCs CRÍTICAS
   ══════════════════════════════════════════════════════════════ */
var WHATSAPP_COORD = '5531952900441';

function alertarNcCriticaWhatsApp(inspId){
  var i=S.insp.find(function(x){return x.id===inspId;});if(!i)return;
  var ncs=Object.values(i.itens||{}).filter(function(v){return v.s==='nao_conforme';});
  if(!ncs.length)return;

  var msg='⚠️ *NC Crítica — TJMG Fiscal*\n\n'
    +'🏛️ *Edificação:* '+i.edif+'\n'
    +'📍 *Comarca:* '+(i.com||'—')+'\n'
    +'📅 *Data:* '+fdt(i.dtVistoria||i.data)+'\n'
    +'👤 *Fiscal:* '+(i.fiscal||'—')+'\n\n'
    +'❌ *Não-conformidades ('+ncs.length+'):*\n'
    +ncs.slice(0,5).map(function(nc){return '• '+nc.nm+(nc.obs?' — '+nc.obs:'');}).join('\n')
    +(ncs.length>5?'\n...e mais '+(ncs.length-5)+' itens':'');

  var num=WHATSAPP_COORD;
  if(!num){
    /* Se não configurado, abre a caixa de seleção de contato */
    var waUrl='https://wa.me/?text='+encodeURIComponent(msg);
    window.open(waUrl,'_blank');
    Tt('WhatsApp aberto. Selecione o coordenador para enviar.');
    return;
  }
  window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank');
  Tt('✅ WhatsApp aberto com a mensagem de NC!');
}

/* ══════════════════════════════════════════════════════════════
   PRÉ-CACHE PARA CAMPO (baixar dados antes de sair)
   ══════════════════════════════════════════════════════════════ */
function preCacheCampo(){
  var s=S.sessao;if(!s)return;
  Tt('⬇️ Baixando dados para uso offline...');
  var etapas=0,total=3;
  function done(){etapas++;if(etapas===total) Tt('✅ Dados em cache! Pode usar sem internet.');}

  /* 1. Sincronizar relatórios */
  if(Sync.ready&&navigator.onLine){
    Sync.pullAll().then(function(){done();}).catch(function(){done();});
  }else{done();}

  /* 2. Pré-carregar tiles do mapa para a região */
  if('serviceWorker' in navigator && navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({type:'PRECACHE_REGION',reg:s.reg});
  }
  done();

  /* 3. Confirmar foto store OK */
  PhotoStore.listKeys().then(function(keys){
    console.log('[PreCache] Fotos em cache:',keys.length);
    done();
  }).catch(function(){done();});

  auditLog('precache_campo',{reg:s.reg});
}

/* ══════════════════════════════════════════════════════════════
   ESTOQUE DE MATERIAIS por região
   ══════════════════════════════════════════════════════════════ */
var ESTOQUE_KEY='_tjmg_estoque';

function getEstoque(reg){
  try{return JSON.parse(localStorage.getItem(ESTOQUE_KEY+'_'+(reg||'NORTE')))||{};}
  catch(e){return {};}
}
function setEstoque(reg,data){
  try{localStorage.setItem(ESTOQUE_KEY+'_'+(reg||'NORTE'),JSON.stringify(data));}catch(e){}
}

function rEstoque(){
  var eb=el('estoque-body');if(!eb)return;
  var s=S.sessao||{};var reg=s.reg||'NORTE';
  var estoque=getEstoque(reg);

  /* Calcular consumo do mês */
  var hoje=new Date();
  var mesAtual=hoje.getFullYear()+'-'+(String(hoje.getMonth()+1).padStart(2,'0'));
  var consumo={};
  filterByReg(S.insp).filter(function(i){return (i.dtVistoria||i.data||'').startsWith(mesAtual);})
    .forEach(function(i){
      (i.mats||[]).forEach(function(m){
        consumo[m.c||m.d]=(consumo[m.c||m.d]||0)+(parseFloat(m.q)||1);
      });
    });

  var h='<div style="padding:12px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:10px;">📦 Estoque de Materiais — '+reg+'</div>';

  /* Top consumidos no mês */
  var consumoArr=Object.keys(consumo).map(function(k){return {nm:k,q:consumo[k]};}).sort(function(a,b){return b.q-a.q;});
  if(consumoArr.length){
    h+='<div class="card" style="margin-bottom:12px;">';
    h+='<div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:8px;">Mais consumidos este mês</div>';
    consumoArr.slice(0,10).forEach(function(m){
      var saldo=estoque[m.nm]||0;
      var corSaldo=saldo<=0?'#dc2626':saldo<m.q*2?'#d97706':'#16a34a';
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">';
      h+='<div style="flex:1;font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_escA(m.nm)+'</div>';
      h+='<div style="font-size:11px;color:#64748b;">Consumo: <b>'+m.q+'</b></div>';
      h+='<div style="font-size:11px;color:'+corSaldo+';font-weight:700;">Saldo: '+saldo+'</div>';
      h+='<button onclick="ajustarEstoque(\''+encodeURIComponent(m.nm)+'\',\''+reg+'\')" style="border:none;background:#f1f5f9;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">✏️</button>';
      h+='</div>';
    });
    h+='</div>';
  }

  h+='<button class="btn ba" onclick="exportarExcelSINAPI()" style="font-size:12px;">📊 Exportar SINAPI (Excel)</button>';
  h+='</div>';
  eb.innerHTML=h;
}

function ajustarEstoque(nmEncoded,reg){
  var nm=decodeURIComponent(nmEncoded);
  var estoque=getEstoque(reg);
  var atual=estoque[nm]||0;
  var novo=prompt('Saldo atual de "'+nm.slice(0,40)+'": '+atual+'\n\nDigite o novo saldo:',atual);
  if(novo===null)return;
  var n=parseFloat(novo);
  if(isNaN(n)){Tt('Valor inválido.');return;}
  estoque[nm]=n;
  setEstoque(reg,estoque);
  rEstoque();
  Tt('✅ Estoque atualizado: '+nm.slice(0,30)+' → '+n);
}

/* ══════════════════════════════════════════════════════════════
   NAVEGAÇÃO POR VOZ NO FORMULÁRIO
   ══════════════════════════════════════════════════════════════ */
var _vozNavAtiva=false;var _vozNavRec=null;

function ativarVozNav(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    Tt('❌ Voz não suportada. Use Chrome/Edge no Android.');
    return;
  }

  if(_vozNavAtiva){
    _vozNavAtiva=false;
    if(_vozNavRec){try{_vozNavRec.stop();}catch(e){}}
    var p=el('voz-painel');if(p)p.remove();
    Tt('🎙️ Navegação por voz desativada.');
    return;
  }

  _vozNavAtiva=true;
  haptic('medio');

  /* Painel flutuante de status */
  var painel=el('voz-painel');if(!painel){
    painel=document.createElement('div');painel.id='voz-painel';
    painel.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
      +'background:rgba(0,32,96,.95);color:#fff;border-radius:20px;padding:10px 18px;'
      +'display:flex;align-items:center;gap:10px;z-index:7000;box-shadow:0 4px 20px rgba(0,0,0,.4);'
      +'backdrop-filter:blur(8px);min-width:240px;justify-content:center;';
    document.getElementById('app').appendChild(painel);
  }

  /* Animar pulsação quando ouvindo */
  function atualizarPainel(estado,ultimo){
    var icone=estado==='ouvindo'?'🎙️':estado==='processando'?'⏳':'💤';
    var cor  =estado==='ouvindo'?'#22c55e':estado==='processando'?'#f59e0b':'#94a3b8';
    painel.innerHTML='<span style="font-size:18px;">'+icone+'</span>'
      +'<div style="flex:1;">'
        +'<div style="font-size:11px;font-weight:800;">Voz Ativa — '+(estado==='ouvindo'?'Fale agora':'Aguardando')+'</div>'
        +(ultimo?'<div style="font-size:10px;opacity:.75;">Último: "'+ultimo+'"</div>':'<div style="font-size:10px;opacity:.6;">Comandos: próximo · voltar · conforme · NC · foto · salvar</div>')
      +'</div>'
      +'<button onclick="ativarVozNav()" style="border:none;background:rgba(255,255,255,.2);color:#fff;'
        +'border-radius:10px;padding:4px 10px;font-size:12px;cursor:pointer;">✕</button>';
    painel.style.borderBottom='3px solid '+cor;
  }
  atualizarPainel('aguardando','');

  /* Mapeamento de comandos */
  var COMANDOS=[
    {test:function(c){return c.includes('próximo')||c.includes('proximo')||c.includes('avançar');},
     acao:function(){if(typeof fnxt==='function')fnxt();return'Próxima etapa';}, label:'próximo'},
    {test:function(c){return c.includes('voltar')||c.includes('anterior');},
     acao:function(){if(typeof fprv==='function')fprv();return'Etapa anterior';}, label:'voltar'},
    {test:function(c){return c.includes('conforme')&&!c.includes('não')&&!c.includes('nao');},
     acao:function(){
       var btn=document.querySelector('[onclick*="conforme"]')||document.querySelector('[data-st="conforme"]');
       if(btn)btn.click();return'Marcado: Conforme';
     }, label:'conforme'},
    {test:function(c){return c.includes('não conforme')||c.includes('nao conforme')||c.includes('nc')||c.includes('não conforma');},
     acao:function(){
       var btn=document.querySelector('[onclick*="nao_conforme"]')||document.querySelector('[data-st="nao_conforme"]');
       if(btn)btn.click();return'Marcado: NC';
     }, label:'não conforme'},
    {test:function(c){return c.includes('não aplicável')||c.includes('nao aplicavel')||c.includes('na');},
     acao:function(){
       var btn=document.querySelector('[onclick*="nao_aplicavel"]');
       if(btn)btn.click();return'Marcado: N/A';
     }, label:'não aplicável'},
    {test:function(c){return c.includes('foto')||c.includes('câmera')||c.includes('camera');},
     acao:function(){
       var inp=document.querySelector('input[type="file"][capture]');if(inp)inp.click();
       return'Câmera aberta';
     }, label:'foto'},
    {test:function(c){return c.includes('salvar')||c.includes('gravar');},
     acao:function(){if(typeof salvarR==='function')salvarR();return'Salvo!';}, label:'salvar'},
    {test:function(c){return c.includes('finalizar')||c.includes('concluir');},
     acao:function(){if(typeof salvarF==='function')salvarF();return'Finalizado!';}, label:'finalizar'},
    {test:function(c){return c.includes('abrir item')||c.includes('detalhe');},
     acao:function(){
       var card=document.querySelector('.fcard');if(card)card.click();
       return'Item aberto';
     }, label:'abrir item'},
    {test:function(c){return c.includes('desativar voz')||c.includes('parar voz');},
     acao:function(){setTimeout(ativarVozNav,200);return'Voz desativada';}, label:'desativar voz'}
  ];

  function ouvir(){
    if(!_vozNavAtiva)return;
    var r=new SR();_vozNavRec=r;
    r.lang='pt-BR';r.continuous=false;r.maxAlternatives=3;
    r.onstart=function(){atualizarPainel('ouvindo','');};
    r.onresult=function(e){
      atualizarPainel('processando','');
      /* Testar todas as alternativas */
      var transcripts=[];
      for(var i=0;i<e.results[0].length;i++) transcripts.push(e.results[0][i].transcript.toLowerCase().trim());
      var executou=false;
      for(var ci=0;ci<COMANDOS.length&&!executou;ci++){
        for(var ti=0;ti<transcripts.length&&!executou;ti++){
          if(COMANDOS[ci].test(transcripts[ti])){
            var resultado=COMANDOS[ci].acao();
            haptic('leve');
            atualizarPainel('aguardando',transcripts[0]);
            Tt('🎙️ "'+transcripts[0]+'" → '+resultado);
            executou=true;
          }
        }
      }
      if(!executou){
        atualizarPainel('aguardando',transcripts[0]);
        /* Não reconhecido — não mostrar erro, só feedback visual */
      }
      setTimeout(ouvir,400);
    };
    r.onerror=function(e){
      if(e.error!=='no-speech') atualizarPainel('aguardando','erro: '+e.error);
      setTimeout(ouvir,800);
    };
    r.onend=function(){if(_vozNavAtiva)setTimeout(ouvir,300);};
    r.start();
  }
  ouvir();
  Tt('🎙️ Voz ativada! Comandos: próximo, voltar, conforme, não conforme, foto, salvar...');
}

/* ══════════════════════════════════════════════════════════════
   RELATÓRIO MENSAL AUTOMÁTICO
   ══════════════════════════════════════════════════════════════ */
function gerarRelatorioMensal(mesDado){
  var s=S.sessao||{};var reg=s.reg||'todos';
  var hoje=new Date();
  var mes=mesDado||((hoje.getFullYear()+'-'+String(hoje.getMonth()).padStart(2,'0'))); /* mês anterior */
  if(!mesDado){
    var d=new Date(hoje.getFullYear(),hoje.getMonth()-1,1);
    mes=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  var mesNome=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var mIdx=parseInt(mes.split('-')[1])-1;
  var mAno=mes.split('-')[0];

  var base=S.insp.filter(function(i){
    if(reg!=='todos'&&i.reg!==reg)return false;
    if(i.st!=='finalizada')return false;
    return (i.dtVistoria||i.data||'').startsWith(mes);
  });

  if(!base.length){Tt('Nenhum relatório finalizado em '+mesNome[mIdx]+'/'+mAno);return;}

  var R=typeof REG!=='undefined'&&REG[reg]?REG[reg]:{l:reg,ct:'CT 017/2026'};
  var imrRes=typeof calcIMRPeriodo==='function'?calcIMRPeriodo(reg,mes+'-01',mes+'-31'):null;
  var imrPct=imrRes&&imrRes.imr!==null?Math.round(imrRes.imr*100):null;
  var faixa=imrPct!==null&&typeof getFaixaIMR==='function'?getFaixaIMR(imrRes.imr):null;

  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    +'<title>Relatório Mensal '+mesNome[mIdx]+'/'+mAno+'</title>'
    +'<style>body{font-family:Arial,sans-serif;font-size:10pt;margin:2cm;color:#000;}'
    +'h1{font-size:13pt;text-align:center;color:#003580;margin-bottom:4px;}'
    +'.sub{text-align:center;font-size:10pt;color:#555;margin-bottom:20px;}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:14px;}'
    +'td,th{border:1px solid #ccc;padding:5px 7px;font-size:9pt;}'
    +'th{background:#dbeafe;font-weight:700;text-align:left;}'
    +'h2{font-size:11pt;margin:14px 0 6px;border-bottom:2px solid #003580;padding-bottom:3px;}'
    +'@media print{body{margin:1.5cm;}}</style></head><body>'
    +'<h1>RELATÓRIO MENSAL DE FISCALIZAÇÃO</h1>'
    +'<div class="sub">'+R.ct+' · Região '+R.l+' · '+mesNome[mIdx]+'/'+mAno+'</div>'
    +'<table><tr><th colspan="2">RESUMO EXECUTIVO</th></tr>'
    +'<tr><td>Total de inspeções finalizadas</td><td><b>'+base.length+'</b></td></tr>'
    +(imrPct!==null?'<tr><td>IMR apurado</td><td><b>'+imrPct+'%</b> — '+(faixa?faixa.label:'—')+'</td></tr>':'')
    +(imrPct!==null&&faixa?'<tr><td>Glosa aplicável</td><td><b>'+(faixa.glosa*100).toFixed(0)+'%</b></td></tr>':'')
    +'</table>'
    +'<h2>Inspeções Realizadas</h2>'
    +'<table><tr><th>Data</th><th>Tipo</th><th>Edificação</th><th>Comarca</th><th>Fiscal</th><th>IMR</th><th>SEI</th></tr>'
    +base.map(function(i){
      var imr=typeof calcIMRInsp==='function'?calcIMRInsp(i):null;
      return '<tr><td>'+fdt(i.dtVistoria||i.data)+'</td>'
        +'<td>'+(typeof TIPOS!=='undefined'&&TIPOS[i.tipo]?TIPOS[i.tipo].l:i.tipo)+'</td>'
        +'<td>'+_escA(i.edif)+'</td>'
        +'<td>'+_escA(i.com||'—')+'</td>'
        +'<td>'+_escA(i.fiscal||'—')+'</td>'
        +'<td><b>'+(imr!==null?Math.round(imr*100)+'%':'—')+'</b></td>'
        +'<td>'+(i.seiProc||'—')+'</td></tr>';
    }).join('')
    +'</table>'
    +'</body></html>';

  var blob=new Blob([html],{type:'text/html'});
  shareFile(blob,'Relatorio_Mensal_'+mesNome[mIdx]+'_'+mAno+'.html','Relatório Mensal '+mesNome[mIdx]+'/'+mAno);
  Tt('✅ Relatório de '+mesNome[mIdx]+'/'+mAno+' gerado ('+base.length+' inspeções)!');
}

/* ══════════════════════════════════════════════════════════════
   CHECKLIST DE ENCERRAMENTO DE CONTRATO (NBR 5674)
   ══════════════════════════════════════════════════════════════ */
function rEncerramentoContrato(){
  var eb=el('encerr-body');if(!eb)return;
  var s=S.sessao||{};var reg=s.reg||'NORTE';
  var R=typeof REG!=='undefined'&&REG[reg]?REG[reg]:{l:reg,ct:'CT 017/2026'};
  var base=S.insp.filter(function(i){return i.reg===reg&&i.st==='finalizada';});

  /* Verificar cobertura de edificações */
  var edifsCobertos=new Set();
  base.forEach(function(i){edifsCobertos.add(i.edif);});

  var totalEdifs=0;var edifsSemProntuario=[];
  if(typeof EDIFICACOES!=='undefined'){
    var polos=EDIFICACOES[reg]||{};
    Object.keys(polos).forEach(function(polo){
      var coms=polos[polo]||{};
      Object.keys(coms).forEach(function(idx){
        var e=coms[idx];if(!e||!e.edif)return;
        totalEdifs++;
        if(!edifsCobertos.has(e.edif)) edifsSemProntuario.push(e.edif);
      });
    });
  }

  /* Laudos vencidos */
  var pronts=base.filter(function(i){return i.tipo==='prontuario';});
  var vencidos=pronts.filter(function(i){
    if(!i.pron||!i.pron.validade)return false;
    return new Date(i.pron.validade)<new Date();
  });

  var ok=edifsSemProntuario.length===0&&vencidos.length===0;
  var corStatus=ok?'#16a34a':'#dc2626';

  var h='<div style="padding:12px;">';
  h+='<div class="card" style="border-left:4px solid '+corStatus+';margin-bottom:12px;">';
  h+='<div style="font-size:14px;font-weight:900;color:'+corStatus+';margin-bottom:4px;">'+(ok?'✅ Pronto para encerrar':'⚠️ Pendências para encerrar')+'</div>';
  h+='<div style="font-size:11px;color:#64748b;">'+R.ct+' · Região '+R.l+'</div>';
  h+='</div>';

  /* KPIs */
  h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;">';
  h+='<div class="card" style="text-align:center;padding:10px;"><div style="font-size:20px;font-weight:900;color:#003580;">'+base.length+'</div><div style="font-size:9px;color:#64748b;">Relatórios</div></div>';
  h+='<div class="card" style="text-align:center;padding:10px;"><div style="font-size:20px;font-weight:900;color:'+(edifsCobertos.size===totalEdifs?'#16a34a':'#d97706')+';">'+edifsCobertos.size+'/'+totalEdifs+'</div><div style="font-size:9px;color:#64748b;">Edificações cobertas</div></div>';
  h+='<div class="card" style="text-align:center;padding:10px;"><div style="font-size:20px;font-weight:900;color:'+(pronts.length>0?'#16a34a':'#d97706')+';">'+pronts.length+'</div><div style="font-size:9px;color:#64748b;">Laudos/Prontuários</div></div>';
  h+='<div class="card" style="text-align:center;padding:10px;"><div style="font-size:20px;font-weight:900;color:'+(vencidos.length>0?'#dc2626':'#16a34a')+';">'+vencidos.length+'</div><div style="font-size:9px;color:#64748b;">Laudos vencidos</div></div>';
  h+='</div>';

  if(edifsSemProntuario.length){
    h+='<div class="card" style="border-left:4px solid #d97706;margin-bottom:12px;">';
    h+='<div style="font-size:12px;font-weight:800;color:#d97706;margin-bottom:8px;">Edificações sem cobertura ('+edifsSemProntuario.length+')</div>';
    edifsSemProntuario.slice(0,10).forEach(function(e){
      h+='<div style="font-size:11px;color:#64748b;padding:3px 0;border-bottom:1px solid #f1f5f9;">'+_escA(e)+'</div>';
    });
    if(edifsSemProntuario.length>10) h+='<div style="font-size:10px;color:#94a3b8;margin-top:4px;">...e mais '+(edifsSemProntuario.length-10)+'</div>';
    h+='</div>';
  }

  h+='<button class="btn ba" onclick="gerarRelatorioFinalFiscalizacao(\''+reg+'\')" style="margin-bottom:8px;">📄 Gerar Relatório Final (NBR 5674)</button>';
  h+='<button class="btn" style="background:#003580;color:#fff;" onclick="window.open(SEI_URL,\'_blank\')">🏛️ Abrir SEI para Arquivamento</button>';
  h+='</div>';
  eb.innerHTML=h;
}

function gerarRelatorioFinalFiscalizacao(reg){
  Tt('Gerando relatório final...');
  gerarRelatorioMensal(); /* base — expandir conforme necessidade */
}

/* ══════════════════════════════════════════════════════════════
   TERMO DE RECEBIMENTO (Lei 14.133/2021, Art. 140)
   ══════════════════════════════════════════════════════════════ */
function gerarTermoRecebimento(tipo,mes){
  /* Modal interativo para preenchimento antes de gerar */
  var m=el('m-termo');if(!m){
    m=document.createElement('div');m.id='m-termo';
    m.className='mdl ctr';m.style.display='none';m.style.zIndex='600';
    document.getElementById('app').appendChild(m);
  }
  var s=S.sessao||{};
  var reg=s.reg||'NORTE';
  var R=(typeof REG!=='undefined'&&REG[reg])?REG[reg]:{l:reg,ct:'CT 017/2026'};
  var hoje=new Date();
  var mesDefault=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0');
  var tipoLabel=tipo==='definitivo'?'DEFINITIVO':'PROVISÓRIO';
  var tipoDesc=tipo==='definitivo'
    ?'Após vistoria e confirmação de que todos os serviços estão corretos, sem pendências.'
    :'Recebimento inicial para verificação. Não exclui responsabilidade por defeitos ocultos.';

  m.innerHTML='<div class="mdc mds" style="max-width:480px;max-height:88vh;overflow-y:auto;background:#fff;color:#0f172a;">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">'
    +'<div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:20px;">📜</div>'
    +'<div><div style="font-size:15px;font-weight:800;color:#003580;">Termo de Recebimento '+tipoLabel+'</div>'
    +'<div style="font-size:11px;color:#64748b;">'+tipoDesc+'</div></div>'
    +'<button onclick="cm(\'m-termo\')" style="margin-left:auto;border:none;background:#f1f5f9;border-radius:8px;padding:5px 10px;font-size:13px;color:#64748b;cursor:pointer;">✕</button>'
    +'</div>'
    +'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:#1e40af;line-height:1.6;">'
    +'<strong>Base legal:</strong> Art. 140 da Lei nº 14.133/2021 — o recebimento '+(tipo==='definitivo'?'definitivo':'provisório')+' é obrigatório e deve ser lavrado em termo formal.'
    +'</div>'
    /* Campos de preenchimento */
    +'<div class="lbl">Contrato</div>'
    +'<input id="tr-ct" value="'+_escA(R.ct)+'" placeholder="Ex: CT 017/2026" style="margin-bottom:10px;background:#f8fafc;color:#0f172a;">'
    +'<div class="lbl">Empresa Contratada</div>'
    +'<input id="tr-emp" value="RENOVA ENGENHARIA" placeholder="Nome da empresa" style="margin-bottom:10px;background:#f8fafc;color:#0f172a;">'
    +'<div class="lbl">Período de Medição (mês/ano)</div>'
    +'<input id="tr-mes" value="'+mesDefault+'" placeholder="YYYY-MM" style="margin-bottom:10px;background:#f8fafc;color:#0f172a;">'
    +'<div class="lbl">Valor da Medição (R$)</div>'
    +'<input id="tr-val" type="number" placeholder="Ex: 150000.00" step="0.01" style="margin-bottom:10px;background:#f8fafc;color:#0f172a;">'
    +'<div class="lbl">Glosa Aplicada (%)</div>'
    +'<input id="tr-glosa" type="number" placeholder="Ex: 5 (para 5%)" step="0.1" min="0" max="100" style="margin-bottom:10px;background:#f8fafc;color:#0f172a;">'
    +'<div class="lbl">Número SEI do Processo (opcional)</div>'
    +'<input id="tr-sei" placeholder="Ex: 0700016-12.2026.8.13.0000" style="margin-bottom:14px;background:#f8fafc;color:#0f172a;">'
    +'<div class="lbl">Observações (opcional)</div>'
    +'<textarea id="tr-obs" placeholder="Pendências, ressalvas ou informações adicionais..." style="min-height:56px;margin-bottom:14px;background:#f8fafc;color:#0f172a;"></textarea>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
    +'<button class="btn bo" onclick="cm(\'m-termo\')">Cancelar</button>'
    +'<button class="btn ba" onclick="_gerarTermoHTML(\''+tipo+'\')">📄 Gerar Documento</button>'
    +'</div>'
    +'</div>';
  m.style.display='flex';
}

function _gerarTermoHTML(tipo){
  var s=S.sessao||{};var reg=s.reg||'NORTE';
  var R=(typeof REG!=='undefined'&&REG[reg])?REG[reg]:{l:reg,ct:'CT 017/2026'};
  var hoje=new Date();
  var dia=String(hoje.getDate()).padStart(2,'0');
  var meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var dataExtenso=dia+' de '+meses[hoje.getMonth()]+' de '+hoje.getFullYear();
  var tipoLabel=tipo==='definitivo'?'DEFINITIVO':'PROVISÓRIO';

  var ct   =el('tr-ct')   ?el('tr-ct').value.trim()   :R.ct;
  var emp  =el('tr-emp')  ?el('tr-emp').value.trim()  :'—';
  var mes  =el('tr-mes')  ?el('tr-mes').value.trim()  :'';
  var val  =el('tr-val')  ?el('tr-val').value.trim()  :'';
  var glosa=el('tr-glosa')?el('tr-glosa').value.trim():'0';
  var sei  =el('tr-sei')  ?el('tr-sei').value.trim()  :'';
  var obs  =el('tr-obs')  ?el('tr-obs').value.trim()  :'';
  cm('m-termo');

  /* Calcular valor líquido */
  var valNum  =parseFloat(val)||0;
  var glosaNum=parseFloat(glosa)||0;
  var glosaR  =valNum*(glosaNum/100);
  var liquido =valNum-glosaR;
  var fmtVal  =function(v){return'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');};

  /* Formatar mês */
  var mesLabel='';
  if(mes){var mp=mes.split('-');if(mp.length===2)mesLabel=meses[parseInt(mp[1])-1]+'/'+mp[0];}

  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    +'<title>Termo de Recebimento '+tipoLabel+'</title>'
    +'<style>'
    +'  @page{margin:2.5cm 2cm;}'
    +'  body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;color:#000;margin:0;}'
    +'  .cabecalho{text-align:center;border-bottom:3px double #000;padding-bottom:14px;margin-bottom:20px;}'
    +'  .brasao{font-size:32pt;margin-bottom:4px;}'
    +'  .org{font-size:10pt;font-weight:bold;letter-spacing:.5px;}'
    +'  h1{font-size:13pt;font-weight:bold;text-transform:uppercase;text-align:center;margin:20px 0 4px;letter-spacing:1px;}'
    +'  h2{font-size:12pt;text-align:center;color:#555;font-weight:normal;margin:0 0 20px;}'
    +'  .corpo p{text-align:justify;margin:10px 0;}'
    +'  .destaque{font-weight:bold;}'
    +'  table{width:100%;border-collapse:collapse;margin:14px 0;}'
    +'  td,th{border:1px solid #000;padding:6px 10px;font-size:10pt;}'
    +'  th{background:#e8e8e8;font-weight:bold;text-align:left;}'
    +'  .assinaturas{margin-top:60px;display:flex;justify-content:space-between;gap:20px;}'
    +'  .ass{text-align:center;flex:1;}'
    +'  .ass .linha{border-top:1px solid #000;margin-bottom:4px;}'
    +'  .ass .nm{font-size:10pt;font-weight:bold;}'
    +'  .ass .cargo{font-size:9pt;}'
    +'  .rodape{margin-top:40px;border-top:1px solid #000;padding-top:8px;font-size:8pt;color:#555;text-align:center;}'
    +'  @media print{body{-webkit-print-color-adjust:exact;}}'
    +'</style></head><body>'
    +'<div class="cabecalho">'
    +'<div class="brasao">⚖️</div>'
    +'<div class="org">TRIBUNAL DE JUSTIÇA DO ESTADO DE MINAS GERAIS</div>'
    +'<div style="font-size:9pt;">Coordenadoria de Manutenção Predial — COMAPT</div>'
    +'</div>'
    +'<h1>Termo de Recebimento '+tipoLabel+' de Serviço</h1>'
    +'<h2>'+ct+' · Região '+R.l+(mesLabel?' · '+mesLabel:'')+'</h2>'
    +'<div class="corpo">'
    +'<table style="margin-bottom:16px;">'
    +'<tr><th style="width:35%;">Contrato</th><td>'+_escA(ct)+'</td></tr>'
    +'<tr><th>Empresa Contratada</th><td>'+_escA(emp)+'</td></tr>'
    +'<tr><th>Região Administrativa</th><td>'+R.l+'</td></tr>'
    +(mesLabel?'<tr><th>Período de Medição</th><td>'+mesLabel+'</td></tr>':'')
    +(sei?'<tr><th>Processo SEI</th><td>'+_escA(sei)+'</td></tr>':'')
    +'<tr><th>Data do Termo</th><td>'+dataExtenso+'</td></tr>'
    +'</table>'
    +(valNum>0?'<table>'
      +'<tr><th colspan="2" style="background:#dbeafe;text-align:center;">Valores da Medição</th></tr>'
      +'<tr><th>Valor Bruto da Medição</th><td>'+fmtVal(valNum)+'</td></tr>'
      +'<tr><th>Glosa Aplicada (IMR '+glosaNum+'%)</th><td style="color:#dc2626;">— '+fmtVal(glosaR)+'</td></tr>'
      +'<tr><th style="background:#dcfce7;">Valor Líquido a Pagar</th><td style="font-weight:bold;color:#15803d;">'+fmtVal(liquido)+'</td></tr>'
      +'</table>':'')
    +'<p>Aos <span class="destaque">'+dataExtenso+'</span>, a fiscalização do TJMG, designada para o acompanhamento do '
    +_escA(ct)+', realizou o recebimento <span class="destaque">'+tipoLabel+'</span> dos serviços de manutenção predial '
    +'executados pela empresa <span class="destaque">'+_escA(emp)+'</span>.</p>'
    +'<p>Os serviços foram verificados quanto à sua conformidade com o objeto contratual, as normas técnicas aplicáveis '
    +'(<span class="destaque">NBR 5674, NBR 14037, NBR 5419, NBR 5410</span>) e as especificações constantes nos Anexos do contrato.</p>'
    +(tipo==='definitivo'
      ?'<p>Após a análise técnica, <span class="destaque">DECLARA-SE</span> que os serviços apresentados '
       +'encontram-se <span class="destaque">em perfeitas condições</span> de uso e funcionamento, atendendo '
       +'integralmente às especificações contratadas, não havendo pendências registradas para a presente medição.</p>'
      :'<p>O presente recebimento provisório <span class="destaque">não exclui</span> a responsabilidade da empresa '
       +'contratada por quaisquer vícios ou defeitos ocultos que venham a ser identificados durante o período de '
       +'observação e garantia, nos termos da legislação aplicável.</p>')
    +(obs?'<p><span class="destaque">Observações e ressalvas:</span> '+_escA(obs)+'</p>':'')
    +'<p>Este Termo é lavrado em conformidade com o <span class="destaque">Art. 140 da Lei nº 14.133/2021</span>.</p>'
    +'</div>'
    +'<div class="assinaturas">'
    +'<div class="ass"><div class="linha"></div><div class="nm">'+_escA(s.nome||'Fiscal TJMG')+'</div><div class="cargo">Fiscal · Matrícula '+_escA(s.mat||'—')+'</div></div>'
    +'<div class="ass"><div class="linha"></div><div class="nm">Coordenador TJMG</div><div class="cargo">Coordenadoria de Manutenção Predial</div></div>'
    +'<div class="ass"><div class="linha"></div><div class="nm">Representante da Contratada</div><div class="cargo">'+_escA(emp)+'</div></div>'
    +'</div>'
    +'<div class="rodape">TJMG · COMAPT · Termo gerado eletronicamente pelo TJMG Fiscal PWA · '+dataExtenso+(sei?' · SEI: '+_escA(sei):'')+'</div>'
    +'</body></html>';

  var blob=new Blob([html],{type:'text/html'});
  var fn='Termo_'+tipoLabel+'_'+(mesLabel||dataExtenso).replace(/[\s/]/g,'_')+'.html';
  shareFile(blob,fn,'Termo de Recebimento '+tipoLabel);
  if(typeof auditLog==='function') auditLog('termo_recebimento',{tipo:tipoLabel,reg:reg,mes:mesLabel,sei:sei});
  Tt('✅ Termo '+tipoLabel+' gerado! Abra, revise e imprima.');
}
window._gerarTermoHTML=_gerarTermoHTML;

/* ══════════════════════════════════════════════════════════════
   EXPORTS
   ══════════════════════════════════════════════════════════════ */
window.abrirSEI              = abrirSEI;
window.salvarSEIProc         = salvarSEIProc;
window.perguntarAssinatura   = perguntarAssinatura;
window.assinarComGovBr       = assinarComGovBr;
window.verificarRetornoGovBr = verificarRetornoGovBr;
window.gerarQRCodeEdif       = gerarQRCodeEdif;
window.gerarQRCodesTodos     = gerarQRCodesTodos;
window.verificarQRCode       = verificarQRCode;
window.processarQRPendente   = processarQRPendente;
window.compressToWebP        = compressToWebP;
window.exportarExcelSINAPI   = exportarExcelSINAPI;
window.alertarNcCriticaWhatsApp = alertarNcCriticaWhatsApp;
window.preCacheCampo         = preCacheCampo;
window.rEstoque              = rEstoque;
window.ajustarEstoque        = ajustarEstoque;
window.ativarVozNav          = ativarVozNav;
window.gerarRelatorioMensal  = gerarRelatorioMensal;
window.rEncerramentoContrato = rEncerramentoContrato;
window.gerarTermoRecebimento = gerarTermoRecebimento;
window.gerarRelatorioFinalFiscalizacao = gerarRelatorioFinalFiscalizacao;
window.SEI_URL               = SEI_URL;

/* ══════════════════════════════════════════════════════════════
   GPS AUTOMÁTICO (v81)
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   GPS APRIMORADO (v82)
   - Múltiplas tentativas para melhor precisão
   - watchPosition para atualização contínua
   - Badge visual no formulário
   - Histórico de posições para trilha da vistoria
   ══════════════════════════════════════════════════════════════ */
var _gpsWatch   = null;  /* ID do watchPosition */
var _gpsTrilha  = [];    /* Histórico de posições durante a vistoria */
var _gpsMelhor  = null;  /* Melhor posição capturada (menor acc) */

function capturarGPS(cb){
  if(!navigator.geolocation){if(cb)cb(null);return;}
  navigator.geolocation.getCurrentPosition(function(pos){
    var gps={
      lat: pos.coords.latitude.toFixed(6),
      lon: pos.coords.longitude.toFixed(6),
      acc: Math.round(pos.coords.accuracy),
      alt: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
      ts:  new Date().toISOString()
    };
    if(cb)cb(gps);
  },function(err){
    if(cb)cb(null);
    console.warn('[GPS] erro:',err.message);
  },{timeout:12000, maximumAge:30000, enableHighAccuracy:true});
}

function iniciarGPS(){
  if(!navigator.geolocation){
    _mostrarBadgeGPS(null,'negado');
    return;
  }

  /* Exibe badge "buscando" imediatamente */
  _mostrarBadgeGPS(null,'buscando');

  /* 1ª captura rápida (pode ter baixa precisão) */
  capturarGPS(function(gps){
    if(gps&&F){
      F.gps=gps;
      _gpsMelhor=gps;
      _mostrarBadgeGPS(gps,'ok');
      DB.sv();
    }
  });

  /* watchPosition: atualiza continuamente durante a vistoria */
  if(_gpsWatch!==null){navigator.geolocation.clearWatch(_gpsWatch);_gpsWatch=null;}
  _gpsTrilha=[];
  _gpsWatch=navigator.geolocation.watchPosition(
    function(pos){
      var gps={
        lat: pos.coords.latitude.toFixed(6),
        lon: pos.coords.longitude.toFixed(6),
        acc: Math.round(pos.coords.accuracy),
        alt: pos.coords.altitude?Math.round(pos.coords.altitude):null,
        ts:  new Date().toISOString()
      };
      /* Guardar trilha (max 20 pontos) */
      _gpsTrilha.push(gps);
      if(_gpsTrilha.length>20) _gpsTrilha.shift();
      /* Atualizar se precisão melhorou */
      if(!_gpsMelhor||gps.acc<_gpsMelhor.acc){
        _gpsMelhor=gps;
        if(F){F.gps=gps;F.gpsTrilha=_gpsTrilha;}
        _mostrarBadgeGPS(gps,'ok');
      }
    },
    function(err){console.warn('[GPS watch]',err.message);},
    {enableHighAccuracy:true, maximumAge:10000, timeout:20000}
  );
}

function pararGPS(){
  if(_gpsWatch!==null){
    navigator.geolocation.clearWatch(_gpsWatch);
    _gpsWatch=null;
  }
  /* Salvar trilha final */
  if(F&&_gpsTrilha.length>0) F.gpsTrilha=_gpsTrilha;
  _gpsTrilha=[];_gpsMelhor=null;
}

function _mostrarBadgeGPS(gps,status){
  var badge=el('gps-badge-form');
  if(!badge){
    badge=document.createElement('div');badge.id='gps-badge-form';
    badge.style.cssText='position:fixed;top:calc(var(--st)+8px);right:8px;z-index:500;'
      +'border-radius:20px;padding:4px 10px;font-size:10px;font-weight:800;'
      +'display:flex;align-items:center;gap:5px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);';
    badge.onclick=function(){_mostrarDetalhesGPS();};
    document.getElementById('app').appendChild(badge);
  }
  if(status==='buscando'){
    badge.style.background='#fef3c7';badge.style.color='#92400e';
    badge.innerHTML='📡 Buscando GPS...';
  }else if(status==='ok'&&gps){
    var qualidade=gps.acc<=10?'🟢':gps.acc<=30?'🟡':gps.acc<=100?'🟠':'🔴';
    var txtQ=gps.acc<=10?'Excelente':gps.acc<=30?'Bom':gps.acc<=100?'Regular':'Fraco';
    badge.style.background='#f0fdf4';badge.style.color='#15803d';
    badge.innerHTML=qualidade+' GPS ±'+gps.acc+'m ('+txtQ+')';
  }else if(status==='negado'){
    badge.style.background='#fee2e2';badge.style.color='#dc2626';
    badge.innerHTML='❌ GPS negado';
  }
  /* Esconder se não estiver no formulário */
  var onForm=document.querySelector('#s-form.act');
  badge.style.display=onForm?'flex':'none';
}

function _mostrarDetalhesGPS(){
  var gps=F&&F.gps;if(!gps){Tt('GPS ainda não capturado.');return;}
  var mapUrl='https://www.google.com/maps?q='+gps.lat+','+gps.lon;
  var m=el('m-gps-det');if(!m){
    m=document.createElement('div');m.id='m-gps-det';
    m.className='mdl ctr';m.style.display='none';m.style.zIndex='650';
    document.getElementById('app').appendChild(m);
  }
  var qualidade=gps.acc<=10?'🟢 Excelente':gps.acc<=30?'🟡 Bom':gps.acc<=100?'🟠 Regular':'🔴 Fraco';
  m.innerHTML='<div class="mdc" style="max-width:380px;background:#fff;color:#0f172a;">'
    +'<div style="font-size:15px;font-weight:800;color:#003580;margin-bottom:14px;">📍 Dados do GPS</div>'
    +'<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:12px;margin-bottom:12px;">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      +'<div style="text-align:center;"><div style="font-size:10px;color:#64748b;font-weight:700;">LATITUDE</div><div style="font-size:14px;font-weight:800;color:#15803d;font-family:monospace;">'+gps.lat+'</div></div>'
      +'<div style="text-align:center;"><div style="font-size:10px;color:#64748b;font-weight:700;">LONGITUDE</div><div style="font-size:14px;font-weight:800;color:#15803d;font-family:monospace;">'+gps.lon+'</div></div>'
      +'<div style="text-align:center;"><div style="font-size:10px;color:#64748b;font-weight:700;">PRECISÃO</div><div style="font-size:14px;font-weight:800;color:#0f172a;">±'+gps.acc+'m</div></div>'
      +'<div style="text-align:center;"><div style="font-size:10px;color:#64748b;font-weight:700;">QUALIDADE</div><div style="font-size:13px;font-weight:700;">'+qualidade+'</div></div>'
      +'</div>'
    +'</div>'
    +(_gpsTrilha.length>1?'<div style="font-size:11px;color:#64748b;margin-bottom:12px;">🗺️ '+_gpsTrilha.length+' pontos registrados durante a vistoria</div>':'')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
    +'<button class="btn bo" onclick="cm(\'m-gps-det\')" style="font-size:12px;">Fechar</button>'
    +'<button class="btn ba" onclick="window.open(\''+mapUrl+'\',\'_blank\')" style="font-size:12px;">🗺️ Ver no Mapa</button>'
    +'</div>'
    +'<button style="width:100%;margin-top:8px;border:none;background:#fef3c7;color:#92400e;border-radius:10px;padding:9px;font-size:11px;font-weight:700;cursor:pointer;" onclick="iniciarGPS();cm(\'m-gps-det\')">🔄 Atualizar GPS</button>'
    +'</div>';
  m.style.display='flex';
}

window.iniciarGPS       = iniciarGPS;
window.pararGPS         = pararGPS;
window.capturarGPS      = capturarGPS;
window._mostrarBadgeGPS = _mostrarBadgeGPS;
window._mostrarDetalhesGPS = _mostrarDetalhesGPS;

/* ══════════════════════════════════════════════════════════════
   HAPTIC FEEDBACK (v81)
   ══════════════════════════════════════════════════════════════ */
function haptic(tipo){
  if(!navigator.vibrate)return;
  var padroes={leve:[30],medio:[50],forte:[80,50,80],erro:[100,50,100,50,200],sucesso:[50,30,100]};
  navigator.vibrate(padroes[tipo]||padroes.leve);
}
window.haptic=haptic;

/* ══════════════════════════════════════════════════════════════
   MODO ESCURO — DESATIVADO em v82
   Tema TJMG é exclusivamente claro (paleta institucional).
   Funções mantidas como no-op para não quebrar chamadas existentes.
   ══════════════════════════════════════════════════════════════ */
function toggleModoEscuro(){
  /* v82-fix: dark-mode removido. Tema TJMG é único e claro. */
  localStorage.removeItem('_darkMode');
  document.body.classList.remove('dark-mode');
  Tt('Tema TJMG ativo');
}
function aplicarModoEscuro(){
  /* v82-fix: no-op — paleta TJMG sempre clara */
  document.body.classList.remove('dark-mode');
}
function iniciarTema(){
  /* v82-fix: limpa qualquer resíduo de dark-mode salvo antes da v82 */
  localStorage.removeItem('_darkMode');
  document.body.classList.remove('dark-mode');
}
window.toggleModoEscuro=toggleModoEscuro;
window.iniciarTema=iniciarTema;

/* ══════════════════════════════════════════════════════════════
   COR POR REGIÃO (v81)
   ══════════════════════════════════════════════════════════════ */
function aplicarCorRegiao(reg){
  var R=(typeof REG!=='undefined'&&REG[reg])?REG[reg]:null;
  if(!R)return;
  var r=document.documentElement;
  r.style.setProperty('--a',R.c);
  r.style.setProperty('--a-dk',_escurecer(R.c,20));
  r.style.setProperty('--a-lt',_clarear(R.c,15));
  r.style.setProperty('--a-xs',R.bg);
}
function _hexToRgb(hex){
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function _rgbToHex(r,g,b){
  return '#'+[r,g,b].map(function(v){return Math.min(255,Math.max(0,Math.round(v))).toString(16).padStart(2,'0');}).join('');
}
function _escurecer(hex,pct){
  try{var rgb=_hexToRgb(hex);return _rgbToHex(rgb[0]*(1-pct/100),rgb[1]*(1-pct/100),rgb[2]*(1-pct/100));}catch(e){return hex;}
}
function _clarear(hex,pct){
  try{var rgb=_hexToRgb(hex);return _rgbToHex(rgb[0]+(255-rgb[0])*(pct/100),rgb[1]+(255-rgb[1])*(pct/100),rgb[2]+(255-rgb[2])*(pct/100));}catch(e){return hex;}
}
window.aplicarCorRegiao=aplicarCorRegiao;

/* ══════════════════════════════════════════════════════════════
   SUPABASE REALTIME (v81) — Free: 200 conexões max
   Coordenador recebe inspeções ao vivo sem recarregar
   ══════════════════════════════════════════════════════════════ */
var _rtChannel=null;
function iniciarRealtime(){
  if(!SB||!S.sessao)return;
  if(_rtChannel){try{SB.removeChannel(_rtChannel);}catch(e){}_rtChannel=null;}
  try{
    _rtChannel=SB.channel('inspections-live')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'inspections'},function(payload){
        if(!payload.new)return;
        var p=payload.new.payload||{};
        /* Ignorar se é da própria sessão */
        if(p.fiscal===S.sessao.nome)return;
        /* Filtrar por região se não for admin/coord global */
        if(S.sessao.tipo==='usuario'&&p.reg!==S.sessao.reg)return;
        /* Atualizar cache local */
        var existe=S.insp.find(function(i){return i.id===payload.new.id;});
        if(!existe){
          S.insp.unshift(Object.assign({},p,{id:payload.new.id,synced_at:payload.new.synced_at}));
          DB.svLocal();
          haptic('leve');
          Tt('🔔 '+p.fiscal+' finalizou: '+p.edif);
          /* Atualizar UI se coordenador está na lista */
          if(typeof rCoord==='function'&&document.querySelector('#s-coord.act'))rCoord();
          if(typeof rHome==='function'&&document.querySelector('#s-home.act'))rHome();
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'inspections'},function(payload){
        if(!payload.new)return;
        var p=payload.new.payload||{};
        if(p.fiscal===S.sessao.nome)return;
        var idx=S.insp.findIndex(function(i){return i.id===payload.new.id;});
        if(idx>=0){S.insp[idx]=Object.assign({},p,{id:payload.new.id,synced_at:payload.new.synced_at});DB.svLocal();}
      })
      .subscribe(function(status){
        if(status==='SUBSCRIBED') console.log('[Realtime] conectado');
        if(status==='CHANNEL_ERROR') console.warn('[Realtime] erro');
      });
  }catch(e){console.warn('[Realtime] falhou:',e.message);}
}
function pararRealtime(){
  if(_rtChannel&&SB){try{SB.removeChannel(_rtChannel);}catch(e){}_rtChannel=null;}
}
window.iniciarRealtime=iniciarRealtime;
window.pararRealtime=pararRealtime;

/* ══════════════════════════════════════════════════════════════
   CRONÔMETRO DE VISTORIA (v81)
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   CRONÔMETRO APRIMORADO (v82)
   - Alertas de tempo (30min, 1h, 2h)
   - Pausar/retomar
   - Cor muda conforme tempo
   - Salva tempo de pausa no relatório
   ══════════════════════════════════════════════════════════════ */
var _cronoStart    = null;
var _cronoTimer    = null;
var _cronoPausado  = false;
var _cronoAcumul   = 0;    /* segundos acumulados antes da pausa */
var _cronoAlertas  = [30,60,120]; /* minutos para alertar */
var _cronoAlertados= {};

function iniciarCrono(){
  _cronoStart   = Date.now();
  _cronoPausado = false;
  _cronoAcumul  = 0;
  _cronoAlertados = {};
  if(_cronoTimer) clearInterval(_cronoTimer);

  _cronoTimer = setInterval(function(){
    if(_cronoPausado) return;
    var el_c = el('crono-disp');
    if(!el_c) return;

    var seg   = Math.floor(_cronoAcumul + (Date.now()-_cronoStart)/1000);
    var m     = Math.floor(seg/60);
    var s     = seg%60;
    var h     = Math.floor(m/60);
    var mm    = m%60;

    var txt   = h>0
      ? String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':'+String(s).padStart(2,'0')
      : String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');

    /* Cor progressiva por tempo */
    var cor = m<30?'rgba(255,255,255,.75)':m<60?'#fbbf24':m<120?'#f97316':'#ef4444';
    el_c.textContent = txt;
    el_c.style.color = cor;

    /* Alertas de tempo */
    _cronoAlertas.forEach(function(limMin){
      if(m>=limMin && !_cronoAlertados[limMin]){
        _cronoAlertados[limMin]=true;
        haptic('medio');
        Tt('⏱️ Vistoria em andamento há '+limMin+'min — verifique o progresso!');
      }
    });
  }, 1000);
}

function pausarCrono(){
  if(!_cronoStart||_cronoPausado) return;
  _cronoAcumul += (Date.now()-_cronoStart)/1000;
  _cronoStart   = null;
  _cronoPausado = true;
  var el_c = el('crono-disp');
  if(el_c) el_c.style.opacity='0.4';
  Tt('⏸️ Cronômetro pausado');
}

function retomaCrono(){
  if(!_cronoPausado) return;
  _cronoStart   = Date.now();
  _cronoPausado = false;
  var el_c = el('crono-disp');
  if(el_c) el_c.style.opacity='1';
  Tt('▶️ Cronômetro retomado');
}

function pararCrono(){
  if(_cronoTimer){ clearInterval(_cronoTimer); _cronoTimer=null; }
  if(!_cronoStart && !_cronoAcumul) return 0;

  var totalSeg = Math.round(_cronoAcumul + (_cronoStart ? (Date.now()-_cronoStart)/1000 : 0));
  var dur       = Math.round(totalSeg/60);

  _cronoStart   = null;
  _cronoPausado = false;
  _cronoAcumul  = 0;

  if(F){
    F.duracaoMin     = dur;
    F.duracaoFormatada = _formatarDuracao(totalSeg);
  }

  /* Esconder badge GPS */
  var badge=el('gps-badge-form');
  if(badge) badge.style.display='none';

  /* Parar GPS watch */
  if(typeof pararGPS==='function') pararGPS();

  return dur;
}

function _formatarDuracao(seg){
  var h=Math.floor(seg/3600);
  var m=Math.floor((seg%3600)/60);
  var s=seg%60;
  if(h>0) return h+'h '+m+'min';
  if(m>0) return m+'min '+s+'s';
  return s+'s';
}

window.iniciarCrono  = iniciarCrono;
window.pausarCrono   = pausarCrono;
window.retomaCrono   = retomaCrono;
window.pararCrono    = pararCrono;

/* ══════════════════════════════════════════════════════════════
   MODO NÃO PERTURBE + WAKELOCK (v81)
   ══════════════════════════════════════════════════════════════ */
var _wakeLock=null;var _naoPerturbe=false;
async function toggleNaoPerturbe(){
  _naoPerturbe=!_naoPerturbe;
  var btn=el('btn-nao-perturbe');
  if(_naoPerturbe){
    /* Ativar WakeLock */
    if('wakeLock' in navigator){
      try{_wakeLock=await navigator.wakeLock.request('screen');}catch(e){}
    }
    if(btn){btn.textContent='🔔';btn.title='Desativar Não Perturbe';}
    Tt('🔕 Modo campo ativado — tela sempre ligada');
  }else{
    if(_wakeLock){try{await _wakeLock.release();}catch(e){}_wakeLock=null;}
    if(btn){btn.textContent='🔕';btn.title='Ativar Modo Campo';}
    Tt('🔔 Modo campo desativado');
  }
}
window.toggleNaoPerturbe=toggleNaoPerturbe;

/* ══════════════════════════════════════════════════════════════
   VALIDAÇÃO DE MEDIÇÕES (SPDA/SUBESTAÇÃO) (v81)
   Limites normativos NBR 5419 / NBR 14039
   ══════════════════════════════════════════════════════════════ */
var LIMITES_NORMATIVOS={
  resistencia_terra:{max:10,unidade:'Ω',norma:'NBR 5419',msg:'Resistência acima do limite (máx 10Ω). Acionar correção!'},
  resistencia_isolamento:{min:1,unidade:'MΩ',norma:'NBR 14039',msg:'Resistência de isolamento baixa (mín 1MΩ). Verificar!'},
  tensao_alimentacao:{min:198,max:231,unidade:'V',norma:'NBR 14039',msg:'Tensão fora da faixa nominal (198–231V).'},
  corrente_fuga:{max:30,unidade:'mA',norma:'NBR 5410',msg:'Corrente de fuga acima do limite (máx 30mA). Risco!'},
  temperatura_quadro:{max:60,unidade:'°C',norma:'NBR 14039',msg:'Temperatura elevada no quadro (máx 60°C). Verificar!'}
};
function validarMedicao(campo,valor){
  var lim=LIMITES_NORMATIVOS[campo];
  if(!lim)return null;
  var v=parseFloat(valor);if(isNaN(v))return null;
  var ok=true;var msg='';
  if(lim.max!==undefined&&v>lim.max){ok=false;msg=lim.msg;}
  if(lim.min!==undefined&&v<lim.min){ok=false;msg=lim.msg;}
  return{ok:ok,msg:msg,norma:lim.norma,unidade:lim.unidade};
}
function renderCampoMedicao(id,campo,label,valorAtual,onInput){
  var v=validarMedicao(campo,valorAtual);
  var cor=v?(!v.ok?'#dc2626':'#16a34a'):'#003580';
  return '<div style="margin-bottom:10px;">'
    +'<div class="lbl">'+label+(LIMITES_NORMATIVOS[campo]?' <span style="font-size:9px;color:#94a3b8;">('+LIMITES_NORMATIVOS[campo].norma+')</span>':'')+'</div>'
    +'<div style="display:flex;gap:6px;align-items:center;">'
    +'<input id="'+id+'" type="number" step="0.01" value="'+(valorAtual||'')+'" oninput="'+onInput+';_valMed(\''+id+'\',\''+campo+'\')" style="flex:1;border-color:'+cor+';">'
    +'<span style="font-size:11px;color:#64748b;flex-shrink:0;">'+(LIMITES_NORMATIVOS[campo]?LIMITES_NORMATIVOS[campo].unidade:'')+'</span>'
    +'</div>'
    +(v&&!v.ok?'<div style="font-size:10px;color:#dc2626;margin-top:3px;font-weight:700;">⚠️ '+v.msg+'</div>':'')
    +'</div>';
}
function _valMed(inputId,campo){
  var inp=el(inputId);if(!inp)return;
  var v=validarMedicao(campo,inp.value);
  if(!v)return;
  inp.style.borderColor=v.ok?'#16a34a':'#dc2626';
  if(!v.ok){haptic('erro');Tt('⚠️ '+v.msg);}
}
window.validarMedicao=validarMedicao;
window.renderCampoMedicao=renderCampoMedicao;
window._valMed=_valMed;

/* ══════════════════════════════════════════════════════════════
   FOTO ANTES×DEPOIS (v81)
   ══════════════════════════════════════════════════════════════ */
function buscarFotoAnterior(edif,itemNm){
  /* Busca a foto mais recente do mesmo item na mesma edificação */
  var hist=S.insp.filter(function(i){
    return i.edif===edif&&i.st==='finalizada'&&i.id!==(F&&F.id);
  }).sort(function(a,b){return(b.dtVistoria||b.data)<(a.dtVistoria||a.data)?-1:1;});
  for(var i=0;i<hist.length;i++){
    var its=Object.values(hist[i].itens||{});
    for(var j=0;j<its.length;j++){
      if(its[j].nm===itemNm&&its[j].fotos&&its[j].fotos.length){
        return{foto:its[j].fotos[0],data:hist[i].dtVistoria||hist[i].data,insp:hist[i]};
      }
    }
  }
  return null;
}
window.buscarFotoAnterior=buscarFotoAnterior;

/* ══════════════════════════════════════════════════════════════
   LEGENDA AUTOMÁTICA DE FOTO (v81)
   ══════════════════════════════════════════════════════════════ */
function legendaAutoFoto(itemNm,indice,total){
  var agora=new Date();
  var h=String(agora.getHours()).padStart(2,'0');
  var m=String(agora.getMinutes()).padStart(2,'0');
  var dtStr=fdt(agora.toISOString().slice(0,10))+' '+h+':'+m;
  return (itemNm?itemNm+' — ':'')+dtStr+' — Foto '+(indice+1)+(total>1?'/'+total:'');
}
window.legendaAutoFoto=legendaAutoFoto;

/* ══════════════════════════════════════════════════════════════
   ZOOM+ROTAÇÃO NAS FOTOS DO LIGHTBOX (v81)
   ══════════════════════════════════════════════════════════════ */
var _lbZoom=1;var _lbRotate=0;
function lbZoomIn(){_lbZoom=Math.min(4,_lbZoom+0.5);_lbAplicarTransform();}
function lbZoomOut(){_lbZoom=Math.max(0.5,_lbZoom-0.5);_lbAplicarTransform();}
function lbRotate(){_lbRotate=(_lbRotate+90)%360;_lbAplicarTransform();}
function lbReset(){_lbZoom=1;_lbRotate=0;_lbAplicarTransform();}
function _lbAplicarTransform(){
  var img=el('lb-img');
  if(img)img.style.transform='scale('+_lbZoom+') rotate('+_lbRotate+'deg)';
}
window.lbZoomIn=lbZoomIn;window.lbZoomOut=lbZoomOut;window.lbRotate=lbRotate;window.lbReset=lbReset;

/* ══════════════════════════════════════════════════════════════
   MINI-GRÁFICO SVG DE CONFORMIDADE NOS CARDS (v81)
   ══════════════════════════════════════════════════════════════ */
function miniDonut(pct,cor,r){
  r=r||12;var c=2*Math.PI*r;var fill=c*(pct/100);
  return '<svg width="'+(r*2+4)+'" height="'+(r*2+4)+'" viewBox="0 0 '+(r*2+4)+' '+(r*2+4)+'" style="transform:rotate(-90deg);">'
    +'<circle cx="'+(r+2)+'" cy="'+(r+2)+'" r="'+r+'" fill="none" stroke="#e2e8f0" stroke-width="3"/>'
    +'<circle cx="'+(r+2)+'" cy="'+(r+2)+'" r="'+r+'" fill="none" stroke="'+(cor||'#003580')+'" stroke-width="3" stroke-dasharray="'+fill.toFixed(1)+' '+c.toFixed(1)+'" stroke-linecap="round"/>'
    +'</svg>';
}
window.miniDonut=miniDonut;

/* ══════════════════════════════════════════════════════════════
   LOCK DE TELA POR INATIVIDADE (v81)
   ══════════════════════════════════════════════════════════════ */
var _lockTimer=null;var _lockAtivo=false;
function resetLockTimer(){
  if(_lockAtivo)return;
  clearTimeout(_lockTimer);
  var TTL=(S.sessao&&S.sessao.tipo==='coordenador')?10*60000:5*60000;/* coord 10min, fiscal 5min */
  _lockTimer=setTimeout(function(){ativarLock();},TTL);
}
function ativarLock(){
  if(!S.sessao||_lockAtivo)return;
  _lockAtivo=true;
  var m=el('m-lock');if(!m){
    m=document.createElement('div');m.id='m-lock';
    m.style.cssText='position:fixed;inset:0;background:linear-gradient(160deg,#002060,#003580);z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    m.innerHTML=
      '<div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px;">🔒</div>'
      +'<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">Sessão Bloqueada</div>'
      +'<div style="font-size:13px;color:rgba(255,255,255,.65);margin-bottom:28px;">'+_escA(S.sessao.nome)+'</div>'
      +'<div id="lock-dots" style="display:flex;gap:14px;margin-bottom:12px;height:20px;align-items:center;"></div>'
      +'<div id="lock-err" style="color:#f87171;font-size:12px;font-weight:600;min-height:18px;margin-bottom:20px;"></div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,80px);gap:10px;">'
      +[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(function(k,i){
        var isOk=k==='✓',isDel=k==='⌫';
        var bg=isOk?'#16a34a':isDel?'rgba(255,255,255,.12)':'rgba(255,255,255,.2)';
        var border=isOk?'none':'1px solid rgba(255,255,255,.15)';
        return'<button onclick="_lockKp(\''+k+'\')" style="border:'+border+';background:'+bg+';color:#fff;border-radius:14px;height:64px;font-size:'+(isOk?'22':isDel?'20':'26')+'px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:all .1s;" onpointerdown="this.style.transform=\'scale(.93)\';this.style.opacity=\'.8\'" onpointerup="this.style.transform=\'\';this.style.opacity=\'1\'">'+k+'</button>';
      }).join('')
      +'</div>'
      +'<button onclick="S._lockBypass=true;_lockAtivo=false;el(\'m-lock\').style.display=\'none\';rLogin();Gb(\'s-login\');" style="margin-top:28px;border:none;background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);border-radius:10px;padding:10px 24px;font-size:12px;cursor:pointer;font-family:inherit;">Trocar usuário</button>';
    document.getElementById('app').appendChild(m);
  }
  m.style.display='flex';
  _lockBuf='';_atualizarLockDots();
}
var _lockBuf='';
function _lockKp(k){
  haptic('leve');
  var err=el('lock-err');if(err)err.textContent='';
  if(k==='⌫'||k==='←'){_lockBuf=_lockBuf.slice(0,-1);}
  else if(k==='✓'){_verificarLockPin();return;}
  else if(_lockBuf.length<6){_lockBuf+=String(k);}
  if(_lockBuf.length===4||_lockBuf.length===6) _verificarLockPin();
  _atualizarLockDots();
}
function _atualizarLockDots(){
  var d=el('lock-dots');if(!d)return;
  var max=6;d.innerHTML='';
  for(var i=0;i<max;i++){
    var dot=document.createElement('div');
    var preenchido=i<_lockBuf.length;
    dot.style.cssText='width:'+(preenchido?'16':'12')+'px;height:'+(preenchido?'16':'12')+'px;border-radius:50%;'
      +'background:'+(preenchido?'#fff':'rgba(255,255,255,.3)')
      +';transition:all .15s cubic-bezier(.34,1.56,.64,1);box-shadow:'+(preenchido?'0 0 8px rgba(255,255,255,.5)':'none')+';';
    d.appendChild(dot);
  }
}
function _verificarLockPin(){
  var u=US.find(function(x){return x.id===S.sessao.userId;});
  if(!u||_lockBuf!==u.pin){
    var e=el('lock-err');if(e)e.textContent='PIN incorreto';
    haptic('erro');_lockBuf='';_atualizarLockDots();return;
  }
  _lockAtivo=false;
  var m=el('m-lock');if(m)m.style.display='none';
  haptic('sucesso');resetLockTimer();
}
window._lockKp=_lockKp;
window.resetLockTimer=resetLockTimer;

/* ══════════════════════════════════════════════════════════════
   MODO ALTO CONTRASTE + FONTE MAIOR (v81)
   ══════════════════════════════════════════════════════════════ */
function toggleAltoContraste(){
  var ac=localStorage.getItem('_altoContraste')==='1';
  ac=!ac;localStorage.setItem('_altoContraste',ac?'1':'0');
  aplicarAltoContraste(ac);
  Tt(ac?'♿ Alto contraste ativado':'♿ Alto contraste desativado');
}
function aplicarAltoContraste(ac){
  document.body.classList.toggle('alto-contraste',ac);
}
function toggleFonteMaior(){
  var fm=localStorage.getItem('_fonteMaior')==='1';
  fm=!fm;localStorage.setItem('_fonteMaior',fm?'1':'0');
  document.body.classList.toggle('fonte-maior',fm);
  Tt(fm?'Aa Fonte aumentada':'Aa Fonte normal');
}
function iniciarAcessibilidade(){
  if(localStorage.getItem('_altoContraste')==='1') aplicarAltoContraste(true);
  if(localStorage.getItem('_fonteMaior')==='1') document.body.classList.add('fonte-maior');
}
window.toggleAltoContraste=toggleAltoContraste;
window.toggleFonteMaior=toggleFonteMaior;
window.iniciarAcessibilidade=iniciarAcessibilidade;

/* ══════════════════════════════════════════════════════════════
   DETECTOR DE DISPOSITIVO (v81)
   ══════════════════════════════════════════════════════════════ */
async function verificarCompatibilidade(){
  var avisos=[];
  /* Espaço disponível */
  if(navigator.storage&&navigator.storage.estimate){
    var est=await navigator.storage.estimate();
    var livreGB=(est.quota-est.usage)/1024/1024/1024;
    if(livreGB<0.3) avisos.push('⚠️ Armazenamento baixo: '+livreGB.toFixed(2)+'GB livre. Libere espaço para fotos.');
  }
  /* Android version via UA */
  var ua=navigator.userAgent;
  var andMatch=ua.match(/Android (\d+)/);
  if(andMatch&&parseInt(andMatch[1])<8) avisos.push('⚠️ Android '+andMatch[1]+' pode ter limitações. Recomendado Android 8+.');
  /* Sem IndexedDB */
  if(!window.indexedDB) avisos.push('❌ Seu navegador não suporta armazenamento offline.');
  if(avisos.length) Tt(avisos[0]);
  return avisos;
}
window.verificarCompatibilidade=verificarCompatibilidade;

/* ══════════════════════════════════════════════════════════════
   CHANGELOG INTERNO (v81)
   ══════════════════════════════════════════════════════════════ */
var CHANGELOG=[
  {v:'v81',data:'2026-05',novidades:['GPS automático em cada vistoria','Modo escuro','Cor por região','Realtime — coordenador vê inspeções ao vivo','Cronômetro de vistoria','Modo campo (WakeLock)','Lock de tela por inatividade','Zoom/rotação nas fotos','Foto Antes×Depois','Mini-donut de conformidade nos cards','Alto contraste e fonte maior','Validação de medições (NBR 5419/14039)']},
  {v:'v80',data:'2026-05',novidades:['SEI TJMG integrado','Assinatura Gov.br (opcional)','QR Code por edificação','Excel SINAPI','WhatsApp para NCs críticas','Relatório mensal automático','Estoque de materiais','Navegação por voz','Termos de Recebimento (Lei 14.133)','WebP nas fotos (-30%)','Mapa e Execução no coordenador']},
  {v:'v79',data:'2026-05',novidades:['Ditado por voz em campos longos','Agenda de vistorias','Comparativo entre vistorias','NOT-INA e ROC automáticos','Mapa de edificações (Leaflet)','IMR calculado automaticamente']}
];
function rChangelog(){
  var cb=el('changelog-body');if(!cb)return;
  var h='<div style="padding:12px;">';
  CHANGELOG.forEach(function(r){
    h+='<div class="card" style="margin-bottom:10px;">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
    h+='<span style="background:#003580;color:#fff;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:800;">'+r.v+'</span>';
    h+='<span style="font-size:11px;color:#64748b;">'+r.data+'</span>';
    h+='</div>';
    r.novidades.forEach(function(n){
      h+='<div style="font-size:11px;color:#475569;padding:3px 0;border-bottom:1px solid #f8fafc;">✨ '+n+'</div>';
    });
    h+='</div>';
  });
  h+='</div>';
  cb.innerHTML=h;
}

/* ══════════════════════════════════════════════════════════════
   MURAL DE COMUNICADOS (v81)
   ══════════════════════════════════════════════════════════════ */
function carregarMural(){
  /* Busca comunicados do Supabase */
  if(!SB||!navigator.onLine)return;
  SB.from('comunicados').select('*').order('created_at',{ascending:false}).limit(5)
    .then(function(res){
      if(res.error||!res.data||!res.data.length)return;
      var mural=el('mural-home');if(!mural)return;
      var ativos=res.data.filter(function(c){return c.reg===S.sessao.reg||c.reg==='todos'||!c.reg;});
      if(!ativos.length)return;
      mural.innerHTML=ativos.map(function(c){
        return'<div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:10px 14px;display:flex;align-items:flex-start;gap:10px;">'
          +'<span style="font-size:18px;flex-shrink:0;">📣</span>'
          +'<div><div style="font-size:12px;font-weight:700;color:#92400e;">'+_escA(c.titulo||'Comunicado')+'</div>'
          +'<div style="font-size:11px;color:#78350f;margin-top:2px;line-height:1.5;">'+_escA(c.texto||'')+'</div>'
          +'<div style="font-size:9px;color:#b45309;margin-top:4px;">'+fdt((c.created_at||'').slice(0,10))+'</div></div>'
          +'</div>';
      }).join('');
      mural.style.display='block';
    }).catch(function(){});
}
function publicarComunicado(titulo,texto,reg){
  if(!SB){Tt('Supabase não disponível.');return;}
  SB.from('comunicados').insert([{titulo:titulo,texto:texto,reg:reg||'todos',autor:S.sessao?S.sessao.nome:''}])
    .then(function(res){
      if(res.error){Tt('Erro ao publicar: '+res.error.message);return;}
      Tt('✅ Comunicado publicado!');
    });
}
window.rChangelog=rChangelog;
window.carregarMural=carregarMural;
window.publicarComunicado=publicarComunicado;

/* ══════════════════════════════════════════════════════════════
   TUTORIAL INTERATIVO (v81) — exibe 1x por usuário
   ══════════════════════════════════════════════════════════════ */
var _tutorialPassos=[
  /* Tela Home */
  {tela:'home', sel:'#h-ola',
   titulo:'👋 Bem-vindo ao TJMG Fiscal!',
   txt:'Este é seu sistema de fiscalização predial. Vamos te apresentar as principais funcionalidades em 10 passos rápidos.',
   bg:'#003580'},
  {tela:'home', sel:'#btn-sync-manual',
   titulo:'☁️ Sincronização',
   txt:'Este botão sincroniza seus relatórios com toda a equipe. <strong>Sempre sincronize</strong> quando tiver internet — antes e depois de ir ao campo.',
   bg:'#0f766e'},
  {tela:'home', sel:'#busca-global',
   titulo:'🔍 Busca Global',
   txt:'Encontre qualquer relatório digitando o nome da edificação, comarca, OS ou fiscal. A busca funciona mesmo offline.',
   bg:'#2563eb'},
  {tela:'home', sel:'.cta',
   titulo:'➕ Criar Novo Relatório',
   txt:'Toque aqui para iniciar uma nova inspeção. Você escolhe o tipo: Manutenção Periódica, Emergencial, OSP, Fachada, SPDA e outros.',
   bg:'#003580'},
  /* Bottom Nav */
  {tela:'home', sel:'#bn0',
   titulo:'🧭 Navegação Principal',
   txt:'<strong>Início</strong> — seus rascunhos e resumo do dia.<br><strong>Novo</strong> — criar relatório.<br><strong>Relatórios</strong> — histórico completo.<br><strong>Agenda</strong> — próximas vistorias.<br><strong>Perfil</strong> — configurações e ferramentas.',
   bg:'#1e293b'},
  /* Formulário */
  {tela:'form', sel:'#fhdr',
   titulo:'📋 Formulário de Inspeção',
   txt:'O formulário tem etapas: <strong>Dados → Checklist → Materiais → Concluir</strong>. Preencha sequencialmente. O sistema salva automaticamente a cada 5 segundos — nunca perde nada.',
   bg:'#003580'},
  {tela:'form', sel:'#crono-disp',
   titulo:'⏱️ Cronômetro + GPS',
   txt:'O cronômetro registra o tempo da vistoria. O GPS captura sua localização automaticamente ao iniciar — serve como prova de presença na edificação.',
   bg:'#003580'},
  /* Relatórios */
  {tela:'rel', sel:'#rflt',
   titulo:'🗂️ Filtros de Relatório',
   txt:'Filtre por tipo (Periódica, OSE, OSP...) ou status (Rascunho/Enviado). Selecione múltiplos para exportar em bloco — HTML, PDF ou ZIP.',
   bg:'#003580'},
  /* Perfil */
  {tela:'perf', sel:'#s-perfil',
   titulo:'⚙️ Perfil e Ferramentas',
   txt:'No perfil você acessa: <strong>IMR</strong>, <strong>Mapa</strong>, <strong>QR Codes</strong>, <strong>Excel SINAPI</strong>, <strong>Termos de Recebimento</strong>, <strong>Relatório Mensal</strong>, <strong>SEI TJMG</strong> e muito mais.',
   bg:'#003580'},
  /* Final */
  {tela:'home', sel:'#h-ola',
   titulo:'✅ Pronto para fiscalizar!',
   txt:'Você está pronto. Lembre-se: <strong>sincronize sempre</strong> que tiver internet. Em caso de dúvidas, este tutorial está disponível no Perfil → Ver Tutorial.',
   bg:'#16a34a'}
];

function iniciarTutorial(forca){
  var key='_tutorialFeito_'+(S.sessao?S.sessao.userId:'');
  if(!forca&&localStorage.getItem(key)==='1')return;
  localStorage.setItem(key,'1');

  /* Ir para home antes de começar */
  if(typeof rHome==='function'){rHome();if(typeof G==='function')G('s-home');}

  var passo=0;
  var overlay=el('m-tutorial');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='m-tutorial';
    overlay.style.cssText='position:fixed;inset:0;z-index:8000;pointer-events:none;';
    document.getElementById('app').appendChild(overlay);
  }

  function mostrarPasso(){
    if(passo>=_tutorialPassos.length){
      overlay.innerHTML='';
      haptic('sucesso');
      Tt('✅ Tutorial concluído! Bom trabalho de campo!');
      return;
    }
    var p=_tutorialPassos[passo];
    var alvo=document.querySelector(p.sel);
    var rect=alvo?alvo.getBoundingClientRect():{top:window.innerHeight/2-40,left:20,width:window.innerWidth-40,height:48};
    var ttop=rect.bottom+12;
    /* Se o tooltip sai da tela, mostrar acima */
    if(ttop+180>window.innerHeight) ttop=rect.top-192;
    if(ttop<8) ttop=8;

    overlay.innerHTML=
      /* Overlay escuro */
      '<div style="position:fixed;inset:0;background:rgba(0,0,0,.65);pointer-events:all;" onclick="void(0)"></div>'
      /* Destaque do elemento */
      +(alvo?'<div style="position:fixed;top:'+(rect.top-6)+'px;left:'+(rect.left-6)+'px;width:'+(rect.width+12)+'px;height:'+(rect.height+12)+'px;'
        +'border:3px solid #60a5fa;border-radius:14px;box-shadow:0 0 0 4px rgba(96,165,250,.25),0 0 0 9999px rgba(0,0,0,.0);pointer-events:none;'
        +'animation:tut-pulse 1.5s infinite;"></div>':'')
      /* Tooltip */
      +'<div style="position:fixed;top:'+ttop+'px;left:12px;right:12px;background:#fff;border-radius:16px;'
        +'padding:16px 18px;box-shadow:0 8px 32px rgba(0,0,0,.25);pointer-events:all;max-width:500px;margin:0 auto;">'
        /* Cabeçalho */
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">'
          +'<div style="width:36px;height:36px;border-radius:10px;background:'+(p.bg||'#003580')+';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">'+p.titulo.split(' ')[0]+'</div>'
          +'<div style="flex:1;font-size:14px;font-weight:800;color:#0f172a;">'+p.titulo.replace(/^\S+\s/,'')+'</div>'
          +'<span style="background:#f1f5f9;color:#64748b;border-radius:12px;padding:2px 8px;font-size:10px;font-weight:700;">'+(passo+1)+'/'+_tutorialPassos.length+'</span>'
        +'</div>'
        /* Barra de progresso */
        +'<div style="background:#f1f5f9;border-radius:4px;height:4px;margin-bottom:10px;overflow:hidden;">'
          +'<div style="background:'+(p.bg||'#003580')+';height:100%;width:'+Math.round((passo+1)/_tutorialPassos.length*100)+'%;border-radius:4px;transition:width .3s;"></div>'
        +'</div>'
        /* Texto */
        +'<div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:14px;">'+p.txt+'</div>'
        /* Botões */
        +'<div style="display:flex;gap:8px;">'
          +'<button onclick="el(\'m-tutorial\').innerHTML=\'\'" '
            +'style="border:1px solid #e2e8f0;background:#fff;color:#64748b;border-radius:10px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">'
            +'Pular tutorial</button>'
          +'<button id="btn-tut-prox" onclick="window._tutNext()" '
            +'style="flex:1;border:none;background:'+(p.bg||'#003580')+';color:#fff;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:800;cursor:pointer;">'
            +(passo<_tutorialPassos.length-1?'Próximo ›':'🎉 Concluir')+'</button>'
        +'</div>'
      +'</div>'
      /* CSS de animação */
      +'<style>@keyframes tut-pulse{0%,100%{box-shadow:0 0 0 4px rgba(96,165,250,.25);}50%{box-shadow:0 0 0 8px rgba(96,165,250,.4);}}</style>';

    passo++;
  }

  window._tutNext=function(){
    haptic('leve');
    mostrarPasso();
  };

  setTimeout(function(){passo=0;mostrarPasso();},600);
}
window.iniciarTutorial=iniciarTutorial;

/* ══════════════════════════════════════════════════════════════
   COMPRESSÃO DE FOTOS ANTIGAS (v81)
   ══════════════════════════════════════════════════════════════ */
function comprimirFotosAntigas(){
  var KEY='_compFotosOld';
  var last=parseInt(localStorage.getItem(KEY)||'0');
  if(Date.now()-last<7*24*3600000)return;/* semanal */
  localStorage.setItem(KEY,Date.now().toString());
  var cutoff=new Date();cutoff.setMonth(cutoff.getMonth()-3);
  var antigas=S.insp.filter(function(i){
    return new Date(i.dtVistoria||i.data||'2000')<cutoff;
  });
  if(!antigas.length)return;
  console.log('[Compress] Verificando fotos de',antigas.length,'inspeções antigas...');
  /* A compressão real das fotos no IndexedDB seria complexa — apenas logar */
  auditLog('compress_fotos',{total_antigas:antigas.length});
}
window.comprimirFotosAntigas=comprimirFotosAntigas;

/* ══════════════════════════════════════════════════════════════
   PAINEL DE VENCIMENTO DE CONTRATOS (v81)
   ══════════════════════════════════════════════════════════════ */
var CONTRATOS_VIGENCIA={
  NORTE:   {ct:'CT 017/2026',empresa:'RENOVA ENGENHARIA',inicio:'2026-01-01',fim:'2026-12-31'},
  CENTRAL: {ct:'CT 025/2026',empresa:'—',              inicio:'2026-01-01',fim:'2026-12-31'},
  LESTE:   {ct:'CT 019/2026',empresa:'—',              inicio:'2026-01-01',fim:'2026-12-31'},
  ZONA_MATA:{ct:'CT 018/2026',empresa:'—',             inicio:'2026-01-01',fim:'2026-12-31'},
  TRIANGULO:{ct:'CT 392/2022',empresa:'—',             inicio:'2022-07-01',fim:'2026-12-31'},
  SUL:     {ct:'CT 138/2023',empresa:'—',              inicio:'2023-06-01',fim:'2026-12-31'},
  SUDOESTE:{ct:'CT 421/2022',empresa:'—',              inicio:'2022-09-01',fim:'2026-12-31'}
};
function rVigenciaContratos(){
  var vb=el('vigencia-body');if(!vb)return;
  var hoje=new Date();hoje.setHours(0,0,0,0);
  var h='<div style="padding:12px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:10px;">📅 Vigência dos Contratos</div>';
  Object.keys(CONTRATOS_VIGENCIA).forEach(function(reg){
    var c=CONTRATOS_VIGENCIA[reg];
    var R=(typeof REG!=='undefined'&&REG[reg])?REG[reg]:{l:reg,c:'#003580'};
    var fim=new Date(c.fim+'T00:00:00');
    var diasRestantes=Math.round((fim-hoje)/86400000);
    var cor=diasRestantes<=30?'#dc2626':diasRestantes<=90?'#d97706':'#16a34a';
    var pctConsumido=Math.min(100,Math.round((hoje-new Date(c.inicio+'T00:00:00'))/(fim-new Date(c.inicio+'T00:00:00'))*100));
    h+='<div class="card" style="margin-bottom:8px;border-left:4px solid '+R.c+';">';
    h+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">';
    h+='<div><div style="font-size:12px;font-weight:800;">'+c.ct+'</div>';
    h+='<div style="font-size:10px;color:#64748b;">'+R.l+(c.empresa!=='—'?' · '+c.empresa:'')+'</div></div>';
    h+='<span style="color:'+cor+';font-size:12px;font-weight:800;flex-shrink:0;">'+diasRestantes+'d</span>';
    h+='</div>';
    h+='<div style="background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden;margin-bottom:4px;">';
    h+='<div style="width:'+pctConsumido+'%;height:100%;background:'+cor+';border-radius:4px;"></div></div>';
    h+='<div style="display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;">';
    h+='<span>'+fdt(c.inicio)+'</span><span>'+pctConsumido+'% consumido</span><span>'+fdt(c.fim)+'</span>';
    h+='</div></div>';
  });
  h+='</div>';
  vb.innerHTML=h;
}
window.rVigenciaContratos=rVigenciaContratos;
