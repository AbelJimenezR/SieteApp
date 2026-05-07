'use strict';

// ─── UI ───────────────────────────────────────────────────────────────────────

function hideSplash() {
  document.getElementById('splashScreen').style.display = 'none';
}

function showLogin() {
  hideSplash();
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display  = 'none';
}

function showApp(email) {
  hideSplash();
  document.getElementById('authScreen').style.display = 'none';
  const appEl = document.getElementById('appScreen');
  appEl.style.display = window.innerWidth >= 701 ? '' : 'block';
  document.getElementById('userEmail').textContent    = email.split('@')[0];
  document.getElementById('avatarInitial').textContent = (email[0] || '?').toUpperCase();
}

function showAuthMsg(msg, type = 'err') {
  const el = document.getElementById('authMsg');
  el.textContent = msg;
  el.className   = 'auth-msg ' + type;
  el.style.display = 'block';
}

function switchTab(tab) {
  document.getElementById('loginForm').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
  document.querySelectorAll('.auth-tab').forEach((b, i) => {
    b.classList.toggle('on', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
}

function togglePass(inputId, btn) {
  const inp  = document.getElementById(inputId);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.querySelector('.eye-on').style.display  = show ? 'none' : '';
  btn.querySelector('.eye-off').style.display = show ? ''     : 'none';
}

// ─── ACCIONS ──────────────────────────────────────────────────────────────────

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) return showAuthMsg('Rellena todos los campos');
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) showAuthMsg(error.message);
}

async function doRegister() {
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  if (!email || !pass) return showAuthMsg('Rellena todos los campos');
  if (pass.length < 6)  return showAuthMsg('La contraseña debe tener mínimo 6 caracteres');
  const { error } = await sb.auth.signUp({ email, password: pass });
  if (error) showAuthMsg(error.message);
  else       showAuthMsg('✅ Cuenta creada. Revisa tu correo para confirmar.', 'ok');
}

async function doLogout() {
  await sb.auth.signOut();
  showLogin();
}

// ─── INICIALITZACIÓ ───────────────────────────────────────────────────────────

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    showApp(session.user.email || '');
    loadAll();
  } else {
    showLogin();
  }
})();

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    showApp(session.user.email || '');
    loadAll();
  } else if (event === 'SIGNED_OUT') {
    showLogin();
  }
});