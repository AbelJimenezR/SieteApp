'use strict';

function renderDashboard() {
  const contratosActius = D.contratos.filter(c => c.activo);
  const rentaMes  = contratosActius.reduce((a, c) => a + Number(c.importe || 0), 0);
  const pendients = D.cobros.filter(c => c.estado === 'Pendiente').length;
  const retrasats = D.cobros.filter(c => c.estado === 'Retrasado').length;

  const subEl = document.getElementById('headerSub');
  if (subEl) subEl.textContent = `${D.inmuebles.length} inmuebles · ${euro(rentaMes)}/mes · ${pendients} pendiente${pendients !== 1 ? 's' : ''}`;

  // Badge alertes al nav — només retrasats
  const badgeEl = document.getElementById('badge-alertes');
  if (badgeEl) {
    if (retrasats > 0) {
      badgeEl.textContent   = retrasats;
      badgeEl.style.display = 'inline';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  _renderDashKpis();
  _renderDashCobros();
  _renderDashInmuebles();
}

function _renderDashKpis() {
  const el = document.getElementById('dash-kpis');
  if (!el) return;

  const cobrosDelMes = D.cobros.filter(c => c.mes === ymActual);
  const rentaMes     = D.contratos.filter(c => c.activo).reduce((a, c) => a + Number(c.importe || 0), 0);
  const cobratMes    = cobrosDelMes.filter(c => c.estado === 'Pagado').reduce((a, b) => a + Number(b.importe || 0), 0);
  const pendentMes   = cobrosDelMes.filter(c => c.estado !== 'Pagado').reduce((a, b) => a + Number(b.importe || 0), 0);
  const cntPendent   = cobrosDelMes.filter(c => c.estado !== 'Pagado').length;
  const pctCobrado   = rentaMes > 0 ? Math.round(cobratMes / rentaMes * 100) : 0;

  el.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon ki-naranja">💵</div>
      <div>
        <div class="kpi-val">${euro(rentaMes)}</div>
        <div class="kpi-label">Renta esperada</div>
        <div class="kpi-sub">${fmtMes(ymActual)}</div>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon ki-verde">✅</div>
      <div>
        <div class="kpi-val" style="color:#16a34a">${euro(cobratMes)}</div>
        <div class="kpi-label">Cobrado</div>
        <div class="kpi-sub">${pctCobrado}% del total</div>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon ki-rojo">⏳</div>
      <div>
        <div class="kpi-val" style="color:${cntPendent > 0 ? '#dc2626' : '#16a34a'}">${euro(pendentMes)}</div>
        <div class="kpi-label">Pendiente</div>
        <div class="kpi-sub">${cntPendent} cobro${cntPendent !== 1 ? 's' : ''}</div>
      </div>
    </div>`;
}

function _renderDashCobros() {
  const el   = document.getElementById('dash-cobros');
  const ymEl = document.getElementById('dash-cobros-ym');
  if (!el) return;
  if (ymEl) ymEl.textContent = fmtMes(ymActual);

  const cobros = D.cobros
  .filter(c => c.mes === ymActual)
  .sort((a, b) => {
    const p = { Retrasado: 0, Pendiente: 1, Pagado: 2 };
    return (p[a.estado] ?? 9) - (p[b.estado] ?? 9);
  });

  if (!cobros.length) {
    el.innerHTML = `<div class="empty">No hay cobros para ${fmtMes(ymActual)}. Pulsa <b>⚡ Generar cobros</b> para crearlos.</div>`;
    return;
  }

  const pagats = cobros.filter(c => c.estado === 'Pagado').length;
  const total  = cobros.length;
  const pct    = Math.round(pagats / total * 100);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="flex:1;background:#e2e8f0;border-radius:999px;height:6px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:#16a34a;border-radius:999px;transition:width .4s"></div>
      </div>
      <span style="font-size:12px;font-weight:700;color:#6b7a90;white-space:nowrap">${pagats}/${total} pagados</span>
    </div>
    <div class="tcard"><table style="min-width:0">
      <thead><tr>
        <th>Inmueble</th><th>Inquilino</th><th>€</th><th>Estado</th><th></th>
      </tr></thead>
      <tbody>${cobros.map(c => _buildDashCobroRow(c)).join('')}</tbody>
    </table></div>`;
}

function _buildDashCobroRow(c) {
  const con  = getContrato(c.contrato_id);
  const im   = con ? getInm(con.inmueble_id)  : null;
  const inq  = con ? getInq(con.inquilino_id) : null;
  const pagat = c.estado === 'Pagado';
  const retr  = c.estado === 'Retrasado';

  const estatBadge = pagat
      ? `<span class="badge b-ok">Pagado</span>`
      : retr ? `<span class="badge b-bad">Retrasado</span>`
          : `<span class="badge b-warn">Pendiente</span>`;

  const cobrarBtn = pagat
      ? `<button class="cob-btn-cobrar ja-pagat" onclick="toggleCobro(${c.id},'${c.estado}')">✓</button>`
      : `<button class="cob-btn-cobrar"          onclick="toggleCobro(${c.id},'${c.estado}')">✅</button>`;

  return `
    <tr style="${pagat ? 'background:#f0fdf4' : retr ? 'background:#fff5f5' : ''}">
      <td><b style="font-size:12px">${im?.direccion || '-'}</b></td>
      <td style="font-size:12px">${inq?.nombre || '—'}</td>
      <td><b>${euro(c.importe)}</b></td>
      <td>${estatBadge}</td>
      <td>${cobrarBtn}</td>
    </tr>`;
}

function _renderDashInmuebles() {
  const el = document.getElementById('dash-inmuebles');
  if (!el) return;

  const inms = D.inmuebles.filter(im => !im.parent_id);
  if (!inms.length) {
    el.innerHTML = `<div class="empty">No hay inmuebles. Ve a <b>Inmuebles</b> para añadir.</div>`;
    return;
  }

  el.innerHTML = inms.map(im => {
    const contrato  = getContratoActivo(im.id);
    const inq       = contrato ? getInq(contrato.inquilino_id) : null;
    const retrasats = D.cobros.filter(c => {
      const con = getContrato(c.contrato_id);
      return con && Number(con.inmueble_id) === Number(im.id) && c.estado === 'Retrasado';
    }).length;
    const cobroMes = D.cobros.find(c => {
      const con = getContrato(c.contrato_id);
      return con && Number(con.inmueble_id) === Number(im.id) && c.mes === ymActual;
    });

    const estatColor = im.estado === 'Alquilado' ? '#1767d1' : '#16a34a';
    const cobroIcon  = cobroMes
        ? cobroMes.estado === 'Pagado'    ? '<span style="color:#16a34a">✅</span>'
            : cobroMes.estado === 'Retrasado' ? '<span style="color:#dc2626">🔴</span>'
                :                                    '<span style="color:#d97706">⏳</span>'
        : '';

    const alertBadge = retrasats > 0
        ? `<span class="badge b-bad" style="font-size:10px">${retrasats} ret.</span>` : '';

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;border:1px solid #e2e8f0;
                  border-radius:14px;margin-bottom:8px;box-shadow:var(--sh);cursor:pointer"
           onclick="goToInmueble(${im.id})">
        <div style="width:42px;height:42px;border-radius:12px;flex-shrink:0;background:${getInmColor(im.id)};
                    display:flex;align-items:center;justify-content:center;font-size:18px">🏠</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${im.direccion}</div>
          <div style="font-size:11px;color:#6b7a90;margin-top:2px">
            <span style="color:${estatColor};font-weight:600">${im.estado || 'Disponible'}</span>
            ${inq ? ` · ${inq.nombre}` : ''}
            ${contrato ? ` · ${euro(contrato.importe)}/mes` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${alertBadge}${cobroIcon}
          <span style="color:#94a3b8;font-size:14px">›</span>
        </div>
      </div>`;
  }).join('');
}

function goToInmueble(id) {
  const btn = [...document.querySelectorAll('.nav button')]
  .find(b => b.querySelector('.nlabel')?.textContent === 'Inmuebles');
  goTo('page-inmuebles', btn || null);

  setTimeout(() => {
    const card = document.querySelector(`#inmuebles .inm-card[data-inm-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.transition = 'outline .15s, box-shadow .15s';
    card.style.outline    = '3px solid var(--pri)';
    card.style.boxShadow  = '0 0 0 6px rgba(23,103,209,.2)';
    setTimeout(() => { card.style.outline = ''; card.style.boxShadow = ''; }, 1800);
  }, 150);
}