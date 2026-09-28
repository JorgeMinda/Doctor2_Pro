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
    treasury: 'treasuryView',
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
    treasury: 'navTreasury',
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

  // Control de visibilidad del toolbar / filtros de agenda por ruta (Unmount on route change)
  const mainToolbar = el('mainToolbar');
  const agendaFilters = el('agendaFilters') || document.querySelector('.filters');
  const agendaActions = el('agendaToolbarActions') || document.querySelector('.toolbar-actions');
  const mobileTitle = el('mobileSectionTitle');

  const sectionTitles = {
    agenda: 'Agenda de Turnos',
    patients: 'Pacientes & Historias Clínicas',
    professionals: 'Equipo de Profesionales',
    treasury: 'Cajas & Tesorería',
    inventory: 'Inventario & Farmacia',
    analytics: 'Estadísticas & Reportes',
    notifications: 'Avisos & Notificaciones',
    chat: 'WhatsApp',
    internalChat: 'Chat Interno',
    connections: 'Conexiones'
  };

  const isAgenda = (view === 'agenda');

  if (agendaFilters) {
    agendaFilters.style.display = isAgenda ? 'flex' : 'none';
  }
  if (agendaActions) {
    agendaActions.style.display = isAgenda ? 'flex' : 'none';
  }

  if (isAgenda) {
    if (mainToolbar) mainToolbar.style.display = 'flex';
    if (mobileTitle) mobileTitle.style.display = 'none';
  } else {
    if (window.innerWidth > 768) {
      // En Desktop, desmontar/ocultar toda la barra superior para máxima limpieza y estética
      if (mainToolbar) mainToolbar.style.display = 'none';
      if (mobileTitle) mobileTitle.style.display = 'none';
    } else {
      // En móvil, mantener visible el botón de menú y mostrar el título de la sección
      if (mainToolbar) mainToolbar.style.display = 'flex';
      if (mobileTitle) {
        mobileTitle.textContent = sectionTitles[view] || 'Doctor Pro';
        mobileTitle.style.display = 'block';
      }
    }
  }

  // Notificar al sistema del cambio de vista
  window.dispatchEvent(new CustomEvent('nav:changed', { detail: { view } }));

  // En móvil, cerrar sidebar al navegar
  closeMobileSidebar();
}

// Mantener consistencia si el usuario redimensiona la ventana
window.addEventListener('resize', () => {
  const currentView = state.currentNav || 'agenda';
  const mainToolbar = el('mainToolbar');
  const mobileTitle = el('mobileSectionTitle');
  if (currentView !== 'agenda') {
    if (window.innerWidth > 768) {
      if (mainToolbar) mainToolbar.style.display = 'none';
      if (mobileTitle) mobileTitle.style.display = 'none';
    } else {
      if (mainToolbar) mainToolbar.style.display = 'flex';
      if (mobileTitle) mobileTitle.style.display = 'block';
    }
  }
});

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
