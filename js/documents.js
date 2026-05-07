'use strict';

// ─── ESTAT ────────────────────────────────────────────────────────────────────

let docContext = { tipus: null, id: null, nom: null };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fileEmoji(nom) {
  const ext = nom.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext))                           return '📄';
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
  if (['doc','docx'].includes(ext))                    return '📝';
  if (['xls','xlsx','csv'].includes(ext))              return '📊';
  if (['zip','rar','7z'].includes(ext))                return '🗜️';
  return '📎';
}

function formatMida(bytes) {
  if (!bytes)              return '';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── OBRIR MODAL ─────────────────────────────────────────────────────────────

async function openDocs(tipus, id, nom) {
  docContext = { tipus, id, nom };
  document.getElementById('doc-modal-title').textContent = `📎 ${nom}`;
  document.getElementById('doc-file-input').value        = '';
  document.getElementById('doc-upload-progress').style.display = 'none';
  document.getElementById('modalDocuments').classList.add('open');
  renderDocList();
}

// ─── RENDER LLISTA ────────────────────────────────────────────────────────────

function renderDocList() {
  const list = D.documents.filter(
      d => d.entitat_tipus === docContext.tipus && d.entitat_id === docContext.id
  );
  const el = document.getElementById('doc-list');

  if (!list.length) {
    el.innerHTML = `<div style="font-size:13px;color:var(--mu);padding:8px 0;text-align:center">No hay documentos adjuntos.</div>`;
    return;
  }

  el.innerHTML = list.map(d => `
    <div class="doc-item">
      <div class="doc-icon">${fileEmoji(d.nom_fitxer)}</div>
      <div class="doc-info">
        <div class="doc-name">${d.nom_fitxer}</div>
        <div class="doc-meta">${formatMida(d.mida)} · ${new Date(d.created_at).toLocaleDateString('es-ES')}</div>
      </div>
      <a href="#" onclick="downloadDoc(event,'${d.storage_path}','${d.nom_fitxer}')"
         style="background:#dbeafe;color:#1d4ed8;border:none;border-radius:8px;padding:7px 10px;
                font:600 12px system-ui;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center">⬇</a>
      <button onclick="deleteDoc(${d.id},'${d.storage_path}')"
              style="background:#fff5f5;color:#dc2626;border:1px solid #fecaca;border-radius:8px;
                     padding:7px 10px;font:600 12px system-ui;cursor:pointer">🗑</button>
    </div>`).join('');
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

async function uploadDocuments(files) {
  if (!files.length) return;
  const { data: { user } } = await sb.auth.getUser();
  const uid      = user.id;
  const prog     = document.getElementById('doc-upload-progress');
  const progText = document.getElementById('doc-progress-text');
  prog.style.display = 'flex';

  let pujats = 0;
  for (const file of files) {
    progText.textContent = `Subiendo ${pujats + 1} de ${files.length}: ${file.name}`;
    const path = `${uid}/${docContext.tipus}_${docContext.id}/${Date.now()}_${file.name}`;

    const { error: upErr } = await sb.storage.from('documents').upload(path, file);
    if (upErr) { showToast('Error subiendo: ' + file.name); continue; }

    const { error: dbErr } = await sb.from('documents').insert({
      user_id:       uid,
      entitat_tipus: docContext.tipus,
      entitat_id:    docContext.id,
      nom_fitxer:    file.name,
      storage_path:  path,
      mida:          file.size,
    });
    if (dbErr) { showToast('Error guardando: ' + file.name); continue; }
    pujats++;
  }

  prog.style.display = 'none';
  document.getElementById('doc-file-input').value = '';

  const { data } = await sb.from('documents').select('*').order('created_at');
  D.documents = data || [];
  renderDocList();
  if (pujats) showToast(`✅ ${pujats} archivo${pujats !== 1 ? 's' : ''} subido${pujats !== 1 ? 's' : ''}`);
}

// ─── DOWNLOAD ────────────────────────────────────────────────────────────────

async function downloadDoc(e, path, nom) {
  e.preventDefault();
  const { data, error } = await sb.storage.from('documents').download(path);
  if (error) return showToast('Error descargando archivo');
  const url = URL.createObjectURL(data);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function deleteDoc(id, path) {
  if (!confirm('¿Eliminar este documento?')) return;
  await sb.storage.from('documents').remove([path]);
  await sb.from('documents').delete().eq('id', id);
  const { data } = await sb.from('documents').select('*').order('created_at');
  D.documents = data || [];
  renderDocList();
  showToast('✅ Documento eliminado');
}