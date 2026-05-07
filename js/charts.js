'use strict';

// ─── ESTAT ────────────────────────────────────────────────────────────────────

let chartEvol = null;
let chartInm  = null;
let rangeEvol = 6;
let rangeInm  = 6;

// ─── RANG ─────────────────────────────────────────────────────────────────────

function setChartRange(which, months, btn) {
  document.getElementById(`range-${which}`).querySelectorAll('button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  if (which === 'evol') { rangeEvol = months; renderChartEvol(); }
  else                  { rangeInm  = months; renderChartInm(); }
}

function getMesosRange(months) {
  const tots = [...new Set([
    ...D.cobros.map(c => c.mes),
    ...D.gastos.map(g => g.fecha.slice(0, 7)),
  ])].sort();
  return (!months || tots.length <= months) ? tots : tots.slice(-months);
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderCharts() {
  renderChartEvol();
  renderChartInm();
}

function renderChartEvol() {
  const canvas = document.getElementById('chartEvol');
  if (!canvas) return;
  const mesos = getMesosRange(rangeEvol);
  if (!mesos.length) return;

  const cobros   = mesos.map(m =>
      D.cobros.filter(c => c.mes === m && c.estado === 'Pagado')
      .reduce((a, b) => a + Number(b.importe || 0), 0));
  const gastos   = mesos.map(m =>
      D.gastos.filter(g => g.fecha.slice(0, 7) === m)
      .reduce((a, b) => a + Number(b.importe || 0), 0));
  const benefici = mesos.map((_, i) => cobros[i] - gastos[i]);
  const labels   = mesos.map(m => { const [y, mo] = m.split('-'); return `${mo}/${y.slice(2)}`; });

  if (chartEvol) chartEvol.destroy();
  chartEvol = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        { type: 'bar',  label: 'Cobros',   data: cobros,   backgroundColor: 'rgba(22,163,74,.7)',    borderRadius: 6, order: 2 },
        { type: 'bar',  label: 'Gastos',   data: gastos,   backgroundColor: 'rgba(220,38,38,.6)',   borderRadius: 6, order: 2 },
        { type: 'line', label: 'Beneficio',data: benefici,
          borderColor: '#1767d1', backgroundColor: 'rgba(23,103,209,.1)',
          borderWidth: 2, pointRadius: 3, fill: true, tension: 0.3, order: 1 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: '#f1f5f9' }, ticks: {
            font: { size: 10 },
            callback: v => v.toLocaleString('es-ES', { minimumFractionDigits: 0 }) + '€',
          }},
      },
    },
  });
}

function renderChartInm() {
  const canvas = document.getElementById('chartInm');
  if (!canvas) return;
  const mesos = getMesosRange(rangeInm);
  if (!mesos.length || !D.inmuebles.length) return;

  const inms      = D.inmuebles;
  const ingressos = inms.map(im =>
      D.cobros.filter(c => c.inmueble_id === im.id && mesos.includes(c.mes) && c.estado === 'Pagado')
      .reduce((a, b) => a + Number(b.importe || 0), 0));
  const despeses  = inms.map(im =>
      D.gastos.filter(g => g.inmueble_id === im.id && mesos.includes(g.fecha.slice(0, 7)))
      .reduce((a, b) => a + Number(b.importe || 0), 0));
  const benefici  = inms.map((_, i) => ingressos[i] - despeses[i]);
  const labels    = inms.map(im => im.direccion);

  // Alçada dinàmica
  const wrap = canvas.parentElement;
  wrap.style.height = Math.max(180, inms.length * 72) + 'px';

  if (chartInm) chartInm.destroy();
  chartInm = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Ingresos',  data: ingressos, backgroundColor: 'rgba(22,163,74,.75)',  borderRadius: 4 },
        { label: 'Gastos',    data: despeses,  backgroundColor: 'rgba(220,38,38,.65)', borderRadius: 4 },
        { label: 'Beneficio', data: benefici,  backgroundColor: 'rgba(23,103,209,.75)', borderRadius: 4 },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: {
            font: { size: 10 },
            callback: v => v.toLocaleString('es-ES', { minimumFractionDigits: 0 }) + '€',
          }},
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 }, crossAlign: 'far' },
          categoryPercentage: 0.7,
          barPercentage: 0.8,
        },
      },
    },
  });
}