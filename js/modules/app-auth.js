/**
 * app-auth.js - Autenticación, Sesión y Login Dinámico Interactivo Odontológico
 */
import { state, api } from './app-state.js';
import { el, showToast, apiFetch } from './app-utils.js';

let currentMouthState = 'idle';

export async function checkSession() {
  try {
    const data = await apiFetch(`${api.auth}?action=session`);
    if (data.user) {
      state.user = data.user;
      applyUserSession(data.user);
    } else {
      showLogin();
    }
  } catch (e) {
    // Si falla o es offline, mostrar login
    showLogin();
  }
}

export function showLogin() {
  const box = el('loginBox');
  if (box) {
    box.classList.remove('hidden');
    setMouthState('idle');
  }
  el('panel')?.classList.add('hidden');
}

export function applyUserSession(user) {
  el('loginBox')?.classList.add('hidden');
  el('panel')?.classList.remove('hidden');

  if (el('userName')) el('userName').textContent = user.name || user.username;
  if (el('userRole')) el('userRole').textContent = user.role || 'Doctor';

  // Aplicar temas guardados
  if (user.appearance) {
    const theme = user.appearance.theme || 'light';
    const fontSize = user.appearance.fontSize || 'normal';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
    if (user.appearance.calendarView) {
      state.calendarView = user.appearance.calendarView;
    }
  }
}

/**
 * Control de Estados del Personaje Odontológico y la Tarjeta de Login
 * @param {'idle' | 'focus-user' | 'focus-password' | 'validating' | 'success' | 'error'} stateName 
 * @param {object} meta 
 */
export function setMouthState(stateName, meta = {}) {
  currentMouthState = stateName;
  const card = el('loginSplitCard');
  if (!card) return;

  // Actualizar clase del card
  card.className = `login-split-card state-${stateName}`;

  // Actualizar Badge de Estado
  const statusText = el('mascotStatusText');
  const badge = el('mascotBadgeStatus');

  const pupilL = document.getElementById('mascotPupilLeft');
  const pupilR = document.getElementById('mascotPupilRight');

  if (stateName === 'idle') {
    if (statusText) statusText.textContent = 'Acceso Seguro';
    if (badge) badge.innerHTML = '<i class="fas fa-shield-halved"></i> <span>Acceso Seguro</span>';
    if (pupilL) pupilL.style.transform = 'translate(0, 0)';
    if (pupilR) pupilR.style.transform = 'translate(0, 0)';
  } else if (stateName === 'focus-user') {
    if (statusText) statusText.textContent = 'Identificando...';
    if (badge) badge.innerHTML = '<i class="fas fa-user-pen" style="color:var(--primary);"></i> <span>Identificando...</span>';
    const len = meta.textLength || 0;
    const shiftX = Math.min(Math.max((len - 5) * 0.7, -5), 5);
    if (pupilL) pupilL.style.transform = `translate(${shiftX}px, 3px)`;
    if (pupilR) pupilR.style.transform = `translate(${shiftX}px, 3px)`;
  } else if (stateName === 'focus-password') {
    if (meta.isPasswordVisible) {
      if (statusText) statusText.textContent = 'Modo Visible 👁️';
      if (badge) badge.innerHTML = '<i class="fas fa-eye" style="color:#8b5cf6;"></i> <span>Modo Visible</span>';
      if (pupilL) pupilL.style.transform = 'translate(0, 4px)';
      if (pupilR) pupilR.style.transform = 'translate(0, 4px)';
    } else {
      if (statusText) statusText.textContent = 'Privacidad Protegida 🔒';
      if (badge) badge.innerHTML = '<i class="fas fa-lock" style="color:#8b5cf6;"></i> <span>Privacidad Protegida</span>';
      if (pupilL) pupilL.style.transform = 'translate(0, -6px)';
      if (pupilR) pupilR.style.transform = 'translate(0, -6px)';
    }
  } else if (stateName === 'validating') {
    if (statusText) statusText.textContent = 'Verificando...';
    if (badge) badge.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--primary);"></i> <span>Verificando...</span>';
    if (pupilL) pupilL.style.transform = 'translate(0, 0)';
    if (pupilR) pupilR.style.transform = 'translate(0, 0)';
  } else if (stateName === 'success') {
    if (statusText) statusText.textContent = '¡Acceso Concedido!';
    if (badge) badge.innerHTML = '<i class="fas fa-circle-check" style="color:#ffffff;"></i> <span>¡Acceso Concedido!</span>';
  } else if (stateName === 'error') {
    if (statusText) statusText.textContent = 'Credenciales Inválidas';
    if (badge) badge.innerHTML = '<i class="fas fa-circle-exclamation" style="color:var(--danger);"></i> <span>Error de Acceso</span>';
    if (pupilL) pupilL.style.transform = 'translate(0, 0)';
    if (pupilR) pupilR.style.transform = 'translate(0, 0)';
  }
}

export async function login() {
  const userEl = el('loginUser');
  const passEl = el('loginPass');
  const msgEl = el('loginMsg');
  const btn = el('loginBtn');

  const username = userEl?.value.trim();
  const password = passEl?.value.trim();

  if (!username || !password) {
    if (msgEl) {
      msgEl.className = 'login-msg-box error';
      msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ingresá usuario y contraseña';
    }
    setMouthState('error');
    setTimeout(() => {
      if (currentMouthState === 'error') setMouthState('idle');
    }, 1500);
    return;
  }

  setMouthState('validating');
  if (msgEl) {
    msgEl.className = 'login-msg-box';
    msgEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando credenciales...';
  }
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
  }

  try {
    const data = await apiFetch(`${api.auth}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data.success && data.user) {
      setMouthState('success');
      if (msgEl) {
        msgEl.className = 'login-msg-box success';
        msgEl.innerHTML = `<i class="fas fa-check-circle"></i> ¡Bienvenido/a, ${data.user.name || data.user.username}!`;
      }

      state.user = data.user;
      state.token = data.token;

      // Esperar la animación radiante de éxito antes de abrir el dashboard
      setTimeout(() => {
        applyUserSession(data.user);
        showToast(`¡Bienvenido, ${data.user.name || data.user.username}!`, 'success');
        window.dispatchEvent(new CustomEvent('app:authenticated'));
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Iniciar Sesión';
        }
      }, 900);
    } else {
      throw new Error(data.error || 'Credenciales inválidas');
    }
  } catch (err) {
    setMouthState('error');
    if (msgEl) {
      msgEl.className = 'login-msg-box error';
      msgEl.innerHTML = `<i class="fas fa-times-circle"></i> ${err.message || 'Usuario o contraseña incorrectos'}`;
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Iniciar Sesión';
    }
    setTimeout(() => {
      if (currentMouthState === 'error') setMouthState('idle');
    }, 1800);
  }
}

export function logout() {
  state.user = null;
  state.token = null;
  showToast('Sesión cerrada correctamente', 'info');
  showLogin();
}

export function setupLoginListeners() {
  const userEl = el('loginUser');
  const passEl = el('loginPass');
  const togglePassBtn = el('toggleLoginPassBtn');
  const togglePassIcon = el('toggleLoginPassIcon');
  const loginBtn = el('loginBtn');

  // Eventos para Usuario
  userEl?.addEventListener('focus', () => {
    if (currentMouthState !== 'validating' && currentMouthState !== 'success') {
      setMouthState('focus-user', { textLength: userEl.value.length });
    }
  });

  userEl?.addEventListener('input', () => {
    if (currentMouthState === 'focus-user') {
      setMouthState('focus-user', { textLength: userEl.value.length });
    }
  });

  userEl?.addEventListener('blur', () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (active !== userEl && active !== passEl && currentMouthState !== 'validating' && currentMouthState !== 'success') {
        setMouthState('idle');
      }
    }, 100);
  });

  // Eventos para Contraseña
  passEl?.addEventListener('focus', () => {
    if (currentMouthState !== 'validating' && currentMouthState !== 'success') {
      const isVisible = passEl.type === 'text';
      setMouthState('focus-password', { isPasswordVisible: isVisible });
    }
  });

  passEl?.addEventListener('blur', () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (active !== userEl && active !== passEl && currentMouthState !== 'validating' && currentMouthState !== 'success') {
        setMouthState('idle');
      }
    }, 100);
  });

  // Toggle Ver/Ocultar Contraseña
  togglePassBtn?.addEventListener('click', () => {
    if (!passEl) return;
    const isNowText = passEl.type === 'password';
    passEl.type = isNowText ? 'text' : 'password';
    if (togglePassIcon) {
      togglePassIcon.className = isNowText ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
    if (document.activeElement === passEl) {
      setMouthState('focus-password', { isPasswordVisible: isNowText });
    }
  });

  // Envío al presionar Enter
  userEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      passEl?.focus();
    }
  });

  passEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });

  loginBtn?.addEventListener('click', login);
}
