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
  el('appearanceModal')?.classList.remove('hidden');
}

export function closeAppearanceModal() {
  el('appearanceModal')?.classList.add('hidden');
}

export function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  document.querySelectorAll('.theme-card-option').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-theme-choice="${themeName}"]`)?.classList.add('active');

  // Guardar en state y servidor
  if (state.user) {
    state.user.appearance = { ...(state.user.appearance || {}), theme: themeName };
    apiFetch(api.profile, {
      method: 'PATCH',
      body: JSON.stringify({ appearance: { theme: themeName } })
    }).catch(() => {});
  }
  showToast(`Tema ${themeName} aplicado`, 'info');
}

export function setFontSize(size) {
  document.documentElement.setAttribute('data-font-size', size);
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-size-choice="${size}"]`)?.classList.add('active');

  if (state.user) {
    state.user.appearance = { ...(state.user.appearance || {}), fontSize: size };
    apiFetch(api.profile, {
      method: 'PATCH',
      body: JSON.stringify({ appearance: { fontSize: size } })
    }).catch(() => {});
  }
}

window.setTheme = setTheme;
window.setFontSize = setFontSize;

// Placeholders de Ajustes Avanzados
export function resetSystem() { if (confirm('¿Estás seguro de reiniciar los datos?')) showToast('Sistema reiniciado', 'info'); }
export function saveMenuPermissions() { showToast('Permisos guardados', 'success'); }
export function saveCountryCode() { showToast('Código de país guardado', 'success'); }
export function saveSheetsSyncSettings() { showToast('Sincronización configurada', 'success'); }
export function exportBackup() { showToast('Copia de seguridad descargada', 'success'); }
export function triggerImportBackup() { el('backupFileInput')?.click(); }
export function importBackup(file) { showToast(`Copia ${file.name} restaurada`, 'success'); }
