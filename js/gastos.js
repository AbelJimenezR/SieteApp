'use strict';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CAT_EMOJI = {
  'Reparación': '🔧',
  'IBI':        '🏛️',
  'Seguro':     '🛡️',
  'Comunidad':  '🏘️',
  'Otros':      '📋',
};

const CAT_COLORS = {
  'Reparación': '#dc2626',
  'IBI':        '#7c3aed',
  'Seguro':     '#0891b2',
  'Comunidad':  '#16a34a',
  'Otros':      '#d97706',
};

const CATS_GASTOS = ['Reparación', 'IBI', 'Seguro', 'Comunidad', 'Otros'];

// ─── ESTAT ────────────────────────────────────────────────────────────────────

let sortGastos = { col: 'fecha', asc: false };

// ─── SORT ─────────────────────────────────────────────────────────────────────

function setSortGastos(columna) {
  sortGastos.asc = sortGastos.col === columna ? !sortGastos.asc : true;
  sortGastos.col = columna;

  ['fecha','concepto','categoria','inmueble','importe'].forEach(id => {
    const el = document.getElementById('sort-g-' + id);
    if (el) el.textContent = id === sortGastos.col ? (sortGastos.asc ? ' ▲' : ' ▼') : '';
  });
  renderGastos();
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderGastos() {
  _poblarSelectInmGastos();
  _poblarSelectAnyGastos();

  const cat   = document.getElementById('gas2-cat')?.value      || '';
  const inmId = document.getElementById('gas2-inmueble')?.value || '';
  const any   = document.getElementById('gas2-any')?.value      || '';

  let list = D.gastos.filter(g => {
    if (cat   && g.categoria !== cat)                    return false;
    if (inmId && String(g.inmueble_id) !== inmId)        return false;
    if (any   && g.fecha.slice(0, 4) !== any)            return false;
    return true;
  });

  list = _sortGastosList(list);

  _renderGasKpis();

  const sumFilt = list.reduce((a, b) => a + Number(b.importe || 0), 0);
  const countEl = document.getElementById('gas-count');
  if (countEl) countEl.textContent = `${list.length} · ${euro(sumFilt)}`;

  document.getElementById('tablaGastos').innerHTML = list.length
      ? list.map(g => _buildGastoRow(g)).join('')
      : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--mu)">
        ${D.gastos.length ? 'Ningún gasto coincide con los filtros.' : 'Sin gastos'}
       </td></tr>`;

  _renderDesglose();
}

function _poblarSelectInmGastos() {
  const sel = document.getElementById('gas2-inmueble');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">Todos</option>` +
      D.inmuebles.map(im =>
          `<option value="${im.id}"${String(im.id) === cur ? ' selected' : ''}>${im.direccion}</option>`
      ).join('');
}

function _poblarSelectAnyGastos() {
  const sel = document.getElementById('gas2-any');
  if (!sel || sel.options.length > 1) return;
  const anys = [...new Set(D.gastos.map(g => g.fecha.slice(0, 4)))].sort().reverse();
  sel.innerHTML = `<option value="">Todos</option>` +
      anys.map(a =>
          `<option value="${a}"${a === String(hoy.getFullYear()) ? ' selected' : ''}>${a}</option>`
      ).join('');
}

function _sortGastosList(list) {
  return [...list].sort((a, b) => {
    let valA, valB;
    switch (sortGastos.col) {
      case 'fecha':     valA = a.fecha;          valB = b.fecha;          break;
      case 'concepto':  valA = a.concepto.toLowerCase(); valB = b.concepto.toLowerCase(); break;
      case 'categoria': valA = a.categoria || ''; valB = b.categoria || ''; break;
      case 'inmueble':  valA = getInm(a.inmueble_id)?.direccion || ''; valB = getInm(b.inmueble_id)?.direccion || ''; break;
      case 'importe':   valA = Number(a.importe || 0); valB = Number(b.importe || 0); break;
      default: return 0;
    }
    if (valA < valB) return sortGastos.asc ? -1 :  1;
    if (valA > valB) return sortGastos.asc ?  1 : -1;
    return 0;
  });
}

function _renderGasKpis() {
  const kpisEl = document.getElementById('gas-kpis');
  if (!kpisEl) return;

  const totalAll  = D.gastos.reduce((a, b) => a + Number(b.importe || 0), 0);
  const perCat    = {};
  D.gastos.forEach(g => { perCat[g.categoria] = (perCat[g.categoria] || 0) + Number(g.importe || 0); });
  const topCat    = Object.entries(perCat).sort((a, b) => b[1] - a[1])[0];

  const perInm    = {};
  D.gastos.forEach(g => { perInm[g.inmueble_id] = (perInm[g.inmueble_id] || 0) + Number(g.importe || 0); });
  const topInm    = Object.entries(perInm).sort((a, b) => b[1] - a[1])[0];
  const topInmNom = topInm ? (getInm(parseInt(topInm[0]))?.direccion || '—') : '—';

  const totalHip  = D.inmuebles.reduce((a, im) => a + Number(im.hipoteca || 0), 0);

  kpisEl.innerHTML = `
    <div class="gas-kpi"><div class="gas-kpi-icon ki-rojo">🔧</div><div>
      <div class="gas-kpi-val" style="color:#dc2626">${euro(totalAll)}</div>
      <div class="gas-kpi-label">Total</div>
      <div class="gas-kpi-sub">${D.gastos.length} reg.</div>
    </div></div>
    <div class="gas-kpi"><div class="gas-kpi-icon ki-naranja">📊</div><div>
      <div class="gas-kpi-val">${topCat ? topCat[0] : '—'}</div>
      <div class="gas-kpi-label">Mayor cat.</div>
      <div class="gas-kpi-sub">${topCat ? euro(topCat[1]) : '0 €'}</div>
    </div></div>
    <div class="gas-kpi"><div class="gas-kpi-icon ki-azul">🏠</div><div>
      <div class="gas-kpi-val" style="font-size:13px;font-weight:800">${topInmNom !== '—' ? topInmNom.split(',')[0] : '—'}</div>
      <div class="gas-kpi-label">Mayor inm.</div>
      <div class="gas-kpi-sub">${topInm ? euro(topInm[1]) : '0 €'}</div>
    </div></div>
    <div class="gas-kpi"><div class="gas-kpi-icon ki-gris">🏦</div><div>
      <div class="gas-kpi-val">${euro(totalHip * 12)}</div>
      <div class="gas-kpi-label">Hipotecas</div>
      <div class="gas-kpi-sub">Cuotas/año</div>
    </div></div>`;
}

function _buildGastoRow(g) {
  return `
    <tr>
      <td><b>${getInm(g.inmueble_id)?.direccion || '—'}</b></td>
      <td style="color:var(--mu)">${g.fecha}</td>
      <td><span style="background:#f1f5f9;border-radius:8px;padding:3px 9px;font-size:12px;font-weight:700">
        ${CAT_EMOJI[g.categoria] || '📋'} ${g.categoria}
      </span></td>
      <td>${g.concepto}</td>
      <td><b>${euro(g.importe)}</b></td>
      <td style="white-space:nowrap;display:flex;gap:5px;align-items:center">
        <button class="cob-btn-revertir" onclick="openDocs('gasto',${g.id},\`${g.concepto}\`)" title="Docs">📎</button>
        <button class="cob-btn-revertir" onclick="editGasto(${g.id})" title="Editar">✏️</button>
        <button class="cob-btn-revertir" style="color:#dc2626;border-color:#fecaca" onclick="deleteItem('gastos',${g.id})" title="Eliminar">🗑</button>
      </td>
    </tr>`;
}

function _renderDesglose() {
  const desgloseEl = document.getElementById('gas-desglose');
  if (!desgloseEl) return;

  const perCat    = {};
  D.gastos.forEach(g => { perCat[g.categoria] = (perCat[g.categoria] || 0) + Number(g.importe || 0); });
  const totalDes  = Object.values(perCat).reduce((a, b) => a + b, 0) || 1;
  const maxVal    = Math.max(...CATS_GASTOS.map(c => perCat[c] || 0), 1);

  desgloseEl.innerHTML = CATS_GASTOS.map(c => {
    const val  = perCat[c] || 0;
    const pct  = Math.round(val / totalDes * 100);
    const barW = Math.round(val / maxVal * 100);
    return `
      <div class="gas-desglose-row">
        <div class="gas-desglose-label">${CAT_EMOJI[c] || '📋'} ${c}</div>
        <div class="gas-desglose-bar-wrap">
          <div class="gas-desglose-bar" style="width:${barW}%;background:${CAT_COLORS[c]}"></div>
        </div>
        <div class="gas-desglose-val">${euro(val)}</div>
        <div class="gas-desglose-pct">${pct}%</div>
      </div>`;
  }).join('');
}

// ─── EDIT ─────────────────────────────────────────────────────────────────────

function editGasto(id) {
  const g = D.gastos.find(x => x.id === id);
  if (!g) return;
  editingId = id;

  document.getElementById('g_inmueble').innerHTML = D.inmuebles
  .map(x => `<option value="${x.id}"${x.id === g.inmueble_id ? ' selected' : ''}>${x.direccion}</option>`).join('');
  document.getElementById('g_fecha').value     = g.fecha;
  document.getElementById('g_concepto').value  = g.concepto;
  document.getElementById('g_importe').value   = g.importe;
  document.getElementById('g_categoria').value = g.categoria;

  document.querySelector('#modalGasto h3').textContent = '🔧 Editar gasto';
  document.getElementById('modalGasto').classList.add('open');
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

async function saveGasto() {
  const row = {
    inmueble_id: parseInt(document.getElementById('g_inmueble').value),
    fecha:       document.getElementById('g_fecha').value,
    concepto:    document.getElementById('g_concepto').value.trim(),
    importe:     parseFloat(document.getElementById('g_importe').value) || 0,
    categoria:   document.getElementById('g_categoria').value,
  };
  if (!row.concepto) return showToast('El concepto es obligatorio');

  const op = editingId
      ? sb.from('gastos').update(row).eq('id', editingId)
      : sb.from('gastos').insert(row);
  const { error } = await op;
  if (error) return showToast('Error: ' + error.message);

  closeModal('modalGasto');
  await loadAll();
  showToast(editingId ? '✅ Gasto actualizado' : '✅ Gasto guardado');
}