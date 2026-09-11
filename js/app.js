/**
 * app.js - Aplicación Principal y Orquestador de Módulos (Doctor2)
 */
import { state, api } from './modules/app-state.js';
import { el, formatDate, showToast, apiFetch } from './modules/app-utils.js';
import { checkSession, login, logout, setupLoginListeners } from './modules/app-auth.js';
import { loadNotifications, markNotificationsRead, deleteAllNotifications } from './modules/app-notifications.js';
import { loadMonth, fillFormProfessionals, scheduleAgendaRender } from './modules/app-calendar.js';
import { loadPatients, renderPatients, openNewPatientModal, closeNewPatientModal, saveNewPatient } from './modules/app-patients.js';
import { loadProfessionals, renderProfessionals, openProfManager, closeProfManager, resetProfForm, saveProfessional } from './modules/app-professionals.js';
import { loadInventory, setupInventoryListeners } from './modules/app-inventory.js';
import { initChat } from './modules/app-chat.js';
import { internalChat } from './modules/app-internal-chat.js';
import { renderAnalytics } from './modules/app-analytics.js';
import { setNav, toggleMobileSidebar, closeMobileSidebar } from './modules/app-navigation.js';
import { initBlockedDays } from './modules/app-blocked-days.js';
import { SuscripcionManager } from './modules/app-subscription.js';
import { initAgendaPrint } from './modules/app-agenda-print.js';
import { initAIAssistant } from './modules/app-ai-assistant.js';
import {
  openModal,
  closeModal,
  loadSlots,
  saveAppointment,
  openProfile,
  closeProfile,
  saveProfile,
  openAppearanceModal,
  closeAppearanceModal,
  initAppearance,
  setTheme,
  setFontSize
} from './modules/app-modal.js';

// Exponer setNav globalmente para los botones del DOM
window.setNav = setNav;

// ========== GESTIÓN DEL SPLITTER DE AGENDA ==========
function initAgendaSplitter() {
  const container = el('calendarGridContainer');
  const splitter = el('agendaSplitter');
  const calendarCard = container?.querySelector('.calendar-card');
  if (!container || !splitter || !calendarCard) return;

  let isDragging = false;

  splitter.addEventListener('mousedown', (e) => {
    isDragging = true;
    splitter.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerRect = container.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    if (newWidth > 380 && newWidth < containerRect.width - 280) {
      container.style.gridTemplateColumns = `${newWidth}px 8px 1fr`;
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      splitter.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ========== INICIALIZACIÓN DE LA APLICACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar sesión de usuario
  checkSession();
  setupLoginListeners();

  // 2. Inicializar componentes y utilitarios
  initAppearance();
  initAgendaSplitter();
  initBlockedDays();
  initAgendaPrint();
  setupInventoryListeners();
  SuscripcionManager.init();

  // 3. Cargar datos iniciales
  await Promise.allSettled([
    loadProfessionals(),
    loadPatients(),
    loadMonth(),
    loadNotifications(),
    loadInventory()
  ]);

  initChat();
  internalChat.init();
  initAIAssistant();
});

// Eventos de Autenticación
el('loginBtn')?.addEventListener('click', login);
el('logoutBtn')?.addEventListener('click', logout);

// Navegación Principal
el('navAgenda')?.addEventListener('click', () => setNav('agenda'));
el('navPatients')?.addEventListener('click', () => setNav('patients'));
el('navPros')?.addEventListener('click', () => setNav('professionals'));
el('navInventory')?.addEventListener('click', () => { setNav('inventory'); loadInventory(); });
el('navAnalytics')?.addEventListener('click', () => { setNav('analytics'); renderAnalytics(); });
el('navConfig')?.addEventListener('click', () => setNav('notifications'));
el('navChat')?.addEventListener('click', () => { setNav('chat'); initChat(); });
el('navInternalChat')?.addEventListener('click', () => { setNav('internalChat'); internalChat.renderMessages(); });
el('navAppearance')?.addEventListener('click', openAppearanceModal);
el('navProfile')?.addEventListener('click', openProfile);

// Modales de Perfil y Apariencia
el('closeProfile')?.addEventListener('click', closeProfile);
el('cancelProfile')?.addEventListener('click', closeProfile);
el('saveProfile')?.addEventListener('click', saveProfile);

el('closeAppearance')?.addEventListener('click', closeAppearanceModal);
el('cancelAppearance')?.addEventListener('click', closeAppearanceModal);

// Notificaciones
el('markRead')?.addEventListener('click', markNotificationsRead);
el('deleteAll')?.addEventListener('click', deleteAllNotifications);

// Controles de Calendario
el('prevMonth')?.addEventListener('click', () => {
  if (state.calendarView === 'week') {
    state.selectedDate.setDate(state.selectedDate.getDate() - 7);
  } else {
    state.monthDate.setMonth(state.monthDate.getMonth() - 1);
  }
  loadMonth();
});

el('nextMonth')?.addEventListener('click', () => {
  if (state.calendarView === 'week') {
    state.selectedDate.setDate(state.selectedDate.getDate() + 7);
  } else {
    state.monthDate.setMonth(state.monthDate.getMonth() + 1);
  }
  loadMonth();
});

el('refreshBtn')?.addEventListener('click', () => loadMonth());

// Toggle de Vista Mes / Semana
function setCalendarView(view) {
  if (state.calendarView === view) return;
  state.calendarView = view;
  el('viewMonth')?.classList.toggle('active', view === 'month');
  el('viewWeek')?.classList.toggle('active', view === 'week');

  scheduleAgendaRender();
}

el('viewMonth')?.addEventListener('click', () => setCalendarView('month'));
el('viewWeek')?.addEventListener('click', () => setCalendarView('week'));

// Modal de Turnos
el('quickNew')?.addEventListener('click', () => openModal({ date: formatDate(state.selectedDate) }));
el('newAptBtn')?.addEventListener('click', () => openModal({ date: formatDate(state.selectedDate) }));
el('closeModal')?.addEventListener('click', closeModal);
el('cancelModal')?.addEventListener('click', closeModal);
el('saveApt')?.addEventListener('click', saveAppointment);
el('formDate')?.addEventListener('change', loadSlots);

// Filtro de Profesional
el('professionalFilter')?.addEventListener('change', (e) => {
  state.selectedProfessional = e.target.value;
  loadMonth();
});

// Búsqueda de Pacientes
el('patientSearch')?.addEventListener('input', renderPatients);
el('newPatientBtn')?.addEventListener('click', openNewPatientModal);
el('closeNewPatient')?.addEventListener('click', closeNewPatientModal);
el('cancelNewPatient')?.addEventListener('click', closeNewPatientModal);
el('saveNewPatient')?.addEventListener('click', saveNewPatient);

// Profesionales
el('newProfessionalBtn')?.addEventListener('click', () => openProfManager());
el('professionalSearch')?.addEventListener('input', renderProfessionals);
el('closeProfManager')?.addEventListener('click', closeProfManager);
el('resetProfForm')?.addEventListener('click', (e) => { e.preventDefault(); resetProfForm(); });
el('saveProf')?.addEventListener('click', saveProfessional);

// Búsqueda global en agenda
el('agendaPatientSearch')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const searchResultsCard = el('agendaSearchResults');
  const list = el('searchResultsList');

  if (!q) {
    searchResultsCard?.classList.add('hidden');
    return;
  }

  const matches = state.appointments.filter(a => a.patient_name.toLowerCase().includes(q));
  if (searchResultsCard && list) {
    searchResultsCard.classList.remove('hidden');
    list.innerHTML = matches.length === 0
      ? '<div class="empty">No se encontraron turnos con ese nombre</div>'
      : matches.map(m => `
        <div class="slot" style="margin-bottom:8px; cursor:pointer;" onclick="window.editApt('${m.id}')">
          <div><strong>${m.patient_name}</strong> · ${m.date} ${m.time}<br><small>${m.reason || 'Consulta'}</small></div>
          <span class="badge ${m.status}">${m.status}</span>
        </div>
      `).join('');
  }
});

el('clearAgendaSearch')?.addEventListener('click', () => {
  const searchInput = el('agendaPatientSearch');
  if (searchInput) searchInput.value = '';
  el('agendaSearchResults')?.classList.add('hidden');
});
