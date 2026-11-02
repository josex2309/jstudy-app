/* ===== INTEGRACIÓN EXACTA DEL ARCHIVO ORIGINAL + AUTENTICACIÓN ===== */
import './original-app.js';
import './globals.js';
import { 
  isSessionActive, 
  loadCurrentUser, 
  registerUser, 
  loginUser, 
  logoutUser, 
  getPasswordStrength,
  onAuthStateChange
} from './auth.js';

function renderLoginUI() {
  let overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'loginOverlay';
  overlay.innerHTML = `
    <div class="login-overlay" style="position:fixed;inset:0;z-index:5000;background:rgba(4,8,18,0.92);backdrop-filter:blur(28px);display:flex;align-items:center;justify-content:center;">
      <div class="login-card" style="background:linear-gradient(145deg,rgba(11,19,37,0.96),rgba(15,26,53,0.96));border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:3rem;max-width:420px;width:92%;text-align:center;box-shadow:0 30px 80px rgba(0,240,255,.15),0 0 0 1px rgba(0,240,255,.1);animation:slideUp .7s ease;">
        <h2 style="font-size:2rem;margin-bottom:.25rem;color:var(--primary);font-family:var(--font-display);">JStudy — Estudio Pro</h2>
        <p style="color:var(--text-muted);margin-bottom:2rem;font-size:.95rem;">Inicia sesión para acceder a tu estudio inteligente.</p>
        <form id="authForm" onsubmit="event.preventDefault(); handleAuth();" style="text-align:left;">
          <div id="authModeLabel" style="margin-bottom:1rem;font-weight:700;color:var(--primary);font-size:1.1rem;">Iniciar Sesión</div>
          <label for="authEmail">Email</label>
          <input id="authEmail" type="email" placeholder="tu@email.com" style="width:100%;margin-bottom:1rem;" autocomplete="email" />
          <label for="authPassword">Contraseña</label>
          <input id="authPassword" type="password" placeholder="Contraseña (letra + número, mín. 6 chars)" style="width:100%;margin-bottom:.5rem;" autocomplete="current-password" />
          <div id="passwordStrength" style="font-size:.75rem;color:var(--text-muted);margin-bottom:1rem;height:1.2rem;"></div>
          <div id="authDisplayNameGroup" style="display:none;margin-bottom:1rem;">
            <label for="authDisplayName">Nombre para mostrar</label>
            <input id="authDisplayName" type="text" placeholder="Tu nombre" style="width:100%;" autocomplete="name" />
          </div>
          <div style="display:flex;gap:.75rem;margin-top:1rem;flex-wrap:wrap;">
            <button type="submit" class="btn" style="flex:1;">Entrar</button>
            <button type="button" onclick="switchAuthMode()" class="btn btn-secondary" style="flex:1;">Registrarme</button>
          </div>
        <div id="authToggleLink" style="margin-top:1rem;text-align:center;font-size:.85rem;color:var(--text-muted);">
            <a href="#" onclick="event.preventDefault(); window.switchAuthMode();" style="color:var(--primary);text-decoration:none;font-weight:600;">¿Ya tienes cuenta? Inicia sesión aquí</a>
          </div>
        </form>
        <div id="authError" style="margin-top:1rem;color:var(--danger);font-weight:600;font-size:.85rem;min-height:1.2rem;"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  window.authMode = 'login';
  const pwInput = document.getElementById('authPassword');
  if (pwInput) pwInput.addEventListener('input', () => {
    const strength = getPasswordStrength(pwInput.value);
    const strengthEl = document.getElementById('passwordStrength');
    if (strengthEl) strengthEl.textContent = `Fortaleza: ${strength.label}`;
  });
}

window.switchAuthMode = () => {
  window.authMode = window.authMode === 'login' ? 'register' : 'login';
  const label = document.getElementById('authModeLabel');
  if (label) label.textContent = window.authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
  const submitBtn = document.querySelector('#authForm button[type="submit"]');
  if (submitBtn) submitBtn.textContent = window.authMode === 'login' ? 'Entrar' : 'Registrarse';
  // Show/hide display name field for registration
  const displayNameGroup = document.getElementById('authDisplayNameGroup');
  if (displayNameGroup) displayNameGroup.style.display = window.authMode === 'register' ? 'block' : 'none';
  // Toggle link text based on mode
  const toggleLink = document.getElementById('authToggleLink');
  if (toggleLink) {
    toggleLink.innerHTML = window.authMode === 'register'
      ? `<a href="#" onclick="event.preventDefault(); window.switchAuthMode();" style="color:var(--primary);text-decoration:none;font-weight:600;">¿Ya tienes cuenta? Inicia sesión aquí</a>`
      : `<a href="#" onclick="event.preventDefault(); window.switchAuthMode();" style="color:var(--primary);text-decoration:none;font-weight:600;">¿No tienes cuenta? Regístrate aquí</a>`;
  }
};

window.handleAuth = async () => {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const displayName = document.getElementById('authDisplayName')?.value.trim();
  const errorEl = document.getElementById('authError');
  if (!email || !password) {
    if (errorEl) errorEl.textContent = 'Completa email y contraseña.';
    return;
  }
  if (window.authMode === 'register') {
    const submitBtn = document.querySelector('#authForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    if (submitBtn) submitBtn.textContent = 'Creando cuenta...';
    const result = await registerUser(email, password, displayName);
    if (submitBtn) submitBtn.disabled = false;
    if (submitBtn) submitBtn.textContent = 'Crear Cuenta';
    if (result.success) {
      if (errorEl) errorEl.textContent = '';
      window.authMode = 'login';
      window.switchAuthMode();
      const label = document.getElementById('authModeLabel');
      if (label) label.textContent = 'Iniciar Sesión';
      const submitBtn2 = document.querySelector('#authForm button[type="submit"]');
      if (submitBtn2) submitBtn2.textContent = 'Entrar';
      if (errorEl) errorEl.style.color = 'var(--success)';
      if (errorEl) errorEl.textContent = 'Cuenta creada. Ahora inicia sesión.';
    } else {
      if (errorEl) { errorEl.style.color = 'var(--danger)'; errorEl.textContent = result.message; }
    }
    return;
  }
  const submitBtn = document.querySelector('#authForm button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  if (submitBtn) submitBtn.textContent = 'Entrando...';
  const result = await loginUser(email, password);
  if (submitBtn) submitBtn.disabled = false;
  if (submitBtn) submitBtn.textContent = 'Entrar';
  if (result.success) {
    if (errorEl) errorEl.textContent = '';
    document.getElementById('welcomeOverlay')?.classList.add('hidden');
    location.reload();
  } else {
    if (errorEl) { errorEl.style.color = 'var(--danger)'; errorEl.textContent = result.message; }
  }
};

window.authLogout = async () => {
  await logoutUser();
  document.getElementById('welcomeOverlay')?.classList.remove('hidden');
  renderLoginUI();
};

try {
  window.addEventListener('load', () => {
    if (!isSessionActive()) {
      renderLoginUI();
    } else {
    const user = loadCurrentUser();
    if (user) {
      document.getElementById('welcomeOverlay')?.classList.add('hidden');
    } else {
      renderLoginUI();
    }
  }
  const panels = ['panel-mazos', 'panel-quiz', 'panel-pomodoro', 'panel-notas', 'panel-resumen', 'panel-progreso'];
  panels.forEach(p => {
    if (!document.getElementById(p)) {
      const div = document.createElement('div');
      div.id = p; div.className = 'panel';
      document.querySelector('.main-content')?.appendChild(div);
    }
  });

  // ===== COMPONENTE PERFIL =====
  renderProfileWidget();
});

function renderProfileWidget() {
  const user = loadCurrentUser();
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (!sidebarFooter) return;
  // Remove existing profile widget to prevent duplication on re-renders
  const existingWidget = document.querySelector('.profile-widget');
  if (existingWidget) existingWidget.remove();
  const profileEl = document.createElement('div');
  profileEl.className = 'profile-widget';
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
  const avatarUrl = user && user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00f0ff&color=060b14&size=64`;
  profileEl.innerHTML = `<button onclick="openProfileModal()" class="profile-btn" aria-label="Perfil de usuario" style="display:flex;align-items:center;gap:.75rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:.4rem .75rem;cursor:pointer;color:var(--text);font-weight:600;font-size:.85rem;transition:all .2s ease;">
    <img src="${avatarUrl}" alt="Avatar" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);flex-shrink:0;" />
    <span style="text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:110px;">${displayName}</span>
  </button>`;
  sidebarFooter.insertAdjacentElement('beforebegin', profileEl);
}

window.openProfileModal = () => {
  const user = loadCurrentUser();
  const existing = document.getElementById('profileModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(4,8,18,0.85);backdrop-filter:blur(28px);display:flex;align-items:center;justify-content:center;animation:fadeIn .3s ease;';
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
  const avatarUrl = user && user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00f0ff&color=060b14&size=128`;
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
      <label for="profileDisplayNameInput">Nombre para mostrar</label>
      <input id="profileDisplayNameInput" type="text" value="${user?.displayName || ''}" placeholder="Tu nombre" style="width:100%;" />
    </div>
    <div style="margin-bottom:1rem;color:var(--text-muted);font-size:.8rem;">
      <strong>Email:</strong> ${user?.email || 'No disponible'}<br>
      <strong>UID:</strong> ${user?.uid || 'No disponible'}
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
  const newDisplayName = document.getElementById('profileDisplayNameInput').value.trim();
  if (newDisplayName && newDisplayName.length >= 2) {
    user.displayName = newDisplayName;
    localStorage.setItem('ep_current_user', JSON.stringify(user));
    // Also update Firebase Auth profile
    import('./auth.js').then(({ getCurrentFirebaseUser, updateProfile }) => {
      const fbUser = getCurrentFirebaseUser();
      if (fbUser) {
        updateProfile(fbUser, { displayName: newDisplayName }).catch(console.error);
      }
    }).catch(console.error);
    const widget = document.querySelector('.profile-widget');
    if (widget) renderProfileWidget();
  }
  document.getElementById('profileModal')?.remove();
};
} catch (e) {
  console.error('JStudy init error:', e);
  document.body.innerHTML = '<div style="padding:2rem;color:#ff5555;font-family:sans-serif;text-align:center;"><h2>Error al cargar JStudy</h2><p>Se produjo un error inesperado al inicializar la aplicación. Intenta recargar la página.</p></div>';
}
