'use strict';
// ============================================================
// prontuario-edif.js — Prontuário completo por edificação
// TJMG Fiscal PWA — v79 · Ref: NBR 5674 item 6.2
// ============================================================

/* ── Tela Prontuário Edificação ─────────────────────────────── */
function rPronEdif(edif, com) {
  var pb = el('pronedif-body'); if (!pb) return;
  var sub = el('pronedif-sub');
  if (sub) sub.textContent = edif + (com ? ' · ' + com : '');

  var hist = S.insp.filter(function(i) {
    return i.edif === edif && (!com || i.com === com);
  }).sort(function(a, b) {
    return (b.dtVistoria || b.data) < (a.dtVistoria || a.data) ? -1 : 1;
  }).reverse(); /* mais recente primeiro */

  if (!hist.length) {
    pb.innerHTML = '<div style="text-align:center;padding:40px;">'
      + '<div style="font-size:48px;">🏛️</div>'
      + '<div style="font-size:14px;color:#94a3b8;margin-top:12px;">Nenhuma inspeção encontrada<br>para esta edificação.</div>'
      + '</div>';
    return;
  }

  /* Estatísticas gerais */
  var fins = hist.filter(function(i) { return i.st === 'finalizada'; });
  var tipos = {};
  fins.forEach(function(i) { tipos[i.tipo] = (tipos[i.tipo] || 0) + 1; });

  /* Conformidade média */
  var somaConf = 0; var cntConf = 0;
  fins.forEach(function(i) {
    var its = Object.values(i.itens || {}).filter(function(v) {
      return v.s && v.s !== 'fora_periodo' && v.s !== 'nao_aplicavel' && v.s !== 'pendente';
    });
    if (!its.length) return;
    somaConf += its.filter(function(v) { return v.s === 'conforme' || v.s === 'executado'; }).length / its.length;
    cntConf++;
  });
  var confMedia = cntConf ? Math.round(somaConf / cntConf * 100) : null;
  var corConf = confMedia !== null ? (confMedia >= 80 ? '#16a34a' : confMedia >= 60 ? '#d97706' : '#dc2626') : '#94a3b8';

  var h = '<div style="padding:12px;">';

  /* KPIs */
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">';
  h += '<div class="card" style="text-align:center;border-left:4px solid #003580;">';
  h += '<div style="font-size:24px;font-weight:900;color:#003580;">' + hist.length + '</div>';
  h += '<div style="font-size:9px;color:#64748b;font-weight:700;">RELATÓRIOS</div></div>';
  h += '<div class="card" style="text-align:center;border-left:4px solid #16a34a;">';
  h += '<div style="font-size:24px;font-weight:900;color:#16a34a;">' + fins.length + '</div>';
  h += '<div style="font-size:9px;color:#64748b;font-weight:700;">FINALIZADOS</div></div>';
  h += '<div class="card" style="text-align:center;border-left:4px solid ' + corConf + ';">';
  h += '<div style="font-size:24px;font-weight:900;color:' + corConf + ';">' + (confMedia !== null ? confMedia + '%' : '—') + '</div>';
  h += '<div style="font-size:9px;color:#64748b;font-weight:700;">CONFORMIDADE</div></div>';
  h += '</div>';

  /* Resumo de tipos */
  if (Object.keys(tipos).length) {
    h += '<div class="card" style="margin-bottom:12px;">';
    h += '<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:8px;">Tipos de Relatório</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    Object.keys(tipos).forEach(function(t) {
      var tp = TIPOS[t] || TIPOS.periodica;
      h += '<span style="background:' + tp.bg + ';color:' + tp.c + ';padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">';
      h += tp.i + ' ' + tp.l + ' (' + tipos[t] + ')</span>';
    });
    h += '</div></div>';
  }

  /* Prontuários / Laudos */
  var pronts = fins.filter(function(i) { return i.tipo === 'prontuario'; });
  if (pronts.length) {
    h += '<div class="card" style="margin-bottom:12px;border-left:4px solid #7c3aed;">';
    h += '<div style="font-size:12px;font-weight:800;color:#7c3aed;margin-bottom:8px;">📄 Laudos e Prontuários (NBR 5674)</div>';
    pronts.forEach(function(i) {
      h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;" onclick="openDet(\'' + i.id + '\')">';
      h += '<div style="flex:1;"><div style="font-size:11px;font-weight:700;">' + fdt(i.dtVistoria || i.data) + '</div>';
      h += '<div style="font-size:10px;color:#64748b;">' + _escA(i.fiscal || '—') + '</div></div>';
      h += '<span style="color:#7c3aed;font-size:14px;">›</span></div>';
    });
    h += '</div>';
  }

  /* Linha do tempo */
  h += '<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:8px;">Histórico Completo</div>';
  hist.forEach(function(i) {
    var tp = TIPOS[i.tipo] || TIPOS.periodica;
    var st = i.st === 'finalizada' ? { l: 'Enviado', c: '#16a34a', bg: '#dcfce7' } : { l: 'Rascunho', c: '#d97706', bg: '#fef3c7' };
    var imr = calcIMRInsp ? calcIMRInsp(i) : null;
    var imrStr = imr !== null ? Math.round(imr * 100) + '%' : '—';
    var imrCor = imr !== null ? (imr >= 0.8 ? '#16a34a' : imr >= 0.6 ? '#d97706' : '#dc2626') : '#94a3b8';

    h += '<div class="card" style="margin-bottom:8px;cursor:pointer;padding:10px 12px;" onclick="openDet(\'' + i.id + '\')">';
    h += '<div style="display:flex;align-items:center;gap:8px;">';
    h += '<div style="width:34px;height:34px;border-radius:8px;background:' + tp.bg + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' + tp.i + '</div>';
    h += '<div style="flex:1;min-width:0;">';
    h += '<div style="font-size:12px;font-weight:700;">' + tp.l + '</div>';
    h += '<div style="font-size:10px;color:#64748b;">' + fdt(i.dtVistoria || i.data) + ' · ' + _escA(i.fiscal || '—') + '</div>';
    h += '<div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap;">';
    h += '<span style="background:' + st.bg + ';color:' + st.c + ';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">' + st.l + '</span>';
    if (imr !== null) h += '<span style="background:#f8fafc;color:' + imrCor + ';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;">IMR ' + imrStr + '</span>';
    h += '</div></div>';
    h += '<span style="color:#e2e8f0;font-size:18px;">›</span>';
    h += '</div></div>';
  });

  /* Exportar Prontuário */
  h += '<button class="btn" style="background:#003580;color:#fff;margin-top:4px;" '
    + 'onclick="exportarProntuarioEdif(\'' + edif + '\',\'' + (com || '') + '\')">📄 Exportar Prontuário (NBR 5674)</button>';
  h += '<div style="height:16px;"></div>';
  h += '</div>';
  pb.innerHTML = h;
}

/* ── Abrir tela de prontuário por edificação ─────────────────── */
function abrirPronEdif(edif, com) {
  var sc = el('s-pronedif');
  if (!sc) {
    /* Cria tela dinamicamente se não existir */
    sc = document.createElement('div');
    sc.className = 'scr';
    sc.id = 's-pronedif';
    sc.style.paddingTop = 'var(--st)';
    sc.innerHTML = '<div class="hdr" style="background:#7c3aed;">'
      + '<div class="bkb" onclick="el(\'s-pronedif\').classList.remove(\'act\');document.querySelector(\'.scr.bk\')&&document.querySelector(\'.scr.bk\').classList.remove(\'bk\');">&#8249;</div>'
      + '<div style="flex:1;"><div class="ht">🏛️ Prontuário</div><div class="hs" id="pronedif-sub">—</div></div>'
      + '</div>'
      + '<div class="scrl" id="pronedif-body"></div>';
    document.getElementById('app').appendChild(sc);
  }
  var c = document.querySelector('.scr.act');
  if (c) { c.classList.add('bk'); setTimeout(function() { c.classList.remove('act', 'bk'); }, 300); }
  sc.classList.add('act');
  rPronEdif(edif, com);
}

/* ── Exportar prontuário HTML ────────────────────────────────── */
function exportarProntuarioEdif(edif, com) {
  var hist = S.insp.filter(function(i) {
    return i.edif === edif && (!com || i.com === com) && i.st === 'finalizada';
  }).sort(function(a, b) {
    return (b.dtVistoria || b.data) < (a.dtVistoria || a.data) ? -1 : 1;
  }).reverse();

  if (!hist.length) { Tt('Sem relatórios finalizados para exportar.'); return; }

  var s = S.sessao || {};
  var R = REG[hist[0].reg] || { l: '', ct: 'CT 017/2026' };

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<title>Prontuário — ' + edif + '</title>'
    + '<style>body{font-family:Arial,sans-serif;font-size:10pt;margin:2cm;}'
    + 'h1{font-size:13pt;text-align:center;margin-bottom:4px;}'
    + '.sub{text-align:center;font-size:10pt;color:#555;margin-bottom:20px;}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:14px;page-break-inside:avoid;}'
    + 'td,th{border:1px solid #ccc;padding:5px 7px;font-size:9pt;}'
    + 'th{background:#dbeafe;font-weight:700;text-align:left;}'
    + 'h2{font-size:11pt;margin:14px 0 6px;border-bottom:2px solid #003580;padding-bottom:3px;}'
    + '@media print{body{margin:1.5cm;}h2{page-break-before:auto;}}</style></head><body>'
    + '<h1>PRONTUÁRIO DA EDIFICAÇÃO</h1>'
    + '<div class="sub">NBR 5674 · ' + R.ct + ' · Região ' + R.l + '</div>'
    + '<table><tr><th colspan="2">IDENTIFICAÇÃO DA EDIFICAÇÃO</th></tr>'
    + '<tr><td><b>Edificação:</b></td><td>' + _escA(edif) + '</td></tr>'
    + '<tr><td><b>Comarca:</b></td><td>' + _escA(com || '—') + '</td></tr>'
    + '<tr><td><b>Total de inspeções:</b></td><td>' + hist.length + '</td></tr>'
    + '<tr><td><b>Período:</b></td><td>' + fdt(hist[hist.length-1].dtVistoria||hist[hist.length-1].data) + ' a ' + fdt(hist[0].dtVistoria||hist[0].data) + '</td></tr>'
    + '</table>'
    + '<h2>Histórico de Inspeções</h2>'
    + '<table><tr><th>Data</th><th>Tipo</th><th>Fiscal</th><th>Status</th><th>IMR</th></tr>'
    + hist.map(function(i) {
      var imr = typeof calcIMRInsp === 'function' ? calcIMRInsp(i) : null;
      return '<tr><td>' + fdt(i.dtVistoria||i.data) + '</td>'
        + '<td>' + (TIPOS[i.tipo]||TIPOS.periodica).l + '</td>'
        + '<td>' + _escA(i.fiscal||'—') + '</td>'
        + '<td>' + (i.st==='finalizada'?'Finalizado':'Em andamento') + '</td>'
        + '<td><b>' + (imr!==null?Math.round(imr*100)+'%':'—') + '</b></td></tr>';
    }).join('')
    + '</table>'
    + '</body></html>';

  var blob = new Blob([html], { type: 'text/html' });
  shareFile(blob, 'Prontuario_' + edif.replace(/[^a-zA-Z0-9]/g,'_').slice(0,40) + '.html', 'Prontuário ' + edif);
  Tt('✅ Prontuário exportado!');
}

window.rPronEdif            = rPronEdif;
window.abrirPronEdif        = abrirPronEdif;
window.exportarProntuarioEdif = exportarProntuarioEdif;
