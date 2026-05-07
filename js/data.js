'use strict';

// ─── CARREGA ──────────────────────────────────────────────────────────────────

async function loadAll() {
  const { data: { user } } = await sb.auth.getUser();
  const uid = user?.id;

  const [inm, inq, con, cob, gas, cats, docs] = await Promise.all([
    sb.from('inmuebles').select('*').order('id'),
    sb.from('inquilinos').select('*').order('id'),
    sb.from('contratos').select('*').order('id'),
    sb.from('cobros').select('*').order('id'),
    sb.from('gastos').select('*').order('id'),
    sb.from('categorias_inmueble').select('*').order('nombre'),
    sb.from('documents').select('*').order('created_at'),
  ]);

  D.inmuebles  = inm.data  || [];
  D.inquilinos = inq.data  || [];
  D.contratos  = con.data  || [];
  D.cobros     = cob.data  || [];
  D.gastos     = gas.data  || [];
  D.categorias = cats.data || [];
  D.documents  = docs.data || [];

  // Seed categories per defecte
  if (D.categorias.length === 0 && uid) {
    const seeds = CATS_DEFAULT.map(c => ({ ...c, user_id: uid }));
    const { data } = await sb.from('categorias_inmueble').insert(seeds).select();
    D.categorias = data || [];
  }

  // Actualitzar cobros Pendiente -> Retrasado si ha passat el dia de pagament
  await _actualizarEstadosCobros();

  render();
  setTimeout(verificarAlertasAlInicio, 500);
}

// ─── ACTUALITZACIO AUTOMATICA D'ESTATS ────────────────────────────────────────

async function _actualizarEstadosCobros() {
  const ara = new Date();

  const aRetrasado = D.cobros.filter(c => {
    if (c.estado !== 'Pendiente') return false;
    const contrato = getContrato(c.contrato_id);
    const im       = contrato ? getInm(contrato.inmueble_id) : null;
    if (!im?.dia_pago) return false;
    const [any, mes] = c.mes.split('-').map(Number);
    const diaLimit = new Date(any, mes - 1, im.dia_pago);
    return ara > diaLimit;
  });

  if (!aRetrasado.length) return;

  const { error } = await sb.from('cobros')
  .update({ estado: 'Retrasado' })
  .in('id', aRetrasado.map(c => c.id));

  if (error) { console.error('Error actualizando estados:', error.message); return; }

  aRetrasado.forEach(c => {
    const local = D.cobros.find(x => x.id === c.id);
    if (local) local.estado = 'Retrasado';
  });
}

// ─── RENDER GLOBAL ────────────────────────────────────────────────────────────

function render() {
  renderChipsTipo();
  renderSelectTipo();
  renderDashboard();
  renderInmuebles();
  renderInquilinos();
  renderCobros();
  renderGastos();
  renderAlertas();
  setTimeout(renderCharts, 50);
}