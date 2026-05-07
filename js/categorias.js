'use strict';

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderChipsTipo() {
  const container = document.getElementById('chips-tipo');
  if (!container) return;

  const activeVal = F.tipo;
  container.innerHTML =
      `<button class="chip${activeVal === '' ? ' on' : ''}" data-val="" onclick="setChip('tipo','',this)">Todos</button>` +
      D.categorias.map(c => `
      <button class="chip${activeVal === c.nombre ? ' on' : ''}" data-val="${c.nombre}"
              onclick="setChip('tipo','${c.nombre}',this)">${c.emoji} ${c.nombre}</button>
    `).join('');
}

function renderSelectTipo(selectedVal = '') {
  const sel = document.getElementById('f_tipo');
  if (!sel) return;
  sel.innerHTML = D.categorias.map(c =>
      `<option value="${c.nombre}"${c.nombre === selectedVal ? ' selected' : ''}>${c.emoji} ${c.nombre}</option>`
  ).join('');
}

function renderSelectInquilino(selectedInqId = null, targetId = 'f_inquilino') {
  const sel = document.getElementById(targetId);
  if (!sel) return;
  sel.innerHTML =
      '<option value="">— Sin inquilino —</option>' +
      D.inquilinos
      .filter(i => i.estado === 'Vigente')
      .map(i => {
        const s = i.id === selectedInqId ? ' selected' : '';
        return `<option value="${i.id}"${s}>${i.nombre}${i.telefono ? ' · ' + i.telefono : ''}</option>`;
      }).join('');
}

function renderCatList() {
  const el = document.getElementById('cat-list');
  if (!el) return;
  el.innerHTML = D.categorias.length
      ? D.categorias.map(c => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9">
          <span style="font-size:20px;width:28px;text-align:center">${c.emoji}</span>
          <span style="flex:1;font-size:13px;font-weight:600">${c.nombre}</span>
          <button class="tbtn del" onclick="deleteCategoria(${c.id},'${c.nombre}')">🗑</button>
        </div>`).join('')
      : `<div style="font-size:13px;color:var(--mu);padding:8px 0">No hay tipos definidos.</div>`;
}

// ─── ACCIONS ──────────────────────────────────────────────────────────────────

async function addCategoria() {
  const emoji  = document.getElementById('cat-emoji').value.trim() || '🏠';
  const nombre = document.getElementById('cat-nombre').value.trim();
  if (!nombre) return showToast('Escribe un nombre');
  if (D.categorias.some(c => c.nombre.toLowerCase() === nombre.toLowerCase()))
    return showToast('Ya existe ese tipo');

  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('categorias_inmueble').insert({ nombre, emoji, user_id: user.id });
  if (error) return showToast('Error: ' + error.message);

  document.getElementById('cat-emoji').value  = '';
  document.getElementById('cat-nombre').value = '';
  await reloadCategorias();
  showToast('✅ Tipo añadido');
}

async function deleteCategoria(id, nombre) {
  const enUso = D.inmuebles.some(im => im.tipo === nombre);
  if (enUso && !confirm(`El tipo "${nombre}" está en uso en ${D.inmuebles.filter(im => im.tipo === nombre).length} inmueble(s). ¿Eliminar igualmente?`))
    return;

  const { error } = await sb.from('categorias_inmueble').delete().eq('id', id);
  if (error) return showToast('Error: ' + error.message);
  await reloadCategorias();
  showToast('✅ Tipo eliminado');
}

async function reloadCategorias() {
  const { data } = await sb.from('categorias_inmueble').select('*').order('nombre');
  D.categorias = data || [];
  renderChipsTipo();
  renderSelectTipo();
  renderCatList();
  renderInmuebles();
}