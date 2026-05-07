'use strict';

// ─── RENDER SELECT CONTRATOS ─────────────────────────────────────────────────

function renderSelectContratos(selectedId = null, targetId = 'c_contrato') {
  const sel = document.getElementById(targetId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecciona contrato —</option>' +
      D.contratos.filter(c => c.activo).map(c => {
        const im  = getInm(c.inmueble_id);
        const inq = getInq(c.inquilino_id);
        const s   = Number(c.id) === Number(selectedId) ? ' selected' : '';
        return `<option value="${c.id}"${s}>${im?.direccion || '—'} · ${inq?.nombre || '—'} · ${euro(c.importe)}/mes</option>`;
      }).join('');
}

// ─── EDIT ─────────────────────────────────────────────────────────────────────

function editContrato(id) {
  const c = D.contratos.find(x => Number(x.id) === Number(id));
  if (!c) return;
  editingId = id;

  _poblarFormContrato();

  document.getElementById('ct_inmueble').value   = c.inmueble_id;
  document.getElementById('ct_inquilino').value  = c.inquilino_id;
  document.getElementById('ct_inicio').value     = c.fecha_inicio || '';
  document.getElementById('ct_fin').value        = c.fecha_fin    || '';
  document.getElementById('ct_importe').value    = c.importe      || '';
  document.getElementById('ct_deposito').value   = c.deposito     || '';
  document.getElementById('ct_activo').checked   = c.activo;

  document.querySelector('#modalContrato h3').textContent = '📋 Editar contrato';
  document.getElementById('modalContrato').classList.add('open');
}

function _poblarFormContrato() {
  const selInm = document.getElementById('ct_inmueble');
  const selInq = document.getElementById('ct_inquilino');
  if (selInm) {
    selInm.innerHTML = '<option value="">— Inmueble —</option>' +
        D.inmuebles.map(im =>
            `<option value="${im.id}">${im.direccion}${im.poblacion ? ' · ' + im.poblacion : ''}</option>`
        ).join('');
  }
  if (selInq) {
    selInq.innerHTML = '<option value="">— Inquilino —</option>' +
        D.inquilinos.filter(i => i.estado === 'Vigente').map(i =>
            `<option value="${i.id}">${i.nombre}</option>`
        ).join('');
  }
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

async function saveContrato() {
  const inmId = parseInt(document.getElementById('ct_inmueble').value);
  const inqId = parseInt(document.getElementById('ct_inquilino').value);
  const importe = parseFloat(document.getElementById('ct_importe').value) || 0;

  if (!inmId)    return showToast('Selecciona un inmueble');
  if (!inqId)    return showToast('Selecciona un inquilino');
  if (!importe)  return showToast('El importe es obligatorio');

  const activo = document.getElementById('ct_activo').checked;

  const row = {
    inmueble_id:  inmId,
    inquilino_id: inqId,
    fecha_inicio: document.getElementById('ct_inicio').value || null,
    fecha_fin:    document.getElementById('ct_fin').value    || null,
    importe,
    deposito:     parseFloat(document.getElementById('ct_deposito').value) || 0,
    activo,
  };

  // Actualitzar estat de l'immoble
  const estatInm = activo ? 'Alquilado' : 'Disponible';
  await sb.from('inmuebles').update({ estado: estatInm }).eq('id', inmId);

  const op = editingId
      ? sb.from('contratos').update(row).eq('id', editingId)
      : sb.from('contratos').insert(row);

  const { error } = await op;
  if (error) return showToast('Error: ' + error.message);

  closeModal('modalContrato');
  await loadAll();
  showToast(editingId ? '✅ Contrato actualizado' : '✅ Contrato creado');
}

// ─── FINALITZAR CONTRATO ─────────────────────────────────────────────────────

async function finalizarContrato(id) {
  const c = D.contratos.find(x => Number(x.id) === Number(id));
  if (!c) return;
  if (!confirm('¿Finalizar este contrato? El inmueble quedará disponible.')) return;

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await sb.from('contratos').update({
    activo:    false,
    fecha_fin: c.fecha_fin || today,
  }).eq('id', id);

  if (error) return showToast('Error: ' + error.message);

  // Alliberar immoble
  await sb.from('inmuebles').update({ estado: 'Disponible' }).eq('id', c.inmueble_id);

  await loadAll();
  showToast('✅ Contrato finalizado');
}

// ─── RENDER HISTORIAL CONTRATOS D'UN IMMOBLE ─────────────────────────────────

function renderContratosInmueble(inmId) {
  const contratos = getContratosInmueble(inmId).sort((a, b) =>
      (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')
  );

  if (!contratos.length) return `<div class="empty">Sin contratos registrados</div>`;

  return contratos.map(c => {
    const inq   = getInq(c.inquilino_id);
    const dates = c.fecha_inicio
        ? `${c.fecha_inicio}${c.fecha_fin ? ' → ' + c.fecha_fin : ' → actualidad'}`
        : 'Sin fechas';

    return `
      <div style="background:#fff;border:1px solid ${c.activo ? '#bae6fd' : '#e2e8f0'};border-radius:12px;
                  padding:12px 14px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            ${inq ? `<button onclick="goToInquilino(${inq.id})"
              style="display:inline-flex;align-items:center;gap:5px;background:#eef4ff;border:1px solid #c7d9f8;
                     border-radius:999px;padding:3px 10px 3px 6px;cursor:pointer;font:600 12px system-ui;color:#1767d1">
              <span style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                           display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#fff">
                ${inq.nombre[0].toUpperCase()}
              </span>${inq.nombre}</button>` : '—'}
            <span class="badge ${c.activo ? 'b-ok' : 'b-blue'}">${c.activo ? 'Activo' : 'Finalizado'}</span>
          </div>
          <div style="font-size:14px;font-weight:900;color:#16a34a">${euro(c.importe)}/mes</div>
        </div>
        <div style="font-size:11px;color:#6b7a90;margin-bottom:8px">📅 ${dates}</div>
        ${c.deposito ? `<div style="font-size:11px;color:#6b7a90">🏦 Depósito: ${euro(c.deposito)}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="tbtn ghost" onclick="editContrato(${c.id})">✏️ Editar</button>
          ${c.activo ? `<button class="tbtn del" onclick="finalizarContrato(${c.id})">🔴 Finalizar</button>` : ''}
        </div>
      </div>`;
  }).join('');
}