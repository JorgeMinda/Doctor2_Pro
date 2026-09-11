/**
 * app-auth.js - Autenticación, Sesión y Preferencias
 */
import { state, api } from './app-state.js';
import { el, showToast, apiFetch } from './app-utils.js';

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
  el('loginBox')?.classList.remove('hidden');
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

export async function login() {
  const userEl = el('loginUser');
  const passEl = el('loginPass');
  const msgEl = el('loginMsg');

  const username = userEl?.value.trim();
  const password = passEl?.value.trim();

  if (!username || !password) {
    if (msgEl) msgEl.textContent = 'Por favor ingresá usuario y contraseña';
    return;
  }

  try {
    if (msgEl) msgEl.textContent = 'Ingresando...';
    const data = await apiFetch(`${api.auth}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data.success && data.user) {
      state.user = data.user;
      state.token = data.token;
      applyUserSession(data.user);
      showToast(`¡Bienvenido, ${data.user.name}!`, 'success');
      // Despachar evento para refrescar módulos
      window.dispatchEvent(new CustomEvent('app:authenticated'));
    }
  } catch (err) {
    if (msgEl) msgEl.textContent = err.message || 'Error al iniciar sesión';
  }
}

export function logout() {
  state.user = null;
  state.token = null;
  showToast('Sesión cerrada correctamente', 'info');
  showLogin();
}

export function setupLoginListeners() {
  el('loginPass')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });
}
