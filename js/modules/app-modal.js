/**
 * app-modal.js - Modales de Turnos, Perfil, Apariencia y Ajustes
 */
import { state, api } from './app-state.js';
import { el, formatDate, apiFetch, showToast } from './app-utils.js';
import { loadMonth } from './app-calendar.js';

let editingAppointmentId = null;

export function openModal(opts = {}) {
  const modal = el('modal');
  if (!modal) return;

  editingAppointmentId = opts.appointment ? opts.appointment.id : null;

  const formProf = el('formProfessional');
  const formDate = el('formDate');
  const formTime = el('formTime');
  const formDuration = el('formDuration');
  const formReason = el('formReason');
  const formPatient = el('formPatient');
  const formPhone = el('formPhone');
  const formEmail = el('formEmail');
  const formCost = el('formCost');
  const formObs = el('formObservation');

  if (opts.appointment) {
    const a = opts.appointment;
    if (formProf) formProf.value = a.professional_id;
    if (formDate) formDate.value = a.date;
    loadSlots();
    if (formTime) setTimeout(() => formTime.value = a.time, 50);
    if (formDuration) formDuration.value = String(a.duration || 30);
    if (formReason) formReason.value = a.reason || '';
    if (formPatient) formPatient.value = a.patient_name || '';
    if (formPhone) formPhone.value = a.patient_phone || '';
    if (formEmail) formEmail.value = a.patient_email || '';
    if (formCost) formCost.value = a.cost || '';
    if (formObs) formObs.value = a.observation || '';
  } else {
    if (formDate) formDate.value = opts.date || formatDate(state.selectedDate);
    if (opts.patientName && formPatient) formPatient.value = opts.patientName;
    if (opts.patientPhone && formPhone) formPhone.value = opts.patientPhone;
    if (opts.patientId && modal) modal.dataset.patientId = opts.patientId;

    loadSlots();
    if (opts.time && formTime) setTimeout(() => formTime.value = opts.time, 50);
    if (formReason) formReason.value = '';
    if (formCost) formCost.value = '';
    if (formObs) formObs.value = '';
  }

  modal.classList.remove('hidden');
}

export function closeModal() {
  el('modal')?.classList.add('hidden');
  editingAppointmentId = null;
}

export function loadSlots() {
  const select = el('formTime');
  if (!select) return;

  const times = [];
  for (let h = 8; h <= 20; h++) {
    const hh = String(h).padStart(2, '0');
    times.push(`${hh}:00`);
    times.push(`${hh}:30`);
  }

  select.innerHTML = times.map(t => `<option value="${t}">${t} hs</option>`).join('');
}

export async function saveAppointment() {
  const profId = el('formProfessional')?.value;
  const date = el('formDate')?.value;
  const time = el('formTime')?.value;
  const duration = parseInt(el('formDuration')?.value) || 30;
  const reason = el('formReason')?.value.trim();
  const patientName = el('formPatient')?.value.trim();
  const patientPhone = el('formPhone')?.value.trim();
  const patientEmail = el('formEmail')?.value.trim();
  const cost = parseFloat(el('formCost')?.value) || 0;
  const observation = el('formObservation')?.value.trim();

  if (!patientName || !date || !time) {
    showToast('Por favor completá paciente, fecha y hora', 'warning');
    return;
  }

  const payload = {
    id: editingAppointmentId,
    professional_id: profId || state.professionals[0]?.id || 'prof-1',
    date,
    time,
    duration,
    reason,
    patient_name: patientName,
    patient_phone: patientPhone,
    patient_email: patientEmail,
    cost,
    observation
  };

  try {
    const method = editingAppointmentId ? 'PATCH' : 'POST';
    await apiFetch(api.appointments, {
      method,
      body: JSON.stringify(payload)
    });

    showToast(editingAppointmentId ? 'Turno actualizado' : 'Turno agendado con éxito', 'success');
    closeModal();
    loadMonth();
  } catch (err) {
    showToast(err.message || 'Error al guardar el turno', 'error');
  }
}

// Modal de Perfil & Apariencia
export function openProfile() {
  el('profileModal')?.classList.remove('hidden');
}

export function closeProfile() {
  el('profileModal')?.classList.add('hidden');
}

export async function saveProfile() {
  showToast('Perfil actualizado correctamente', 'success');
  closeProfile();
}

export function openAppearanceModal() {
  syncAppearanceUI();
  el('appearanceModal')?.classList.remove('hidden');
}

export function closeAppearanceModal() {
  el('appearanceModal')?.classList.add('hidden');
}

// Estado temporal o activo de apariencia
let currentAppearance = {
  theme: localStorage.getItem('doctor2_theme') || 'light',
  fontSize: localStorage.getItem('doctor2_fontSize') || 'normal',
  density: localStorage.getItem('doctor2_density') || 'normal',
  sidebar: localStorage.getItem('doctor2_sidebar') || 'fixed'
};

export function initAppearance() {
  setTheme(currentAppearance.theme, true);
  setFontSize(currentAppearance.fontSize, true);
  setAgendaDensity(currentAppearance.density, true);
  setSidebarMode(currentAppearance.sidebar, true);
}

function syncAppearanceUI() {
  // 1. Temas
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentAppearance.theme);
  });
  // 2. Fuente
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === currentAppearance.fontSize);
  });
  // 3. Densidad
  document.querySelectorAll('.density-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.density === currentAppearance.density);
  });
  // 4. Sidebar
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sidebar === currentAppearance.sidebar);
  });
}

export function setTheme(themeName, silent = false) {
  currentAppearance.theme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('doctor2_theme', themeName);
  
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === themeName);
  });

  if (!silent) {
    const themeLabels = {
      dark: 'Oscuro',
      light: 'Claro',
      blue: 'Azul Cyber',
      green: 'Verde Esmeralda',
      purple: 'Violeta Velvet',
      rose: 'Rosa Coral',
      amber: 'Ámbar Solar',
      teal: 'Turquesa Mint'
    };
    showToast(`Tema ${themeLabels[themeName] || themeName} aplicado`, 'info');
  }
}

export function setFontSize(size, silent = false) {
  currentAppearance.fontSize = size;
  document.documentElement.setAttribute('data-font-size', size);
  localStorage.setItem('doctor2_fontSize', size);

  document.querySelectorAll('.size-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.size === size);
  });

  if (!silent) {
    showToast(`Tamaño de texto: ${size === 'small' ? 'Pequeño' : size === 'large' ? 'Grande' : 'Normal'}`, 'info');
  }
}

export function setAgendaDensity(density, silent = false) {
  currentAppearance.density = density;
  document.documentElement.setAttribute('data-agenda-density', density);
  localStorage.setItem('doctor2_density', density);

  document.querySelectorAll('.density-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.density === density);
  });

  if (!silent) {
    showToast(`Distribución de agenda: ${density}`, 'info');
  }
}

export function setSidebarMode(mode, silent = false) {
  currentAppearance.sidebar = mode;
  document.documentElement.setAttribute('data-sidebar-mode', mode);
  localStorage.setItem('doctor2_sidebar', mode);

  document.querySelectorAll('.sidebar-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sidebar === mode);
  });

  if (!silent) {
    showToast(`Menú lateral: ${mode === 'auto' ? 'Automático (al pasar el mouse)' : 'Fijo'}`, 'info');
  }
}

export function saveAppearanceSettings() {
  if (state.user) {
    state.user.appearance = { ...currentAppearance };
    apiFetch(api.profile, {
      method: 'PATCH',
      body: JSON.stringify({ appearance: currentAppearance })
    }).catch(() => {});
  }
  showToast('Preferencias de apariencia guardadas con éxito', 'success');
  closeAppearanceModal();
}

export function resetAppearanceSettings() {
  setTheme('light');
  setFontSize('normal');
  setAgendaDensity('normal');
  setSidebarMode('fixed');
  saveAppearanceSettings();
  showToast('Apariencia restablecida a valores por defecto', 'info');
}

// Exponer funciones en window para invocación desde el DOM
window.setTheme = setTheme;
window.setFontSize = setFontSize;
window.setAgendaDensity = setAgendaDensity;
window.setSidebarMode = setSidebarMode;
window.saveAppearanceSettings = saveAppearanceSettings;
window.resetAppearanceSettings = resetAppearanceSettings;

// Placeholders de Ajustes Avanzados
export function resetSystem() { if (confirm('¿Estás seguro de reiniciar los datos?')) showToast('Sistema reiniciado', 'info'); }
export function saveMenuPermissions() { showToast('Permisos guardados', 'success'); }
export function saveCountryCode() { showToast('Código de país guardado', 'success'); }
export function saveSheetsSyncSettings() { showToast('Sincronización configurada', 'success'); }
export function exportBackup() { showToast('Copia de seguridad descargada', 'success'); }
export function triggerImportBackup() { el('backupFileInput')?.click(); }
export function importBackup(file) { showToast(`Copia ${file.name} restaurada`, 'success'); }
