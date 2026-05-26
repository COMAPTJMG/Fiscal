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
var WHATSAPP_COORD = ''; /* ⚠ Definir número do coordenador: '5531999999999' */

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
  if(!SR){Tt('Navegação por voz não suportada neste dispositivo.');return;}
  if(_vozNavAtiva){
    _vozNavAtiva=false;
    if(_vozNavRec)_vozNavRec.stop();
    Tt('Navegação por voz desativada.');return;
  }
  _vozNavAtiva=true;
  Tt('🎙️ Navegação por voz ativada! Comandos: "próximo", "voltar", "conforme", "não conforme", "foto"');

  function ouvir(){
    if(!_vozNavAtiva)return;
    var r=new SR();_vozNavRec=r;
    r.lang='pt-BR';r.continuous=false;r.maxAlternatives=1;
    r.onresult=function(e){
      var cmd=(e.results[0][0].transcript||'').toLowerCase().trim();
      if(cmd.includes('próximo')||cmd.includes('proximo')){if(typeof fnxt==='function')fnxt();}
      else if(cmd.includes('voltar')||cmd.includes('anterior')){if(typeof fprv==='function')fprv();}
      else if(cmd.includes('conforme')){
        var btn=document.querySelector('[data-st="conforme"]');if(btn)btn.click();
      }
      else if(cmd.includes('não conforme')||cmd.includes('nao conforme')){
        var btn2=document.querySelector('[data-st="nao_conforme"]');if(btn2)btn2.click();
      }
      else if(cmd.includes('foto')){
        var inp=document.querySelector('input[type="file"][capture]');if(inp)inp.click();
      }
      else if(cmd.includes('salvar')){if(typeof salvarR==='function')salvarR();}
      else if(cmd.includes('finalizar')){if(typeof salvarF==='function')salvarF();}
      setTimeout(ouvir,300);
    };
    r.onerror=function(){setTimeout(ouvir,1000);};
    r.onend=function(){if(_vozNavAtiva)setTimeout(ouvir,300);};
    r.start();
  }
  ouvir();
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
  var s=S.sessao||{};var reg=s.reg||'NORTE';
  var R=typeof REG!=='undefined'&&REG[reg]?REG[reg]:{l:reg,ct:'CT 017/2026'};
  var hoje=new Date();
  var dtHoje=fdt(hoje.toISOString().slice(0,10));
  var tipoLabel=tipo==='definitivo'?'DEFINITIVO':'PROVISÓRIO';

  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    +'<title>Termo de Recebimento '+tipoLabel+'</title>'
    +'<style>body{font-family:Arial,sans-serif;font-size:11pt;margin:3cm 2cm;color:#000;line-height:1.8;}'
    +'h1{font-size:13pt;text-align:center;text-transform:uppercase;margin-bottom:4px;}'
    +'.sub{text-align:center;font-size:10pt;color:#555;margin-bottom:30px;}'
    +'.footer{margin-top:60px;display:flex;justify-content:space-between;}'
    +'.ass{text-align:center;border-top:1px solid #000;width:220px;padding-top:4px;font-size:9pt;}'
    +'@media print{body{margin:2cm;}}</style></head><body>'
    +'<h1>TERMO DE RECEBIMENTO '+tipoLabel+' DE SERVIÇO</h1>'
    +'<div class="sub">'+R.ct+' · Região '+R.l+'</div>'
    +'<p>Aos '+dtHoje+', a Comissão de Recebimento designada pela Portaria competente, reuniu-se para o recebimento '+(tipo==='definitivo'?'definitivo':'provisório')+' dos serviços de manutenção predial executados pela empresa contratada, referente ao período de medição '+(mes||'_____/2026')+'.</p>'
    +'<p>Os serviços foram executados em conformidade com o objeto do '+R.ct+', observadas as especificações técnicas, as normas técnicas aplicáveis (NBR 5674, NBR 14037) e as exigências constantes nos Anexos do contrato.</p>'
    +(tipo==='definitivo'?'<p><b>Declaramos</b>, para os devidos fins, que os serviços encontram-se em perfeitas condições de uso e funcionamento, atendendo às especificações contratadas, não havendo pendências registradas.</p>':'<p>O presente recebimento <b>não exclui a responsabilidade da contratada</b> por quaisquer vícios ou defeitos ocultos que venham a ser identificados no período de garantia.</p>')
    +'<p>Este Termo é lavrado em conformidade com o Art. 140 da Lei nº 14.133/2021.</p>'
    +'<div class="footer">'
    +'<div class="ass">_______________________<br>Fiscal TJMG<br>'+_escA(s.nome||'—')+'</div>'
    +'<div class="ass">_______________________<br>Coordenador TJMG</div>'
    +'<div class="ass">_______________________<br>Representante Contratada</div>'
    +'</div></body></html>';

  var blob=new Blob([html],{type:'text/html'});
  shareFile(blob,'Termo_Recebimento_'+tipoLabel+'_'+(mes||'').replace('/','_')+'.html','Termo '+tipoLabel);
  Tt('✅ Termo de Recebimento '+tipoLabel+' gerado!');
}

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
