'use strict';

// ─── ESTAT FILTRE ─────────────────────────────────────────────────────────────

let inqEstado = 'Vigente';

function setInqChip(val, btn) {
  inqEstado = val;
  document.getElementById('chips-inq-estado').querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');
  renderInquilinos();
}

const AVATAR_COLORS = [
  '#1767d1','#0d9488','#7c3aed','#c2410c','#0891b2',
  '#15803d','#9333ea','#b45309','#dc2626','#0369a1',
];

function avatarColor(id) {
  return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length];
}

// ─── RENDER LLISTA ────────────────────────────────────────────────────────────

function renderInquilinos() {
  const sel = document.getElementById('inq-inmueble');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = `<option value="">Todos los inmuebles</option>` +
        D.inmuebles.map(im =>
            `<option value="${im.id}"${String(im.id) === cur ? ' selected' : ''}>${im.direccion}</option>`
        ).join('');
  }

  const txt   = (document.getElementById('inq-texto')?.value || '').toLowerCase().trim();
  const inmId = document.getElementById('inq-inmueble')?.value || '';

  const list = D.inquilinos.filter(i => {
    if (inqEstado && i.estado !== inqEstado) return false;
    if (inmId && !getContratosActivosInquilino(i.id).some(c => String(c.inmueble_id) === inmId)) return false;
    if (txt && !`${i.nombre} ${i.telefono || ''} ${i.email || ''}`.toLowerCase().includes(txt)) return false;
    return true;
  });

  const total   = D.inquilinos.length;
  const countEl = document.getElementById('inq-count');
  if (countEl) {
    countEl.textContent = list.length === total
        ? `${total} inquilino${total !== 1 ? 's' : ''}`
        : `${list.length} de ${total} inquilino${total !== 1 ? 's' : ''}`;
  }

  _renderInqKpis();

  if (!list.length) {
    document.getElementById('inquilinos').innerHTML =
        `<div class="empty">${D.inquilinos.length ? 'Ningún inquilino coincide con los filtros.' : 'No hay inquilinos registrados.'}</div>`;
    return;
  }

  document.getElementById('inquilinos').innerHTML = `
    <div style="background:#fff;border:1px solid var(--br);border-radius:16px;overflow:hidden;box-shadow:var(--sh)">
      ${list.map((i, idx) => _buildInqRow(i, idx, list.length)).join('')}
    </div>`;
}

function _buildInqRow(i, idx, total) {
  const esBaja          = i.estado === 'Baja';
  const contratosActius = getContratosActivosInquilino(i.id);
  const rentaTotal      = getRentaInq(i.id);
  const tel             = i.telefono || '';
  const inicial         = (i.nombre || '?')[0].toUpperCase();
  const bgColor         = avatarColor(i.id);

  // Cobro del mes actual (primer contracte actiu)
  const cobroMes = D.cobros.find(c => {
    return contratosActius.some(ct => Number(ct.id) === Number(c.contrato_id)) && c.mes === ymActual;
  });

  const cobroIcon = cobroMes
      ? cobroMes.estado === 'Pagado'    ? '<span style="font-size:16px">✅</span>'
          : cobroMes.estado === 'Retrasado' ? '<span style="font-size:16px">🔴</span>'
              :                                    '<span style="font-size:16px">⏳</span>'
      : '<span style="font-size:16px;color:#e2e8f0">○</span>';

  const borderBottom = idx < total - 1 ? 'border-bottom:1px solid #f1f5f9' : '';
  const bgStyle      = esBaja ? 'background:#fafafa;opacity:.7;' : '';

  const inmsNoms = contratosActius.map(c => getInm(c.inmueble_id)?.direccion || '').filter(Boolean);

  return `
    <div data-inq-id="${i.id}" onclick="openInqDetall(${i.id})" style="display:flex;align-items:center;gap:12px;padding:12px 16px;
         cursor:pointer;transition:background .15s;${bgStyle}${borderBottom}"
         onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${esBaja ? '#fafafa' : '#fff'}'">

      <div style="width:40px;height:40px;border-radius:50%;flex-shrink:0;background:${bgColor};
                  display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff">
        ${inicial}
      </div>

      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:14px;font-weight:700;color:#1a2535">${i.nombre}</span>
          ${esBaja ? '<span class="badge b-bad" style="font-size:10px">Baja</span>' : ''}
          ${contratosActius.length > 1 ? `<span class="badge b-blue" style="font-size:10px">${contratosActius.length} inmuebles</span>` : ''}
        </div>
        <div style="font-size:11px;color:#6b7a90;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${inmsNoms.length ? inmsNoms.join(' · ') : 'Sin inmueble asignado'}
        </div>
      </div>

      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:13px;font-weight:800;color:${rentaTotal > 0 ? '#16a34a' : '#94a3b8'}">${rentaTotal > 0 ? euro(rentaTotal) + '/mes' : '—'}</div>
        <div style="margin-top:4px">${cobroIcon}</div>
      </div>

      <span style="color:#cbd5e1;font-size:18px;flex-shrink:0">›</span>
    </div>`;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

function _renderInqKpis() {
  const kpisEl = document.getElementById('inq-kpis');
  if (!kpisEl) return;

  const vigents      = D.inquilinos.filter(i => i.estado === 'Vigente');
  const rentaTotal   = vigents.reduce((a, i) => a + getRentaInq(i.id), 0);
  const depositTotal = D.contratos.filter(c => c.activo).reduce((a, c) => a + Number(c.deposito || 0), 0);
  const avui         = new Date();
  const propVencen   = vigents.filter(i =>
      getContratosActivosInquilino(i.id).some(c => {
        if (!c.fecha_fin) return false;
        const diff = (new Date(c.fecha_fin) - avui) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 60;
      })
  ).length;

  kpisEl.innerHTML = `
    <div class="inq-kpi"><div class="inq-kpi-icon ki-morado">👤</div><div>
      <div class="inq-kpi-val">${vigents.length}</div>
      <div class="inq-kpi-label">Inquilinos</div>
      <div class="inq-kpi-sub">Vigentes</div>
    </div></div>
    <div class="inq-kpi"><div class="inq-kpi-icon ki-naranja">💰</div><div>
      <div class="inq-kpi-val" style="color:#d97706">${euro(rentaTotal)}</div>
      <div class="inq-kpi-label">Alquiler/mes</div>
      <div class="inq-kpi-sub">Total</div>
    </div></div>
    <div class="inq-kpi"><div class="inq-kpi-icon ki-azul">🏦</div><div>
      <div class="inq-kpi-val" style="color:#d97706">${euro(depositTotal)}</div>
      <div class="inq-kpi-label">Depósitos</div>
      <div class="inq-kpi-sub">Garantías</div>
    </div></div>
    <div class="inq-kpi"><div class="inq-kpi-icon ki-rojo">📅</div><div>
      <div class="inq-kpi-val" style="color:${propVencen > 0 ? '#dc2626' : '#16a34a'}">${propVencen}</div>
      <div class="inq-kpi-label">Vencen pronto</div>
      <div class="inq-kpi-sub">${propVencen === 0 ? 'Todo ok' : 'En 60 días'}</div>
    </div></div>`;
}

// ─── MODAL DETALL INQUILÍ ─────────────────────────────────────────────────────

function openInqDetall(id) {
  const i = D.inquilinos.find(x => x.id === id);
  if (!i) return;

  const esBaja          = i.estado === 'Baja';
  const tel             = i.telefono || '';
  const wa              = tel.replace(/[^\d]/g, '').replace(/^(?!34)/, '34');
  const msg             = encodeURIComponent(`Hola ${i.nombre}, te contacto por tu alquiler.`);
  const inicial         = (i.nombre || '?')[0].toUpperCase();
  const bgColor         = avatarColor(i.id);
  const contratosActius = getContratosActivosInquilino(i.id);
  const totsContratos   = getContratosInquilino(i.id);
  const rentaTotal      = getRentaInq(i.id);

  // Cobros
  const contratoIds = totsContratos.map(c => c.id);
  const cobrosInq   = D.cobros
  .filter(c => contratoIds.some(id => Number(id) === Number(c.contrato_id)))
  .sort((a, b) => b.mes.localeCompare(a.mes))
  .slice(0, 8);

  const cobratsPagats = cobrosInq.filter(c => c.estado === 'Pagado').length;
  const pct           = cobrosInq.length > 0 ? Math.round(cobratsPagats / cobrosInq.length * 100) : 0;

  const cobrosHTML = cobrosInq.length ? cobrosInq.map(c => {
    const con   = getContrato(c.contrato_id);
    const im    = con ? getInm(con.inmueble_id) : null;
    const pagat = c.estado === 'Pagado';
    const retr  = c.estado === 'Retrasado';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9">
        <span style="font-size:11px;color:#6b7a90;flex-shrink:0">${fmtMes(c.mes)}</span>
        <span style="font-size:11px;color:#94a3b8;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${im?.direccion || '—'}</span>
        <span style="font-size:12px;font-weight:700;flex-shrink:0">${euro(c.importe)}</span>
        <span class="badge ${pagat ? 'b-ok' : retr ? 'b-bad' : 'b-warn'}" style="font-size:10px;flex-shrink:0">${c.estado}</span>
        ${!pagat ? `<button class="cob-btn-cobrar" onclick="toggleCobro(${c.id},'${c.estado}');closeModal('modalInqDetall')"
                    style="padding:4px 10px;font-size:11px;flex-shrink:0">✅</button>` : ''}
      </div>`;
  }).join('') : `<div style="font-size:12px;color:#94a3b8;padding:8px 0">Sin cobros registrados</div>`;

  // Contractes actius
  const contratosHTML = contratosActius.map(c => {
    const im = getInm(c.inmueble_id);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;cursor:pointer"
           onclick="closeModal('modalInqDetall');goToInmueble(${im?.id})">
        <div style="width:32px;height:32px;border-radius:9px;background:${getInmColor(im?.id)};
                    display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">🏠</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${im?.direccion || '—'}</div>
          <div style="font-size:11px;color:#6b7a90">${c.fecha_inicio || ''}${c.fecha_fin ? ' → ' + c.fecha_fin : ''}</div>
        </div>
        <div style="font-size:13px;font-weight:800;color:#16a34a;flex-shrink:0">${euro(c.importe)}/mes</div>
        <span style="color:#cbd5e1;font-size:14px">›</span>
      </div>`;
  }).join('');

  document.getElementById('inq-detall-body').innerHTML = `
    <!-- Capçalera -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-right:20px">
      <div style="width:52px;height:52px;border-radius:50%;background:${bgColor};flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff">
        ${inicial}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:18px;font-weight:900;color:#1a2535">${i.nombre}</div>
        ${tel ? `<div style="font-size:13px;color:#6b7a90;margin-top:2px">${tel}</div>` : ''}
        ${i.email ? `<div style="font-size:12px;color:#6b7a90">${i.email}</div>` : ''}
      </div>
      ${esBaja ? '<span class="badge b-bad">Baja</span>' : '<span class="badge b-ok">Vigente</span>'}
    </div>

    <!-- Contacte ràpid -->
    ${!esBaja && tel ? `
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <a href="tel:${tel}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
         background:#dcfce7;border-radius:10px;padding:10px;font:600 13px system-ui;color:#15803d;text-decoration:none">
        📞 Llamar
      </a>
      <a href="https://wa.me/${wa}?text=${msg}" target="_blank"
         style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
         background:#dcfce7;border-radius:10px;padding:10px;font:600 13px system-ui;color:#15803d;text-decoration:none">
        💬 WhatsApp
      </a>
      ${i.email ? `<a href="mailto:${i.email}?subject=Alquiler"
         style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
         background:#dbeafe;border-radius:10px;padding:10px;font:600 13px system-ui;color:#1d4ed8;text-decoration:none">
        ✉️ Email
      </a>` : ''}
    </div>` : ''}

    <!-- Resum pagaments -->
    ${cobrosInq.length ? `
    <div style="background:#f8fafc;border-radius:12px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="flex:1">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:6px">Historial de pagos</div>
        <div style="background:#e2e8f0;border-radius:999px;height:6px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:#16a34a;border-radius:999px"></div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:14px;font-weight:900;color:#16a34a">${pct}%</div>
        <div style="font-size:11px;color:#6b7a90">${cobratsPagats}/${cobrosInq.length}</div>
      </div>
    </div>` : ''}

    <!-- Contractes actius -->
    ${contratosActius.length ? `
    <div style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">
      Inmuebles · <span style="color:#16a34a">${euro(rentaTotal)}/mes</span>
    </div>
    <div style="margin-bottom:16px">${contratosHTML}</div>` : ''}

    <!-- Últims cobros -->
    <div style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Últimos cobros</div>
    <div style="margin-bottom:16px">${cobrosHTML}</div>

    <!-- Botons -->
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="inm-btn-edit" onclick="closeModal('modalInqDetall');goToCobrosInquilino(${i.id})" style="flex:1">📋 Historial</button>
      <button class="inm-btn-edit" onclick="closeModal('modalInqDetall');openDocs('inquilino',${i.id},\`${i.nombre}\`)" style="flex:1">📄 Docs</button>
      <button class="inm-btn-edit" onclick="closeModal('modalInqDetall');editInquilino(${i.id})" style="flex:1">✏️ Editar</button>
      ${esBaja
      ? `<button class="inm-btn-edit" onclick="closeModal('modalInqDetall');reactivarInquilino(${i.id})" style="color:#15803d">♻️</button>`
      : `<button class="inm-btn-del"  onclick="closeModal('modalInqDetall');darBajaInquilino(${i.id},'${i.nombre}')">🗑</button>`}
    </div>`;

  document.getElementById('modalInqDetall').classList.add('open');
}

// ─── EDIT ─────────────────────────────────────────────────────────────────────

function editInquilino(id) {
  const i = D.inquilinos.find(x => x.id === id);
  if (!i) return;
  editingId = id;

  document.getElementById('i_nombre').value   = i.nombre;
  document.getElementById('i_telefono').value = i.telefono || '';
  document.getElementById('i_email').value    = i.email    || '';

  document.querySelector('#modalInquilino h3').textContent = '👤 Editar inquilino';
  document.getElementById('modalInquilino').classList.add('open');
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

async function saveInquilino() {
  const row = {
    nombre:   document.getElementById('i_nombre').value.trim(),
    telefono: document.getElementById('i_telefono').value.trim(),
    email:    document.getElementById('i_email').value.trim(),
    estado:   'Vigente',
  };
  if (!row.nombre) return showToast('El nombre es obligatorio');

  const op = editingId
      ? sb.from('inquilinos').update(row).eq('id', editingId)
      : sb.from('inquilinos').insert(row);
  const { error } = await op;
  if (error) return showToast('Error: ' + error.message);

  closeModal('modalInquilino');
  await loadAll();
  showToast(editingId ? '✅ Inquilino actualizado' : '✅ Inquilino guardado');
}

// ─── BAJA / REACTIVAR ─────────────────────────────────────────────────────────

async function darBajaInquilino(id, nombre) {
  if (!confirm(`¿Dar de baja a ${nombre}?\nSe conservará todo su historial.`)) return;
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from('inquilinos').update({ estado: 'Baja', fecha_baja: today }).eq('id', id);
  if (error) return showToast('Error: ' + error.message);
  await loadAll();
  showToast(`✅ ${nombre} dado de baja`);
}

async function reactivarInquilino(id) {
  const { error } = await sb.from('inquilinos').update({ estado: 'Vigente', fecha_baja: null }).eq('id', id);
  if (error) return showToast('Error: ' + error.message);
  await loadAll();
  showToast('✅ Inquilino reactivado');
}

// ─── HISTORIAL COBROS ─────────────────────────────────────────────────────────

function goToCobrosInquilino(inqId) {
  const contratoIds = getContratosInquilino(inqId).map(c => c.id);
  if (!contratoIds.length) return showToast('Este inquilino no tiene contratos');

  const btn = [...document.querySelectorAll('.nav button')]
  .find(b => b.querySelector('.nlabel')?.textContent === 'Cobros');
  goTo('page-cobros', btn || null);

  setTimeout(() => {
    cobContratosFilter = new Set(contratoIds.map(Number));
    cobInmsFilter      = null;
    const selEst = document.getElementById('cob2-estado');
    const selAny = document.getElementById('cob2-any');
    const selInm = document.getElementById('cob2-inmueble');
    if (selEst) selEst.value = '';
    if (selAny) selAny.value = '';
    if (selInm) selInm.value = '';
    cobKpiFilter = '';
    cobPagina    = 1;
    renderCobros();
  }, 50);
}