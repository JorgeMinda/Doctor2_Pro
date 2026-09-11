/**
 * app-professionals.js - Gestión de Médicos y Profesionales de la Salud
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';
import { fillFormProfessionals } from './app-calendar.js';

export async function loadProfessionals() {
  try {
    const data = await apiFetch(api.professionals);
    state.professionals = data.professionals || [];
    renderProfessionals();
    fillFormProfessionals();
  } catch (err) {
    console.warn('Error al cargar profesionales:', err);
  }
}

export function renderProfessionals() {
  const tbody = el('professionalsTable');
  const searchInput = el('professionalSearch');
  if (!tbody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filtered = state.professionals.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.specialty.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No se encontraron profesionales</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:12px; height:12px; border-radius:50%; background:${p.color || '#3b82f6'};"></span>
          <strong>${p.name}</strong>
        </div>
      </td>
      <td>${p.specialty}</td>
      <td>${p.email || '-'}</td>
      <td>${p.phone || '-'}</td>
      <td>${p.start_time || '08:00'} - ${p.end_time || '20:00'} (${p.slot_minutes} min)</td>
      <td><button class="ghost" onclick="window.editProfessional('${p.id}')"><i class="fas fa-edit"></i></button></td>
    </tr>
  `).join('');
}

window.editProfessional = (id) => {
  const prof = state.professionals.find(p => p.id === id);
  if (prof) openProfManager(prof);
};

export function openProfManager(prof = null) {
  const modal = el('profManager');
  if (!modal) return;

  el('mgrName').value = prof ? prof.name : '';
  el('mgrSpecialty').value = prof ? prof.specialty : '';
  el('mgrEmail').value = prof ? prof.email : '';
  el('mgrPhone').value = prof ? prof.phone : '';
  el('mgrColor').value = prof ? prof.color : '#3b82f6';
  el('mgrSlot').value = prof ? prof.slot_minutes : '30';
  el('mgrStart').value = prof ? prof.start_time : '08:00';
  el('mgrEnd').value = prof ? prof.end_time : '20:00';

  modal.classList.remove('hidden');
}

export function closeProfManager() {
  el('profManager')?.classList.add('hidden');
}

export function resetProfForm() {
  el('mgrName').value = '';
  el('mgrSpecialty').value = '';
  el('mgrEmail').value = '';
  el('mgrPhone').value = '';
}

export async function saveProfessional() {
  const name = el('mgrName')?.value.trim();
  const specialty = el('mgrSpecialty')?.value.trim();
  const email = el('mgrEmail')?.value.trim();
  const phone = el('mgrPhone')?.value.trim();
  const color = el('mgrColor')?.value;
  const slot = parseInt(el('mgrSlot')?.value) || 30;
  const startTime = el('mgrStart')?.value || '08:00';
  const endTime = el('mgrEnd')?.value || '20:00';

  if (!name || !specialty) {
    showToast('Nombre y especialidad son obligatorios', 'warning');
    return;
  }

  try {
    await apiFetch(api.professionals, {
      method: 'POST',
      body: JSON.stringify({ name, specialty, email, phone, color, slot_minutes: slot, start_time: startTime, end_time: endTime })
    });

    showToast('Profesional guardado exitosamente', 'success');
    closeProfManager();
    loadProfessionals();
  } catch (err) {
    showToast(err.message || 'Error al guardar profesional', 'error');
  }
}

export function openNewProfessionalModal() {
  openProfManager();
}

export function closeNewProfessionalModal() {
  closeProfManager();
}

export function saveNewProfessional() {
  saveProfessional();
}
