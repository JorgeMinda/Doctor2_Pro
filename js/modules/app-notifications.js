/**
 * app-notifications.js - Avisos Internos y Notificaciones
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';

export async function loadNotifications() {
  try {
    const data = await apiFetch(api.notifications);
    state.notifications = data.notifications || [];
    renderNotifications();
  } catch (err) {
    console.warn('Error al cargar notificaciones:', err);
  }
}

export function renderNotifications() {
  const container = el('notifList');
  const badge = el('navBadge');
  if (!container) return;

  const unread = state.notifications.filter(n => !n.is_read).length;
  if (badge) {
    badge.textContent = unread;
    if (unread > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  }

  if (state.notifications.length === 0) {
    container.innerHTML = '<div class="empty">No hay notificaciones pendientes.</div>';
    return;
  }

  container.innerHTML = state.notifications.map(n => `
    <div class="slot notification-item ${n.is_read ? 'is-read' : ''}">
      <div class="info">
        <strong>${n.title}</strong><br>
        <small>${n.message}</small>
      </div>
      <div class="notif-status">
        <small class="muted">${n.created_at || 'Reciente'}</small>
      </div>
    </div>
  `).join('');
}

export async function markNotificationsRead() {
  try {
    await apiFetch(`${api.notifications}?action=mark_all_read`, { method: 'PATCH' });
    state.notifications.forEach(n => n.is_read = 1);
    renderNotifications();
    showToast('Notificaciones marcadas como leídas', 'success');
  } catch (err) {
    showToast('Error al marcar notificaciones', 'error');
  }
}

export async function deleteAllNotifications() {
  try {
    await apiFetch(api.notifications, { method: 'DELETE' });
    state.notifications = [];
    renderNotifications();
    showToast('Notificaciones eliminadas', 'info');
  } catch (err) {
    showToast('Error al eliminar notificaciones', 'error');
  }
}
