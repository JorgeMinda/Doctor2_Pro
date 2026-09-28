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
          <div>
            <strong>${p.name}</strong>
            ${p.license_code ? `<div style="font-size:0.75rem; color:var(--muted);"><i class="fas fa-id-card"></i> ${p.license_code}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${p.specialty}</td>
      <td>${p.email || '-'}</td>
      <td>${p.phone || '-'}</td>
      <td>${p.start_time || '08:00'} - ${p.end_time || '20:00'} (${p.slot_minutes} min)</td>
      <td>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="ghost" onclick="window.openDoctorEmergencyBlock('${p.id}')" title="Bloqueo por Emergencia" style="color:var(--danger); padding:4px 8px; font-size:0.75rem;">
            <i class="fas fa-ban"></i> Bloqueo
          </button>
          <button class="ghost" onclick="window.editProfessional('${p.id}')" title="Editar Profesional">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.editProfessional = (id) => {
  const prof = state.professionals.find(p => p.id === id);
  if (prof) openProfManager(prof);
};

window.openDoctorEmergencyBlock = (id) => {
  const prof = state.professionals.find(p => p.id === id);
  if (prof) openDoctorEmergencyModal(prof);
};

export function openDoctorEmergencyModal(prof) {
  const modal = el('profEmergencyModal');
  if (!modal || !prof) return;

  el('profEmergencyProfId').value = prof.id;
  const title = el('profEmergencyTitle');
  if (title) {
    title.innerHTML = `<i class="fas fa-ban" style="color:var(--danger);"></i> Bloqueo de Emergencia: ${prof.name}`;
  }

  const today = new Date().toISOString().split('T')[0];
  if (el('profEmergencyDateFrom')) el('profEmergencyDateFrom').value = today;
  if (el('profEmergencyDateTo')) el('profEmergencyDateTo').value = today;
  if (el('profEmergencyReason')) el('profEmergencyReason').value = 'Emergencia médica';

  const allDayCheck = el('profEmergencyAllDay');
  if (allDayCheck) {
    allDayCheck.checked = true;
    const hoursContainer = el('profEmergencyHoursContainer');
    if (hoursContainer) hoursContainer.style.display = 'none';
  }
  if (el('profEmergencyTimeFrom')) el('profEmergencyTimeFrom').value = '08:00';
  if (el('profEmergencyTimeTo')) el('profEmergencyTimeTo').value = '13:00';

  loadDoctorEmergencyBlocks(prof.id);
  modal.classList.remove('hidden');
}

export function closeDoctorEmergencyModal() {
  el('profEmergencyModal')?.classList.add('hidden');
}

export async function loadDoctorEmergencyBlocks(profId) {
  const container = el('profEmergencyList');
  if (!container) return;

  container.innerHTML = '<div style="padding:10px; color:var(--muted); font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> Cargando bloqueos...</div>';

  try {
    const res = await apiFetch(`${api.blockedDays}?professional_id=${encodeURIComponent(profId)}`);
    const blocks = res.blocked_days || [];

    if (blocks.length === 0) {
      container.innerHTML = '<div class="empty" style="padding:12px; font-size:0.8rem; color:var(--muted); text-align:center;">No hay bloqueos activos para este profesional.</div>';
      return;
    }

    container.innerHTML = blocks.map(b => {
      const isAllDay = b.all_day !== false && (!b.time_from || !b.time_to);
      const timeBadge = isAllDay 
        ? '<span style="font-size:0.75rem; color:var(--muted); margin-left:4px;">(Día completo)</span>' 
        : `<span style="font-size:0.75rem; color:var(--primary); font-weight:600; margin-left:4px;"><i class="far fa-clock"></i> ${b.time_from} a ${b.time_to} hs</span>`;

      return `
        <div class="slot" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:0.85rem;"><i class="fas fa-calendar-times" style="color:var(--danger);"></i> ${b.date_from === b.date_to ? b.date_from : `${b.date_from} al ${b.date_to}`}</strong>
            ${timeBadge}
            <br><small style="color:var(--muted); font-size:0.75rem;">${b.reason || 'Emergencia'}</small>
          </div>
          <button class="ghost" onclick="window.removeDoctorEmergencyBlock('${b.id}', '${profId}')" title="Desbloquear" style="color:var(--danger); padding:4px 8px; font-size:0.75rem;">
            <i class="fas fa-trash-alt"></i> Desbloquear
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger); font-size:0.8rem; padding:10px;">Error al cargar bloqueos.</div>';
  }
}

window.removeDoctorEmergencyBlock = async (blockId, profId) => {
  if (!confirm('¿Deseas eliminar este bloqueo y habilitar nuevamente la agenda para esas fechas y horarios?')) return;

  try {
    await apiFetch(`${api.blockedDays}?id=${blockId}`, { method: 'DELETE' });
    showToast('Bloqueo eliminado correctamente', 'success');
    loadDoctorEmergencyBlocks(profId);
    
    // Recargar estado de bloqueos y agenda
    if (window.loadAgenda) window.loadAgenda();
  } catch (err) {
    showToast('Error al eliminar bloqueo', 'error');
  }
};

export async function saveDoctorEmergencyBlock() {
  const profId = el('profEmergencyProfId')?.value;
  const dateFrom = el('profEmergencyDateFrom')?.value;
  const dateTo = el('profEmergencyDateTo')?.value || dateFrom;
  const allDay = el('profEmergencyAllDay')?.checked ?? true;
  const timeFrom = el('profEmergencyTimeFrom')?.value || '';
  const timeTo = el('profEmergencyTimeTo')?.value || '';
  const reason = el('profEmergencyReason')?.value.trim() || 'Emergencia médica';

  if (!profId || !dateFrom) {
    showToast('Selecciona la fecha para el bloqueo', 'warning');
    return;
  }

  if (!allDay && (!timeFrom || !timeTo)) {
    showToast('Completá el horario desde y hasta para el bloqueo', 'warning');
    return;
  }

  try {
    const res = await apiFetch(api.blockedDays, {
      method: 'POST',
      body: JSON.stringify({
        professional_id: profId,
        date_from: dateFrom,
        date_to: dateTo,
        all_day: allDay,
        time_from: allDay ? '' : timeFrom,
        time_to: allDay ? '' : timeTo,
        reason: reason,
        type: 'emergency'
      })
    });

    const cancelledCount = res.cancelled_count || 0;
    if (cancelledCount > 0) {
      showToast(`Bloqueo aplicado. Se cancelaron ${cancelledCount} turnos afectados`, 'warning');
    } else {
      showToast('Bloqueo de emergencia aplicado exitosamente', 'success');
    }

    loadDoctorEmergencyBlocks(profId);

    // Recargar agenda si está activa
    if (window.loadAgenda) window.loadAgenda();
  } catch (err) {
    showToast(err.message || 'Error al aplicar bloqueo', 'error');
  }
}

export function openProfManager(prof = null) {
  const modal = el('profManager');
  if (!modal) return;

  const idInput = el('mgrProfId');
  if (idInput) idInput.value = prof ? prof.id : '';
  el('mgrName').value = prof ? prof.name : '';
  el('mgrSpecialty').value = prof ? prof.specialty : '';
  if (el('mgrLicenseCode')) el('mgrLicenseCode').value = prof ? (prof.license_code || '') : '';
  el('mgrEmail').value = prof ? prof.email : '';
  el('mgrPhone').value = prof ? prof.phone : '';
  el('mgrColor').value = prof ? (prof.color || '#3b82f6') : '#3b82f6';
  el('mgrSlot').value = prof ? (prof.slot_minutes || 30) : '30';
  el('mgrStart').value = prof ? (prof.start_time || '08:00') : '08:00';
  el('mgrEnd').value = prof ? (prof.end_time || '20:00') : '20:00';

  modal.classList.remove('hidden');
}

export function closeProfManager() {
  el('profManager')?.classList.add('hidden');
}

export function resetProfForm() {
  if (el('mgrProfId')) el('mgrProfId').value = '';
  el('mgrName').value = '';
  el('mgrSpecialty').value = '';
  if (el('mgrLicenseCode')) el('mgrLicenseCode').value = '';
  el('mgrEmail').value = '';
  el('mgrPhone').value = '';
}

export async function saveProfessional() {
  const id = el('mgrProfId')?.value;
  const name = el('mgrName')?.value.trim();
  const specialty = el('mgrSpecialty')?.value.trim();
  const licenseCode = el('mgrLicenseCode')?.value.trim() || '';
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
    const payload = {
      name,
      specialty,
      license_code: licenseCode,
      email,
      phone,
      color,
      slot_minutes: slot,
      start_time: startTime,
      end_time: endTime
    };

    if (id) {
      payload.id = id;
      await apiFetch(api.professionals, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch(api.professionals, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

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

// Event Listeners para modal de emergencia del profesional
document.addEventListener('DOMContentLoaded', () => {
  el('closeProfEmergencyModal')?.addEventListener('click', closeDoctorEmergencyModal);
  el('cancelProfEmergencyModal')?.addEventListener('click', closeDoctorEmergencyModal);
  el('saveProfEmergencyBtn')?.addEventListener('click', saveDoctorEmergencyBlock);

  // Toggle de día completo vs por horas para modal de médico
  el('profEmergencyAllDay')?.addEventListener('change', (e) => {
    const hoursContainer = el('profEmergencyHoursContainer');
    if (hoursContainer) {
      hoursContainer.style.display = e.target.checked ? 'none' : 'grid';
    }
  });
});
