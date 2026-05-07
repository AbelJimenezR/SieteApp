'use strict';

let _alertasInicioMostrada = false;

// ─── RENDER PAGINA D'ALERTES ──────────────────────────────────────────────────

function renderAlertas() {
  const container  = document.getElementById('alertas-listado-container');
  const resumenEl  = document.getElementById('alt-resumen-count');
  if (!container) return;

  const filtroOrden = document.getElementById('alt-filtro-orden')?.value || 'mes';

  const llista = D.cobros
  .filter(c => c.estado === 'Retrasado')
  .sort((a, b) =>
      filtroOrden === 'importe'
          ? Number(b.importe) - Number(a.importe)
          : a.mes.localeCompare(b.mes)
  );

  const totalImporte = llista.reduce((acc, c) => acc + Number(c.importe || 0), 0);
  if (resumenEl) resumenEl.textContent = `${llista.length} retrasado${llista.length !== 1 ? 's' : ''} · ${euro(totalImporte)}`;

  if (!llista.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#16a34a;font-size:14px;">
        ✅ Sin cobros retrasados.
      </div>`;
    return;
  }

  container.innerHTML = llista.map(c => _buildAlertaCard(c)).join('');
}

function _buildAlertaCard(c) {
  const con = getContrato(c.contrato_id);
  const im  = con ? getInm(con.inmueble_id)  : null;
  const inq = con ? getInq(con.inquilino_id) : null;

  return `
    <div data-alerta-inm="${im?.id}" style="background:#fff;border:1px solid #fecaca;border-radius:14px;
                padding:16px 20px;box-shadow:var(--sh);position:relative">

      <span class="badge b-bad" style="position:absolute;top:14px;right:16px;font-size:10px">Retrasado</span>

      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding-right:100px">
        <div style="width:10px;height:10px;border-radius:50%;background:#dc2626;flex-shrink:0"></div>
        <button onclick="goToInmueble(${im?.id})"
          style="display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;border:1px solid #e2e8f0;
                 border-radius:999px;padding:3px 10px 3px 8px;cursor:pointer;font:700 12px system-ui;color:#1a2535">
          🏠 ${im?.direccion || 'Inmueble'}
        </button>
      </div>

      <div style="display:flex;align-items:center;gap:8px;padding-left:18px">
        ${inq
      ? `<button onclick="goToInquilino(${inq.id})"
              style="display:inline-flex;align-items:center;gap:5px;background:#eef4ff;border:1px solid #c7d9f8;
                     border-radius:999px;padding:3px 10px 3px 6px;cursor:pointer;font:600 12px system-ui;color:#1767d1">
              <span style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                           display:inline-flex;align-items:center;justify-content:center;font-size:9px;
                           font-weight:900;color:#fff;flex-shrink:0">
                ${inq.nombre[0].toUpperCase()}
              </span>
              ${inq.nombre}
            </button>`
      : ''}
        <span style="color:#64748b;font-size:12px;flex:1">${fmtMes(c.mes)} · ${euro(c.importe)}</span>
        <button onclick="toggleCobro(${c.id},'${c.estado}')"
                style="display:inline-flex;align-items:center;gap:5px;padding:6px 14px;background:#f0fdf4;
                       border:1px solid #bbf7d0;border-radius:8px;color:#16a34a;font:700 12px system-ui;
                       cursor:pointer;white-space:nowrap;flex-shrink:0">
          ✅ Cobrado
        </button>
      </div>
    </div>`;
}

// ─── MODAL INICIAL D'ALERTES ─────────────────────────────────────────────────

function verificarAlertasAlInicio() {
  if (_alertasInicioMostrada) return;
  const alertas = D.cobros.filter(c => c.estado === 'Retrasado');
  if (!alertas.length) return;

  _alertasInicioMostrada = true;

  const container = document.getElementById('modal-alertas-body');
  container.innerHTML = alertas.map(c => {
    const con = getContrato(c.contrato_id);
    const im  = con ? getInm(con.inmueble_id)  : null;
    const inq = con ? getInq(con.inquilino_id) : null;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fff;
                  border:1px solid #fecaca;border-radius:12px;margin-bottom:8px;">
        <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:#dc2626"></div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            <button onclick="cerrarModalInicio();goToInmueble(${im?.id})"
              style="display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;border:1px solid #e2e8f0;
                     border-radius:999px;padding:3px 10px 3px 8px;cursor:pointer;font:700 12px system-ui;color:#1a2535">
              🏠 ${im?.direccion || 'Inmueble'}
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap">
            ${inq
        ? `<button onclick="cerrarModalInicio();goToInquilino(${inq.id})"
                  style="display:inline-flex;align-items:center;gap:5px;background:#eef4ff;border:1px solid #c7d9f8;
                         border-radius:999px;padding:3px 10px 3px 6px;cursor:pointer;font:600 12px system-ui;color:#1767d1">
                  <span style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#1767d1,#6366f1);
                               display:inline-flex;align-items:center;justify-content:center;font-size:9px;
                               font-weight:900;color:#fff;flex-shrink:0">
                    ${inq.nombre[0].toUpperCase()}
                  </span>
                  ${inq.nombre}
                </button>`
        : ''}
            <span style="color:#64748b;font-size:12px">${fmtMes(c.mes)} · ${euro(c.importe)}</span>
          </div>
        </div>
        <span class="badge b-bad" style="font-size:9px">Retrasado</span>
      </div>`;
  }).join('');

  document.getElementById('modal-inicio-alertas').style.display = 'flex';
}

function cerrarModalInicio() {
  document.getElementById('modal-inicio-alertas').style.display = 'none';
}

function irAAlertas() {
  cerrarModalInicio();
  const btn = [...document.querySelectorAll('.nav button')]
  .find(b => b.querySelector('.nlabel')?.textContent === 'Alertas');
  goTo('page-alertas', btn || null);
}