'use strict';

// sortCobros declarat aqui, la resta de globals a config.js
let sortCobros = { col: 'mes', asc: false };

// ─── FILTRE KPI ───────────────────────────────────────────────────────────────

function setCobKpi(estat, el) {
  cobKpiFilter       = estat;
  cobContratosFilter = null;
  cobInmsFilter      = null;
  document.querySelectorAll('.cob-kpi').forEach(k => k.classList.remove('actiu'));
  if (el) el.classList.add('actiu');

  const sel = document.getElementById('cob2-estado');
  if (sel) sel.value = estat;
  const selInm = document.getElementById('cob2-inmueble');
  if (selInm) selInm.value = '';
  const selMes = document.getElementById('cob2-mes');
  if (selMes) selMes.value = '';
  const selAny = document.getElementById('cob2-any');
  if (selAny) selAny.value = '';

  cobPagina = 1;
  renderCobros();
}

// ─── SORT ─────────────────────────────────────────────────────────────────────

function setSort(columna) {
  sortCobros.asc = sortCobros.col === columna ? !sortCobros.asc : true;
  sortCobros.col = columna;

  ['inmueble','inquilino','mes','importe','fecha_pago','estado'].forEach(id => {
    const el = document.getElementById('sort-' + id);
    if (el) el.textContent = id === columna ? (sortCobros.asc ? ' ▲' : ' ▼') : '';
  });
  cobPagina = 1;
  renderCobros();
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderCobros(resetPagina = false) {
  if (resetPagina) cobPagina = 1;

  _poblarSelectInmCobros();
  _poblarSelectAnyCobros();

  const estado = document.getElementById('cob2-estado')?.value  || '';
  const inmId  = document.getElementById('cob2-inmueble')?.value || '';
  const mes    = document.getElementById('cob2-mes')?.value      || '';
  const any    = document.getElementById('cob2-any')?.value      || '';

  let list = D.cobros.filter(c => {
    if (estado && c.estado !== estado) return false;
    if (mes    && c.mes.slice(5, 7) !== mes) return false;
    if (any    && c.mes.slice(0, 4) !== any) return false;

    // Filtre per contractes específics (historial immoble o inquilí)
    if (cobContratosFilter && !cobContratosFilter.has(Number(c.contrato_id))) return false;

    // Filtre per immoble via select (quan no hi ha cobContratosFilter)
    if (!cobContratosFilter && inmId) {
      const con = getContrato(c.contrato_id);
      if (!con || String(con.inmueble_id) !== inmId) return false;
    }

    return true;
  });

  list = _sortCobros(list);

  _renderCobKpis();

  const total   = list.length;
  const sumFilt = list.reduce((a, b) => a + Number(b.importe || 0), 0);
  const countEl = document.getElementById('cob-count');
  if (countEl) countEl.textContent = `${total} cobro${total !== 1 ? 's' : ''} · ${euro(sumFilt)}`;

  const totalPags = Math.max(1, Math.ceil(total / COB_PER_PAG));
  if (cobPagina > totalPags) cobPagina = totalPags;
  const inici  = (cobPagina - 1) * COB_PER_PAG;
  const paginat = list.slice(inici, inici + COB_PER_PAG);

  document.getElementById('tablaCobros').innerHTML = total
      ? paginat.map(c => _buildCobroRow(c)).join('')
      : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--mu)">
        ${D.cobros.length ? 'Ningún cobro coincide con los filtros.' : 'No hay cobros registrados.'}
       </td></tr>`;

  _renderCobPaginacio(cobPagina, totalPags, total);
}

function _poblarSelectInmCobros() {
  const sel = document.getElementById('cob2-inmueble');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">Todos</option>` +
      D.inmuebles.map(im =>
          `<option value="${im.id}"${String(im.id) === cur ? ' selected' : ''}>${im.direccion}</option>`
      ).join('');
}

function _poblarSelectAnyCobros() {
  const sel = document.getElementById('cob2-any');
  if (!sel || sel.options.length > 1) return;
  const anys = [...new Set(D.cobros.map(c => c.mes.slice(0, 4)))].sort().reverse();
  sel.innerHTML = `<option value="">Todos</option>` +
      anys.map(a =>
          `<option value="${a}"${a === String(hoy.getFullYear()) ? ' selected' : ''}>${a}</option>`
      ).join('');
}

function _sortCobros(list) {
  return [...list].sort((a, b) => {
    let valA, valB;
    const conA = getContrato(a.contrato_id);
    const conB = getContrato(b.contrato_id);
    switch (sortCobros.col) {
      case 'inmueble':
        valA = getInm(conA?.inmueble_id)?.direccion || '';
        valB = getInm(conB?.inmueble_id)?.direccion || '';
        break;
      case 'inquilino':
        valA = getInq(conA?.inquilino_id)?.nombre || 'ZZZ';
        valB = getInq(conB?.inquilino_id)?.nombre || 'ZZZ';
        break;
      case 'mes':       valA = a.mes; valB = b.mes; break;
      case 'importe':   valA = Number(a.importe); valB = Number(b.importe); break;
      case 'fecha_pago':valA = a.fecha_pago || '0000-00-00'; valB = b.fecha_pago || '0000-00-00'; break;
      case 'estado': {
        const p = { Retrasado: 0, Pendiente: 1, Pagado: 2 };
        valA = p[a.estado] ?? 9; valB = p[b.estado] ?? 9; break;
      }
      default: return 0;
    }
    if (valA < valB) return sortCobros.asc ? -1 :  1;
    if (valA > valB) return sortCobros.asc ?  1 : -1;
    return 0;
  });
}

function _renderCobKpis() {
  const kpisEl = document.getElementById('cob-kpis');
  if (!kpisEl) return;

  const sum = (estat) => D.cobros.filter(c => c.estado === estat).reduce((a, b) => a + Number(b.importe || 0), 0);
  const cnt = (estat) => D.cobros.filter(c => c.estado === estat).length;
  const sumAll = D.cobros.reduce((a, b) => a + Number(b.importe || 0), 0);

  const kpi = (estat, icon, bgClass, color, label, sub) => `
    <div class="cob-kpi${cobKpiFilter === estat ? ' actiu' : ''}" onclick="setCobKpi('${estat}',this)">
      <div class="cob-kpi-icon ${bgClass}">${icon}</div>
      <div>
        <div class="cob-kpi-val" style="color:${color}">${sum(estat).toLocaleString('es-ES')} €</div>
        <div class="cob-kpi-label">${label}</div>
        <div class="cob-kpi-sub">${sub(cnt(estat))}</div>
      </div>
    </div>`;

  kpisEl.innerHTML =
      kpi('Pagado',    '✅', 'ki-verde',  '#16a34a', 'Cobrado',   n => `${n} pagos`) +
      kpi('Pendiente', '⏳', 'ki-naranja','#d97706', 'Pendiente', n => String(n)) +
      kpi('Retrasado', '🚨', 'ki-rojo',  '#dc2626', 'Retrasado', n => String(n)) +
      `<div class="cob-kpi${!cobKpiFilter && !document.getElementById('cob2-estado')?.value ? ' actiu' : ''}" onclick="setCobKpi('',this)">
      <div class="cob-kpi-icon ki-gris">💳</div>
      <div>
        <div class="cob-kpi-val">${sumAll.toLocaleString('es-ES')} €</div>
        <div class="cob-kpi-label">Total</div>
        <div class="cob-kpi-sub">${D.cobros.length} cobros</div>
      </div>
    </div>`;
}

function _buildCobroRow(c) {
  const con  = getContrato(c.contrato_id);
  const im   = con ? getInm(con.inmueble_id)   : null;
  const inq  = con ? getInq(con.inquilino_id)  : null;
  const pagat = c.estado === 'Pagado';
  const retr  = c.estado === 'Retrasado';
  const rowCls = pagat ? 'pagat' : retr ? 'retrassat' : '';

  const estatHtml = pagat
      ? `<span class="badge b-ok">Pagado</span>`
      : retr
          ? `<span class="badge b-bad">Retrasado</span>`
          : `<span class="badge b-warn">Pendiente</span>`;

  const cobrarBtn = pagat
      ? `<button class="cob-btn-cobrar ja-pagat" onclick="toggleCobro(${c.id},'${c.estado}')">✓ Pagado</button>`
      : `<button class="cob-btn-cobrar"          onclick="toggleCobro(${c.id},'${c.estado}')">✅ Cobrar</button>`;

  return `
    <tr class="${rowCls}">
      <td><b>${im?.direccion || '-'}</b></td>
      <td>${inq?.nombre || '—'}</td>
      <td>${fmtMes(c.mes)}</td>
      <td><b>${euro(c.importe)}</b></td>
      <td style="color:var(--mu);font-size:12px">${c.fecha_pago || '—'}</td>
      <td>${estatHtml}</td>
      <td style="white-space:nowrap;display:flex;gap:5px;align-items:center">
        ${cobrarBtn}
        <button class="cob-btn-revertir" onclick="editCobro(${c.id})" title="Editar">✏️</button>
        <button class="cob-btn-revertir" style="color:#dc2626;border-color:#fecaca" onclick="deleteItem('cobros',${c.id})" title="Eliminar">🗑</button>
      </td>
    </tr>`;
}

// ─── PAGINACIO ────────────────────────────────────────────────────────────────

function _renderCobPaginacio(paginaActual, totalPags, totalItems) {
  const el = document.getElementById('cob-paginacio');
  if (!el) return;
  if (totalPags <= 1) { el.innerHTML = ''; return; }

  const inici = (paginaActual - 1) * COB_PER_PAG + 1;
  const fi    = Math.min(paginaActual * COB_PER_PAG, totalItems);
  const rang  = 2;
  let pagBtns = '';

  for (let p = 1; p <= totalPags; p++) {
    if (p === 1 || p === totalPags || (p >= paginaActual - rang && p <= paginaActual + rang)) {
      const actiu = p === paginaActual;
      pagBtns += `<button onclick="setCobPagina(${p})"
        style="min-width:32px;height:32px;border-radius:8px;border:1px solid ${actiu ? 'var(--pri)' : '#e2e8f0'};
               background:${actiu ? 'var(--pri)' : '#fff'};color:${actiu ? '#fff' : 'var(--tx)'};
               font:${actiu ? '800' : '600'} 13px system-ui;cursor:pointer;padding:0 8px">${p}</button>`;
    } else if (p === paginaActual - rang - 1 || p === paginaActual + rang + 1) {
      pagBtns += `<span style="color:var(--mu);padding:0 2px">…</span>`;
    }
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
                padding:12px 4px 4px;font-size:12px;color:var(--mu)">
      <span>${inici}–${fi} de ${totalItems}</span>
      <div style="display:flex;align-items:center;gap:4px">
        <button onclick="setCobPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}
          style="width:32px;height:32px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;
                 cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;
                 opacity:${paginaActual === 1 ? '.35' : '1'}">‹</button>
        ${pagBtns}
        <button onclick="setCobPagina(${paginaActual + 1})" ${paginaActual === totalPags ? 'disabled' : ''}
          style="width:32px;height:32px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;
                 cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;
                 opacity:${paginaActual === totalPags ? '.35' : '1'}">›</button>
      </div>
    </div>`;
}

function setCobPagina(p) {
  const totalPags = Math.ceil(D.cobros.length / COB_PER_PAG);
  if (p < 1 || p > totalPags) return;
  cobPagina = p;
  renderCobros();
  document.querySelector('.cob-table-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── EDIT ─────────────────────────────────────────────────────────────────────

function editCobro(id) {
  const c = D.cobros.find(x => x.id === id);
  if (!c) return;
  editingId = id;

  const con = getContrato(c.contrato_id);
  document.getElementById('c_contrato').innerHTML = D.contratos.map(ct => {
    const im  = getInm(ct.inmueble_id);
    const inq = getInq(ct.inquilino_id);
    return `<option value="${ct.id}"${ct.id === c.contrato_id ? ' selected' : ''}>${im?.direccion || '—'} · ${inq?.nombre || '—'}</option>`;
  }).join('');
  document.getElementById('c_mes').value     = c.mes;
  document.getElementById('c_importe').value = c.importe;
  document.getElementById('c_estado').value  = c.estado;

  document.querySelector('#modalCobro h3').textContent = '💰 Editar cobro';
  document.getElementById('modalCobro').classList.add('open');
}

function prefillImportCobro() {
  if (editingId) return;
  const conId = parseInt(document.getElementById('c_contrato').value);
  const con   = getContrato(conId);
  if (con) document.getElementById('c_importe').value = con.importe || '';
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

async function saveCobro() {
  const contratoId = parseInt(document.getElementById('c_contrato').value);
  const mesDesde   = document.getElementById('c_mes').value;
  const mesFins    = document.getElementById('c_mes_fins').value || mesDesde;

  if (!contratoId) return showToast('Selecciona un contrato');
  if (!mesDesde)   return showToast('Selecciona un mes');
  if (mesFins < mesDesde) return showToast('El mes hasta debe ser igual o posterior al mes desde');

  const importe  = parseFloat(document.getElementById('c_importe').value) || 0;
  const estado   = document.getElementById('c_estado').value;
  const fechaPago = estado === 'Pagado' ? new Date().toISOString().slice(0, 10) : null;

  // Generar llista de mesos del rang
  const mesos = [];
  let [any, mes] = mesDesde.split('-').map(Number);
  const [anyFi, mesFi] = mesFins.split('-').map(Number);
  while (any < anyFi || (any === anyFi && mes <= mesFi)) {
    mesos.push(`${any}-${String(mes).padStart(2, '0')}`);
    mes++;
    if (mes > 12) { mes = 1; any++; }
  }

  if (editingId) {
    // Edició: actualitzar només el primer mes
    const row = { contrato_id: contratoId, mes: mesDesde, importe, estado, fecha_pago: fechaPago };
    const { error } = await sb.from('cobros').update(row).eq('id', editingId);
    if (error) return showToast('Error: ' + error.message);
    closeModal('modalCobro');
    await loadAll();
    return showToast('✅ Cobro actualizado');
  }

  // Creació: filtrar duplicats
  const duplicats = mesos.filter(m =>
      D.cobros.find(c => Number(c.contrato_id) === contratoId && c.mes === m)
  );
  const nous = mesos.filter(m => !duplicats.includes(m));

  if (!nous.length) {
    return showToast(`Ya existen cobros para todos los meses seleccionados`);
  }

  const rows = nous.map(m => ({
    contrato_id: contratoId,
    mes:         m,
    importe,
    estado,
    fecha_pago:  fechaPago,
  }));

  const { error } = await sb.from('cobros').insert(rows);
  if (error) return showToast('Error: ' + error.message);

  closeModal('modalCobro');
  await loadAll();

  if (duplicats.length > 0) {
    showToast(`✅ ${nous.length} cobro${nous.length !== 1 ? 's' : ''} creado${nous.length !== 1 ? 's' : ''}. ⚠️ ${duplicats.length} ya existían (${duplicats.map(fmtMes).join(', ')})`, 4000);
  } else {
    showToast(`✅ ${nous.length} cobro${nous.length !== 1 ? 's' : ''} creado${nous.length !== 1 ? 's' : ''}`);
  }
}

// ─── TOGGLE PAGAT ────────────────────────────────────────────────────────────

async function toggleCobro(id, estadoActual) {
  const nou = estadoActual === 'Pagado' ? 'Pendiente' : 'Pagado';
  const { error } = await sb.from('cobros').update({
    estado:     nou,
    fecha_pago: nou === 'Pagado' ? new Date().toISOString().slice(0, 10) : null,
  }).eq('id', id);
  if (error) return showToast('Error: ' + error.message);
  await loadAll();
}

// ─── COBRAR TOTS ─────────────────────────────────────────────────────────────

async function cobrarTots() {
  const inmId = document.getElementById('cob2-inmueble')?.value || '';
  const mes   = document.getElementById('cob2-mes')?.value      || '';
  const any   = document.getElementById('cob2-any')?.value      || '';

  const pendents = D.cobros.filter(c => {
    if (c.estado === 'Pagado') return false;
    if (mes && c.mes.slice(5, 7) !== mes) return false;
    if (any && c.mes.slice(0, 4) !== any) return false;
    if (inmId) {
      const con = getContrato(c.contrato_id);
      if (!con || String(con.inmueble_id) !== inmId) return false;
    }
    return true;
  });

  if (!pendents.length) return showToast('No hay cobros pendientes con los filtros actuales');
  if (!confirm(`Marcar ${pendents.length} cobro${pendents.length !== 1 ? 's' : ''} como Pagado?`)) return;

  const avui = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from('cobros')
  .update({ estado: 'Pagado', fecha_pago: avui })
  .in('id', pendents.map(c => c.id));
  if (error) return showToast('Error: ' + error.message);

  await loadAll();
  showToast(`✅ ${pendents.length} cobro${pendents.length !== 1 ? 's' : ''} marcado${pendents.length !== 1 ? 's' : ''} como Pagado`);
}

// ─── GENERAR COBROS DEL MES ───────────────────────────────────────────────────

async function generarCobrosMes() {
  const contratosActius = D.contratos.filter(c => c.activo);
  if (!contratosActius.length) return showToast('No hay contratos activos');

  const jaExistents = new Set(
      D.cobros.filter(c => c.mes === ymActual).map(c => c.contrato_id)
  );
  const nous = contratosActius.filter(c => !jaExistents.has(c.id));

  if (!nous.length) return showToast(`Ya existen cobros para todos los contratos en ${ymActual}`);

  const llistaNous = nous.map(c => {
    const im  = getInm(c.inmueble_id);
    const inq = getInq(c.inquilino_id);
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9">
        <div>
          <div style="font-size:13px;font-weight:600">${im?.direccion || '—'}</div>
          <div style="font-size:11px;color:#6b7a90">${inq?.nombre || '—'}</div>
        </div>
        <div style="font-size:13px;font-weight:800;color:#16a34a">${euro(c.importe)}</div>
      </div>`;
  }).join('');

  const total = nous.reduce((a, c) => a + Number(c.importe || 0), 0);

  document.getElementById('modal-generar-body').innerHTML = `
    <p style="font-size:13px;color:#6b7a90;margin:0 0 12px">
      Se crearán <b>${nous.length} cobro${nous.length !== 1 ? 's' : ''}</b> para <b>${fmtMes(ymActual)}</b>:
    </p>
    ${llistaNous}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0;font-size:14px;font-weight:800">
      <span>Total</span>
      <span style="color:#16a34a">${euro(total)}</span>
    </div>`;

  document.getElementById('btn-confirmar-generar').dataset.nous = JSON.stringify(
      nous.map(c => ({ contrato_id: c.id, importe: c.importe, inmueble_id: c.inmueble_id }))
  );

  document.getElementById('modalGenerar').classList.add('open');
}

async function confirmarGenerarCobros() {
  const btn  = document.getElementById('btn-confirmar-generar');
  const nous = JSON.parse(btn.dataset.nous || '[]');

  closeModal('modalGenerar');

  const rows = nous.map(n => {
    const im = getInm(n.inmueble_id);
    return {
      contrato_id: n.contrato_id,
      mes:         ymActual,
      importe:     n.importe,
      estado:      _estatCobroAvui(im?.dia_pago, ymActual),
      fecha_pago:  null,
    };
  });

  const { error } = await sb.from('cobros').insert(rows);
  if (error) return showToast('Error: ' + error.message);

  await loadAll();
  showToast(`✅ ${rows.length} cobro${rows.length !== 1 ? 's' : ''} creado${rows.length !== 1 ? 's' : ''} para ${fmtMes(ymActual)}`);
}

function _estatCobroAvui(diaPago, mes) {
  if (!diaPago) return 'Pendiente';
  const [any, mesNum] = mes.split('-').map(Number);
  const diaLimit = new Date(any, mesNum - 1, diaPago);
  return new Date() > diaLimit ? 'Retrasado' : 'Pendiente';
}