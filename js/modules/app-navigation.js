/**
 * app-navigation.js - Navegación entre Módulos y Control del Sidebar
 */
import { state } from './app-state.js';
import { el } from './app-utils.js';

export function setNav(view) {
  state.currentNav = view;

  // Lista de todas las vistas
  const views = {
    agenda: 'agendaView',
    patients: 'patientsView',
    professionals: 'professionalsView',
    inventory: 'inventoryView',
    analytics: 'analyticsView',
    notifications: 'notificationsView',
    chat: 'chatView',
    internalChat: 'internalChatView',
    connections: 'connectionsView'
  };

  const navButtons = {
    agenda: 'navAgenda',
    patients: 'navPatients',
    professionals: 'navPros',
    inventory: 'navInventory',
    analytics: 'navAnalytics',
    notifications: 'navConfig',
    chat: 'navChat',
    internalChat: 'navInternalChat',
    connections: 'navConnections'
  };

  // Ocultar todas las secciones
  Object.values(views).forEach(viewId => {
    const pane = el(viewId);
    if (pane) pane.classList.add('hidden');
  });

  // Desactivar botones nav
  Object.values(navButtons).forEach(btnId => {
    const btn = el(btnId);
    if (btn) btn.classList.remove('active');
  });

  // Mostrar vista activa y botón activo
  const targetPane = el(views[view]);
  if (targetPane) {
    targetPane.classList.remove('hidden');
  }

  const targetBtn = el(navButtons[view]);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  // Notificar al sistema del cambio de vista
  window.dispatchEvent(new CustomEvent('nav:changed', { detail: { view } }));

  // En móvil, cerrar sidebar al navegar
  closeMobileSidebar();
}

export function toggleMobileSidebar() {
  const sidebar = el('sidebar');
  const overlay = el('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('show');
  if (overlay) overlay.classList.toggle('show');
}

export function closeMobileSidebar() {
  const sidebar = el('sidebar');
  const overlay = el('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
}

window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
