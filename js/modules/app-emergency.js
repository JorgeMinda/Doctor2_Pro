/**
 * app-emergency.js - Cita Emergente Express
 * Crea un paciente provisional (registro incompleto) y un turno inmediato.
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';
import { loadProfessionals } from './app-professionals.js';
import { setNav } from './app-navigation.js';
import { selectPatient, loadPatients } from './app-patients.js';

let emDocTouched = false;
let emModalOpen = false;

const EMERGENCY_ROLES = new Set(['admin', 'secretaria', 'secretario', 'recepcion', 'recepcionista']);

function userCanEmergency() {
  const role = String(state.user?.role || '').toLowerCase();
  return EMERGENCY_ROLES.has(role);
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function populateDoctorSelect() {
  const sel = el('em-doc');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  const autoOpt = document.createElement('option');
  autoOpt.value = '';
  autoOpt.textContent = 'Auto-asignar primer médico disponible';
  sel.appendChild(autoOpt);
  (state.professionals || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    const active = p.active !== 0 && p.active !== false && p.active !== '0';
    opt.textContent = `${p.name}${p.specialty ? ' - ' + p.specialty : ''}${active ? '' : ' (inactivo)'}`;
    if (!active) opt.disabled = true;
    sel.appendChild(opt);
  });
  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  }
}

function resolveReceivingDoctor() {
  const user = state.user;
  const profs = state.professionals || [];
  const noticeEl = el('em-notice');
  if (noticeEl) { noticeEl.style.display = 'none'; noticeEl.textContent = ''; }

  if (!user || profs.length === 0) {
    return '';
  }

  const lcUser = String(user.license_code || '').trim();
  const emailUser = String(user.email || '').trim().toLowerCase();

  const matches = profs.filter(p => {
    const lcProf = String(p.license_code || '').trim();
    if (lcUser && lcProf && lcUser === lcProf) return true;
    const emailProf = String(p.email || '').trim().toLowerCase();
    if (emailUser && emailProf && emailUser === emailProf) return true;
    return false;
  });

  const activeMatches = matches.filter(p => p.active !== 0 && p.active !== false && p.active !== '0');

  if (activeMatches.length === 1) {
    return activeMatches[0].id;
  }

  let msg = null;
  if (matches.length === 1 && activeMatches.length === 0) {
    msg = 'El profesional de tu sesión no está disponible; se asignará automáticamente.';
  } else if (matches.length > 1) {
    msg = 'No se pudo determinar un único médico; se asignará automáticamente.';
  }

  if (msg && noticeEl) {
    noticeEl.textContent = msg;
    noticeEl.style.display = 'block';
  }
  return '';
}

function applyReceivingDoctor(force) {
  const sel = el('em-doc');
  if (!sel) return;
  if (!force && emDocTouched) return;
  populateDoctorSelect();
  const resolved = resolveReceivingDoctor();
  if (!emDocTouched) {
    sel.value = resolved;
  }
}

export function openEmergencyModal() {
  if (!userCanEmergency()) {
    showToast('No tenés permisos para crear citas de emergencia', 'error');
    return;
  }
  const modal = el('emergencyModal');
  if (!modal) return;

  emDocTouched = false;
  emModalOpen = true;

  // Reset fields
  if (el('em-firstname')) el('em-firstname').value = '';
  if (el('em-lastname')) el('em-lastname').value = '';
  if (el('em-sex')) el('em-sex').value = '';
  if (el('em-dni')) el('em-dni').value = '';
  if (el('em-age')) el('em-age').value = '';
  if (el('em-phone')) el('em-phone').value = '';
  if (el('em-reason')) el('em-reason').value = 'Atención de emergencia inmediata';
  const noticeEl = el('em-notice');
  if (noticeEl) { noticeEl.style.display = 'none'; noticeEl.textContent = ''; }

  modal.classList.remove('hidden');

  // Ensure professionals loaded
  if (!state.professionals || state.professionals.length === 0) {
    loadProfessionals().then(() => {
      if (emModalOpen && !emDocTouched) {
        applyReceivingDoctor(true);
      }
    }).catch(() => {
      if (el('em-notice')) {
        el('em-notice').textContent = 'No se pudo cargar la lista de médicos; se asignará automáticamente.';
        el('em-notice').style.display = 'block';
      }
    });
  }
  populateDoctorSelect();
  applyReceivingDoctor(true);
}

export function closeEmergencyModal() {
  emModalOpen = false;
  el('emergencyModal')?.classList.add('hidden');
}

async function saveEmergency() {
  if (!userCanEmergency()) {
    showToast('No tenés permisos para crear citas de emergencia', 'error');
    return;
  }
  const firstName = (el('em-firstname')?.value || '').trim();
  const lastName = (el('em-lastname')?.value || '').trim();
  const sex = el('em-sex')?.value || '';
  const dni = (el('em-dni')?.value || '').trim();
  const ageRaw = (el('em-age')?.value || '').trim();
  const phone = (el('em-phone')?.value || '').trim();
  const reason = (el('em-reason')?.value || '').trim() || 'Atención de emergencia inmediata';

  if (!firstName || !lastName || !sex) {
    showToast('Nombre, apellido y sexo son obligatorios', 'error');
    return;
  }

  const age = ageRaw && !isNaN(Number(ageRaw)) ? Number(ageRaw) : null;
  const fullName = `${firstName} ${lastName}`;

  // 1) Crear paciente provisional
  let patient = null;
  try {
    const res = await apiFetch(api.patients, {
      method: 'POST',
      body: JSON.stringify({
        name: fullName,
        sex: sex,
        dni: dni,
        age: age,
        edad_aproximada: age,
        phone: phone,
        registro_incompleto: true,
        notes: 'Paciente provisional creado por Cita Emergente Express'
      })
    });
    patient = res.patient;
  } catch (err) {
    showToast(err.message || 'Error al crear el paciente', 'error');
    return;
  }

  if (!patient || !patient.id) {
    showToast('No se pudo crear el paciente', 'error');
    return;
  }

  // 2) Resolver médico receptor
  const sel = el('em-doc');
  let profId = sel ? sel.value : '';
  if (!profId) {
    const activeProfs = (state.professionals || []).filter(p => p.active !== 0 && p.active !== false && p.active !== '0');
    const pool = activeProfs.length ? activeProfs : (state.professionals || []);
    profId = pool.length ? pool[0].id : '';
  }

  // 3) Crear turno inmediato
  try {
    await apiFetch(api.appointments, {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patient.id,
        patient_name: patient.name || fullName,
        patient_phone: phone,
        professional_id: profId,
        date: todayStr(),
        time: nowHHMM(),
        duration: 30,
        reason: reason,
        status: 'En Atención',
        emergencia: true
      })
    });
  } catch (err) {
    showToast(err.message || 'Error al crear el turno de emergencia', 'error');
    // Patient already created; do not duplicate on retry. User can retry appointment creation manually.
    return;
  }

  showToast('Cita de emergencia creada', 'success');
  closeEmergencyModal();

  // Abrir ficha del paciente
  try {
    setNav('patients');
    await selectPatient(patient.id, 'ficha');
  } catch (e) {
    console.warn('No se pudo abrir la ficha del paciente', e);
  }

  loadPatients();
  if (window.loadAgenda) window.loadAgenda();
}

// Wire late-load of professionals
window.addEventListener('app:professionals-loaded', () => {
  if (emModalOpen && !emDocTouched) {
    applyReceivingDoctor(true);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Toggle button visibility by role
  const btn = el('emergencyBtn');
  if (btn) {
    btn.style.display = userCanEmergency() ? 'inline-flex' : 'none';
    btn.addEventListener('click', openEmergencyModal);
  }
  el('closeEmergencyModal')?.addEventListener('click', closeEmergencyModal);
  el('cancelEmergencyModal')?.addEventListener('click', closeEmergencyModal);
  el('saveEmergencyBtn')?.addEventListener('click', saveEmergency);

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && emModalOpen) {
      closeEmergencyModal();
    }
  });

  // Re-evaluate visibility when session becomes available
  window.addEventListener('app:authenticated', () => {
    const b = el('emergencyBtn');
    if (b) b.style.display = userCanEmergency() ? 'inline-flex' : 'none';
  });
});

// expose
window.openEmergencyModal = openEmergencyModal;
window.closeEmergencyModal = closeEmergencyModal;
