/* ===== EXPONER SOLO FUNCIONES NUEVAS AL ÁMBITO GLOBAL ===== */
// Las funciones del archivo original (startTour, skipWelcome, showTab, addCard, etc.)
// ya están expuestas por original-app.js al final del archivo.
// Este archivo solo expone las funciones nuevas del sistema de autenticación y perfil.

window.switchAuthMode = () => {
  window.authMode = window.authMode === 'login' ? 'register' : 'login';
  const label = document.getElementById('authModeLabel');
  if (label) label.textContent = window.authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
  const submitBtn = document.querySelector('#authForm button[type="submit"]');
  if (submitBtn) submitBtn.textContent = window.authMode === 'login' ? 'Entrar' : 'Crear Cuenta';
};

window.handleAuth = async () => {
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  if (!username || !password) {
    if (errorEl) errorEl.textContent = 'Completa usuario y contraseña.';
    return;
  }
  if (window.authMode === 'register') {
    const result = registerUser(username, password);
    if (result.success) {
      if (errorEl) errorEl.textContent = '';
      window.authMode = 'login';
      window.switchAuthMode();
      const label = document.getElementById('authModeLabel');
      if (label) label.textContent = 'Iniciar Sesión';
      const submitBtn = document.querySelector('#authForm button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Entrar';
      if (errorEl) errorEl.style.color = 'var(--success)';
      if (errorEl) errorEl.textContent = 'Cuenta creada. Ahora inicia sesión.';
    } else {
      if (errorEl) { errorEl.style.color = 'var(--danger)'; errorEl.textContent = result.message; }
    }
    return;
  }
  const result = await loginUser(username, password);
  if (result.success) {
    if (errorEl) errorEl.textContent = '';
    document.getElementById('welcomeOverlay')?.classList.add('hidden');
    location.reload();
  } else {
    if (errorEl) { errorEl.style.color = 'var(--danger)'; errorEl.textContent = result.message; }
  }
};

window.authLogout = () => {
  logoutUser();
  document.getElementById('welcomeOverlay')?.classList.remove('hidden');
  const overlay = document.getElementById('loginOverlay');
  if (overlay) document.body.appendChild(overlay.cloneNode(true));
  window.location.reload();
};

window.openProfileModal = () => {
  const user = loadCurrentUser();
  const existing = document.getElementById('profileModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(4,8,18,0.85);backdrop-filter:blur(28px);display:flex;align-items:center;justify-content:center;animation:fadeIn .3s ease;';
  const avatarUrl = user && user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${user ? encodeURIComponent(user.username || 'U') : 'U'}&background=00f0ff&color=060b14&size=128`;
  modal.innerHTML = `<div class="profile-modal-card" style="background:linear-gradient(145deg,rgba(11,19,37,0.96),rgba(15,26,53,0.96));border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:2rem;max-width:420px;width:92%;box-shadow:0 30px 80px rgba(0,240,255,.2);animation:slideUp .5s ease;position:relative;">
    <button onclick="document.getElementById('profileModal').remove()" aria-label="Cerrar" style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--text-muted);font-size:1.25rem;cursor:pointer;line-height:1;">✕</button>
    <h3 style="margin-bottom:1.5rem;color:var(--primary);font-family:var(--font-display);font-size:1.25rem;">Perfil de Usuario</h3>
    <div style="text-align:center;margin-bottom:1.5rem;">
      <img id="profileAvatarPreview" src="${avatarUrl}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);box-shadow:0 0 20px rgba(0,240,255,.3);" />
      <label for="avatarInput" style="display:block;margin-top:.75rem;color:var(--text-muted);font-size:.75rem;">Cambiar foto (archivo o URL)</label>
      <input id="avatarInput" type="file" accept="image/*" onchange="updateAvatarFromFile(this)" style="margin-top:.25rem;" />
      <input type="text" id="avatarUrlInput" placeholder="O pega una URL de imagen" oninput="updateAvatarFromUrl(this.value)" style="margin-top:.5rem;width:100%;" />
    </div>
    <div style="margin-bottom:1rem;">
      <label for="profileUsernameInput">Nombre de usuario</label>
      <input id="profileUsernameInput" type="text" value="${user ? user.username : ''}" placeholder="Nuevo nombre" style="width:100%;" />
    </div>
    <div style="display:flex;gap:.75rem;margin-top:1.5rem;flex-wrap:wrap;">
      <button onclick="saveProfileChanges()" class="btn" style="flex:1;">Guardar cambios</button>
      <button onclick="authLogout(); document.getElementById('profileModal').remove();" class="btn btn-secondary" style="flex:1;background:linear-gradient(135deg,#ff5555,#ff3333);color:#fff;">Cerrar sesión</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
};

window.updateAvatarFromFile = (input) => {
  const file = input.files ? input.files[0] : null;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const user = loadCurrentUser();
    if (user) { user.avatar = e.target.result; localStorage.setItem('ep_current_user', JSON.stringify(user)); }
    const preview = document.getElementById('profileAvatarPreview');
    if (preview) preview.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.updateAvatarFromUrl = (url) => {
  const user = loadCurrentUser();
  if (user && url.trim()) { user.avatar = url.trim(); localStorage.setItem('ep_current_user', JSON.stringify(user)); }
  const preview = document.getElementById('profileAvatarPreview');
  if (preview && url.trim()) preview.src = url.trim();
};

window.saveProfileChanges = () => {
  const user = loadCurrentUser();
  if (!user) return;
  const newName = document.getElementById('profileUsernameInput').value.trim();
  if (newName && newName.length >= 3) {
    user.username = newName;
    localStorage.setItem('ep_current_user', JSON.stringify(user));
    const widget = document.querySelector('.profile-widget');
    if (widget) {
      const btn = widget.querySelector('button');
      if (btn) {
        btn.querySelector('span').textContent = newName;
      }
    }
  }
  document.getElementById('profileModal')?.remove();
};
