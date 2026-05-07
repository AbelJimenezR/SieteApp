'use strict';

// ─── HELPERS FORMULARI ────────────────────────────────────────────────────────

function _poblarSelectParent(selectedId = null, excludeId = null) {
  const sel = document.getElementById('f_parent');
  if (!sel) return;
  // Mostrar immobles principals (sense parent_id) excloent l'actual
  const candidats = D.inmuebles.filter(im => !im.parent_id && im.id !== excludeId);
  sel.innerHTML = '<option value="">— Inmueble independiente —</option>' +
      candidats.map(im => {
        const s = Number(im.id) === Number(selectedId) ? ' selected' : '';
        return `<option value="${im.id}"${s}>${im.direccion}${im.poblacion ? ' · ' + im.poblacion : ''}</option>`;
      }).join('');
}

// ─── FILTRES ──────────────────────────────────────────────────────────────────

const F = { estado: '', tipo: '' };

function setChip(group, val, btn) {
  F[group] = val;
  document.getElementById('chips-' + group).querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');
  renderInmuebles();
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderInmuebles() {
  const txt = (document.getElementById('flt-texto')?.value || '').toLowerCase().trim();

  const list = D.inmuebles.filter(im => {
    if (F.estado && im.estado !== F.estado) return false;
    if (F.tipo   && im.tipo   !== F.tipo)   return false;
    if (txt && !`${im.direccion} ${im.poblacion || ''}`.toLowerCase().includes(txt)) return false;
    return true;
  });

  // Ordenar: pares primer, fills just a sota del seu pare
  const pares  = list.filter(im => !im.parent_id);
  const fills  = list.filter(im => im.parent_id);
  const ordenat = [];
  pares.forEach(pare => {
    ordenat.push(pare);
    fills.filter(f => Number(f.parent_id) === Number(pare.id)).forEach(f => ordenat.push(f));
  });
  fills.filter(f => !pares.some(p => Number(p.id) === Number(f.parent_id))).forEach(f => ordenat.push(f));

  const totalPares = D.inmuebles.filter(im => !im.parent_id).length;
  const countEl    = document.getElementById('flt-count');
  if (countEl) {
    countEl.textContent = pares.length === totalPares
        ? `${totalPares} inmueble${totalPares !== 1 ? 's' : ''}`
        : `${pares.length} de ${totalPares} inmueble${totalPares !== 1 ? 's' : ''}`;
  }

  if (!ordenat.length) {
    document.getElementById('inmuebles').innerHTML =
        `<div class="empty">${D.inmuebles.length ? 'Ningún inmueble coincide con los filtros.' : 'No hay inmuebles registrados.'}</div>`;
    return;
  }

  document.getElementById('inmuebles').innerHTML = `
    <div style="background:#fff;border:1px solid var(--br);border-radius:16px;overflow:hidden;box-shadow:var(--sh)">
      ${ordenat.map((im, idx) => _buildInmRow(im, idx, ordenat.length)).join('')}
    </div>`;
}

function _buildInmRow(im, idx, total) {
  const esFill     = !!im.parent_id;
  const contrato   = getContratoActivo(im.id);
  const inquili    = contrato ? getInq(contrato.inquilino_id) : null;
  const alq        = Number(contrato?.importe || 0);
  const compra     = Number(im.precio_compra || 0);

  // Sumar ingressos de les dependències (només per al pare)
  const alqFills = !esFill
      ? D.inmuebles.filter(x => Number(x.parent_id) === Number(im.id)).reduce((a, f) => {
        const con = getContratoActivo(f.id);
        return a + Number(con?.importe || 0);
      }, 0)
      : 0;
  const alqTotal = alq + alqFills;
  const rentab   = (!esFill && compra > 0 && alqTotal > 0)
      ? ((alqTotal * 12 / compra) * 100).toFixed(1) + '%'
      : null;
  const retrasats  = D.cobros.filter(c => {
    const con = getContrato(c.contrato_id);
    return con && Number(con.inmueble_id) === Number(im.id) && c.estado === 'Retrasado';
  }).length;

  const cobroMes = D.cobros.find(c => {
    const con = getContrato(c.contrato_id);
    return con && Number(con.inmueble_id) === Number(im.id) && c.mes === ymActual;
  });

  const cobroIcon = cobroMes
      ? cobroMes.estado === 'Pagado'    ? '<span style="font-size:16px">✅</span>'
          : cobroMes.estado === 'Retrasado' ? '<span style="font-size:16px">🔴</span>'
              :                                    '<span style="font-size:16px">⏳</span>'
      : '<span style="font-size:16px;color:#e2e8f0">○</span>';

  const tipoCat  = D.categorias.find(c => c.nombre === im.tipo);
  const tipoEmoji = tipoCat?.emoji || '🏠';

  const borderBottom = idx < total - 1 ? 'border-bottom:1px solid #f1f5f9' : '';
  const fillStyle    = esFill ? 'background:#fafbfc;' : '';
  const fillIndent   = esFill ? 'padding-left:32px' : 'padding-left:16px';

  return `
    <div onclick="${Number(im.parent_id) > 0 ? `openInmDetallFill(${im.id})` : `openInmDetall(${im.id})`}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;
         cursor:pointer;transition:background .15s;${fillStyle}${borderBottom}"
         onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${esFill ? '#fafbfc' : '#fff'}'">

      ${esFill ? '<span style="color:#cbd5e1;font-size:12px;flex-shrink:0">↳</span>' : ''}

      <div style="width:40px;height:40px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;
                  justify-content:center;font-size:20px;background:${getInmColor(im.id)};${esFill ? 'width:34px;height:34px;border-radius:9px;font-size:16px' : ''}">
        ${tipoEmoji}
      </div>

      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:${esFill ? '13px' : '14px'};font-weight:700;color:#1a2535;
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${im.direccion}</span>
          ${retrasats > 0 ? `<span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:1px 7px;font-size:10px;font-weight:800">🔔 ${retrasats}</span>` : ''}
        </div>
        <div style="font-size:11px;color:#6b7a90;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="background:#f1f5f9;border-radius:5px;padding:1px 6px;font-weight:600">${im.tipo}</span>
          ${!esFill ? `<span style="color:${im.estado === 'Alquilado' ? '#1767d1' : '#16a34a'};font-weight:600">${im.estado || 'Disponible'}</span>` : ''}
          ${inquili
      ? `<span style="display:inline-flex;align-items:center;gap:3px">
                <span style="width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                             display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:#fff">
                  ${inquili.nombre[0].toUpperCase()}
                </span>
                ${inquili.nombre}
              </span>`
      : `<span style="color:#94a3b8">Sin inquilino</span>`}
        </div>
      </div>

      <div style="text-align:right;flex-shrink:0">
        ${!esFill ? `<div style="font-size:13px;font-weight:800;color:${alq > 0 ? '#16a34a' : '#94a3b8'}">${alq > 0 ? euro(alq) + '/mes' : '—'}</div>` : ''}
        ${!esFill && rentab ? `<div style="font-size:10px;font-weight:700;color:#1767d1">${rentab}</div>` : ''}
        <div style="margin-top:2px">${cobroIcon}</div>
      </div>

      <span style="color:#cbd5e1;font-size:18px;flex-shrink:0">›</span>
    </div>`;
}

function _buildInmCard(im) {
  const contrato   = getContratoActivo(im.id);
  const inquili    = contrato ? getInq(contrato.inquilino_id) : null;
  const alq        = Number(contrato?.importe || 0);
  const compra     = Number(im.precio_compra || 0);
  const hip        = Number(im.hipoteca || 0);

  // Sumar ingressos dels fills (dependències)
  const fills      = D.inmuebles.filter(x => Number(x.parent_id) === Number(im.id));
  const alqFills   = fills.reduce((a, f) => {
    const con = getContratoActivo(f.id);
    return a + Number(con?.importe || 0);
  }, 0);
  const alqTotal   = alq + alqFills;

  const retrasats  = D.cobros.filter(c => {
    const con = getContrato(c.contrato_id);
    return con && Number(con.inmueble_id) === Number(im.id) && c.estado === 'Retrasado';
  });
  const docs = D.documents.filter(d => d.entitat_tipus === 'inmueble' && Number(d.entitat_id) === Number(im.id));
  const flujo      = alqTotal - hip;
  const rentab     = (compra > 0 && alqTotal > 0) ? ((alqTotal * 12 / compra) * 100).toFixed(2) + '%' : null;

  // Badge alerta
  const alertBadge = retrasats.length > 0
      ? `<span class="inm-badge-alert" onclick="goToAlertasInmueble(${im.id})" style="cursor:pointer">🔔 ${retrasats.length}</span>`
      : '';

  const docsBadge = docs.length > 0
      ? `<span class="inm-badge-docs" onclick="openDocs('inmueble',${im.id},\`${im.direccion}\`)" style="cursor:pointer">📎 ${docs.length}</span>`
      : '';

  // Files de detall
  const hipRow    = hip    > 0 ? `<div class="inm-row"><span class="lbl">Hipoteca/mes</span><span class="val bad">${euro(hip)}</span></div>` : '';
  const alqRow    = alqTotal > 0 ? `<div class="inm-row"><span class="lbl">Alquiler/mes</span><span class="val ok">${euro(alqTotal)}</span></div>` : '';
  const rentRow   = rentab ? `<div class="inm-row"><span class="lbl">Rentabilidad</span><span class="val pri">${rentab}</span></div>` : '';
  const compraRow = `<div class="inm-row"><span class="lbl">Precio compra</span><span class="val" style="${compra > 0 ? '' : 'color:#94a3b8'}">${compra > 0 ? euro(compra) : 'Sin datos'}</span></div>`;

  const estatColor = !im.estado || im.estado === 'Disponible' ? '#16a34a' : im.estado === 'Alquilado' ? '#1767d1' : '#6b7a90';
  const estatRow = `
    <div class="inm-row">
      <span class="lbl">Estado</span>
      <span class="val" style="color:${estatColor}">${im.estado || 'Disponible'}</span>
    </div>
    ${inquili ? `<div class="inm-row"><span class="lbl">Inquilino</span>
      <button onclick="goToInquilino(${inquili.id})"
        style="display:inline-flex;align-items:center;gap:5px;background:#eef4ff;border:1px solid #c7d9f8;
               border-radius:999px;padding:3px 10px 3px 6px;cursor:pointer;font:600 12px system-ui;color:#1767d1">
        <span style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                     display:inline-flex;align-items:center;justify-content:center;font-size:10px;
                     font-weight:900;color:#fff;flex-shrink:0">${inquili.nombre[0].toUpperCase()}</span>
        ${inquili.nombre}
      </button></div>` : ''}`;

  const particionsHTML = '';  // Les dependències ara es mostren com cards independents

  const flujoClass    = flujo > 0 ? '' : flujo < 0 ? ' neg' : ' neu';
  const flujoValClass = flujo > 0 ? 'ok' : flujo < 0 ? 'bad' : '';

  return `
    <div class="inm-card" data-inm-id="${im.id}">
      <div class="inm-card-header" style="background:${getInmColor(im.id)}">
        <div class="inm-card-badge">${alertBadge}${docsBadge}</div>
        <h4>${im.direccion}</h4>
        <div class="inm-sub">${im.poblacion || ''} · ${im.tipo}</div>
      </div>
      <div class="inm-card-body">
        ${estatRow}${compraRow}${hipRow}${alqRow}${rentRow}
      </div>
      ${particionsHTML}
      <div class="inm-flujo${flujoClass}">
        <span class="lbl">Flujo/mes</span>
        <span class="val ${flujoValClass}">${euro(flujo)}</span>
      </div>
      <div class="inm-card-footer">
        <button class="inm-btn-edit" onclick="goToCobrosInmueble(${im.id})">📋 Historial</button>
        <button class="inm-btn-edit" onclick="editInmueble(${im.id})">✏️ Editar</button>
        <button class="inm-btn-del"  onclick="deleteItem('inmuebles',${im.id})">🗑</button>
      </div>
    </div>`;
}

function _buildParticionsBlock(parent, particions) {
  const totalRenta = particions.reduce((a, p) => {
    const con = getContratoActivo(p.id);
    return a + Number(con?.importe || 0);
  }, 0);
  const ocupats = particions.filter(p => p.estado === 'Alquilado').length;

  const files = particions.map(p => {
    const conP   = getContratoActivo(p.id);
    const inqP   = conP ? getInq(conP.inquilino_id) : null;
    const nomMod = p.direccion.replace(parent.direccion + ' — ', '');
    const isAlq  = p.estado === 'Alquilado';
    const cobroP = D.cobros.find(c => {
      const con = getContrato(c.contrato_id);
      return con && Number(con.inmueble_id) === Number(p.id) && c.mes === ymActual;
    });
    const alertesP = D.cobros.filter(c => {
      const con = getContrato(c.contrato_id);
      return con && Number(con.inmueble_id) === Number(p.id) && c.estado === 'Retrasado';
    }).length;

    const cobroIcon = cobroP
        ? cobroP.estado === 'Pagado'    ? '<span style="color:#16a34a;font-size:11px">✅</span>'
            : cobroP.estado === 'Retrasado' ? '<span style="color:#dc2626;font-size:11px">🔴</span>'
                :                                  '<span style="color:#d97706;font-size:11px">⏳</span>'
        : '';

    const alertModul = alertesP > 0
        ? `<span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:800">${alertesP} ret.</span>`
        : '';

    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;
                  background:${isAlq ? '#f0f9ff' : '#f8fafc'};border:1px solid ${isAlq ? '#bae6fd' : '#e2e8f0'};margin-bottom:5px">
        <span style="font-size:14px;flex-shrink:0">${isAlq ? '🔵' : '🟢'}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:800;color:#6b7a90;background:#e2e8f0;border-radius:6px;padding:1px 7px">${p.tipo}</span>
            <div style="font-size:12px;font-weight:700;color:#1a2535;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nomMod}</div>
          </div>
          ${inqP
        ? `<button onclick="goToInquilino(${inqP.id})"
                style="display:inline-flex;align-items:center;gap:5px;background:#eef4ff;border:1px solid #c7d9f8;
                       border-radius:999px;padding:2px 8px 2px 5px;cursor:pointer;font:600 11px system-ui;color:#1767d1;margin-top:3px">
                <span style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                             display:inline-flex;align-items:center;justify-content:center;font-size:8px;
                             font-weight:900;color:#fff;flex-shrink:0">${inqP.nombre[0].toUpperCase()}</span>
                ${inqP.nombre}
              </button>`
        : '<div style="font-size:11px;color:#94a3b8;margin-top:2px">Sin inquilino</div>'}
        </div>
        ${alertModul}${cobroIcon}
        <div style="font-size:12px;font-weight:800;color:${isAlq ? '#1767d1' : '#94a3b8'};white-space:nowrap">
          ${conP ? euro(conP.importe) : '—'}
        </div>
        <button onclick="editInmueble(${p.id})"
                style="background:none;border:none;cursor:pointer;font-size:13px;padding:2px 4px;color:#94a3b8;flex-shrink:0">✏️</button>
      </div>`;
  }).join('');

  return `
    <div style="margin:10px 10px 4px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px">Dependencias (${particions.length})</span>
        <span style="font-size:11px;font-weight:600;color:#6b7a90">${ocupats}/${particions.length} ocupados · <b style="color:#16a34a">${euro(totalRenta)}/mes</b></span>
      </div>
      ${files}
    </div>`;
}

// ─── MODAL DETALL FILL (sense preu compra, rentabilitat, flujo) ───────────────

function openInmDetallFill(id) {
  const im      = getInm(id);
  if (!im) return;

  const contrato = getContratoActivo(im.id);
  const inquili  = contrato ? getInq(contrato.inquilino_id) : null;
  const alq      = Number(contrato?.importe || 0);
  const tipoCat  = D.categorias.find(c => c.nombre === im.tipo);

  const cobrosInm = D.cobros
  .filter(c => { const con = getContrato(c.contrato_id); return con && Number(con.inmueble_id) === Number(im.id); })
  .sort((a, b) => b.mes.localeCompare(a.mes))
  .slice(0, 6);

  const cobrosHTML = cobrosInm.length ? cobrosInm.map(c => {
    const pagat = c.estado === 'Pagado';
    const retr  = c.estado === 'Retrasado';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9">
        <span style="font-size:12px;color:#6b7a90">${fmtMes(c.mes)}</span>
        <span style="font-size:12px;font-weight:700">${euro(c.importe)}</span>
        <span class="badge ${pagat ? 'b-ok' : retr ? 'b-bad' : 'b-warn'}" style="font-size:10px">${c.estado}</span>
        ${!pagat ? `<button class="cob-btn-cobrar" onclick="toggleCobro(${c.id},'${c.estado}');closeModal('modalInmDetall')"
                    style="padding:4px 10px;font-size:11px">✅</button>` : ''}
      </div>`;
  }).join('') : `<div style="font-size:12px;color:#94a3b8;padding:8px 0">Sin cobros registrados</div>`;

  const pare = im.parent_id ? getInm(im.parent_id) : null;

  document.getElementById('inm-detall-body').innerHTML = `
    <div style="background:${getInmColor(im.id)};padding:20px;margin:-20px -16px 16px;border-radius:10px 10px 0 0">
      <div style="font-size:11px;color:rgba(255,255,255,.6);font-weight:600;margin-bottom:4px">${tipoCat?.emoji || '🏠'} ${im.tipo}</div>
      <div style="font-size:18px;font-weight:900;color:#fff;line-height:1.2">${im.direccion}</div>
      ${im.poblacion ? `<div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:3px">${im.poblacion}</div>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Estado</div>
        <div style="font-size:13px;font-weight:700;color:${im.estado === 'Alquilado' ? '#1767d1' : '#16a34a'}">${im.estado || 'Disponible'}</div>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Alquiler/mes</div>
        <div style="font-size:13px;font-weight:700;color:#16a34a">${alq > 0 ? euro(alq) : '—'}</div>
      </div>
      ${pare ? `<div style="grid-column:1/-1;background:#eef4ff;border-radius:10px;padding:10px 12px;cursor:pointer"
                    onclick="closeModal('modalInmDetall');openInmDetall(${pare.id})">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Inmueble principal</div>
        <div style="font-size:13px;font-weight:700;color:#1767d1">🏠 ${pare.direccion}</div>
      </div>` : ''}
    </div>

    ${inquili ? `
    <div style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Inquilino</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                  display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0">
        ${inquili.nombre[0].toUpperCase()}
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">${inquili.nombre}</div>
        ${inquili.telefono ? `<div style="font-size:11px;color:#6b7a90">${inquili.telefono}</div>` : ''}
        ${contrato?.fecha_inicio ? `<div style="font-size:11px;color:#6b7a90">📅 ${contrato.fecha_inicio}${contrato.fecha_fin ? ' → ' + contrato.fecha_fin : ''}</div>` : ''}
      </div>
      <button onclick="closeModal('modalInmDetall');goToInquilino(${inquili.id})"
              style="background:#eef4ff;border:1px solid #c7d9f8;border-radius:8px;padding:6px 10px;
                     font:600 12px system-ui;color:#1767d1;cursor:pointer">Ver →</button>
    </div>` : ''}

    <div style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Últimos cobros</div>
    <div>${cobrosHTML}</div>

    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="inm-btn-edit" onclick="closeModal('modalInmDetall');goToCobrosInmueble(${im.id})" style="flex:1">📋 Historial</button>
      <button class="inm-btn-edit" onclick="closeModal('modalInmDetall');openDocs('inmueble',${im.id},\`${im.direccion}\`)" style="flex:1">📎 Docs</button>
      <button class="inm-btn-edit" onclick="closeModal('modalInmDetall');editInmueble(${im.id})" style="flex:1">✏️ Editar</button>
      <button class="inm-btn-del"  onclick="closeModal('modalInmDetall');deleteItem('inmuebles',${im.id})">🗑</button>
    </div>`;

  document.getElementById('modalInmDetall').classList.add('open');
}

// ─── MODAL DETALL IMMOBLE ─────────────────────────────────────────────────────

function openInmDetall(id) {
  const im       = getInm(id);
  if (!im) return;

  const contrato = getContratoActivo(im.id);
  const inquili  = contrato ? getInq(contrato.inquilino_id) : null;
  const alq      = Number(contrato?.importe || 0);
  const compra   = Number(im.precio_compra || 0);
  const hip      = Number(im.hipoteca || 0);
  const fills    = D.inmuebles.filter(x => Number(x.parent_id) === Number(im.id));
  const alqFills = fills.reduce((a, f) => {
    const con = getContratoActivo(f.id);
    return a + Number(con?.importe || 0);
  }, 0);
  const alqTotal = alq + alqFills;
  const flujo    = alqTotal - hip;
  const rentab   = (compra > 0 && alqTotal > 0) ? ((alqTotal * 12 / compra) * 100).toFixed(2) + '%' : null;
  const tipoCat  = D.categorias.find(c => c.nombre === im.tipo);

  // Cobros recents
  const cobrosInm = D.cobros
  .filter(c => { const con = getContrato(c.contrato_id); return con && Number(con.inmueble_id) === Number(im.id); })
  .sort((a, b) => b.mes.localeCompare(a.mes))
  .slice(0, 6);

  const cobrosHTML = cobrosInm.length ? cobrosInm.map(c => {
    const pagat = c.estado === 'Pagado';
    const retr  = c.estado === 'Retrasado';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9">
        <span style="font-size:12px;color:#6b7a90">${fmtMes(c.mes)}</span>
        <span style="font-size:12px;font-weight:700">${euro(c.importe)}</span>
        <span class="badge ${pagat ? 'b-ok' : retr ? 'b-bad' : 'b-warn'}" style="font-size:10px">${c.estado}</span>
        ${!pagat ? `<button class="cob-btn-cobrar" onclick="toggleCobro(${c.id},'${c.estado}');closeModal('modalInmDetall')"
                    style="padding:4px 10px;font-size:11px">✅</button>` : ''}
      </div>`;
  }).join('') : `<div style="font-size:12px;color:#94a3b8;padding:8px 0">Sin cobros registrados</div>`;

  // Dependències
  const fillsHTML = fills.length ? fills.map(f => {
    const conF = getContratoActivo(f.id);
    const inqF = conF ? getInq(conF.inquilino_id) : null;
    const tipF = D.categorias.find(c => c.nombre === f.tipo);
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9">
        <span>${tipF?.emoji || '🏠'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600">${f.tipo} · ${f.direccion.replace(im.direccion + ' — ', '')}</div>
          <div style="font-size:11px;color:#6b7a90">${inqF ? inqF.nombre : 'Sin inquilino'}</div>
        </div>
        <span style="font-size:12px;font-weight:700;color:#16a34a">${conF ? euro(conF.importe) + '/mes' : '—'}</span>
      </div>`;
  }).join('') : '';

  document.getElementById('inm-detall-body').innerHTML = `
    <!-- Capçalera -->
    <div style="background:${getInmColor(im.id)};padding:20px;margin:-20px -16px 16px;border-radius:10px 10px 0 0">
      <div style="font-size:11px;color:rgba(255,255,255,.6);font-weight:600;margin-bottom:4px">${tipoCat?.emoji || '🏠'} ${im.tipo}</div>
      <div style="font-size:18px;font-weight:900;color:#fff;line-height:1.2">${im.direccion}</div>
      ${im.poblacion ? `<div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:3px">${im.poblacion}</div>` : ''}
    </div>

    <!-- Info principal -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Estado</div>
        <div style="font-size:13px;font-weight:700;color:${im.estado === 'Alquilado' ? '#1767d1' : '#16a34a'}">${im.estado || 'Disponible'}</div>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Alquiler/mes</div>
        <div style="font-size:13px;font-weight:700;color:#16a34a">${alq > 0 ? euro(alq) : '—'}</div>
      </div>
      ${compra > 0 ? `<div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Precio compra</div>
        <div style="font-size:13px;font-weight:700">${euro(compra)}</div>
      </div>` : ''}
      ${rentab ? `<div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Rentabilidad</div>
        <div style="font-size:13px;font-weight:700;color:#1767d1">${rentab}</div>
      </div>` : ''}
      ${hip > 0 ? `<div style="background:#fff5f5;border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Hipoteca/mes</div>
        <div style="font-size:13px;font-weight:700;color:#dc2626">${euro(hip)}</div>
      </div>` : ''}
      <div style="background:${flujo >= 0 ? '#f0fdf4' : '#fff5f5'};border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:800;color:#6b7a90;text-transform:uppercase;margin-bottom:4px">Flujo/mes</div>
        <div style="font-size:13px;font-weight:700;color:${flujo >= 0 ? '#16a34a' : '#dc2626'}">${euro(flujo)}</div>
      </div>
    </div>

    <!-- Inquilí -->
    ${inquili ? `
    <div style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Inquilino</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                  display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0">
        ${inquili.nombre[0].toUpperCase()}
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">${inquili.nombre}</div>
        ${inquili.telefono ? `<div style="font-size:11px;color:#6b7a90">${inquili.telefono}</div>` : ''}
        ${contrato?.fecha_inicio ? `<div style="font-size:11px;color:#6b7a90">📅 ${contrato.fecha_inicio}${contrato.fecha_fin ? ' → ' + contrato.fecha_fin : ''}</div>` : ''}
      </div>
      <button onclick="closeModal('modalInmDetall');goToInquilino(${inquili.id})"
              style="background:#eef4ff;border:1px solid #c7d9f8;border-radius:8px;padding:6px 10px;
                     font:600 12px system-ui;color:#1767d1;cursor:pointer">Ver →</button>
    </div>` : ''}

    <!-- Dependències -->
    ${fills.length ? `
    <div style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Dependencias</div>
    <div style="margin-bottom:16px">${fillsHTML}</div>` : ''}

    <!-- Cobros recents -->
    <div style="font-size:11px;font-weight:900;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Últimos cobros</div>
    <div>${cobrosHTML}</div>

    <!-- Botons -->
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="inm-btn-edit" onclick="closeModal('modalInmDetall');goToCobrosInmueble(${im.id})" style="flex:1">📋 Historial</button>
      <button class="inm-btn-edit" onclick="closeModal('modalInmDetall');openDocs('inmueble',${im.id},\`${im.direccion}\`)" style="flex:1">📎 Docs</button>
      <button class="inm-btn-edit" onclick="closeModal('modalInmDetall');editInmueble(${im.id})" style="flex:1">✏️ Editar</button>
      <button class="inm-btn-del"  onclick="closeModal('modalInmDetall');deleteItem('inmuebles',${im.id})">🗑</button>
    </div>`;

  document.getElementById('modalInmDetall').classList.add('open');
}

// ─── EDIT ─────────────────────────────────────────────────────────────────────

function editInmueble(id) {
  const im = getInm(id);
  if (!im) return;

  editingId       = id;
  currentInmueble = im;

  renderSelectTipo(im.tipo);
  _poblarSelectParent(im.parent_id, id);

  document.getElementById('f_estado').value    = im.estado || 'Disponible';
  document.getElementById('f_direccion').value = im.direccion;
  document.getElementById('f_poblacion').value = im.poblacion || '';
  document.getElementById('f_compra').value    = im.precio_compra || '';
  document.getElementById('f_hipoteca').value  = im.hipoteca || '';
  document.getElementById('f_dia_pago').value  = im.dia_pago || '';

  document.querySelector('#modalInmueble h3').textContent = '🏢 Editar inmueble';
  document.getElementById('modalInmueble').classList.add('open');
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

async function saveInmueble() {
  const parentId = parseInt(document.getElementById('f_parent').value) || null;

  const row = {
    tipo:         document.getElementById('f_tipo').value,
    estado:       document.getElementById('f_estado').value,
    direccion:    document.getElementById('f_direccion').value.trim(),
    poblacion:    document.getElementById('f_poblacion').value.trim(),
    precio_compra:parseFloat(document.getElementById('f_compra').value)   || 0,
    hipoteca:     parseFloat(document.getElementById('f_hipoteca').value) || 0,
    dia_pago:     parseInt(document.getElementById('f_dia_pago').value)   || null,
    parent_id:    parentId,
  };

  if (!row.direccion) return showToast('La dirección es obligatoria');

  const op = editingId
      ? sb.from('inmuebles').update(row).eq('id', editingId)
      : sb.from('inmuebles').insert(row);

  const { error } = await op.select().single();
  if (error) return showToast('Error: ' + error.message);

  closeModal('modalInmueble');
  await loadAll();
  showToast(editingId ? '✅ Inmueble actualizado' : '✅ Inmueble guardado');
}

// ─── PARTICIONS ───────────────────────────────────────────────────────────────

async function crearParticion() {
  const nombre  = document.getElementById('p_nombre').value.trim();
  const alquiler = parseFloat(document.getElementById('p_alquiler').value) || 0;

  if (!nombre) return showToast('El nombre es obligatorio');

  const row = {
    tipo:         currentInmueble.tipo,
    estado:       'Disponible',
    direccion:    currentInmueble.direccion + ' — ' + nombre,
    poblacion:    currentInmueble.poblacion,
    precio_compra:0,
    hipoteca:     0,
    parent_id:    currentInmueble.id,
  };

  const { error } = await sb.from('inmuebles').insert(row);
  if (error) return showToast('Error: ' + error.message);

  closeModal('modalParticion');
  await loadAll();
  showToast('✅ Partición creada');
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function deleteItem(tabla, id) {
  if (!confirm('¿Eliminar este registro?')) return;
  const { error } = await sb.from(tabla).delete().eq('id', id);
  if (error) return showToast('Error: ' + error.message);
  await loadAll();
  showToast('✅ Eliminado correctamente');
}

// ─── NAVEGACIO DES DE CARD ────────────────────────────────────────────────────

function goToAlertasInmueble(inmId) {
  const btn = [...document.querySelectorAll('.nav button')]
  .find(b => b.querySelector('.nlabel')?.textContent === 'Alertas');
  goTo('page-alertas', btn || null);

  setTimeout(() => {
    const card = document.querySelector(`[data-alerta-inm="${inmId}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.transition = 'outline .15s, box-shadow .15s';
    card.style.outline    = '3px solid #dc2626';
    card.style.boxShadow  = '0 0 0 6px rgba(220,38,38,.2)';
    setTimeout(() => { card.style.outline = ''; card.style.boxShadow = ''; }, 1800);
  }, 150);
}

function goToCobrosInmueble(inmId) {
  const btn = [...document.querySelectorAll('.nav button')]
  .find(b => b.querySelector('.nlabel')?.textContent === 'Cobros');
  goTo('page-cobros', btn || null);

  setTimeout(() => {
    // Trobar contractes d'aquest immoble i filtrar per ells
    const contratoIds = getContratosInmueble(inmId).map(c => c.id);
    cobContratosFilter = new Set(contratoIds.map(Number));
    cobInmsFilter = null;
    const selEst = document.getElementById('cob2-estado');
    const selAny = document.getElementById('cob2-any');
    if (selEst) selEst.value = '';
    if (selAny) selAny.value = '';
    cobKpiFilter = '';
    cobPagina = 1;
    renderCobros();
  }, 50);
}