'use strict';

// editingId i currentInmueble declarats a config.js

// ─── OPEN ────────────────────────────────────────────────────────────────────

function openModal(tipo) {
  editingId = null;

  const today = new Date().toISOString().slice(0, 10);

  switch (tipo) {
    case 'inmueble':
      renderSelectTipo();
      _poblarSelectParent();
      ['f_direccion','f_poblacion','f_compra','f_hipoteca','f_dia_pago'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('f_estado').value = 'Disponible';
      document.querySelector('#modalInmueble h3').textContent = '🏢 Nuevo inmueble';
      document.getElementById('modalInmueble').classList.add('open');
      break;

    case 'inquilino':
      ['i_nombre','i_telefono','i_email'].forEach(id => { document.getElementById(id).value = ''; });
      document.querySelector('#modalInquilino h3').textContent = '👤 Nuevo inquilino';
      document.getElementById('modalInquilino').classList.add('open');
      break;

    case 'contrato':
      if (!D.inmuebles.length)  return showToast('Primero crea un inmueble');
      if (!D.inquilinos.length) return showToast('Primero crea un inquilino');
      _poblarFormContrato();
      ['ct_inicio','ct_fin','ct_importe','ct_deposito'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('ct_inicio').value  = today;
      document.getElementById('ct_activo').checked = true;
      document.querySelector('#modalContrato h3').textContent = '📋 Nuevo contrato';
      document.getElementById('modalContrato').classList.add('open');
      break;

    case 'cobro':
      if (!D.contratos.filter(c => c.activo).length) return showToast('Primero crea un contrato activo');
      renderSelectContratos();
      document.getElementById('c_mes').value     = ymActual;
      document.getElementById('c_importe').value = '';
      document.getElementById('c_estado').value  = 'Pendiente';
      document.querySelector('#modalCobro h3').textContent = '💰 Nuevo cobro';
      document.getElementById('modalCobro').classList.add('open');
      break;

    case 'gasto':
      if (!D.inmuebles.length) return showToast('Primero crea un inmueble');
      document.getElementById('g_inmueble').innerHTML =
          D.inmuebles.map(x => `<option value="${x.id}">${x.direccion}</option>`).join('');
      document.getElementById('g_fecha').value    = today;
      document.getElementById('g_concepto').value = '';
      document.getElementById('g_importe').value  = '';
      document.querySelector('#modalGasto h3').textContent = '🔧 Nuevo gasto';
      document.getElementById('modalGasto').classList.add('open');
      break;

    case 'categorias':
      renderCatList();
      document.getElementById('cat-emoji').value  = '';
      document.getElementById('cat-nombre').value = '';
      document.getElementById('modalCategorias').classList.add('open');
      break;

    case 'ayuda':
      helpTab('general', document.querySelector('.help-tab'));
      document.getElementById('modalAyuda').classList.add('open');
      break;

    case 'particion':
      document.getElementById('p_nombre').value   = '';
      document.getElementById('p_alquiler').value = '';
      document.getElementById('modalParticion').classList.add('open');
      break;
  }
}

// ─── CLOSE ───────────────────────────────────────────────────────────────────

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ─── HELP TABS ────────────────────────────────────────────────────────────────

function helpTab(section, btn) {
  document.querySelectorAll('.help-tab').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.help-section').forEach(s => s.classList.remove('on'));
  if (btn) btn.classList.add('on');
  const el = document.getElementById('help-' + section);
  if (el) el.classList.add('on');
}

// ─── CLOSE EN CLIC AL BACKDROP ───────────────────────────────────────────────

document.querySelectorAll('.modal-bg').forEach(bg => {
  bg.addEventListener('click', e => {
    if (e.target === bg) bg.classList.remove('open');
  });
});