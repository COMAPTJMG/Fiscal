'use strict';
// ============================================================
// imr.js — Cálculo de IMR e Boletim de Medição
// TJMG Fiscal PWA — v79
// Ref: CT-017/2026 Cláusula de Medição + Anexo F
// ============================================================

/* ── Constantes do contrato ─────────────────────────────────── */
var IMR_PESOS = {
  periodica:   0.40,   /* Manutenção Periódica — maior peso */
  programada:  0.30,   /* Manutenção Programada */
  ose:         0.20,   /* Emergencial */
  subestacao:  0.05,   /* Subestação */
  prontuario:  0.03,   /* Laudos/Prontuários */
  fachada:     0.01,   /* Fachada */
  spda:        0.01    /* SPDA */
};

/* Limites de desconto por faixa de IMR */
var IMR_FAIXAS = [
  { min: 0.90, max: 1.00, glosa: 0.00,  label: 'Ótimo — sem glosa' },
  { min: 0.80, max: 0.90, glosa: 0.05,  label: 'Bom — 5% de glosa' },
  { min: 0.70, max: 0.80, glosa: 0.10,  label: 'Regular — 10% de glosa' },
  { min: 0.60, max: 0.70, glosa: 0.15,  label: 'Insuficiente — 15% de glosa' },
  { min: 0.00, max: 0.60, glosa: 0.20,  label: 'Crítico — 20% de glosa' }
];

/* ── Cálculo de IMR por inspeção ────────────────────────────── */
function calcIMRInsp(insp) {
  if (!insp || insp.st !== 'finalizada') return null;

  var its = Object.values(insp.itens || {});
  if (insp.tipo === 'ose' || insp.tipo === 'programada' || insp.tipo === 'osp') {
    /* Para OSE/Programada: base é atividades selecionadas */
    var sel = insp.ativSel || {};
    var hasSel = Object.keys(sel).some(function(k) { return !!sel[k]; });
    if (hasSel) {
      its = its.filter(function(it) {
        var k = it._k || '';
        var aid = k.replace(/^[^_]*_/, '');
        return !!sel[aid];
      });
    }
    var exec = its.filter(function(v) { return v.s === 'executado'; }).length;
    var nExec = its.filter(function(v) { return v.s === 'nao_executado'; }).length;
    var total = exec + nExec;
    return total > 0 ? exec / total : null;
  }

  /* Periódica / Fachada / SPDA / Sub */
  var avaliados = its.filter(function(v) {
    return v.s && v.s !== 'fora_periodo' && v.s !== 'pendente' && v.s !== 'nao_aplicavel';
  });
  if (!avaliados.length) return null;
  var conformes = avaliados.filter(function(v) {
    return v.s === 'conforme' || v.s === 'executado';
  }).length;
  return conformes / avaliados.length;
}

/* ── Cálculo de IMR geral do período ───────────────────────── */
function calcIMRPeriodo(reg, dtIni, dtFim) {
  var base = S.insp.filter(function(i) {
    if (i.st !== 'finalizada') return false;
    if (reg && reg !== 'todos' && i.reg !== reg) return false;
    var dt = i.dtVistoria || i.data || '';
    if (dtIni && dt < dtIni) return false;
    if (dtFim && dt > dtFim) return false;
    return true;
  });

  if (!base.length) return null;

  /* IMR ponderado por tipo */
  var somasPeso = {}; var contsPeso = {};
  Object.keys(IMR_PESOS).forEach(function(t) { somasPeso[t] = 0; contsPeso[t] = 0; });

  base.forEach(function(i) {
    var imr = calcIMRInsp(i);
    if (imr === null) return;
    var t = i.tipo;
    if (somasPeso[t] === undefined) { somasPeso[t] = 0; contsPeso[t] = 0; }
    somasPeso[t] += imr;
    contsPeso[t]++;
  });

  var imrTotal = 0; var pesoTotal = 0;
  Object.keys(IMR_PESOS).forEach(function(t) {
    if (!contsPeso[t]) return;
    var mediaT = somasPeso[t] / contsPeso[t];
    imrTotal += mediaT * (IMR_PESOS[t] || 0);
    pesoTotal += (IMR_PESOS[t] || 0);
  });

  return {
    imr: pesoTotal > 0 ? imrTotal / pesoTotal : null,
    totalInsps: base.length,
    porTipo: Object.keys(somasPeso).filter(function(t) { return contsPeso[t] > 0; }).map(function(t) {
      return {
        tipo: t,
        label: (TIPOS[t] || TIPOS.periodica).l,
        media: somasPeso[t] / contsPeso[t],
        count: contsPeso[t],
        peso: IMR_PESOS[t] || 0
      };
    })
  };
}

/* ── Faixa de IMR ──────────────────────────────────────────── */
function getFaixaIMR(imr) {
  for (var i = 0; i < IMR_FAIXAS.length; i++) {
    var f = IMR_FAIXAS[i];
    if (imr >= f.min && imr <= f.max) return f;
  }
  return IMR_FAIXAS[IMR_FAIXAS.length - 1];
}

/* ── Tela IMR ──────────────────────────────────────────────── */
function rIMR() {
  var ib = el('imr-body'); if (!ib) return;
  var s = S.sessao || {};

  /* Período padrão: mês atual */
  var hoje = new Date();
  var dtIni = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-01';
  var dtFim = new Date().toISOString().slice(0, 10);
  var reg = (el('imr-reg') && el('imr-reg').value) || s.reg || 'todos';

  var res = calcIMRPeriodo(reg, dtIni, dtFim);
  if (!res || res.imr === null) {
    ib.innerHTML = '<div style="text-align:center;padding:40px;">'
      + '<div style="font-size:48px;">📊</div>'
      + '<div style="font-size:14px;color:#94a3b8;margin-top:12px;font-weight:600;">Sem dados suficientes<br>para calcular o IMR no período.</div>'
      + '</div>';
    return;
  }

  var faixa = getFaixaIMR(res.imr);
  var pct = Math.round(res.imr * 100);
  var cor = pct >= 90 ? '#16a34a' : pct >= 80 ? '#2563eb' : pct >= 70 ? '#d97706' : '#dc2626';

  var h = '<div style="padding:12px;">';

  /* KPI principal */
  h += '<div class="card" style="text-align:center;border-left:4px solid ' + cor + ';margin-bottom:12px;">';
  h += '<div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;">IMR — Índice de Medição de Resultado</div>';
  h += '<div style="font-size:56px;font-weight:900;color:' + cor + ';line-height:1;">' + pct + '%</div>';
  h += '<div style="font-size:12px;color:#64748b;margin-top:4px;">' + faixa.label + '</div>';
  /* Barra visual */
  h += '<div style="background:#f1f5f9;border-radius:8px;height:10px;margin:12px 0 4px;overflow:hidden;">';
  h += '<div style="width:' + pct + '%;height:100%;background:' + cor + ';border-radius:8px;transition:width .6s;"></div></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;"><span>0%</span><span>60%</span><span>70%</span><span>80%</span><span>90%</span><span>100%</span></div>';
  h += '</div>';

  /* Glosa */
  h += '<div class="card" style="border-left:4px solid ' + (faixa.glosa > 0 ? '#dc2626' : '#16a34a') + ';margin-bottom:12px;">';
  h += '<div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:6px;">IMPACTO NA MEDIÇÃO</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
  h += '<div style="text-align:center;background:#f8fafc;border-radius:8px;padding:10px;">';
  h += '<div style="font-size:22px;font-weight:900;color:' + (faixa.glosa > 0 ? '#dc2626' : '#16a34a') + ';">' + (faixa.glosa * 100).toFixed(0) + '%</div>';
  h += '<div style="font-size:9px;color:#64748b;">Glosa Aplicável</div></div>';
  h += '<div style="text-align:center;background:#f8fafc;border-radius:8px;padding:10px;">';
  h += '<div style="font-size:22px;font-weight:900;color:#003580;">' + res.totalInsps + '</div>';
  h += '<div style="font-size:9px;color:#64748b;">Inspeções Base</div></div>';
  h += '</div></div>';

  /* Detalhamento por tipo */
  h += '<div class="card" style="margin-bottom:12px;">';
  h += '<div style="font-size:12px;font-weight:800;color:#003580;margin-bottom:10px;">Detalhamento por Tipo</div>';
  res.porTipo.sort(function(a, b) { return b.peso - a.peso; }).forEach(function(t) {
    var tPct = Math.round(t.media * 100);
    var tCor = tPct >= 90 ? '#16a34a' : tPct >= 80 ? '#2563eb' : tPct >= 70 ? '#d97706' : '#dc2626';
    h += '<div style="margin-bottom:10px;">';
    h += '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px;">';
    h += '<span>' + t.label + '</span>';
    h += '<span style="color:' + tCor + ';">' + tPct + '% <span style="color:#94a3b8;font-weight:400;">(' + t.count + ' insps · peso ' + (t.peso * 100).toFixed(0) + '%)</span></span>';
    h += '</div>';
    h += '<div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden;">';
    h += '<div style="width:' + tPct + '%;height:100%;background:' + tCor + ';border-radius:4px;"></div></div>';
    h += '</div>';
  });
  h += '</div>';

  /* Botão exportar boletim */
  h += '<button class="btn" style="background:#003580;color:#fff;margin-bottom:8px;" '
    + 'onclick="exportarBoletimIMR()">📄 Exportar Boletim de Medição</button>';

  h += '</div>';
  ib.innerHTML = h;
}

/* ── Exportar Boletim HTML ─────────────────────────────────── */
function exportarBoletimIMR() {
  var s = S.sessao || {};
  var R = REG[s.reg] || { l: s.reg || '', ct: 'CT 017/2026' };
  var hoje = new Date();
  var dtIni = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-01';
  var dtFim = hoje.toISOString().slice(0, 10);
  var res = calcIMRPeriodo(s.reg, dtIni, dtFim);
  if (!res || res.imr === null) { Tt('Sem dados para o boletim.'); return; }
  var faixa = getFaixaIMR(res.imr);
  var pct = Math.round(res.imr * 100);
  var mes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][hoje.getMonth()];

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<title>Boletim IMR ' + mes + '/' + hoje.getFullYear() + '</title>'
    + '<style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2cm;color:#000;}'
    + 'h1{font-size:14pt;text-align:center;margin-bottom:4px;}'
    + '.sub{text-align:center;font-size:10pt;color:#555;margin-bottom:20px;}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:14px;}'
    + 'td,th{border:1px solid #000;padding:6px 8px;font-size:10pt;}'
    + 'th{background:#dbeafe;font-weight:700;text-align:left;}'
    + '.imr-box{text-align:center;border:3px solid #003580;border-radius:8px;padding:20px;margin:16px 0;}'
    + '.imr-val{font-size:48pt;font-weight:900;color:#003580;line-height:1;}'
    + '.footer{margin-top:40px;display:flex;justify-content:space-between;}'
    + '.ass{text-align:center;border-top:1px solid #000;width:220px;padding-top:4px;font-size:9pt;}'
    + '@media print{body{margin:1.5cm;}}</style></head><body>'
    + '<h1>BOLETIM DE MEDIÇÃO — IMR</h1>'
    + '<div class="sub">' + R.ct + ' · Região ' + R.l + ' · ' + mes + '/' + hoje.getFullYear() + '</div>'
    + '<table><tr><th colspan="2">IDENTIFICAÇÃO</th></tr>'
    + '<tr><td><b>Período:</b></td><td>' + fdt(dtIni) + ' a ' + fdt(dtFim) + '</td></tr>'
    + '<tr><td><b>Região:</b></td><td>' + R.l + '</td></tr>'
    + '<tr><td><b>Fiscal Responsável:</b></td><td>' + _escA(s.nome || '—') + '</td></tr>'
    + '<tr><td><b>Total de Inspeções:</b></td><td>' + res.totalInsps + '</td></tr>'
    + '</table>'
    + '<div class="imr-box">'
    + '<div style="font-size:12pt;font-weight:700;margin-bottom:8px;">IMR APURADO</div>'
    + '<div class="imr-val">' + pct + '%</div>'
    + '<div style="font-size:11pt;margin-top:8px;">' + faixa.label + '</div>'
    + '</div>'
    + '<table><tr><th>Tipo de Serviço</th><th>Peso</th><th>Inspeções</th><th>Conformidade</th></tr>'
    + res.porTipo.sort(function(a,b){return b.peso-a.peso;}).map(function(t){
      return '<tr><td>' + t.label + '</td><td>' + (t.peso*100).toFixed(0) + '%</td>'
        + '<td>' + t.count + '</td><td><b>' + Math.round(t.media*100) + '%</b></td></tr>';
    }).join('')
    + '</table>'
    + '<p><b>Glosa aplicável:</b> ' + (faixa.glosa*100).toFixed(0) + '% sobre o valor da medição.</p>'
    + '<div class="footer">'
    + '<div class="ass">' + _escA(s.nome || '—') + '<br>Fiscal TJMG</div>'
    + '<div class="ass">_______________________<br>Coordenador</div>'
    + '<div class="ass">_______________________<br>Gestor Contrato</div>'
    + '</div></body></html>';

  var blob = new Blob([html], { type: 'text/html' });
  shareFile(blob, 'Boletim_IMR_' + mes + '_' + hoje.getFullYear() + '.html', 'Boletim IMR');
  Tt('✅ Boletim IMR exportado!');
}

window.rIMR              = rIMR;
window.calcIMRPeriodo    = calcIMRPeriodo;
window.calcIMRInsp       = calcIMRInsp;
window.exportarBoletimIMR= exportarBoletimIMR;
