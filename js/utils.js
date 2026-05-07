'use strict';

// ─── FORMATADORS ─────────────────────────────────────────────────────────────

function euro(n) {
  return (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
}

function badge(s) {
  if (['Pagado', 'Vigente', 'Alquilado', 'Disponible'].includes(s))
    return `<span class="badge b-ok">${s}</span>`;
  if (['Pendiente'].includes(s))
    return `<span class="badge b-warn">${s}</span>`;
  if (['Retrasado', 'Baja', 'Impagado'].includes(s))
    return `<span class="badge b-bad">${s}</span>`;
  return `<span class="badge b-blue">${s || ''}</span>`;
}

/**
 * Converteix "YYYY-MM" → "Mes Any"  (ex. "2026-04" → "Abr 2026")
 */
function fmtMes(ym) {
  if (!ym) return '—';
  const NOMS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [any, mesNum] = ym.split('-');
  return `${NOMS[parseInt(mesNum)]} ${any}`;
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────────

function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

/**
 * Navega a una pàgina de l'app i marca el botó de nav actiu.
 */
function goTo(id, btn) {
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const page = document.getElementById(id);
  if (page) {
    page.style.display = 'block';
    window.scrollTo(0, 0);
  }
}

/**
 * Salta a la pàgina d'inquilins i fa scroll + highlight a la card indicada.
 */
function goToInquilino(id) {
  const btn = [...document.querySelectorAll('.nav button')]
  .find(b => b.querySelector('.nlabel')?.textContent === 'Inquilinos');
  goTo('page-inquilinos', btn || null);

  document.getElementById('inq-texto').value = '';
  const vigentChip = document.querySelector('#chips-inq-estado .chip[data-val="Vigente"]');
  if (vigentChip) {
    inqEstado = 'Vigente';
    document.querySelectorAll('#chips-inq-estado .chip').forEach(c => c.classList.remove('on'));
    vigentChip.classList.add('on');
  }
  renderInquilinos();

  setTimeout(() => {
    const fila = document.querySelector(`#inquilinos [data-inq-id="${id}"]`);
    if (!fila) return;
    fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fila.style.transition = 'outline .15s, box-shadow .15s';
    fila.style.outline    = '3px solid var(--pri)';
    fila.style.boxShadow  = '0 0 0 6px rgba(23,103,209,.2)';
    setTimeout(() => { fila.style.outline = ''; fila.style.boxShadow = ''; }, 1800);
  }, 150);
}