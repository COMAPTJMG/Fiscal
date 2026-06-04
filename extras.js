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

  var _RWa=typeof REG!=='undefined'&&i.reg&&REG[i.reg]?REG[i.reg]:{l:'',ct:'',empresa:''};
  var _empWa=_RWa.empresa&&_RWa.empresa!=='A definir'?_RWa.empresa:'Empresa '+(_RWa.ct||'—');
  var msg='⚠️ *NC Crítica — TJMG Fiscal*\n\n'
    +'🏛️ *Edificação:* '+i.edif+'\n'
    +'📍 *Comarca:* '+(i.com||'—')+' | *Região:* '+_RWa.l+'\n'
    +'🏢 *Contratada:* '+_empWa+'\n'
    +'📄 *Contrato:* '+(_RWa.ct||'—')+'\n'
    +'📅 *Data:* '+fdt(i.dtVistoria||i.data)+'\n'
    +'👤 *Fiscal:* '+(i.fiscal||'—')+'\n\n'
    +'❌ *Não-conformidades ('+ncs.length+'):*\n'
    +ncs.slice(0,5).map(function(nc){return '• '+nc.nm+(nc.obs?' — '+nc.obs:'');}).join('\n')
    +(ncs.length>5?'\n...e mais '+(ncs.length-5)+' itens':'')
    +'\n\n_Notificação automática — TJMG Fiscal PWA_';

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

  /* v84: design institucional idêntico aos demais relatórios */
  var _css='<style>'
    +'@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800&family=Source+Serif+4:opsz,wght@8..60,700&display=swap");'
    +'*{box-sizing:border-box;margin:0;padding:0;}'
    +'body{font-family:"IBM Plex Sans",sans-serif;font-size:12px;color:#1f2937;background:#fff;line-height:1.5;}'
    +'.topo{background:#1e3a5f;color:#fff;padding:16px 24px;}'
    +'.topo-inst{font-size:11px;opacity:.75;margin-top:2px;}'
    +'.topo-nome{font-size:15px;font-weight:800;font-family:"Source Serif 4",serif;}'
    +'.topo-ref{font-size:10px;opacity:.6;margin-top:4px;}'
    +'.faixa{background:#003580;color:#fff;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;}'
    +'.faixa-titulo{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}'
    +'.faixa-data{font-size:11px;opacity:.7;}'
    +'.corpo{padding:20px 24px 40px;max-width:900px;margin:0 auto;}'
    +'.sec-titulo{font-family:"Source Serif 4",serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:5px;margin:20px 0 12px;}'
    +'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}'
    +'.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;}'
    +'.kpi-n{font-size:24px;font-weight:900;color:#1e3a5f;}'
    +'.kpi-l{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-top:3px;}'
    +'.kpi.imr .kpi-n{color:'+(imrPct!==null?(imrPct>=80?'#16a34a':imrPct>=60?'#d97706':'#dc2626'):'#94a3b8')+'}'
    +'table{width:100%;border-collapse:collapse;font-size:11px;}'
    +'th{background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.04em;}'
    +'td{padding:7px 10px;border-bottom:1px solid #f1f5f9;}'
    +'tr:hover td{background:#f8fafc;}'
    +'.td-ok{color:#16a34a;font-weight:700;}'
    +'.td-nc{color:#dc2626;font-weight:700;}'
    +'.td-warn{color:#d97706;font-weight:700;}'
    +'.rodape{margin-top:40px;padding:12px 24px;background:#f8fafc;border-top:2px solid #e2e8f0;font-size:9.5px;color:#9ca3af;text-align:center;}'
    +'@page{size:A4;margin:12mm 14mm 16mm;}'
    +'@media print{body{font-size:11px;}.topo,.faixa{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}'
    +'</style>';

  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    +'<title>Relatório Mensal '+mesNome[mIdx]+'/'+mAno+'</title>'
    +_css
    +'</head><body>'
    +'<div class="topo">'
    +'<div class="topo-inst">Tribunal de Justiça do Estado de Minas Gerais · DENGEP / GEMAP</div>'
    +'<div class="topo-nome">Relatório Mensal de Fiscalização</div>'
    +'<div class="topo-ref">'+R.ct+' · Região '+R.l+' · '+mesNome[mIdx]+'/'+mAno+'</div>'
    +'</div>'
    +'<div class="faixa">'
    +'<span class="faixa-titulo">RELMF — Período: '+mesNome[mIdx]+'/'+mAno+'</span>'
    +'<span class="faixa-data">Emitido em: '+new Date().toLocaleDateString('pt-BR')+'</span>'
    +'</div>'
    +'<div class="corpo">'
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
    /* KPIs */
    +(function(){
      var _allNcs=base.reduce(function(s,i){return s+Object.values(i.itens||{}).filter(function(v){return v.s==='nao_conforme';}).length;},0);
      var _avgConf=dados&&dados.length?Math.round(dados.reduce(function(s,d){return s+(d||0);},0)/dados.length):null;
      return '<div class="sec-titulo">Resumo Executivo</div>'
        +'<div class="kpis">'
        +'<div class="kpi"><div class="kpi-n">'+base.length+'</div><div class="kpi-l">Inspeções</div></div>'
        +(imrPct!==null?'<div class="kpi imr"><div class="kpi-n">'+imrPct+'%</div><div class="kpi-l">IMR Apurado</div></div>':'')
        +(imrPct!==null&&faixa?'<div class="kpi"><div class="kpi-n">'+Math.round(faixa.glosa*100)+'%</div><div class="kpi-l">Glosa</div></div>':'')
        +'<div class="kpi"><div class="kpi-n" style="color:#dc2626;">'+_allNcs+'</div><div class="kpi-l">Total NCs</div></div>'
        +'</div>';
    })()
    +'</div>'/* corpo */
    +'<div class="rodape">Tribunal de Justiça do Estado de Minas Gerais · GEMAP · TJMG Fiscal PWA v84 · '+R.ct+'</div>'
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
    +(function(){
      var _regT=S.sessao&&S.sessao.reg?S.sessao.reg:'NORTE';
      var _empT=typeof REG!=='undefined'&&REG[_regT]&&REG[_regT].empresa&&REG[_regT].empresa!=='A definir'?REG[_regT].empresa:'';
      return '<input id="tr-emp" value="'+_empT+'" placeholder="Nome da empresa contratada" style="margin-bottom:10px;background:#f8fafc;color:#0f172a;">';
    })()
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

/* v91-fix: GPS badge SEMPRE oculto — GPS funciona em background sem indicador visual */
function _mostrarBadgeGPS(gps,status){
  /* GPS continua capturando em background, mas sem exibir badge na tela */
  var badge=el('gps-badge-form');
  if(badge) badge.style.display='none';
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
  /* v84: empresa alinhada com config.js — RENOVA apenas no CT 017/2026 (Região Norte) */
  NORTE:    {ct:'CT 017/2026',empresa:'RENOVA ENGENHARIA',inicio:'2026-01-01',fim:'2026-12-31'},
  CENTRAL:  {ct:'CT 025/2026',empresa:'CONSTRUTORA MIQUERINOS LTDA',        inicio:'2026-01-01',fim:'2026-12-31'},
  LESTE:    {ct:'CT 019/2026',empresa:'M. BORGES ENGENHARIA LTDA',        inicio:'2026-01-01',fim:'2026-12-31'},
  ZONA_MATA:{ct:'CT 018/2026',empresa:'CONSTRUTORA MIQUERINOS LTDA',        inicio:'2026-01-01',fim:'2026-12-31'},
  TRIANGULO:{ct:'CT 392/2022',empresa:'ETERA CONSTRUÇÕES E ISOLAMENTOS LTDA',        inicio:'2022-07-01',fim:'2026-12-31'},
  SUL:      {ct:'CT 138/2023',empresa:'ETERA CONSTRUÇÕES E ISOLAMENTOS LTDA',        inicio:'2023-06-01',fim:'2026-12-31'},
  SUDOESTE: {ct:'CT 421/2022',empresa:'A definir',        inicio:'2022-09-01',fim:'2026-12-31'}
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

/* ══════════════════════════════════════════════════════════════
   DASHBOARD ANALÍTICO POR COMARCA — v84
   Gráfico de barras: conformidade por comarca, pior→melhor
   Identificação rápida de comarcas problemáticas
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   ANÁLISE AVANÇADA — v87
   Funções de inteligência para fiscalização:
   - Score de saúde por edificação
   - Mapa de calor de NCs por sistema
   - Score de desempenho da contratada
   - NCs reincidentes (mesmo item, mesmo local)
   ══════════════════════════════════════════════════════════════ */

/* ── Score de Saúde da Edificação (0-100) ──────────────────
   Pondera: conformidade média, NCs reincidentes, tempo sem
   vistoria, total de NCs acumuladas, fotos por NC.
   Quanto mais baixo, mais atenção a edificação precisa.
   ─────────────────────────────────────────────────────────── */
function calcSaudeEdificacao(edif, reg) {
  var insps = filterByReg(S.insp).filter(function(i) {
    return i.edif === edif && i.reg === reg && i.st === 'finalizada';
  }).sort(function(a, b) { return (b.dtVistoria || b.data || '') > (a.dtVistoria || a.data || '') ? 1 : -1; });
  if (!insps.length) return { score: null, label: 'Sem dados', cor: '#94a3b8' };

  var ultima = insps[0];
  var its = Object.values(ultima.itens || {});
  var aplic = its.filter(function(v) { return v.s && v.s !== 'fora_periodo' && v.s !== 'nao_aplicavel' && v.s !== 'pendente'; });
  var ncs = aplic.filter(function(v) { return v.s === 'nao_conforme'; });
  var conf = aplic.length ? Math.round(aplic.filter(function(v) { return v.s === 'conforme'; }).length / aplic.length * 100) : 100;

  /* Fator 1: conformidade (peso 40%) */
  var f1 = conf;

  /* Fator 2: NCs reincidentes (peso 25%) — mesmo item NC em 2+ vistorias seguidas */
  var reincidentes = 0;
  if (insps.length >= 2) {
    var ant = insps[1];
    Object.keys(ultima.itens || {}).forEach(function(k) {
      if ((ultima.itens[k].s === 'nao_conforme') && ant.itens && ant.itens[k] && ant.itens[k].s === 'nao_conforme') reincidentes++;
    });
  }
  var f2 = ncs.length ? Math.max(0, 100 - (reincidentes / ncs.length * 100)) : 100;

  /* Fator 3: tempo desde última vistoria (peso 20%) */
  var diasDesdeUltima = Math.round((new Date() - new Date((ultima.dtVistoria || ultima.data) + 'T12:00:00')) / 86400000);
  var f3 = diasDesdeUltima <= 90 ? 100 : diasDesdeUltima <= 180 ? 70 : diasDesdeUltima <= 365 ? 40 : 10;

  /* Fator 4: cobertura fotográfica (peso 15%) — NCs com foto */
  var ncsComFoto = ncs.filter(function(v) { return (v.fotos || []).length > 0; }).length;
  var f4 = ncs.length ? Math.round(ncsComFoto / ncs.length * 100) : 100;

  var score = Math.round(f1 * 0.40 + f2 * 0.25 + f3 * 0.20 + f4 * 0.15);
  var label = score >= 80 ? 'Bom' : score >= 60 ? 'Atenção' : score >= 40 ? 'Crítico' : 'Urgente';
  var cor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : score >= 40 ? '#dc2626' : '#7f1d1d';

  return {
    score: score, label: label, cor: cor,
    conf: conf, ncs: ncs.length, reincidentes: reincidentes,
    diasDesdeUltima: diasDesdeUltima, ncsComFoto: ncsComFoto,
    totalInsps: insps.length, edif: edif
  };
}

/* ── Mapa de Calor de NCs por Sistema ──────────────────────
   Retorna ranking: qual sistema acumula mais NCs no total
   ─────────────────────────────────────────────────────────── */
function calcNcsPorSistema() {
  var sistemas = {};
  filterByReg(S.insp).filter(function(i) { return i.st === 'finalizada'; }).forEach(function(i) {
    Object.values(i.itens || {}).forEach(function(v) {
      if (v.s !== 'nao_conforme') return;
      var sn = v.sn || v.sistema || 'Outros';
      if (!sistemas[sn]) sistemas[sn] = { total: 0, reincidente: 0, comarcas: {} };
      sistemas[sn].total++;
      sistemas[sn].comarcas[i.com || '—'] = (sistemas[sn].comarcas[i.com || '—'] || 0) + 1;
    });
  });
  return Object.entries(sistemas)
    .map(function(e) { return { sistema: e[0], total: e[1].total, comarcas: Object.keys(e[1].comarcas).length }; })
    .sort(function(a, b) { return b.total - a.total; });
}

/* ── Score de Desempenho da Contratada ─────────────────────
   Por região: IMR médio + taxa de resolução de NCs + tempo
   médio de resposta
   ─────────────────────────────────────────────────────────── */
function calcDesempenhoContratada(regiao) {
  var R = (typeof REG !== 'undefined' && REG[regiao]) ? REG[regiao] : { l: regiao, empresa: '' };
  var insps = S.insp.filter(function(i) { return i.reg === regiao && i.st === 'finalizada'; });
  if (!insps.length) return null;

  var totalNcs = 0, ncsResolvidas = 0, somaConf = 0;
  insps.forEach(function(i) {
    var its = Object.values(i.itens || {});
    var aplic = its.filter(function(v) { return v.s && v.s !== 'fora_periodo' && v.s !== 'nao_aplicavel' && v.s !== 'pendente'; });
    var conf = aplic.filter(function(v) { return v.s === 'conforme'; }).length;
    somaConf += aplic.length ? Math.round(conf / aplic.length * 100) : 100;
    totalNcs += its.filter(function(v) { return v.s === 'nao_conforme'; }).length;
  });

  /* NCs que eram NC na penúltima e viraram conforme na última (resolvidas) */
  var edifs = {};
  insps.forEach(function(i) { if (!edifs[i.edif]) edifs[i.edif] = []; edifs[i.edif].push(i); });
  Object.values(edifs).forEach(function(arr) {
    arr.sort(function(a, b) { return (b.dtVistoria || b.data || '') > (a.dtVistoria || a.data || '') ? 1 : -1; });
    if (arr.length < 2) return;
    var atu = arr[0], ant = arr[1];
    Object.keys(ant.itens || {}).forEach(function(k) {
      if (ant.itens[k].s === 'nao_conforme' && atu.itens && atu.itens[k] && atu.itens[k].s === 'conforme') ncsResolvidas++;
    });
  });

  var mediaConf = Math.round(somaConf / insps.length);
  var taxaResolucao = totalNcs > 0 ? Math.round(ncsResolvidas / totalNcs * 100) : 100;

  return {
    regiao: regiao,
    empresa: R.empresa || '—',
    contrato: R.ct || '—',
    totalInsps: insps.length,
    mediaConf: mediaConf,
    totalNcs: totalNcs,
    ncsResolvidas: ncsResolvidas,
    taxaResolucao: taxaResolucao,
    score: Math.round(mediaConf * 0.5 + taxaResolucao * 0.5)
  };
}

window.calcSaudeEdificacao = calcSaudeEdificacao;
window.calcNcsPorSistema = calcNcsPorSistema;
window.calcDesempenhoContratada = calcDesempenhoContratada;

function rDashboard() {
  var db = el('dashboard-body'); if (!db) return;
  var s  = S.sessao || {};
  var base = filterByReg(S.insp).filter(function(i) {
    return i.st === 'finalizada' && i.tipo === 'periodica';
  });

  if (!base.length) {
    db.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">'
      + '<div style="font-size:40px;">📊</div>'
      + '<div style="font-size:14px;font-weight:600;margin-top:10px;">Nenhuma inspeção finalizada</div>'
      + '</div>';
    return;
  }

  /* Agrupar por comarca */
  var comarcas = {};
  base.forEach(function(i) {
    var c = i.com || 'Sem comarca';
    if (!comarcas[c]) comarcas[c] = { insps: [], ncs: 0, fotos: 0 };
    var its = Object.values(i.itens || {});
    var aplic = its.filter(function(v) {
      return v.s && v.s !== 'fora_periodo' && v.s !== 'nao_aplicavel' && v.s !== 'pendente';
    });
    var conf  = aplic.filter(function(v) { return v.s === 'conforme'; }).length;
    var nc    = aplic.filter(function(v) { return v.s === 'nao_conforme'; }).length;
    var ft    = its.reduce(function(s,v){ return s + (v.fotos||[]).length; }, 0);
    var pct   = aplic.length ? Math.round(conf / aplic.length * 100) : null;
    comarcas[c].insps.push({ pct: pct, nc: nc, data: i.dtVistoria || i.data, id: i.id });
    comarcas[c].ncs   += nc;
    comarcas[c].fotos += ft;
  });

  /* Calcular média por comarca */
  var dados = Object.keys(comarcas).map(function(c) {
    var insps = comarcas[c].insps.filter(function(x) { return x.pct !== null; });
    var media = insps.length
      ? Math.round(insps.reduce(function(s,x){ return s+x.pct; },0) / insps.length)
      : null;
    return {
      comarca: c,
      media:   media,
      n:       comarcas[c].insps.length,
      ncs:     comarcas[c].ncs,
      fotos:   comarcas[c].fotos,
      ultima:  comarcas[c].insps.sort(function(a,b){ return (b.data||'') > (a.data||'') ? 1 : -1; })[0]
    };
  }).filter(function(d) { return d.media !== null; });

  /* Ordenar pior → melhor */
  dados.sort(function(a, b) { return a.media - b.media; });

  var maxVal = Math.max.apply(null, dados.map(function(d){ return d.media; }));

  /* ── Cabeçalho ── */
  var hoje = new Date();
  var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0');
  var noMes = base.filter(function(i){ return (i.dtVistoria||i.data||'').startsWith(mesAtual); }).length;

  /* ── HTML ── */
  var h = '<div style="padding:12px;">';

  /* KPIs topo */
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">';
  h += '<div style="background:#dbeafe;border-radius:10px;padding:12px;text-align:center;">'
     + '<div style="font-size:22px;font-weight:900;color:#1e40af;">'+dados.length+'</div>'
     + '<div style="font-size:9px;color:#1e40af;text-transform:uppercase;font-weight:700;">Comarcas</div></div>';
  h += '<div style="background:#dcfce7;border-radius:10px;padding:12px;text-align:center;">'
     + '<div style="font-size:22px;font-weight:900;color:#166534;">'+base.length+'</div>'
     + '<div style="font-size:9px;color:#166534;text-transform:uppercase;font-weight:700;">Inspeções</div></div>';
  h += '<div style="background:#fef3c7;border-radius:10px;padding:12px;text-align:center;">'
     + '<div style="font-size:22px;font-weight:900;color:#92400e;">'+noMes+'</div>'
     + '<div style="font-size:9px;color:#92400e;text-transform:uppercase;font-weight:700;">Este mês</div></div>';
  h += '</div>';

  /* Legenda de cores */
  h += '<div style="display:flex;gap:10px;margin-bottom:12px;font-size:10px;font-weight:700;">';
  h += '<span style="color:#dc2626;">● Crítico &lt;60%</span>';
  h += '<span style="color:#d97706;">● Regular 60-80%</span>';
  h += '<span style="color:#16a34a;">● Bom ≥80%</span>';
  h += '</div>';

  /* Gráfico de barras */
  h += '<div style="font-size:11px;font-weight:800;color:#003580;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Conformidade por Comarca (pior → melhor)</div>';
  h += '<div style="display:flex;flex-direction:column;gap:5px;">';

  dados.forEach(function(d) {
    var cor = d.media >= 80 ? '#16a34a' : d.media >= 60 ? '#d97706' : '#dc2626';
    var bgCor = d.media >= 80 ? '#dcfce7' : d.media >= 60 ? '#fef3c7' : '#fee2e2';
    var pct = d.media;
    var barW = Math.round(pct / 100 * 100);

    h += '<div style="background:#fff;border-radius:10px;padding:10px 12px;border-left:4px solid '+cor+';border:1px solid #f1f5f9;border-left:4px solid '+cor+';">';
    /* Linha 1: comarca + % */
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">';
    h += '<div style="font-size:12px;font-weight:700;color:#1e293b;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:8px;">'+d.comarca+'</div>';
    h += '<div style="font-size:16px;font-weight:900;color:'+cor+';flex-shrink:0;">'+pct+'%</div>';
    h += '</div>';
    /* Barra */
    h += '<div style="background:#e2e8f0;border-radius:4px;height:8px;margin-bottom:5px;overflow:hidden;">';
    h += '<div style="width:'+barW+'%;height:100%;background:'+cor+';border-radius:4px;transition:width .4s;"></div>';
    h += '</div>';
    /* Linha 2: detalhes */
    h += '<div style="display:flex;gap:8px;font-size:9.5px;color:#64748b;">';
    h += '<span>📋 '+d.n+' inspeção'+(d.n>1?'s':'')+'</span>';
    if (d.ncs > 0) h += '<span style="color:'+cor+';font-weight:700;">⚠ '+d.ncs+' NC</span>';
    if (d.fotos > 0) h += '<span>📸 '+d.fotos+'</span>';
    h += '</div>';
    h += '</div>';
  });

  h += '</div>';

  /* Tabela ranking completo */
  /* Ranking: cards em vez de tabela grid (mobile-friendly) */
  h += '<div style="margin-top:16px;font-size:11px;font-weight:800;color:#003580;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Ranking Completo</div>';
  dados.forEach(function(d, ix) {
    var cor = d.media >= 80 ? '#16a34a' : d.media >= 60 ? '#d97706' : '#dc2626';
    h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:'+(ix%2===0?'#fff':'#f8fafc')+';border-radius:8px;margin-bottom:3px;border:1px solid #f1f5f9;">';
    h += '<div style="width:20px;font-size:11px;color:#94a3b8;font-weight:800;text-align:center;flex-shrink:0;">'+(ix+1)+'</div>';
    h += '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+d.comarca+'</div>';
    h += '<div style="font-size:10px;color:#64748b;">'+d.n+' inspeção'+(d.n>1?'s':'')+(d.ncs>0?' · <span style="color:#dc2626;font-weight:700;">'+d.ncs+' NC</span>':'')+'</div></div>';
    h += '<div style="font-size:16px;font-weight:900;color:'+cor+';flex-shrink:0;">'+d.media+'%</div>';
    h += '</div>';
  });
  /* ═══ MAPA DE CALOR DE NCs POR SISTEMA ═══ */
  var ncsSistema = typeof calcNcsPorSistema === 'function' ? calcNcsPorSistema() : [];
  if (ncsSistema.length) {
    var maxNcSis = ncsSistema[0].total;
    h += '<div style="margin-top:20px;font-size:11px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">🔥 Sistemas com Mais NCs</div>';
    ncsSistema.slice(0, 8).forEach(function(s, idx) {
      var pctBar = Math.round(s.total / maxNcSis * 100);
      var cor = idx === 0 ? '#dc2626' : idx < 3 ? '#ea580c' : '#d97706';
      h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
      h += '<div style="width:18px;font-size:10px;font-weight:800;color:' + cor + ';text-align:right;">' + (idx + 1) + '</div>';
      h += '<div style="flex:1;min-width:0;">';
      h += '<div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.sistema + '</div>';
      h += '<div style="background:#fee2e2;border-radius:3px;height:6px;margin-top:3px;"><div style="width:' + pctBar + '%;height:100%;background:' + cor + ';border-radius:3px;"></div></div>';
      h += '</div>';
      h += '<div style="font-size:12px;font-weight:800;color:' + cor + ';">' + s.total + '</div>';
      h += '</div>';
    });
  }

  /* ═══ SAÚDE DAS EDIFICAÇÕES (top 10 piores) ═══ */
  var edifSet = {};
  filterByReg(S.insp).filter(function(i) { return i.st === 'finalizada'; }).forEach(function(i) {
    edifSet[i.edif + '::' + i.reg] = { edif: i.edif, reg: i.reg, com: i.com };
  });
  var saudes = Object.values(edifSet).map(function(e) {
    return calcSaudeEdificacao(e.edif, e.reg);
  }).filter(function(s) { return s.score !== null; }).sort(function(a, b) { return a.score - b.score; });

  if (saudes.length) {
    h += '<div style="margin-top:20px;font-size:11px;font-weight:800;color:#7f1d1d;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">🏥 Saúde das Edificações</div>';
    saudes.slice(0, 10).forEach(function(s) {
      h += '<div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;border-left:4px solid ' + s.cor + ';padding:8px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">';
      h += '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _escA(s.edif) + '</div>';
      h += '<div style="font-size:10px;color:#64748b;">' + s.ncs + ' NC · ' + s.reincidentes + ' reinc. · há ' + s.diasDesdeUltima + 'd</div></div>';
      h += '<div style="text-align:center;flex-shrink:0;margin-left:8px;"><div style="font-size:18px;font-weight:900;color:' + s.cor + ';">' + s.score + '</div>';
      h += '<div style="font-size:8px;color:' + s.cor + ';font-weight:700;">' + s.label + '</div></div></div>';
    });
  }

  /* ═══ DESEMPENHO POR CONTRATADA ═══ */
  var regioes = Object.keys(typeof REG !== 'undefined' ? REG : {});
  var desempenhos = regioes.map(function(r) { return typeof calcDesempenhoContratada === 'function' ? calcDesempenhoContratada(r) : null; }).filter(Boolean).sort(function(a, b) { return a.score - b.score; });

  if (desempenhos.length) {
    h += '<div style="margin-top:20px;font-size:11px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">🏢 Desempenho por Contratada</div>';
    desempenhos.forEach(function(d) {
      var corD = d.score >= 80 ? '#16a34a' : d.score >= 60 ? '#d97706' : '#dc2626';
      h += '<div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;padding:12px 14px;margin-bottom:8px;">';
      h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">';
      h += '<div><div style="font-size:13px;font-weight:800;color:#0f172a;">' + _escA(d.empresa) + '</div>';
      h += '<div style="font-size:10px;color:#7c3aed;font-weight:600;">' + d.contrato + '</div></div>';
      h += '<div style="font-size:22px;font-weight:900;color:' + corD + ';">' + d.score + '<span style="font-size:9px;color:#94a3b8;"> pts</span></div></div>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
      h += '<div style="background:#f8fafc;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:' + (d.mediaConf >= 80 ? '#16a34a' : '#d97706') + ';">' + d.mediaConf + '%</div><div style="font-size:9px;color:#64748b;">Conformidade</div></div>';
      h += '<div style="background:#f8fafc;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:' + (d.taxaResolucao >= 70 ? '#16a34a' : '#dc2626') + ';">' + d.taxaResolucao + '%</div><div style="font-size:9px;color:#64748b;">NCs Resolvidas</div></div>';
      h += '</div>';
      h += '<div style="font-size:10px;color:#64748b;margin-top:6px;">' + d.totalInsps + ' inspeções · ' + d.totalNcs + ' NCs · ' + d.ncsResolvidas + ' resolvidas</div>';
      h += '</div>';
    });
  }

  h += '</div>'; /* padding wrapper */

  db.innerHTML = h;
}

/* ══════════════════════════════════════════════════════════════
   GERAR OSP A PARTIR DE NCs SELECIONADAS — v86
   O fiscal seleciona NCs de uma inspeção e gera uma OSP
   pré-preenchida com edificação, comarca, sistemas e descrições.
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   GERAR OSP A PARTIR DE NCs — v88
   MODO 1: abrirSeletorNcParaOsp(inspId) → NCs de UMA inspeção
   MODO 2: abrirOspEdificacao(edif, reg)  → TODAS as NCs abertas
           dessa edificação, de TODAS as vistorias finalizadas.
           O fiscal seleciona quais incluir na OSP.
   ══════════════════════════════════════════════════════════════ */

/* Modo 1: NCs de uma inspeção específica */
function abrirSeletorNcParaOsp(inspId) {
  var i = S.insp.find(function(x){ return x.id === inspId; });
  if (!i) return;
  var ncs = [];
  Object.entries(i.itens || {}).forEach(function(pair) {
    var k = pair[0], v = pair[1];
    if (v.s === 'nao_conforme') ncs.push({
      key: k, nm: v.nm || v.n || k, obs: v.obs || '', sn: v.sn || '',
      inspId: inspId, data: i.dtVistoria || i.data, edif: i.edif, com: i.com
    });
  });
  if (!ncs.length) { Tt('Nenhuma NC nesta inspeção.'); return; }
  _abrirSeletorNcModal(ncs, i.edif, i.com || '', i.reg || '');
}

/* Modo 2: TODAS as NCs de uma edificação (todas as vistorias) */
function abrirOspEdificacao(edif, reg) {
  var insps = filterByReg(S.insp).filter(function(i) {
    return i.edif === edif && i.st === 'finalizada';
  }).sort(function(a, b) {
    return (b.dtVistoria || b.data || '') > (a.dtVistoria || a.data || '') ? 1 : -1;
  });

  if (!insps.length) { Tt('Nenhuma inspeção finalizada para esta edificação.'); return; }

  /* Coletar TODAS as NCs, evitando duplicatas (mesmo item em vistorias diferentes → pega a mais recente) */
  var ncMap = {}; /* chave: itemKey → NC mais recente */
  insps.forEach(function(i) {
    Object.entries(i.itens || {}).forEach(function(pair) {
      var k = pair[0], v = pair[1];
      if (v.s !== 'nao_conforme') return;
      /* Se esse item já foi corrigido (conforme) em uma vistoria MAIS RECENTE, ignorar */
      if (ncMap[k] && ncMap[k].resolvido) return;
      if (!ncMap[k]) {
        ncMap[k] = {
          key: k, nm: v.nm || v.n || k, obs: v.obs || '', sn: v.sn || '',
          inspId: i.id, data: i.dtVistoria || i.data, edif: i.edif, com: i.com || '',
          resolvido: false
        };
      }
    });
    /* Marcar itens que foram corrigidos nesta vistoria */
    Object.entries(i.itens || {}).forEach(function(pair) {
      var k = pair[0], v = pair[1];
      if (v.s === 'conforme' && ncMap[k] && !ncMap[k].resolvido) {
        ncMap[k].resolvido = true;
      }
    });
  });

  var ncs = Object.values(ncMap).filter(function(nc) { return !nc.resolvido; });

  if (!ncs.length) {
    Tt('✅ Todas as NCs desta edificação já foram resolvidas!');
    return;
  }

  var com = insps[0].com || '';
  _abrirSeletorNcModal(ncs, edif, com, reg);
}

/* ── Modal de seleção de NCs (usado por ambos os modos) ── */
function _abrirSeletorNcModal(ncs, edif, com, reg) {
  var R = (typeof REG !== 'undefined' && REG[reg]) ? REG[reg] : { l: reg, empresa: '', ct: '' };
  var emp = R.empresa && R.empresa !== 'A definir' ? R.empresa : '';

  var ov = document.createElement('div');
  ov.id = '_osp_nc_ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10000;display:flex;flex-direction:column;';

  var h = '<div style="background:#fff;flex:1;display:flex;flex-direction:column;border-radius:16px 16px 0 0;margin-top:32px;overflow:hidden;">';

  /* Header */
  h += '<div style="background:#0f766e;padding:14px 16px;color:#fff;flex-shrink:0;">';
  h += '<div style="font-size:15px;font-weight:800;">📋 Gerar OSP a partir de NCs</div>';
  h += '<div style="font-size:11px;opacity:.7;margin-top:2px;">' + _escA(edif) + ' · ' + _escA(com) + '</div>';
  if (emp) h += '<div style="font-size:10px;opacity:.5;margin-top:1px;">🏢 ' + _escA(emp) + ' · ' + _escA(R.ct) + '</div>';
  h += '</div>';

  /* Corpo scrollável */
  h += '<div style="padding:12px;flex:1;overflow-y:auto;">';

  /* Ações topo */
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  h += '<button onclick="_ospNcSelAll()" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;">☐ Todas</button>';
  h += '<span id="_osp_nc_cnt" style="font-size:11px;color:#64748b;">0 / ' + ncs.length + '</span>';
  h += '<span style="flex:1;"></span>';
  h += '<span style="font-size:10px;color:#dc2626;font-weight:700;">' + ncs.length + ' NC' + (ncs.length > 1 ? 's' : '') + ' aberta' + (ncs.length > 1 ? 's' : '') + '</span>';
  h += '</div>';

  /* Agrupar por sistema */
  var porSistema = {};
  var ordemSis = [];
  ncs.forEach(function(nc, idx) {
    var s = nc.sn || 'Outros';
    if (!porSistema[s]) { porSistema[s] = []; ordemSis.push(s); }
    nc._idx = idx;
    porSistema[s].push(nc);
  });

  ordemSis.forEach(function(sis) {
    h += '<div style="font-size:10px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.06em;border-left:3px solid #0f766e;padding-left:8px;margin:12px 0 6px;">' + _escA(sis) + ' (' + porSistema[sis].length + ')</div>';

    porSistema[sis].forEach(function(nc) {
      var idx = nc._idx;
      h += '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:' + (idx % 2 === 0 ? '#fff' : '#fafafa') + ';border-radius:8px;margin-bottom:3px;cursor:pointer;" onclick="_ospNcToggle(' + idx + ')">';
      h += '<div id="_osp_ck_' + idx + '" style="width:22px;height:22px;border-radius:6px;border:2px solid #cbd5e1;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;margin-top:1px;"></div>';
      h += '<div style="flex:1;min-width:0;">';
      h += '<div style="font-size:12px;font-weight:700;color:#1e293b;">' + _escA(nc.nm) + '</div>';
      if (nc.obs) h += '<div style="font-size:11px;color:#dc2626;font-style:italic;margin-top:2px;">' + _escA(nc.obs) + '</div>';
      h += '<div style="font-size:9px;color:#94a3b8;margin-top:2px;">Vistoria: ' + fdt(nc.data) + '</div>';
      h += '</div></div>';
    });
  });

  h += '</div>';

  /* Footer com botão */
  h += '<div style="padding:12px 16px 24px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0;">';
  h += '<button onclick="_gerarOspDeNcsV2()" id="_osp_nc_btn" style="width:100%;background:#0f766e;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;opacity:.5;pointer-events:none;">📋 Gerar OSP (selecione NCs)</button>';
  h += '<button onclick="document.body.removeChild(document.getElementById(\'_osp_nc_ov\'))" style="width:100%;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;padding:11px;font-size:12px;cursor:pointer;margin-top:6px;">Cancelar</button>';
  h += '</div></div>';

  ov.innerHTML = h;
  document.body.appendChild(ov);

  window._ospNcSel = {};
  window._ospNcList = ncs;
  window._ospEdif = edif;
  window._ospCom = com;
  window._ospReg = reg;
}

function _ospNcToggle(idx) {
  if (window._ospNcSel[idx]) delete window._ospNcSel[idx];
  else window._ospNcSel[idx] = true;
  _ospNcRefresh();
}

function _ospNcSelAll() {
  var ncs = window._ospNcList || [];
  var allSel = ncs.length > 0 && Object.keys(window._ospNcSel || {}).length === ncs.length;
  window._ospNcSel = {};
  if (!allSel) ncs.forEach(function(_, idx) { window._ospNcSel[idx] = true; });
  _ospNcRefresh();
}

function _ospNcRefresh() {
  var ncs = window._ospNcList || [];
  var n = Object.keys(window._ospNcSel || {}).length;
  ncs.forEach(function(_, idx) {
    var ck = el('_osp_ck_' + idx);
    if (ck) {
      var sel = !!window._ospNcSel[idx];
      ck.style.background = sel ? '#0f766e' : '#fff';
      ck.style.borderColor = sel ? '#0f766e' : '#cbd5e1';
      ck.textContent = sel ? '\u2713' : '';
    }
  });
  var cnt = el('_osp_nc_cnt');
  if (cnt) cnt.textContent = n + ' / ' + ncs.length;
  var btn = el('_osp_nc_btn');
  if (btn) {
    btn.style.opacity = n > 0 ? '1' : '.5';
    btn.style.pointerEvents = n > 0 ? 'auto' : 'none';
    btn.textContent = n > 0 ? '\ud83d\udccb Gerar OSP (' + n + ' NC' + (n > 1 ? 's' : '') + ')' : '\ud83d\udccb Gerar OSP (selecione NCs)';
  }
}

function _gerarOspDeNcsV2() {
  var ncs = window._ospNcList || [];
  var selIdx = Object.keys(window._ospNcSel || {}).map(Number);
  if (!selIdx.length) { Tt('Selecione pelo menos uma NC.'); return; }

  var selNcs = selIdx.map(function(idx) { return ncs[idx]; }).filter(Boolean);
  var edif = window._ospEdif || selNcs[0].edif;
  var com = window._ospCom || selNcs[0].com;
  var reg = window._ospReg || '';

  /* Descrição agrupada por sistema */
  var porSis = {};
  selNcs.forEach(function(nc) {
    var s = nc.sn || 'Geral';
    if (!porSis[s]) porSis[s] = [];
    porSis[s].push(nc);
  });
  var descricao = Object.keys(porSis).map(function(sis) {
    var itens = porSis[sis].map(function(nc, i) {
      return '  ' + (i + 1) + '. ' + nc.nm + (nc.obs ? ' — ' + nc.obs : '') + ' (vistoria ' + fdt(nc.data) + ')';
    }).join('\n');
    return '[ ' + sis + ' ]\n' + itens;
  }).join('\n\n');

  /* Fechar modal */
  var ov = document.getElementById('_osp_nc_ov');
  if (ov) document.body.removeChild(ov);

  /* Criar OSP */
  var novaId = uid();
  var novaOsp = {
    id: novaId,
    tipo: 'osp',
    edif: edif,
    com: com,
    reg: reg,
    fiscal: S.sessao ? S.sessao.nome : '',
    dtVistoria: new Date().toISOString().slice(0, 10),
    data: new Date().toISOString().slice(0, 10),
    st: 'em_andamento',
    itens: {},
    obs: 'OSP gerada a partir de ' + selNcs.length + ' NC(s) da edificação ' + edif + ':\n\n' + descricao,
    _origemNcs: selNcs.map(function(nc) { return { inspId: nc.inspId, key: nc.key }; })
  };

  S.insp.push(novaOsp);
  DB.sv();
  Tt('\u2705 OSP criada com ' + selNcs.length + ' NC(s)! Redirecionando...');
  setTimeout(function() {
    if (typeof retomarF === 'function') retomarF(novaId);
  }, 500);
}


/* ══════════════════════════════════════════════════════════════
   LAUDO FOTOGRÁFICO ANTES × DEPOIS — v89
   Compara fotos de NC (vistoria anterior) com fotos de
   correção (vistoria atual onde item virou conforme).
   Gera HTML exportável com pares lado a lado.
   ══════════════════════════════════════════════════════════════ */

function gerarLaudoAntesDepois(edif, reg) {
  var insps = filterByReg(S.insp).filter(function(i) {
    return i.edif === edif && i.reg === reg && i.st === 'finalizada';
  }).sort(function(a, b) {
    return (a.dtVistoria || a.data || '') > (b.dtVistoria || b.data || '') ? 1 : -1;
  });

  if (insps.length < 2) { Tt('Necessário pelo menos 2 vistorias para comparar.'); return; }

  /* Identificar pares antes/depois: item era NC → virou conforme */
  var pares = [];
  for (var vi = 1; vi < insps.length; vi++) {
    var ant = insps[vi - 1], atu = insps[vi];
    Object.keys(atu.itens || {}).forEach(function(k) {
      var itAtu = atu.itens[k];
      var itAnt = ant.itens && ant.itens[k];
      if (!itAnt) return;
      if (itAnt.s === 'nao_conforme' && itAtu.s === 'conforme') {
        pares.push({
          itemKey: k,
          nome: itAtu.nm || itAnt.nm || k,
          sistema: itAtu.sn || itAnt.sn || '',
          /* Antes */
          antData: ant.dtVistoria || ant.data,
          antObs: itAnt.obs || '',
          antFotos: (itAnt.fotos || []).filter(function(f) { return f && f.b64; }),
          antFiscal: ant.fiscal || '',
          /* Depois */
          atuData: atu.dtVistoria || atu.data,
          atuObs: itAtu.obs || '',
          atuFotos: (itAtu.fotos || []).filter(function(f) { return f && f.b64; }),
          atuFiscal: atu.fiscal || ''
        });
      }
    });
  }

  if (!pares.length) {
    Tt('Nenhum item corrigido encontrado (NC → Conforme) com fotos.');
    return;
  }

  /* Gerar HTML do laudo */
  var R = (typeof REG !== 'undefined' && REG[reg]) ? REG[reg] : { l: reg, ct: '', empresa: '' };
  var emp = R.empresa && R.empresa !== 'A definir' ? R.empresa : '';
  var com = insps[0].com || '';

  var css = '<style>'
    + '@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800&display=swap");'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"IBM Plex Sans",sans-serif;font-size:12px;color:#1f2937;background:#fff;}'
    + '.topo{background:#1e3a5f;color:#fff;padding:16px 24px;}'
    + '.topo h1{font-size:16px;font-weight:800;}'
    + '.topo p{font-size:11px;opacity:.6;margin-top:3px;}'
    + '.corpo{padding:20px 24px;max-width:900px;margin:0 auto;}'
    + '.sec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:5px;margin:24px 0 14px;}'
    + '.par{border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;overflow:hidden;break-inside:avoid;}'
    + '.par-hdr{background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0;}'
    + '.par-hdr h3{font-size:13px;font-weight:800;color:#0f172a;}'
    + '.par-hdr p{font-size:10px;color:#64748b;margin-top:2px;}'
    + '.par-body{display:grid;grid-template-columns:1fr 1fr;}'
    + '.lado{padding:12px;}'
    + '.lado-ant{background:#fff5f5;border-right:2px dashed #fca5a5;}'
    + '.lado-dep{background:#f0fdf4;}'
    + '.lado-tag{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;display:flex;align-items:center;gap:5px;}'
    + '.lado-ant .lado-tag{color:#dc2626;}'
    + '.lado-dep .lado-tag{color:#16a34a;}'
    + '.lado img{width:100%;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:6px;}'
    + '.lado .obs{font-size:11px;color:#374151;font-style:italic;margin-top:4px;line-height:1.5;}'
    + '.lado .meta{font-size:10px;color:#94a3b8;margin-top:4px;}'
    + '.sem-foto{background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;color:#94a3b8;font-size:11px;}'
    + '.resumo{background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:20px;}'
    + '.resumo h2{font-size:14px;font-weight:800;color:#166534;margin-bottom:4px;}'
    + '.resumo p{font-size:12px;color:#15803d;}'
    + '.rodape{margin-top:32px;padding:12px;background:#f8fafc;border-top:2px solid #e2e8f0;font-size:9.5px;color:#9ca3af;text-align:center;}'
    + '.btn-print{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e2e8f0;padding:8px 20px;text-align:right;}'
    + '.btn-print button{background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:6px 18px;font-size:12px;font-weight:700;cursor:pointer;}'
    + '@media print{.btn-print{display:none!important;}.par{break-inside:avoid;}.lado img{max-height:200px;object-fit:contain;}-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'
    + '</style>';

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Laudo Antes x Depois — ' + _escA(edif) + '</title>' + css + '</head><body>';

  html += '<div class="btn-print"><button onclick="window.print()">⬇ Salvar / Imprimir PDF</button></div>';

  html += '<div class="topo">';
  html += '<h1>Laudo Fotográfico — Antes × Depois</h1>';
  html += '<p>' + _escA(edif) + ' · ' + _escA(com) + ' · Região ' + _escA(R.l) + (emp ? ' · ' + _escA(emp) : '') + '</p>';
  html += '</div>';

  html += '<div class="corpo">';

  /* Resumo */
  html += '<div class="resumo">';
  html += '<h2>✅ ' + pares.length + ' item(ns) corrigido(s)</h2>';
  html += '<p>Itens que foram NC em uma vistoria e passaram a Conforme na vistoria seguinte.</p>';
  html += '</div>';

  html += '<div class="sec">Pares de Evidências</div>';

  pares.forEach(function(p, idx) {
    html += '<div class="par">';
    html += '<div class="par-hdr"><h3>' + (idx + 1) + '. ' + _escA(p.nome) + '</h3>';
    if (p.sistema) html += '<p>Sistema: ' + _escA(p.sistema) + '</p>';
    html += '</div>';
    html += '<div class="par-body">';

    /* Lado ANTES */
    html += '<div class="lado lado-ant">';
    html += '<div class="lado-tag">❌ Antes (NC)</div>';
    if (p.antFotos.length) {
      p.antFotos.forEach(function(f) {
        html += '<img src="' + f.b64 + '" alt="Antes">';
        if (f.leg) html += '<div style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:6px;">' + _escA(f.leg) + '</div>';
      });
    } else {
      html += '<div class="sem-foto">📷 Sem foto registrada</div>';
    }
    if (p.antObs) html += '<div class="obs">"' + _escA(p.antObs) + '"</div>';
    html += '<div class="meta">' + fdt(p.antData) + ' · ' + _escA(p.antFiscal) + '</div>';
    html += '</div>';

    /* Lado DEPOIS */
    html += '<div class="lado lado-dep">';
    html += '<div class="lado-tag">✅ Depois (Corrigido)</div>';
    if (p.atuFotos.length) {
      p.atuFotos.forEach(function(f) {
        html += '<img src="' + f.b64 + '" alt="Depois">';
        if (f.leg) html += '<div style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:6px;">' + _escA(f.leg) + '</div>';
      });
    } else {
      html += '<div class="sem-foto">📷 Sem foto registrada</div>';
    }
    if (p.atuObs) html += '<div class="obs">"' + _escA(p.atuObs) + '"</div>';
    html += '<div class="meta">' + fdt(p.atuData) + ' · ' + _escA(p.atuFiscal) + '</div>';
    html += '</div>';

    html += '</div></div>';
  });

  html += '</div>';
  html += '<div class="rodape">TJMG · GEMAP · Laudo gerado em ' + new Date().toLocaleString('pt-BR') + ' · ' + _escA(R.ct) + '</div>';
  html += '</body></html>';

  /* Download */
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'TJMG_LAUDO_ANTES_DEPOIS_' + normProt(edif) + '_' + new Date().toISOString().slice(0, 10) + '.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  Tt('✅ Laudo Antes × Depois exportado! ' + pares.length + ' par(es).');
}
window.gerarLaudoAntesDepois = gerarLaudoAntesDepois;

/* ══════════════════════════════════════════════════════════════
   HISTÓRICO DA EDIFICAÇÃO — TIMELINE — v89
   Tela tipo "prontuário do prédio": tudo que já aconteceu
   naquela edificação, em ordem cronológica.
   ══════════════════════════════════════════════════════════════ */

function rTimeline(edif, reg) {
  var tb = el('timeline-body'); if (!tb) return;
  var insps = filterByReg(S.insp).filter(function(i) {
    return i.edif === edif;
  }).sort(function(a, b) {
    return (b.dtVistoria || b.data || '') > (a.dtVistoria || a.data || '') ? 1 : -1;
  });

  var R = (typeof REG !== 'undefined' && REG[reg]) ? REG[reg] : { l: reg || '', ct: '', empresa: '', c: '#003580', bg: '#dbeafe' };
  var emp = R.empresa && R.empresa !== 'A definir' ? R.empresa : '';
  var com = insps.length ? insps[0].com || '' : '';

  /* Score de saúde */
  var saude = typeof calcSaudeEdificacao === 'function' ? calcSaudeEdificacao(edif, reg) : { score: null };

  var h = '';

  /* ── Header da edificação ── */
  h += '<div style="background:' + R.c + ';color:#fff;padding:14px 16px;border-radius:0 0 16px 16px;margin-bottom:16px;">';
  h += '<div style="font-size:16px;font-weight:800;">' + _escA(edif) + '</div>';
  h += '<div style="font-size:11px;opacity:.7;margin-top:3px;">' + _escA(com) + ' · Região ' + _escA(R.l) + '</div>';
  if (emp) h += '<div style="font-size:10px;opacity:.5;margin-top:2px;">🏢 ' + _escA(emp) + ' · ' + _escA(R.ct) + '</div>';
  h += '<div style="display:flex;gap:12px;margin-top:10px;">';
  if (saude.score !== null) {
    h += '<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 12px;text-align:center;">';
    h += '<div style="font-size:22px;font-weight:900;">' + saude.score + '</div>';
    h += '<div style="font-size:9px;opacity:.7;">Saúde</div></div>';
  }
  h += '<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 12px;text-align:center;">';
  h += '<div style="font-size:22px;font-weight:900;">' + insps.length + '</div>';
  h += '<div style="font-size:9px;opacity:.7;">Vistorias</div></div>';
  var totalNcs = insps.reduce(function(s, i) {
    return s + Object.values(i.itens || {}).filter(function(v) { return v.s === 'nao_conforme'; }).length;
  }, 0);
  h += '<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 12px;text-align:center;">';
  h += '<div style="font-size:22px;font-weight:900;">' + totalNcs + '</div>';
  h += '<div style="font-size:9px;opacity:.7;">NCs total</div></div>';
  h += '</div>';

  /* Botões de ação */
  h += '<div style="display:flex;gap:8px;margin-top:10px;">';
  h += '<button onclick="gerarLaudoAntesDepois(\'' + _escA(edif) + '\',\'' + _escA(reg) + '\')" style="flex:1;background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:8px;font-size:11px;font-weight:700;cursor:pointer;">📸 Laudo Antes×Depois</button>';
  h += '<button onclick="abrirOspEdificacao(\'' + _escA(edif) + '\',\'' + _escA(reg) + '\')" style="flex:1;background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:8px;font-size:11px;font-weight:700;cursor:pointer;">📋 OSP de NCs</button>';
  h += '</div>';
  h += '</div>';

  /* ── Timeline ── */
  if (!insps.length) {
    h += '<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="font-size:40px;">🏛️</div><div style="margin-top:10px;font-size:13px;font-weight:600;">Nenhuma vistoria registrada</div></div>';
    tb.innerHTML = h;
    return;
  }

  h += '<div style="padding:0 12px;">';

  insps.forEach(function(i, idx) {
    var t = TIPOS[i.tipo] || TIPOS.periodica;
    var its = Object.values(i.itens || {});
    var aplic = its.filter(function(v) { return v.s && v.s !== 'fora_periodo' && v.s !== 'nao_aplicavel' && v.s !== 'pendente'; });
    var conf = aplic.filter(function(v) { return v.s === 'conforme'; }).length;
    var ncs = aplic.filter(function(v) { return v.s === 'nao_conforme'; }).length;
    var pct = aplic.length ? Math.round(conf / aplic.length * 100) : null;
    var fotos = its.reduce(function(s, v) { return s + (v.fotos || []).length; }, 0);
    var corPct = pct === null ? '#94a3b8' : pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';

    /* Linha do tempo */
    h += '<div style="display:flex;gap:12px;margin-bottom:4px;">';

    /* Coluna da linha vertical */
    h += '<div style="display:flex;flex-direction:column;align-items:center;width:20px;flex-shrink:0;">';
    h += '<div style="width:12px;height:12px;border-radius:50%;background:' + t.c + ';border:3px solid ' + t.bg + ';flex-shrink:0;z-index:1;"></div>';
    if (idx < insps.length - 1) h += '<div style="flex:1;width:2px;background:#e2e8f0;margin:2px 0;"></div>';
    h += '</div>';

    /* Card */
    h += '<div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;border-left:4px solid ' + t.c + ';">';

    /* Header do card */
    h += '<div style="padding:10px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="openDet(\'' + i.id + '\')">';
    h += '<div style="font-size:20px;">' + t.i + '</div>';
    h += '<div style="flex:1;min-width:0;">';
    h += '<div style="display:flex;align-items:center;gap:6px;">';
    h += '<span style="font-size:12px;font-weight:800;color:#0f172a;">' + t.l + '</span>';
    if (i.grupo) h += '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-weight:700;">Grp ' + i.grupo + '</span>';
    h += '</div>';
    h += '<div style="font-size:10px;color:#64748b;margin-top:1px;">' + fdt(i.dtVistoria || i.data) + ' · ' + _escA(i.fiscal || '') + '</div>';
    h += '</div>';
    /* Conformidade */
    if (pct !== null) {
      h += '<div style="text-align:center;flex-shrink:0;">';
      h += '<div style="font-size:18px;font-weight:900;color:' + corPct + ';">' + pct + '%</div>';
      h += '</div>';
    }
    h += '</div>';

    /* Stats rápidos */
    h += '<div style="padding:0 12px 8px;display:flex;gap:8px;flex-wrap:wrap;">';
    if (conf > 0) h += '<span style="font-size:10px;background:#dcfce7;color:#16a34a;padding:2px 7px;border-radius:12px;font-weight:700;">✅ ' + conf + '</span>';
    if (ncs > 0) h += '<span style="font-size:10px;background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:12px;font-weight:700;">❌ ' + ncs + ' NC</span>';
    if (fotos > 0) h += '<span style="font-size:10px;background:#ede9fe;color:#7c3aed;padding:2px 7px;border-radius:12px;font-weight:700;">📸 ' + fotos + '</span>';
    h += '<span style="font-size:10px;background:' + (i.st === 'finalizada' ? '#dcfce7' : '#fef3c7') + ';color:' + (i.st === 'finalizada' ? '#16a34a' : '#d97706') + ';padding:2px 7px;border-radius:12px;font-weight:700;">' + (i.st === 'finalizada' ? '✓ Finalizada' : '⏳ Em andamento') + '</span>';
    h += '</div>';

    /* NCs desta vistoria (resumo) */
    if (ncs > 0) {
      var ncItens = its.filter(function(v) { return v.s === 'nao_conforme'; }).slice(0, 3);
      h += '<div style="padding:0 12px 10px;">';
      ncItens.forEach(function(v) {
        h += '<div style="font-size:10px;color:#991b1b;padding:2px 0;border-top:1px solid #fef2f2;">⚠ ' + _escA(v.nm || v.n || '') + (v.obs ? ' — ' + _escA(v.obs).slice(0, 60) : '') + '</div>';
      });
      if (ncs > 3) h += '<div style="font-size:9px;color:#dc2626;padding:2px 0;">...e mais ' + (ncs - 3) + '</div>';
      h += '</div>';
    }

    h += '</div>'; /* card */
    h += '</div>'; /* flex row */
  });

  h += '</div>';
  tb.innerHTML = h;
}


/* ══════════════════════════════════════════════════════════════
   CONTRA-VISTORIA — v92
   Carrega SÓ os itens NC da última vistoria para o fiscal
   confirmar: Corrigido ✅ ou Persiste ❌.
   NCs que persistem podem virar OSP diretamente.
   ══════════════════════════════════════════════════════════════ */
function iniciarContraVistoria(edif, reg) {
  var insps = filterByReg(S.insp).filter(function(i) {
    return i.edif === edif && i.reg === reg && i.st === 'finalizada';
  }).sort(function(a, b) {
    return (b.dtVistoria || b.data || '') > (a.dtVistoria || a.data || '') ? 1 : -1;
  });

  if (!insps.length) { Tt('Nenhuma vistoria finalizada para esta edificação.'); return; }

  var ultima = insps[0];
  var ncs = [];
  Object.entries(ultima.itens || {}).forEach(function(pair) {
    var k = pair[0], v = pair[1];
    if (v.s === 'nao_conforme') {
      ncs.push({
        key: k, nm: v.nm || v.n || k, sn: v.sn || '', obs: v.obs || '',
        fotos: v.fotos || [], inspId: ultima.id
      });
    }
  });

  if (!ncs.length) { Tt('✅ Sem NCs na última vistoria! Nada a revisar.'); return; }

  /* Criar inspeção tipo "contra-vistoria" */
  var novaId = uid();
  var nova = {
    id: novaId,
    tipo: ultima.tipo || 'periodica',
    _contraVistoria: true,
    _origemInspId: ultima.id,
    edif: edif,
    com: ultima.com || '',
    reg: reg,
    fiscal: S.sessao ? S.sessao.nome : '',
    dtVistoria: new Date().toISOString().slice(0, 10),
    data: new Date().toISOString().slice(0, 10),
    st: 'em_andamento',
    itens: {},
    obs: 'Contra-vistoria de ' + ncs.length + ' NC(s) da inspeção de ' + fdt(ultima.dtVistoria || ultima.data)
  };

  /* Copiar APENAS os itens NC — status volta a pendente para reavaliação */
  ncs.forEach(function(nc) {
    nova.itens[nc.key] = {
      s: 'pendente',
      nm: nc.nm,
      n: nc.nm,
      sn: nc.sn,
      obs: 'NC anterior: ' + (nc.obs || 'sem observação'),
      fotos: [],
      mats: [],
      _ncAnterior: true,
      _obsNcOriginal: nc.obs
    };
  });

  S.insp.push(nova);
  DB.sv();
  Tt('🔁 Contra-vistoria criada com ' + ncs.length + ' NC(s)!');

  setTimeout(function() {
    if (typeof retomarF === 'function') retomarF(novaId);
  }, 400);
}
window.iniciarContraVistoria = iniciarContraVistoria;

/* ══════════════════════════════════════════════════════════════
   PRAZO DE REGULARIZAÇÃO NC — v92
   Ao emitir NOT-INA, define prazo (30/60/90 dias).
   Coordenador vê contagem regressiva na aba NCs.
   NCs vencidas ficam vermelhas pulsando.
   ══════════════════════════════════════════════════════════════ */
function definirPrazoNC(inspId, itemKey, dias) {
  var i = S.insp.find(function(x) { return x.id === inspId; });
  if (!i || !i.itens[itemKey]) return;

  var dataEmissao = new Date().toISOString().slice(0, 10);
  var dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + (dias || 30));
  var dataLimiteStr = dataLimite.toISOString().slice(0, 10);

  i.itens[itemKey]._prazoEmissao = dataEmissao;
  i.itens[itemKey]._prazoLimite = dataLimiteStr;
  i.itens[itemKey]._prazoDias = dias || 30;
  DB.sv();
  Tt('⏰ Prazo de ' + dias + ' dias definido — vence em ' + fdt(dataLimiteStr));
}
window.definirPrazoNC = definirPrazoNC;

function calcPrazoNC(item) {
  if (!item._prazoLimite) return null;
  var hoje = new Date();
  var limite = new Date(item._prazoLimite + 'T23:59:59');
  var diasRestantes = Math.round((limite - hoje) / 86400000);
  return {
    diasRestantes: diasRestantes,
    vencida: diasRestantes < 0,
    proxima: diasRestantes >= 0 && diasRestantes <= 7,
    limite: item._prazoLimite,
    emissao: item._prazoEmissao
  };
}
window.calcPrazoNC = calcPrazoNC;

/* ── Modal para definir prazo ao gerar NOT-INA ── */
function abrirModalPrazoNC(inspId, itemKey) {
  var ov = document.createElement('div');
  ov.id = '_prazo_nc_ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;';

  var h = '<div style="background:#fff;border-radius:16px;padding:20px;max-width:340px;width:90%;">';
  h += '<div style="font-size:15px;font-weight:800;color:#dc2626;margin-bottom:12px;">⏰ Prazo para Regularização</div>';
  h += '<div style="font-size:12px;color:#64748b;margin-bottom:14px;">Defina o prazo que a contratada tem para corrigir esta NC:</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">';

  [30, 60, 90, 15].forEach(function(d) {
    h += '<button onclick="definirPrazoNC(\'' + inspId + '\',\'' + itemKey + '\',' + d + ');document.body.removeChild(document.getElementById(\'_prazo_nc_ov\'))" ';
    h += 'style="background:#fee2e2;color:#dc2626;border:2px solid #fca5a5;border-radius:10px;padding:12px;font-size:14px;font-weight:800;cursor:pointer;">';
    h += d + ' dias</button>';
  });

  h += '</div>';
  h += '<button onclick="document.body.removeChild(document.getElementById(\'_prazo_nc_ov\'))" style="width:100%;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;padding:10px;font-size:12px;cursor:pointer;">Cancelar</button>';
  h += '</div>';

  ov.innerHTML = h;
  document.body.appendChild(ov);
}
window.abrirModalPrazoNC = abrirModalPrazoNC;

/* ══════════════════════════════════════════════════════════════
   CHECKLIST SUBESTAÇÃO ANEXO B.1 — v92
   Dados mestres dos 9 serviços obrigatórios com itens detalhados
   + campos de medição elétrica por equipamento
   ══════════════════════════════════════════════════════════════ */
var SUB_CHECKLIST = [
  {id:'sub_a', sec:'A', nm:'Segurança — NR-10', itens:[
    {id:'a1', nm:'Procedimentos de segurança conforme NR-10', obrigatorio:true}
  ]},
  {id:'sub_b', sec:'B', nm:'Transformadores', itens:[
    {id:'b1', nm:'Desconectar entrada e saída de energia'},
    {id:'b2', nm:'Limpeza de isoladores, suportes, abas, parafusos, aletas'},
    {id:'b3', nm:'Coleta óleo isolante para análise físico-química'},
    {id:'b4', nm:'Inspeção exterior do transformador e adjacências'},
    {id:'b5', nm:'Verificar vazamentos'},
    {id:'b6', nm:'Verificar trincas e fissuras nas buchas'},
    {id:'b7', nm:'Inspecionar instrumentos e acessórios'},
    {id:'b8', nm:'Reaperto de todas as conexões elétricas'},
    {id:'b9', nm:'Ensaio resistência de isolamento em CC', medicao:true, unidade:'MΩ', campo:'res_iso'},
    {id:'b10',nm:'Ensaio resistência ôhmica dos enrolamentos', medicao:true, unidade:'mΩ', campo:'res_ohm'},
    {id:'b11',nm:'Ensaio relação de transformação', medicao:true, unidade:'', campo:'rel_transf'},
    {id:'b12',nm:'Verificar conexões de aterramento'},
    {id:'b13',nm:'Reconectar entradas e saídas de energia'},
    {id:'b14',nm:'Pratear contatos com desgaste da camada'},
  ], fotoObrigatoria:['Plaqueta','Termografia','Geral']},
  {id:'sub_c', sec:'C', nm:'Disjuntores PVO', itens:[
    {id:'c1', nm:'Ensaio grandezas elétricas características'},
    {id:'c2', nm:'Substituir óleo mineral (ABNT IEC 60296)'},
    {id:'c3', nm:'Inspecionar mecanismo de comando, limpar, lubrificar'},
    {id:'c4', nm:'Inspeção exterior e limpeza geral'},
    {id:'c5', nm:'Reaperto com torque adequado'},
    {id:'c6', nm:'Ensaio resistência de contato', medicao:true, unidade:'mΩ', campo:'res_cont'},
    {id:'c7', nm:'Ensaio resistência de isolamento em CC', medicao:true, unidade:'MΩ', campo:'res_iso'},
    {id:'c8', nm:'Testar operação e ajustar relés primários'},
  ], fotoObrigatoria:['Plaqueta','Termografia']},
  {id:'sub_d', sec:'D', nm:'Disjuntores a Vácuo', itens:[
    {id:'d1', nm:'Ajustar grandezas elétricas'},
    {id:'d2', nm:'Inspecionar mecanismo de comando, limpar, lubrificar'},
    {id:'d3', nm:'Inspeção exterior e limpeza geral'},
    {id:'d4', nm:'Reaperto com torque adequado'},
    {id:'d5', nm:'Ensaio resistência de contato', medicao:true, unidade:'mΩ', campo:'res_cont'},
    {id:'d6', nm:'Ensaio resistência de isolamento em CC', medicao:true, unidade:'MΩ', campo:'res_iso'},
    {id:'d7', nm:'Testar operação do disjuntor'},
    {id:'d8', nm:'Ajustar relés primários'},
  ], fotoObrigatoria:['Termografia']},
  {id:'sub_e', sec:'E', nm:'Chaves Seccionadoras', itens:[
    {id:'e1', nm:'Inspecionar e efetuar limpeza'},
    {id:'e2', nm:'Desoxidar e polir contatos'},
    {id:'e3', nm:'Lubrificar partes articuladas'},
    {id:'e4', nm:'Ensaio resistência de contato', medicao:true, unidade:'mΩ', campo:'res_cont'},
    {id:'e5', nm:'Reaperto de conexões elétricas'},
    {id:'e6', nm:'Testar'},
    {id:'e7', nm:'Ajustar pressão das molas'},
  ]},
  {id:'sub_f', sec:'F', nm:'Óleo Isolante de Transformadores', itens:[
    {id:'f1', nm:'Coletar óleo antes da manutenção'},
    {id:'f2', nm:'Análise em laboratório credenciado'},
    {id:'f3', nm:'Complementar óleo até nível necessário'},
    {id:'f4', nm:'Rigidez dielétrica', medicao:true, unidade:'kV', campo:'rigidez'},
    {id:'f5', nm:'Teor de água', medicao:true, unidade:'ppm', campo:'teor_agua'},
    {id:'f6', nm:'Fator de potência', medicao:true, unidade:'%', campo:'fator_pot'},
    {id:'f7', nm:'Tensão interfacial', medicao:true, unidade:'mN/m', campo:'tensao_int'},
  ], fotoObrigatoria:['Laudo laboratório']},
  {id:'sub_g', sec:'G', nm:'Muflas', itens:[
    {id:'g1', nm:'Inspeção visual de todas as muflas'},
    {id:'g2', nm:'Medição com termômetro digital', medicao:true, unidade:'°C', campo:'temp'},
    {id:'g3', nm:'Obtenção de imagens térmicas'},
    {id:'g4', nm:'Limpeza'},
    {id:'g5', nm:'Testes de isolamento quando necessário', medicao:true, unidade:'MΩ', campo:'res_iso'},
  ], fotoObrigatoria:['Termografia']},
  {id:'sub_h', sec:'H', nm:'Relés Secundários Microprocessados', itens:[
    {id:'h1', nm:'Verificar condições operacionais'},
    {id:'h2', nm:'Verificar nobreak do relé — testar baterias'},
    {id:'h3', nm:'Reconfigurar relés com perda de configuração'},
  ]},
  {id:'sub_i', sec:'I', nm:'Barramentos Blindados', itens:[
    {id:'i1', nm:'Inspeção visual — cofres, pluglins, conexões'},
    {id:'i2', nm:'Reaperto com torquímetro em emendas e derivações'},
    {id:'i3', nm:'Limpeza com soprador'},
    {id:'i4', nm:'Medição com termômetro digital', medicao:true, unidade:'°C', campo:'temp'},
    {id:'i5', nm:'Obtenção de imagens térmicas'},
  ], fotoObrigatoria:['Termografia','Geral']},
];

/* Campos de medição elétrica (usados nos formulários de subestação) */
var SUB_MEDICOES = [
  {id:'tensao_rn', nm:'Tensão R-N', unidade:'V', tipo:'number'},
  {id:'tensao_sn', nm:'Tensão S-N', unidade:'V', tipo:'number'},
  {id:'tensao_tn', nm:'Tensão T-N', unidade:'V', tipo:'number'},
  {id:'corrente_r', nm:'Corrente R', unidade:'A', tipo:'number'},
  {id:'corrente_s', nm:'Corrente S', unidade:'A', tipo:'number'},
  {id:'corrente_t', nm:'Corrente T', unidade:'A', tipo:'number'},
  {id:'temp_amb',   nm:'Temp. Ambiente', unidade:'°C', tipo:'number'},
  {id:'temp_quente',nm:'Temp. Ponto Quente', unidade:'°C', tipo:'number'},
];


/* ══════════════════════════════════════════════════════════════
   COMPARATIVO DE MEDIÇÕES ANO A ANO — v93
   Cruza medições de subestação de todas as vistorias de uma
   edificação e exibe lado a lado com tendência (▲▼).
   Alerta quando degradação é detectada.
   ══════════════════════════════════════════════════════════════ */

function gerarComparativoMedicoes(edif, reg) {
  var insps = filterByReg(S.insp).filter(function(i) {
    return i.edif === edif && i.tipo === 'subestacao' && i.st === 'finalizada' && i.sub;
  }).sort(function(a, b) {
    return (a.dtVistoria || a.data || '') > (b.dtVistoria || b.data || '') ? 1 : -1;
  });

  if (insps.length < 1) { Tt('Nenhuma inspeção de subestação finalizada.'); return; }

  var R = (typeof REG !== 'undefined' && REG[reg]) ? REG[reg] : { l: reg, ct: '', empresa: '' };

  /* ── Extrair medições de cada inspeção ── */
  var colunas = insps.map(function(i) {
    var dt = fdt(i.dtVistoria || i.data);
    var ano = (i.dtVistoria || i.data || '').slice(0, 4);
    var sub = i.sub || {};
    return { dt: dt, ano: ano, id: i.id, sub: sub, fiscal: i.fiscal || '' };
  });

  /* ── Construir HTML ── */
  var css = '<style>'
    + '@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800&display=swap");'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"IBM Plex Sans",sans-serif;font-size:11px;color:#1f2937;background:#fff;}'
    + '.topo{background:#1e3a5f;color:#fff;padding:16px 24px;}'
    + '.topo h1{font-size:16px;font-weight:800;}'
    + '.topo p{font-size:10px;opacity:.6;margin-top:3px;}'
    + '.corpo{padding:16px;max-width:960px;margin:0 auto;}'
    + '.sec{font-size:12px;font-weight:800;color:#0f172a;background:#f1f5f9;padding:8px 12px;margin:16px 0 8px;border-radius:8px;border-left:4px solid #0369a1;}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px;}'
    + 'th{background:#1e3a5f;color:#fff;padding:6px 8px;text-align:left;font-size:10px;white-space:nowrap;}'
    + 'td{padding:5px 8px;border-bottom:1px solid #f1f5f9;}'
    + 'tr:nth-child(even) td{background:#fafafa;}'
    + '.up{color:#dc2626;font-weight:800;} .dn{color:#16a34a;font-weight:800;} .eq{color:#94a3b8;}'
    + '.val-ok{color:#16a34a;font-weight:700;} .val-warn{color:#d97706;font-weight:700;} .val-crit{color:#dc2626;font-weight:800;}'
    + '.alerta{background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px;margin:8px 0;font-size:11px;color:#991b1b;}'
    + '.resumo{background:#dbeafe;border:1px solid #93c5fd;border-radius:10px;padding:14px;margin-bottom:16px;}'
    + '.resumo h2{font-size:14px;font-weight:800;color:#1e40af;margin-bottom:4px;}'
    + '.rodape{margin-top:24px;padding:10px;background:#f8fafc;border-top:2px solid #e2e8f0;font-size:9px;color:#9ca3af;text-align:center;}'
    + '.btn-print{position:sticky;top:0;z-index:100;background:#fff;padding:6px 16px;text-align:right;border-bottom:1px solid #e2e8f0;}'
    + '.btn-print button{background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:11px;font-weight:700;cursor:pointer;}'
    + '@media print{.btn-print{display:none!important;} th{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}'
    + '</style>';

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Comparativo Medições — ' + _escA(edif) + '</title>' + css + '</head><body>';
  html += '<div class="btn-print"><button onclick="window.print()">⬇ Salvar / Imprimir PDF</button></div>';
  html += '<div class="topo"><h1>⚡ Comparativo de Medições — Subestação</h1>';
  html += '<p>' + _escA(edif) + ' · ' + _escA(R.l) + ' · ' + _escA(R.empresa || '') + ' · ' + _escA(R.ct) + '</p></div>';
  html += '<div class="corpo">';

  /* Resumo */
  html += '<div class="resumo"><h2>' + colunas.length + ' medição(ões) registrada(s)</h2>';
  html += '<p style="font-size:11px;color:#3b82f6;">' + colunas.map(function(c) { return c.dt + ' (' + c.fiscal + ')'; }).join(' → ') + '</p></div>';

  var alertas = [];

  /* ── Função auxiliar: renderizar tabela comparativa ── */
  function renderTabela(titulo, campos, getDados) {
    html += '<div class="sec">' + titulo + '</div>';
    html += '<table><thead><tr><th>Medição</th><th>Ref.</th><th>Un.</th>';
    colunas.forEach(function(c) { html += '<th>' + c.dt + '</th>'; });
    if (colunas.length >= 2) html += '<th>Tendência</th>';
    html += '</tr></thead><tbody>';

    campos.forEach(function(campo) {
      html += '<tr><td style="font-weight:700;">' + campo.nm + '</td>';
      html += '<td>' + (campo.ref || '—') + '</td>';
      html += '<td>' + (campo.un || '') + '</td>';

      var valores = [];
      colunas.forEach(function(col) {
        var dados = getDados(col);
        var val = dados ? dados[campo.key] : null;
        var n = val ? parseFloat(val) : NaN;
        valores.push(n);

        var corClass = '';
        if (!isNaN(n)) {
          if (campo.tipo === 'min') corClass = n >= campo.limite ? 'val-ok' : 'val-crit';
          else if (campo.tipo === 'max') corClass = n <= campo.limite ? 'val-ok' : n <= campo.limCrit ? 'val-warn' : 'val-crit';
        }
        html += '<td class="' + corClass + '">' + (isNaN(n) ? '—' : n.toFixed(campo.dec || 0)) + '</td>';
      });

      /* Tendência */
      if (colunas.length >= 2) {
        var first = valores.find(function(v) { return !isNaN(v); });
        var last = valores.slice().reverse().find(function(v) { return !isNaN(v); });
        if (first !== undefined && last !== undefined && !isNaN(first) && !isNaN(last) && first !== 0) {
          var pct = Math.round((last - first) / Math.abs(first) * 100);
          var isGood;
          if (campo.tipo === 'min') isGood = pct >= 0;
          else isGood = pct <= 0;

          var corT = pct === 0 ? 'eq' : isGood ? 'dn' : 'up';
          var seta = pct > 0 ? '▲' : pct < 0 ? '▼' : '=';
          html += '<td class="' + corT + '">' + seta + ' ' + (pct > 0 ? '+' : '') + pct + '%</td>';

          if (!isGood && Math.abs(pct) > 20) {
            alertas.push(titulo + ' — ' + campo.nm + ': ' + seta + ' ' + pct + '% (' + first.toFixed(campo.dec || 0) + ' → ' + last.toFixed(campo.dec || 0) + ' ' + (campo.un || '') + ')');
          }
        } else {
          html += '<td class="eq">—</td>';
        }
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
  }

  /* ── TRANSFORMADORES ── */
  var maxTrafos = Math.max.apply(null, colunas.map(function(c) { return (c.sub.trafos || []).length; }));
  for (var ti = 0; ti < maxTrafos; ti++) {
    renderTabela('TRANSFORMADOR #' + (ti + 1) + ' — Relação de Transformação (TTR)', [
      { nm: 'TTR X1', key: 'ttr_x1', ref: '±0.5%', un: '', tipo: 'info', dec: 4 },
      { nm: 'TTR X2', key: 'ttr_x2', ref: '±0.5%', un: '', tipo: 'info', dec: 4 },
      { nm: 'TTR X3', key: 'ttr_x3', ref: '±0.5%', un: '', tipo: 'info', dec: 4 },
    ], function(col) { return (col.sub.trafos || [])[ti] || null; });

    renderTabela('TRANSFORMADOR #' + (ti + 1) + ' — Resistência de Isolamento', [
      { nm: 'X1-T (BT→Terra)', key: 'iso_x1t', ref: '≥10', un: 'MΩ', tipo: 'min', limite: 10, dec: 0 },
      { nm: 'X2-T (BT→Terra)', key: 'iso_x2t', ref: '≥10', un: 'MΩ', tipo: 'min', limite: 10, dec: 0 },
      { nm: 'X3-T (BT→Terra)', key: 'iso_x3t', ref: '≥10', un: 'MΩ', tipo: 'min', limite: 10, dec: 0 },
      { nm: 'H1-T (AT→Terra)', key: 'iso_h1t', ref: '≥100', un: 'MΩ', tipo: 'min', limite: 100, dec: 0 },
      { nm: 'H2-T (AT→Terra)', key: 'iso_h2t', ref: '≥100', un: 'MΩ', tipo: 'min', limite: 100, dec: 0 },
      { nm: 'H3-T (AT→Terra)', key: 'iso_h3t', ref: '≥100', un: 'MΩ', tipo: 'min', limite: 100, dec: 0 },
      { nm: 'H1-X1 (AT→BT)', key: 'iso_h1x1', ref: '≥10', un: 'MΩ', tipo: 'min', limite: 10, dec: 0 },
      { nm: 'H2-X2 (AT→BT)', key: 'iso_h2x2', ref: '≥10', un: 'MΩ', tipo: 'min', limite: 10, dec: 0 },
      { nm: 'H3-X3 (AT→BT)', key: 'iso_h3x3', ref: '≥10', un: 'MΩ', tipo: 'min', limite: 10, dec: 0 },
    ], function(col) { return (col.sub.trafos || [])[ti] || null; });

    renderTabela('TRANSFORMADOR #' + (ti + 1) + ' — Resistência Ôhmica', [
      { nm: 'X1-X0 (BT)', key: 'ohm_x1x0', ref: '≤3% var', un: 'mΩ', tipo: 'info', dec: 2 },
      { nm: 'X2-X0 (BT)', key: 'ohm_x2x0', ref: '≤3% var', un: 'mΩ', tipo: 'info', dec: 2 },
      { nm: 'X3-X0 (BT)', key: 'ohm_x3x0', ref: '≤3% var', un: 'mΩ', tipo: 'info', dec: 2 },
      { nm: 'H1-H2 (AT)', key: 'ohm_h1h2', ref: '≤3% var', un: 'mΩ', tipo: 'info', dec: 2 },
      { nm: 'H1-H3 (AT)', key: 'ohm_h1h3', ref: '≤3% var', un: 'mΩ', tipo: 'info', dec: 2 },
      { nm: 'H2-H3 (AT)', key: 'ohm_h2h3', ref: '≤3% var', un: 'mΩ', tipo: 'info', dec: 2 },
    ], function(col) { return (col.sub.trafos || [])[ti] || null; });
  }

  /* ── DISJUNTORES ── */
  var maxDisjs = Math.max.apply(null, colunas.map(function(c) { return (c.sub.disjs || []).length; }));
  for (var di = 0; di < maxDisjs; di++) {
    renderTabela('DISJUNTOR MT #' + (di + 1) + ' — Isolamento + Contato', [
      { nm: 'Aberto R', key: 'ab_r', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Aberto S', key: 'ab_s', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Aberto T', key: 'ab_t', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Fechado R', key: 'fe_r', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Fechado S', key: 'fe_s', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Fechado T', key: 'fe_t', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Contato R1-R2', key: 'cr', ref: '≤200', un: 'µΩ', tipo: 'max', limite: 200, limCrit: 300, dec: 0 },
      { nm: 'Contato S1-S2', key: 'cs', ref: '≤200', un: 'µΩ', tipo: 'max', limite: 200, limCrit: 300, dec: 0 },
      { nm: 'Contato T1-T2', key: 'ct', ref: '≤200', un: 'µΩ', tipo: 'max', limite: 200, limCrit: 300, dec: 0 },
    ], function(col) { return (col.sub.disjs || [])[di] || null; });
  }

  /* ── SECCIONADORAS ── */
  var maxSecc = Math.max.apply(null, colunas.map(function(c) { return (c.sub.secc || []).length; }));
  for (var si = 0; si < maxSecc; si++) {
    renderTabela('SECCIONADORA #' + (si + 1) + ' — Isolamento + Contato', [
      { nm: 'Aberta R', key: 'ab_r', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Aberta S', key: 'ab_s', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Aberta T', key: 'ab_t', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Fechada R', key: 'fe_r', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Fechada S', key: 'fe_s', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Fechada T', key: 'fe_t', ref: '≥1000', un: 'MΩ', tipo: 'min', limite: 1000, dec: 0 },
      { nm: 'Contato R', key: 'cr', ref: '≤200', un: 'µΩ', tipo: 'max', limite: 200, limCrit: 500, dec: 0 },
      { nm: 'Contato S', key: 'cs', ref: '≤200', un: 'µΩ', tipo: 'max', limite: 200, limCrit: 500, dec: 0 },
      { nm: 'Contato T', key: 'ct_secc', ref: '≤200', un: 'µΩ', tipo: 'max', limite: 200, limCrit: 500, dec: 0 },
    ], function(col) { return (col.sub.secc || [])[si] || null; });
  }

  /* ── ALERTAS DE DEGRADAÇÃO ── */
  if (alertas.length) {
    html += '<div class="sec" style="border-color:#dc2626;color:#dc2626;">⚠ ALERTAS DE DEGRADAÇÃO (' + alertas.length + ')</div>';
    html += '<div class="alerta">';
    alertas.forEach(function(a) { html += '<div style="padding:3px 0;border-bottom:1px solid #fecaca;">⚠ ' + _escA(a) + '</div>'; });
    html += '</div>';
  } else if (colunas.length >= 2) {
    html += '<div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px;margin-top:12px;font-size:12px;color:#166534;font-weight:700;">✅ Nenhuma degradação significativa detectada (variações ≤20%)</div>';
  }

  html += '</div>';
  html += '<div class="rodape">TJMG · GEMAP · Comparativo gerado em ' + new Date().toLocaleString('pt-BR') + ' · ' + _escA(R.ct) + '</div>';
  html += '</body></html>';

  /* Download */
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'TJMG_MEDICOES_' + normProt(edif) + '_' + new Date().toISOString().slice(0, 10) + '.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  Tt('⚡ Comparativo de medições exportado! ' + colunas.length + ' medição(ões), ' + alertas.length + ' alerta(s).');
}

/* ══════════════════════════════════════════════════════════════
   1. CALCULADORA ELÉTRICA — v93
   ══════════════════════════════════════════════════════════════ */
function abrirCalculadoraEletrica(){
  var ov=document.createElement('div');ov.id='_calc_ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:10000;display:flex;flex-direction:column;overflow-y:auto;';
  var h='<div style="background:#fff;flex:1;border-radius:16px 16px 0 0;margin-top:32px;padding:16px;overflow-y:auto;">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  h+='<div style="font-size:16px;font-weight:800;color:#0369a1;">⚡ Calculadora Elétrica</div>';
  h+='<button onclick="document.body.removeChild(document.getElementById(\'_calc_ov\'))" style="border:none;background:#f1f5f9;border-radius:8px;padding:5px 12px;font-size:14px;cursor:pointer;">✕</button></div>';

  /* Desequilíbrio de Corrente */
  h+='<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;margin-bottom:10px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#0369a1;margin-bottom:8px;">📊 Desequilíbrio de Corrente</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">';
  h+='<div><div style="font-size:9px;color:#64748b;">Fase R (A)</div><input id="_ce_ir" type="number" step="0.1" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcDeseq()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">Fase S (A)</div><input id="_ce_is" type="number" step="0.1" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcDeseq()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">Fase T (A)</div><input id="_ce_it" type="number" step="0.1" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcDeseq()"></div>';
  h+='</div><div id="_ce_deseq_res" style="margin-top:8px;font-size:13px;font-weight:700;color:#94a3b8;">—</div></div>';

  /* Potência Trifásica */
  h+='<div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:10px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#a16207;margin-bottom:8px;">⚡ Potência Trifásica</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">';
  h+='<div><div style="font-size:9px;color:#64748b;">Tensão (V)</div><input id="_ce_v" type="number" value="380" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcPot()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">Corrente (A)</div><input id="_ce_i" type="number" step="0.1" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcPot()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">FP</div><input id="_ce_fp" type="number" value="0.92" step="0.01" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcPot()"></div>';
  h+='</div><div id="_ce_pot_res" style="margin-top:8px;font-size:13px;font-weight:700;color:#94a3b8;">—</div></div>';

  /* Queda de Tensão */
  h+='<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px;margin-bottom:10px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#16a34a;margin-bottom:8px;">📉 Queda de Tensão</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;">';
  h+='<div><div style="font-size:9px;color:#64748b;">Comp. (m)</div><input id="_ce_l" type="number" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcQueda()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">Seção (mm²)</div><input id="_ce_s" type="number" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcQueda()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">Corrente (A)</div><input id="_ce_qi" type="number" step="0.1" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcQueda()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">Tensão (V)</div><input id="_ce_qv" type="number" value="220" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcQueda()"></div>';
  h+='</div><div id="_ce_queda_res" style="margin-top:8px;font-size:13px;font-weight:700;color:#94a3b8;">—</div></div>';

  /* Fator de Potência */
  h+='<div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:10px;padding:12px;margin-bottom:10px;">';
  h+='<div style="font-size:12px;font-weight:800;color:#7c3aed;margin-bottom:8px;">🔄 Fator de Potência</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
  h+='<div><div style="font-size:9px;color:#64748b;">Pot. Ativa kW</div><input id="_ce_kw" type="number" step="0.1" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcFP()"></div>';
  h+='<div><div style="font-size:9px;color:#64748b;">Pot. Aparente kVA</div><input id="_ce_kva" type="number" step="0.1" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px;font-size:13px;" oninput="_calcFP()"></div>';
  h+='</div><div id="_ce_fp_res" style="margin-top:8px;font-size:13px;font-weight:700;color:#94a3b8;">—</div></div>';

  h+='</div>';ov.innerHTML=h;document.body.appendChild(ov);
}
function _calcDeseq(){
  var r=parseFloat(el('_ce_ir').value)||0,s=parseFloat(el('_ce_is').value)||0,t=parseFloat(el('_ce_it').value)||0;
  if(!r&&!s&&!t){el('_ce_deseq_res').innerHTML='—';return;}
  var med=(r+s+t)/3;var maxDev=Math.max(Math.abs(r-med),Math.abs(s-med),Math.abs(t-med));
  var pct=med?((maxDev/med)*100).toFixed(1):0;
  var cor=pct<=2?'#16a34a':pct<=5?'#d97706':'#dc2626';
  var status=pct<=2?'✅ Normal':pct<=5?'⚠️ Atenção':'❌ Crítico (>5%)';
  el('_ce_deseq_res').innerHTML='<span style="color:'+cor+';">Desequilíbrio: '+pct+'% — '+status+'</span><br><span style="font-size:10px;color:#64748b;">Média: '+med.toFixed(1)+' A</span>';
}
function _calcPot(){
  var v=parseFloat(el('_ce_v').value)||0,i=parseFloat(el('_ce_i').value)||0,fp=parseFloat(el('_ce_fp').value)||0.92;
  if(!v||!i){el('_ce_pot_res').innerHTML='—';return;}
  var kw=(v*i*Math.sqrt(3)*fp/1000).toFixed(2);var kva=(v*i*Math.sqrt(3)/1000).toFixed(2);
  el('_ce_pot_res').innerHTML='<b>'+kw+' kW</b> ('+kva+' kVA) · FP: '+fp;
}
function _calcQueda(){
  var l=parseFloat(el('_ce_l').value)||0,s=parseFloat(el('_ce_s').value)||0,i=parseFloat(el('_ce_qi').value)||0,v=parseFloat(el('_ce_qv').value)||220;
  if(!l||!s||!i){el('_ce_queda_res').innerHTML='—';return;}
  var rho=0.0172;var dv=(2*rho*l*i/s);var pct=(dv/v*100).toFixed(2);
  var cor=pct<=3?'#16a34a':pct<=5?'#d97706':'#dc2626';
  var st=pct<=3?'✅ OK (≤3%)':pct<=5?'⚠️ Atenção':'❌ Acima (>5%)';
  el('_ce_queda_res').innerHTML='<span style="color:'+cor+';">ΔV: '+dv.toFixed(2)+' V ('+pct+'%) — '+st+'</span>';
}
function _calcFP(){
  var kw=parseFloat(el('_ce_kw').value)||0,kva=parseFloat(el('_ce_kva').value)||0;
  if(!kw||!kva){el('_ce_fp_res').innerHTML='—';return;}
  var fp=(kw/kva).toFixed(3);var cor=fp>=0.92?'#16a34a':fp>=0.85?'#d97706':'#dc2626';
  el('_ce_fp_res').innerHTML='<span style="color:'+cor+';">FP = '+fp+(fp>=0.92?' ✅ OK':fp>=0.85?' ⚠️ Baixo':' ❌ Penalidade concessionária')+'</span>';
}

/* ══════════════════════════════════════════════════════════════
   6. RELATÓRIO FOTOGRÁFICO RÁPIDO — v93
   Sem checklist, sem formulário complexo. O fiscal tira fotos
   com legenda e gera um relatório limpo.
   Uso: acompanhamento de obra, vistoria informal, registro
   de ocorrência, documentação geral.
   ══════════════════════════════════════════════════════════════ */

function abrirRelFotografico() {
  /* Estado do relatório fotográfico */
  if (!window._relFoto) {
    window._relFoto = {
      edif: '', com: '', assunto: '', obs: '',
      fotos: [], /* [{b64:'',leg:'',dt:''}, ...] */
      fiscal: S.sessao ? S.sessao.nome : '',
      data: new Date().toISOString().slice(0, 10)
    };
  }
  _renderRelFoto();
}

function _renderRelFoto() {
  var rf = window._relFoto;
  var ov = document.getElementById('_relfoto_ov');
  if (!ov) {
    ov = document.createElement('div'); ov.id = '_relfoto_ov';
    ov.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(ov);
  }

  var nf = rf.fotos.length;
  var h = '';

  /* Header */
  h += '<div style="background:#b45309;padding:14px 16px;color:#fff;flex-shrink:0;">';
  h += '<div style="display:flex;align-items:center;gap:10px;">';
  h += '<button onclick="_fecharRelFoto()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">←</button>';
  h += '<div style="flex:1;"><div style="font-size:15px;font-weight:800;">📸 Relatório Fotográfico</div>';
  h += '<div style="font-size:10px;opacity:.7;">' + nf + ' foto(s) · ' + fdt(rf.data) + '</div></div>';
  if (nf > 0) h += '<button onclick="_exportRelFoto()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;">📄 Exportar</button>';
  h += '</div></div>';

  /* Corpo scrollável */
  h += '<div style="flex:1;overflow-y:auto;padding:12px;">';

  /* Dados básicos */
  h += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:12px;">';
  h += '<div style="font-size:11px;font-weight:800;color:#92400e;margin-bottom:8px;">Identificação</div>';
  h += '<input value="' + _escA(rf.edif) + '" oninput="window._relFoto.edif=this.value" placeholder="Edificação *" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:13px;margin-bottom:6px;box-sizing:border-box;">';
  h += '<input value="' + _escA(rf.com) + '" oninput="window._relFoto.com=this.value" placeholder="Comarca" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:13px;margin-bottom:6px;box-sizing:border-box;">';
  h += '<input value="' + _escA(rf.assunto) + '" oninput="window._relFoto.assunto=this.value" placeholder="Assunto (ex: Acompanhamento obra, Vistoria informal...)" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:13px;margin-bottom:6px;box-sizing:border-box;">';
  h += '<textarea oninput="window._relFoto.obs=this.value" placeholder="Observações gerais..." style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:13px;min-height:50px;resize:none;box-sizing:border-box;">' + _escA(rf.obs) + '</textarea>';
  h += '</div>';

  /* Botões de adicionar foto */
  h += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
  h += '<label style="flex:1;background:#b45309;color:#fff;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;">';
  h += '📷 Câmera<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="_addFotoRel(this)">';
  h += '</label>';
  h += '<label style="flex:1;background:#7c3aed;color:#fff;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;">';
  h += '🖼 Galeria<input type="file" accept="image/*" multiple style="display:none;" onchange="_addFotoRel(this)">';
  h += '</label>';
  h += '</div>';

  /* Grade de fotos com legendas */
  if (nf > 0) {
    h += '<div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:6px;">' + nf + ' foto(s) registrada(s)</div>';
    rf.fotos.forEach(function(f, idx) {
      h += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;overflow:hidden;">';
      h += '<div style="position:relative;">';
      h += '<img src="' + f.b64 + '" style="width:100%;height:200px;object-fit:cover;display:block;">';
      h += '<button onclick="_remFotoRel(' + idx + ')" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">✕</button>';
      h += '<div style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.6);color:#fff;border-radius:4px;padding:2px 8px;font-size:10px;">' + (idx + 1) + '/' + nf + ' · ' + (f.dt || '') + '</div>';
      h += '</div>';
      h += '<div style="padding:8px;">';
      h += '<input value="' + _escA(f.leg) + '" oninput="window._relFoto.fotos[' + idx + '].leg=this.value" placeholder="Legenda da foto ' + (idx + 1) + '..." style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:12px;box-sizing:border-box;">';
      h += '</div></div>';
    });
  } else {
    h += '<div style="text-align:center;padding:40px 20px;color:#94a3b8;">';
    h += '<div style="font-size:48px;margin-bottom:10px;">📸</div>';
    h += '<div style="font-size:14px;font-weight:700;">Nenhuma foto ainda</div>';
    h += '<div style="font-size:12px;margin-top:4px;">Toque em Câmera ou Galeria para começar</div>';
    h += '</div>';
  }

  h += '</div>'; /* fim corpo */
  ov.innerHTML = h;
}

function _addFotoRel(inp) {
  if (!inp.files || !inp.files.length) return;
  var rf = window._relFoto;
  var total = inp.files.length, done = 0;

  Array.from(inp.files).forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      /* Comprimir */
      var img = new Image();
      img.onload = function() {
        var cv = document.createElement('canvas');
        var max = 1440;
        var w = img.width, hh = img.height;
        if (w > max || hh > max) {
          if (w >= hh) { hh = Math.round(hh * (max / w)); w = max; }
          else { w = Math.round(w * (max / hh)); hh = max; }
        }
        cv.width = w; cv.height = hh;
        cv.getContext('2d').drawImage(img, 0, 0, w, hh);
        var b64 = cv.toDataURL('image/webp', 0.82);
        var agora = new Date();
        rf.fotos.push({
          b64: b64,
          leg: '',
          dt: String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0')
        });
        done++;
        if (done >= total) _renderRelFoto();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  inp.value = '';
}

function _remFotoRel(idx) {
  window._relFoto.fotos.splice(idx, 1);
  _renderRelFoto();
}

function _fecharRelFoto() {
  var ov = document.getElementById('_relfoto_ov');
  if (ov) {
    if (window._relFoto && window._relFoto.fotos.length > 0) {
      cf('?', 'Fechar', 'Tem ' + window._relFoto.fotos.length + ' foto(s). Deseja descartar?', function() {
        window._relFoto = null;
        document.body.removeChild(ov);
      });
    } else {
      window._relFoto = null;
      document.body.removeChild(ov);
    }
  }
}

function _exportRelFoto() {
  var rf = window._relFoto;
  if (!rf || !rf.fotos.length) { Tt('Adicione pelo menos uma foto.'); return; }
  if (!rf.edif) { Tt('Preencha a edificação.'); return; }

  var R = S.sessao && S.sessao.reg && typeof REG !== 'undefined' ? REG[S.sessao.reg] || {} : {};

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<title>Relatório Fotográfico — ' + _escA(rf.edif) + '</title>'
    + '<style>'
    + '@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800&display=swap");'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"IBM Plex Sans",sans-serif;font-size:12px;color:#1f2937;}'
    + '.topo{background:#b45309;color:#fff;padding:20px 28px;}'
    + '.topo h1{font-size:18px;font-weight:800;}'
    + '.topo p{font-size:11px;opacity:.7;margin-top:3px;}'
    + '.corpo{padding:24px 28px;max-width:800px;margin:0 auto;}'
    + '.info{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:20px;}'
    + '.info b{color:#92400e;}'
    + '.foto-card{break-inside:avoid;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px;overflow:hidden;}'
    + '.foto-card img{width:100%;display:block;}'
    + '.foto-leg{padding:10px 14px;background:#f8fafc;}'
    + '.foto-leg .num{font-size:10px;color:#94a3b8;font-weight:700;}'
    + '.foto-leg .txt{font-size:13px;color:#1e293b;font-weight:600;margin-top:2px;}'
    + '.rodape{margin-top:32px;padding:12px;background:#f8fafc;border-top:2px solid #e2e8f0;font-size:9px;color:#9ca3af;text-align:center;}'
    + '@media print{.topo{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}.foto-card{break-inside:avoid;}}'
    + '</style></head><body>';

  html += '<div class="topo"><h1>📸 Relatório Fotográfico</h1>';
  html += '<p>' + _escA(rf.edif) + ' · ' + _escA(rf.com) + ' · ' + fdt(rf.data) + '</p></div>';

  html += '<div class="corpo">';
  html += '<div class="info">';
  html += '<b>Edificação:</b> ' + _escA(rf.edif) + '<br>';
  if (rf.com) html += '<b>Comarca:</b> ' + _escA(rf.com) + '<br>';
  if (rf.assunto) html += '<b>Assunto:</b> ' + _escA(rf.assunto) + '<br>';
  html += '<b>Data:</b> ' + fdt(rf.data) + '<br>';
  html += '<b>Fiscal:</b> ' + _escA(rf.fiscal) + '<br>';
  if (R.ct) html += '<b>Contrato:</b> ' + _escA(R.ct) + '<br>';
  if (rf.obs) html += '<br><b>Observações:</b> ' + _escA(rf.obs);
  html += '</div>';

  rf.fotos.forEach(function(f, idx) {
    html += '<div class="foto-card">';
    html += '<img src="' + f.b64 + '" alt="Foto ' + (idx + 1) + '">';
    html += '<div class="foto-leg">';
    html += '<div class="num">Foto ' + (idx + 1) + ' de ' + rf.fotos.length + (f.dt ? ' · ' + f.dt : '') + '</div>';
    if (f.leg) html += '<div class="txt">' + _escA(f.leg) + '</div>';
    html += '</div></div>';
  });

  html += '</div>';
  html += '<div class="rodape">TJMG · GEMAP · Relatório gerado em ' + new Date().toLocaleString('pt-BR') + '</div>';
  html += '</body></html>';

  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'TJMG_FOTOGRAFICO_' + normProt(rf.edif) + '_' + rf.data + '.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  Tt('📸 Relatório fotográfico exportado com ' + rf.fotos.length + ' fotos!');
}
window.abrirRelFotografico = abrirRelFotografico;

/* ══════════════════════════════════════════════════════════════
   8. COMPARAR FOTOS COM SWIPE (ANTES × DEPOIS) — v93
   Barra divisória arrastável entre duas fotos.
   ══════════════════════════════════════════════════════════════ */

function abrirSwipeAntesDepois(b64Antes, b64Depois, labelAntes, labelDepois) {
  var ov = document.createElement('div'); ov.id = '_swipe_ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:10001;display:flex;flex-direction:column;align-items:center;justify-content:center;';

  var h = '<div style="color:#fff;text-align:center;margin-bottom:10px;">';
  h += '<div style="font-size:14px;font-weight:800;">📸 Comparação Antes × Depois</div>';
  h += '<div style="font-size:10px;opacity:.6;margin-top:2px;">Arraste a barra para comparar</div>';
  h += '</div>';

  h += '<div id="_swipe_box" style="position:relative;width:90vw;max-width:500px;aspect-ratio:4/3;border-radius:12px;overflow:hidden;touch-action:none;cursor:ew-resize;">';

  /* Imagem Depois (fundo) */
  h += '<img src="' + b64Depois + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" draggable="false">';

  /* Imagem Antes (clip) */
  h += '<div id="_swipe_clip" style="position:absolute;inset:0;width:50%;overflow:hidden;">';
  h += '<img src="' + b64Antes + '" style="width:' + (90) + 'vw;max-width:500px;height:100%;object-fit:cover;" draggable="false">';
  h += '</div>';

  /* Barra divisória */
  h += '<div id="_swipe_bar" style="position:absolute;top:0;bottom:0;left:50%;width:4px;background:#fff;transform:translateX(-50%);box-shadow:0 0 10px rgba(0,0,0,.5);z-index:2;">';
  h += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3);">⟺</div>';
  h += '</div>';

  /* Labels */
  h += '<div style="position:absolute;top:8px;left:8px;background:rgba(220,38,38,.85);color:#fff;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:800;z-index:3;">❌ ' + _escA(labelAntes || 'ANTES') + '</div>';
  h += '<div style="position:absolute;top:8px;right:8px;background:rgba(22,163,74,.85);color:#fff;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:800;z-index:3;">✅ ' + _escA(labelDepois || 'DEPOIS') + '</div>';

  h += '</div>';

  h += '<button onclick="document.body.removeChild(document.getElementById(\'_swipe_ov\'))" style="margin-top:16px;background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 28px;font-size:13px;font-weight:700;cursor:pointer;">Fechar</button>';

  ov.innerHTML = h;
  document.body.appendChild(ov);

  /* Evento de arrasto */
  var box = document.getElementById('_swipe_box');
  var clip = document.getElementById('_swipe_clip');
  var bar = document.getElementById('_swipe_bar');

  function move(clientX) {
    var rect = box.getBoundingClientRect();
    var x = clientX - rect.left;
    var pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    clip.style.width = pct + '%';
    bar.style.left = pct + '%';
  }

  box.addEventListener('touchmove', function(e) {
    e.preventDefault();
    move(e.touches[0].clientX);
  }, { passive: false });

  box.addEventListener('mousemove', function(e) {
    if (e.buttons === 1) move(e.clientX);
  });

  box.addEventListener('touchstart', function(e) {
    move(e.touches[0].clientX);
  });

  box.addEventListener('click', function(e) {
    move(e.clientX);
  });
}
window.abrirSwipeAntesDepois = abrirSwipeAntesDepois;

/* Botão swipe no detalhe: detecta pares NC→Conforme com fotos */
function _getParesSwipe(inspId) {
  var i = S.insp.find(function(x) { return x.id === inspId; });
  if (!i) return [];

  var insps = filterByReg(S.insp).filter(function(x) {
    return x.edif === i.edif && x.st === 'finalizada' && x.id !== inspId;
  }).sort(function(a, b) {
    return (b.dtVistoria || b.data || '') > (a.dtVistoria || a.data || '') ? 1 : -1;
  });

  var pares = [];
  Object.entries(i.itens || {}).forEach(function(pair) {
    var k = pair[0], v = pair[1];
    if (v.s !== 'conforme' || !(v.fotos || []).length) return;

    for (var pi = 0; pi < insps.length; pi++) {
      var ant = insps[pi];
      if (ant.itens && ant.itens[k] && ant.itens[k].s === 'nao_conforme' && (ant.itens[k].fotos || []).length) {
        pares.push({
          key: k,
          nm: v.nm || v.n || k,
          antes: ant.itens[k].fotos[0].b64,
          depois: v.fotos[0].b64,
          dtAntes: fdt(ant.dtVistoria || ant.data),
          dtDepois: fdt(i.dtVistoria || i.data)
        });
        break;
      }
    }
  });
  return pares;
}
window._getParesSwipe = _getParesSwipe;

window.abrirCalculadoraEletrica=abrirCalculadoraEletrica;

/* ══════════════════════════════════════════════════════════════
   2. ANOTAÇÃO POR VOZ — v93
   Usa Web Speech API para transcrever voz → texto.
   ══════════════════════════════════════════════════════════════ */
function iniciarVoz(inputId){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){Tt('Reconhecimento de voz não disponível neste navegador.');return;}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var rec=new SR();rec.lang='pt-BR';rec.continuous=true;rec.interimResults=true;
  var inp=el(inputId);if(!inp){Tt('Campo não encontrado.');return;}
  var textoAnterior=inp.value;
  rec.onresult=function(e){
    var txt='';for(var i=e.resultIndex;i<e.results.length;i++){txt+=e.results[i][0].transcript;}
    inp.value=textoAnterior+(textoAnterior?' ':'')+txt;
    inp.dispatchEvent(new Event('input',{bubbles:true}));
  };
  rec.onerror=function(e){Tt('Erro de voz: '+e.error);};
  rec.onend=function(){Tt('🎤 Gravação encerrada');};
  rec.start();
  Tt('🎤 Fale agora...');
  /* Parar após 30 segundos */
  setTimeout(function(){try{rec.stop();}catch(e){}},30000);
}
window.iniciarVoz=iniciarVoz;

/* ══════════════════════════════════════════════════════════════
   3. TABELA DE REFERÊNCIA RÁPIDA — v93
   ══════════════════════════════════════════════════════════════ */
function abrirReferencia(){
  var ov=document.createElement('div');ov.id='_ref_ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:10000;display:flex;flex-direction:column;';
  var h='<div style="background:#fff;flex:1;border-radius:16px 16px 0 0;margin-top:32px;overflow-y:auto;padding:16px;">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  h+='<div style="font-size:16px;font-weight:800;color:#1e3a5f;">📖 Referência Rápida</div>';
  h+='<button onclick="document.body.removeChild(document.getElementById(\'_ref_ov\'))" style="border:none;background:#f1f5f9;border-radius:8px;padding:5px 12px;font-size:14px;cursor:pointer;">✕</button></div>';

  /* Isolamento por tensão */
  h+='<div style="font-size:11px;font-weight:800;color:#0369a1;margin:10px 0 6px;border-bottom:2px solid #0369a1;padding-bottom:4px;">🔌 Resistência Mínima de Isolamento (NBR 5356)</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">';
  h+='<tr style="background:#1e3a5f;color:#fff;"><th style="padding:5px 8px;">Tensão Nominal</th><th>Mín. Isolamento</th><th>Instrumento</th></tr>';
  [['≤ 1 kV (BT)','≥ 10 MΩ','Megômetro 500V'],['1-15 kV (MT)','≥ 100 MΩ','Megômetro 2500V'],['15-35 kV','≥ 500 MΩ','Megômetro 5000V'],['Disjuntor MT','≥ 1000 MΩ','IEC 62271'],['Contato disjuntor','≤ 200 µΩ','Microhmímetro'],['Contato seccionadora','≤ 200 µΩ','Microhmímetro']].forEach(function(r,i){
    h+='<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:4px 8px;font-weight:700;">'+r[0]+'</td><td style="color:#16a34a;font-weight:700;">'+r[1]+'</td><td style="color:#64748b;">'+r[2]+'</td></tr>';
  });
  h+='</table>';

  /* Extintores */
  h+='<div style="font-size:11px;font-weight:800;color:#dc2626;margin:10px 0 6px;border-bottom:2px solid #dc2626;padding-bottom:4px;">🧯 Extintores — Classes e Cores</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">';
  h+='<tr style="background:#dc2626;color:#fff;"><th style="padding:5px 8px;">Agente</th><th>Classe</th><th>Cor Faixa</th><th>Validade</th></tr>';
  [['Pó ABC','A, B, C','Amarela','5 anos (recarga 1 ano)'],['CO₂','B, C','Vermelha','5 anos (pesagem 6 meses)'],['Água pressurizada','A','Verde','5 anos (recarga 1 ano)'],['Espuma mecânica','A, B','Creme','5 anos'],['Pó BC','B, C','Amarela','5 anos']].forEach(function(r,i){
    h+='<tr style="background:'+(i%2?'#fef2f2':'#fff')+'"><td style="padding:4px 8px;font-weight:700;">'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td style="color:#64748b;">'+r[3]+'</td></tr>';
  });
  h+='</table>';

  /* NR-10 Distâncias */
  h+='<div style="font-size:11px;font-weight:800;color:#d97706;margin:10px 0 6px;border-bottom:2px solid #d97706;padding-bottom:4px;">⚡ NR-10 — Distâncias de Segurança</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">';
  h+='<tr style="background:#d97706;color:#fff;"><th style="padding:5px 8px;">Tensão</th><th>Zona Controlada</th><th>Zona de Risco</th></tr>';
  [['≤ 1 kV','0.70 m','0.20 m'],['1 - 3 kV','1.22 m','0.35 m'],['3 - 6 kV','1.22 m','0.38 m'],['6 - 10 kV','1.22 m','0.40 m'],['10 - 15 kV','1.33 m','0.58 m'],['15 - 20 kV','1.35 m','0.60 m'],['20 - 35 kV','1.53 m','0.73 m']].forEach(function(r,i){
    h+='<tr style="background:'+(i%2?'#fffbeb':'#fff')+'"><td style="padding:4px 8px;font-weight:700;">'+r[0]+'</td><td>'+r[1]+'</td><td style="color:#dc2626;font-weight:700;">'+r[2]+'</td></tr>';
  });
  h+='</table>';

  /* Torque parafusos */
  h+='<div style="font-size:11px;font-weight:800;color:#7c3aed;margin:10px 0 6px;border-bottom:2px solid #7c3aed;padding-bottom:4px;">🔩 Torque de Aperto por Bitola</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">';
  h+='<tr style="background:#7c3aed;color:#fff;"><th style="padding:5px 8px;">Bitola</th><th>Torque (N·m)</th><th>Aplicação</th></tr>';
  [['M6','5-8','Terminais pequenos'],['M8','15-25','Bornes QD'],['M10','30-45','Barramentos BT'],['M12','50-80','Barramentos MT'],['M16','100-160','Conexões pesadas']].forEach(function(r,i){
    h+='<tr style="background:'+(i%2?'#faf5ff':'#fff')+'"><td style="padding:4px 8px;font-weight:700;">'+r[0]+'</td><td style="font-weight:700;">'+r[1]+'</td><td style="color:#64748b;">'+r[2]+'</td></tr>';
  });
  h+='</table>';

  /* Prazos contratuais */
  h+='<div style="font-size:11px;font-weight:800;color:#0f766e;margin:10px 0 6px;border-bottom:2px solid #0f766e;padding-bottom:4px;">📋 Prazos Contratuais (CT 017/2026)</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">';
  [['Emergência (OSE)','2 horas','Início atendimento'],['Urgência','24 horas','Início atendimento'],['Periódica Grp A/B','Trimestral','Execução completa'],['Periódica Grp C','Semestral','Execução completa'],['Subestação B.1','Anual','Manutenção preventiva'],['SPDA laudo','Anual','NBR 5419'],['NOT-INA resposta','30 dias','Prazo padrão'],['Relatório mensal','Até dia 5','Mês subsequente']].forEach(function(r,i){
    h+='<tr style="background:'+(i%2?'#f0fdfa':'#fff')+'"><td style="padding:4px 8px;font-weight:700;">'+r[0]+'</td><td style="color:#0f766e;font-weight:700;">'+r[1]+'</td><td style="color:#64748b;">'+r[2]+'</td></tr>';
  });
  h+='</table>';

  h+='</div>';ov.innerHTML=h;document.body.appendChild(ov);
}
window.abrirReferencia=abrirReferencia;

/* ══════════════════════════════════════════════════════════════
   5. NÍVEL DIGITAL (giroscópio) — v93
   ══════════════════════════════════════════════════════════════ */
function abrirNivel(){
  var ov=document.createElement('div');ov.id='_nivel_ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
  var h='<div style="text-align:center;color:#fff;">';
  h+='<div style="font-size:14px;font-weight:800;margin-bottom:16px;">📐 Nível Digital</div>';
  h+='<div style="position:relative;width:200px;height:200px;border:3px solid rgba(255,255,255,.3);border-radius:50%;margin:0 auto;">';
  h+='<div style="position:absolute;top:50%;left:50%;width:4px;height:4px;background:#fff;border-radius:50%;transform:translate(-50%,-50%);"></div>';
  h+='<div id="_nivel_bola" style="position:absolute;top:50%;left:50%;width:24px;height:24px;background:#3b82f6;border-radius:50%;transform:translate(-50%,-50%);transition:transform .1s;box-shadow:0 0 10px rgba(59,130,246,.5);"></div>';
  h+='<div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(255,255,255,.15);"></div>';
  h+='<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.15);"></div>';
  h+='</div>';
  h+='<div id="_nivel_val" style="font-size:28px;font-weight:900;margin-top:16px;font-family:monospace;">0.0°</div>';
  h+='<div id="_nivel_status" style="font-size:12px;color:#94a3b8;margin-top:4px;">Posicione o celular na superfície</div>';
  h+='<button onclick="_nivelParar();document.body.removeChild(document.getElementById(\'_nivel_ov\'))" style="margin-top:20px;background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 28px;font-size:13px;font-weight:700;cursor:pointer;">Fechar</button>';
  h+='</div>';ov.innerHTML=h;document.body.appendChild(ov);

  window._nivelHandler=function(e){
    var b=e.beta||0,g=e.gamma||0;
    var angulo=Math.sqrt(b*b+g*g).toFixed(1);
    var bola=el('_nivel_bola');
    if(bola){
      var dx=Math.min(80,Math.max(-80,g));var dy=Math.min(80,Math.max(-80,b));
      bola.style.transform='translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px))';
      bola.style.background=angulo<=0.5?'#16a34a':angulo<=2?'#3b82f6':angulo<=5?'#d97706':'#dc2626';
    }
    var v=el('_nivel_val');if(v)v.textContent=angulo+'°';
    var st=el('_nivel_status');
    if(st)st.textContent=angulo<=0.5?'✅ Nivelado!':angulo<=2?'Quase nivelado':angulo<=5?'⚠️ Inclinado':'❌ Muito inclinado';
  };
  if(window.DeviceOrientationEvent){
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      DeviceOrientationEvent.requestPermission().then(function(r){if(r==='granted')window.addEventListener('deviceorientation',window._nivelHandler);});
    }else{window.addEventListener('deviceorientation',window._nivelHandler);}
  }else{Tt('Giroscópio não disponível neste dispositivo.');}
}
function _nivelParar(){if(window._nivelHandler)window.removeEventListener('deviceorientation',window._nivelHandler);}
window.abrirNivel=abrirNivel;

/* ══════════════════════════════════════════════════════════════
   MENSAGEM NC PARA EMPRESA — v93
   Gera mensagem WhatsApp/e-mail para a contratada informando
   NCs encontradas na manutenção periódica.
   ══════════════════════════════════════════════════════════════ */
function gerarMsgNcEmpresa(inspId) {
  var i = S.insp.find(function(x) { return x.id === inspId; });
  if (!i) return;
  var R = (typeof REG !== 'undefined' && REG[i.reg]) ? REG[i.reg] : { l: i.reg || '', ct: '', empresa: '' };
  var ncs = [];
  Object.values(i.itens || {}).forEach(function(v) {
    if (v.s === 'nao_conforme') ncs.push(v);
  });
  if (!ncs.length) { Tt('Nenhuma NC nesta inspeção.'); return; }

  var msg = '*TJMG — NOTIFICAÇÃO DE NÃO CONFORMIDADE*\n'
    + '\n'
    + 'Prezada ' + (R.empresa || 'Empresa Contratada') + ',\n'
    + '\n'
    + 'Informamos que em vistoria de manutenção periódica realizada em *' + fdt(i.dtVistoria || i.data) + '* na edificação *' + (i.edif || '') + '* — Comarca de *' + (i.com || '') + '* (Região ' + R.l + '), foram identificadas as seguintes não conformidades:\n'
    + '\n';

  var porSistema = {};
  ncs.forEach(function(nc) {
    var s = nc.sn || 'Geral';
    if (!porSistema[s]) porSistema[s] = [];
    porSistema[s].push(nc);
  });

  Object.keys(porSistema).forEach(function(sis) {
    msg += '*' + sis + ':*\n';
    porSistema[sis].forEach(function(nc, idx) {
      msg += (idx + 1) + '. ' + (nc.nm || nc.n || '') + (nc.obs ? ' — _' + nc.obs + '_' : '') + '\n';
    });
    msg += '\n';
  });

  msg += 'Total: *' + ncs.length + ' não conformidade(s)*\n'
    + '\n'
    + 'Solicitamos a regularização no prazo contratual, sob pena de aplicação das sanções previstas no ' + (R.ct || 'contrato') + '.\n'
    + '\n'
    + 'Atenciosamente,\n'
    + (S.sessao ? S.sessao.nome : 'Fiscal') + '\n'
    + 'Fiscal de Contrato — TJMG/GEMAP\n'
    + fdt(new Date().toISOString().slice(0, 10));

  /* Copiar e abrir WhatsApp */
  var msgClean = msg.replace(/\n/g, '\n');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(msgClean).then(function() {
      Tt('📋 Mensagem copiada! Cole no WhatsApp ou e-mail.');
    });
  }
  var waUrl = 'https://wa.me/?text=' + encodeURIComponent(msgClean);
  window.open(waUrl, '_blank');
}
window.gerarMsgNcEmpresa = gerarMsgNcEmpresa;

window.gerarComparativoMedicoes = gerarComparativoMedicoes;

window.SUB_CHECKLIST = SUB_CHECKLIST;
window.SUB_MEDICOES = SUB_MEDICOES;

window.rTimeline = rTimeline;

window.abrirSeletorNcParaOsp = abrirSeletorNcParaOsp;
window.abrirOspEdificacao = abrirOspEdificacao;
window._ospNcToggle = _ospNcToggle;
window._ospNcSelAll = _ospNcSelAll;
window._gerarOspDeNcsV2 = _gerarOspDeNcsV2;
window.abrirSeletorNcParaOsp = abrirSeletorNcParaOsp;

/* ══════════════════════════════════════════════════════════════
   DUPLICAR INSPEÇÃO — v86
   Copia edificação, comarca, itens (zerados) da última vistoria
   ══════════════════════════════════════════════════════════════ */
function duplicarInspecao(inspId) {
  var orig = S.insp.find(function(x) { return x.id === inspId; });
  if (!orig) { Tt('Inspeção não encontrada.'); return; }

  var novoId = uid();
  var novo = JSON.parse(JSON.stringify(orig));
  novo.id = novoId;
  novo.st = 'em_andamento';
  novo.data = new Date().toISOString().slice(0, 10);
  novo.dtVistoria = new Date().toISOString().slice(0, 10);
  novo.dtVistoriaFim = '';
  novo.fiscal = S.sessao ? S.sessao.nome : orig.fiscal;
  novo.synced_at = null;
  novo._coordNota = '';
  novo._coordNotaDt = '';

  /* Zerar status de todos os itens mas manter nomes e sistemas */
  Object.keys(novo.itens || {}).forEach(function(k) {
    novo.itens[k].s = 'pendente';
    novo.itens[k].obs = '';
    novo.itens[k].fotos = [];
  });

  /* Zerar fotos e materiais */
  novo.fotos = [];
  novo.materiais = [];
  novo.obs = '';
  novo.duracaoMin = null;
  novo.duracaoFormatada = '';

  S.insp.push(novo);
  DB.sv();
  Tt('✅ Inspeção duplicada! Todos os itens zerados.');

  setTimeout(function() {
    if (typeof retomarF === 'function') retomarF(novoId);
  }, 400);
}
window.duplicarInspecao = duplicarInspecao;

window.rDashboard = rDashboard;

window.rVigenciaContratos=rVigenciaContratos;
