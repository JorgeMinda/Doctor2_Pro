/**
 * app-blocked-days.js - Gestión de Feriados y Bloqueos de Agenda
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';
import { createSlotPicker } from './slots/slot-picker.js';

const BLOCKED_HOURS_LIST = [];
for (let h = 7; h <= 21; h++) {
  const hh = String(h).padStart(2, '0');
  BLOCKED_HOURS_LIST.push(`${hh}:00`);
  if (h < 21) {
    BLOCKED_HOURS_LIST.push(`${hh}:30`);
  }
}

let slotPicker = null;

/**
 * Inicializa el slot picker para el modal de bloqueos (modo rango)
 */
function initSlotPicker(opts = {}) {
  const inputFrom = el('newBlockedTimeFrom');
  const inputTo = el('newBlockedTimeTo');
  const containerFrom = el('blockedTimeFromSlots');
  const containerTo = el('blockedTimeToSlots');
  const badgeFrom = el('blockedTimeFromBadge');
  const badgeTo = el('blockedTimeToBadge');

  if (slotPicker) {
    slotPicker.destroy();
  }

  slotPicker = createSlotPicker({
    mode: 'range',
    containerFrom: el('blockedTimeFromSlots'),
    containerTo: el('blockedTimeToSlots'),
    inputFrom: el('newBlockedTimeFrom'),
    inputTo: el('newBlockedTimeTo'),
    badgeFrom: el('blockedTimeFromBadge'),
    badgeTo: el('blockedTimeToBadge'),
    getContext: () => {
      const profId = el('newBlockedProfessional')?.value || 'all';
      const dateFrom = el('newBlockedDateFrom')?.value || '';
      const dateTo = el('newBlockedDateTo')?.value || '';
      return {
        appointments: state.appointments || [],
        blockedDays: state.blockedDays || [],
        profId,
        dateFrom: el('newBlockedDateFrom')?.value || '',
        dateTo: el('newBlockedDateTo')?.value || '',
        date: el('newBlockedDateFrom')?.value || '',
        profId: el('newBlockedProfessional')?.value || 'all',
        now: new Date().toISOString()
      };
    },
    onChange: (selection) => {
      const badgeFrom = el('blockedTimeFromBadge');
      const badgeTo = el('blockedTimeToBadge');
      const inputFrom = el('newBlockedTimeFrom');
      const inputTo = el('newBlockedTimeTo');
      if (badgeFrom) badgeFrom.textContent = `${selection.from} hs`;
      if (badgeTo) badgeTo.textContent = `${selection.to} hs`;
      if (inputFrom) inputFrom.value = selection.from;
      if (inputTo) inputTo.value = selection.to;
    },
    initialSelection: {
      from: el('newBlockedTimeFrom')?.value || '08:00',
      to: el('newBlockedTimeTo')?.value || '13:00',
      mode: 'range'
    }
  });

  // Renderizar inmediatamente
  slotPicker.render();
}

export function initBlockedDays() {
  const btn = el('blockedDaysBtn');
  if (btn) {
    btn.addEventListener('click', openBlockedDaysModal);
  }

  el('closeBlockedModal')?.addEventListener('click', closeBlockedDaysModal);
  el('cancelBlockedModal')?.addEventListener('click', closeBlockedDaysModal);
  el('saveBlockedBtn')?.addEventListener('click', saveBlockedDay);

  // Toggle de día completo vs por horas
  el('newBlockedAllDay')?.addEventListener('change', (e) => {
    const hoursContainer = el('newBlockedHoursContainer');
    if (hoursContainer) {
      hoursContainer.style.display = e.target.checked ? 'none' : 'flex';
      if (!e.target.checked) {
        const profId = el('newBlockedProfessional')?.value || 'all';
        const dateFrom = el('newBlockedDateFrom')?.value || '';
        const dateTo = el('newBlockedDateTo')?.value || '';
        initSlotPicker({ profId, dateFrom, dateTo });
      }
    }
  });
}

export function openBlockedDaysModal() {
  el('blockedDaysModal')?.classList.remove('hidden');
  populateBlockedProfSelect();

  const today = new Date().toISOString().split('T')[0];
  if (el('newBlockedDateFrom')) el('newBlockedDateFrom').value = today;
  if (el('newBlockedDateTo')) el('newBlockedDateTo').value = today;
  if (el('newBlockedReason')) el('newBlockedReason').value = '';
  
  const allDayCheck = el('newBlockedAllDay');
  if (allDayCheck) {
    allDayCheck.checked = true;
    const hoursContainer = el('newBlockedHoursContainer');
    if (hoursContainer) hoursContainer.style.display = 'none';
  }
  if (el('newBlockedTimeFrom')) el('newBlockedTimeFrom').value = '08:00';
  if (el('newBlockedTimeTo')) el('newBlockedTimeTo').value = '13:00';

// Renderizar slots con información de citas existentes
  const profId = el('newBlockedProfessional')?.value || 'all';
  const dateFrom = el('newBlockedDateFrom')?.value || '';
  const dateTo = el('newBlockedDateTo')?.value || '';
  initSlotPicker({ profId, dateFrom, dateTo });
  renderBlockedDaysList();

// Actualizar slots cuando cambie el profesional o las fechas
  ['newBlockedProfessional', 'newBlockedDateFrom', 'newBlockedDateTo'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const p = el('newBlockedProfessional')?.value || 'all';
        const dF = el('newBlockedDateFrom')?.value || '';
        const dT = el('newBlockedDateTo')?.value || '';
        initSlotPicker({ profId: p, dateFrom: dF, dateTo: dT });
      });
    }
  });
}

export function closeBlockedDaysModal() {
  el('blockedDaysModal')?.classList.add('hidden');
}

function populateBlockedProfSelect() {
  const sel = el('newBlockedProfessional');
  if (!sel) return;

  sel.innerHTML = '<option value="all">Todos los Profesionales (Feriado / Cierre General)</option>' +
    (state.professionals || []).map(p => `<option value="${p.id}">${p.name} (${p.specialty})</option>`).join('');
}

export async function renderBlockedDaysList() {
  const container = el('blockedDaysList');
  if (!container) return;

  container.innerHTML = '<div style="padding:10px; color:var(--muted); font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> Cargando bloqueos...</div>';

  try {
    const res = await apiFetch(api.blockedDays);
    state.blockedDays = res.blocked_days || [];

    if (state.blockedDays.length === 0) {
      container.innerHTML = '<div class="empty" style="padding:12px; font-size:0.8rem; color:var(--muted); text-align:center;">No hay bloqueos ni feriados registrados.</div>';
      return;
    }

      container.innerHTML = state.blockedDays.map(b => {
      const isAllDay = b.all_day !== false && (!b.time_from || !b.time_to);
      const timeBadge = isAllDay 
        ? '<span style="font-size:0.75rem; color:var(--muted); margin-left:4px;">(Día completo)</span>' 
        : `<span style="font-size:0.75rem; color:var(--primary); font-weight:600; margin-left:4px;"><i class="far fa-clock"></i> ${b.time_from} a ${b.time_to} hs</span>`;

      const isHoliday = !b.professional_id || b.professional_id === 'all';
      const typeLabel = isHoliday ? 'Feriado / Cierre' : 'Ausencia médica';

      return `
        <div class="slot" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:0.85rem;"><i class="fas fa-calendar-times" style="color:var(--danger);"></i> ${b.date_from === b.date_to ? b.date_from : `${b.date_from} al ${b.date_to}`}</strong>
            ${timeBadge}
            <span style="font-size:0.75rem; color:var(--text); margin-left:6px; font-weight:600;">[${b.professional_name || (isHoliday ? 'Todos' : 'Profesional')}]</span>
            <br><small style="color:var(--muted); font-size:0.75rem;">${b.reason || 'Bloqueado'}</small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="badge Cancelado" style="font-size:0.7rem;">${typeLabel}</span>
            <button class="ghost" onclick="window.removeBlockedDay('${b.id}')" title="Eliminar bloqueo" style="color:var(--danger); padding:4px 8px; font-size:0.75rem;">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger); font-size:0.8rem; padding:10px;">Error al cargar bloqueos.</div>';
  }
}

window.removeBlockedDay = async (blockId) => {
  if (!confirm('¿Deseas eliminar este bloqueo y habilitar nuevamente la agenda para esas fechas y horarios?')) return;

  try {
    await apiFetch(`${api.blockedDays}?id=${blockId}`, { method: 'DELETE' });
    showToast('Bloqueo eliminado correctamente', 'success');
    renderBlockedDaysList();
    if (window.loadAgenda) window.loadAgenda();
  } catch (err) {
    showToast(err.message || 'Error al eliminar bloqueo', 'error');
  }
};

export async function saveBlockedDay() {
  const profId = el('newBlockedProfessional')?.value || 'all';
  const dateFrom = el('newBlockedDateFrom')?.value;
  const dateTo = el('newBlockedDateTo')?.value || dateFrom;
  const allDay = el('newBlockedAllDay')?.checked ?? true;
  const timeFrom = el('newBlockedTimeFrom')?.value || '';
  const timeTo = el('newBlockedTimeTo')?.value || '';
  const reason = el('newBlockedReason')?.value.trim();

  if (!dateFrom || !reason) {
    showToast('Completá la fecha y el motivo del bloqueo', 'warning');
    return;
  }

  if (!allDay && (!timeFrom || !timeTo)) {
    showToast('Completá el horario desde y hasta para el bloqueo', 'warning');
    return;
  }

  // Aviso previo: qué turnos existentes quedan afectados por este bloqueo
  const affectedAppointments = (state.appointments || []).filter(apt => {
    const matchProf = profId === 'all' || !profId || apt.professional_id === profId;
    const matchDate = apt.date >= dateFrom && apt.date <= (dateTo || dateFrom);
    const matchTime = allDay || (apt.time >= timeFrom && apt.time < timeTo);
    const isLive = apt.status !== 'Cancelado' && apt.status !== 'Atendido';
    return matchProf && matchDate && matchTime && isLive;
  });

  if (affectedAppointments.length > 0) {
    const patientNames = affectedAppointments.map(a => `- ${a.patient_name} (${a.time} hs - ${a.status})`).join('\n');
    const proceed = confirm(
      `ATENCIÓN: Este bloqueo afecta a ${affectedAppointments.length} turno(s) existente(s):\n\n${patientNames}\n\nEsos turnos serán cancelados automáticamente y los pacientes deberán ser avisados. ¿Continuar?`
    );
    if (!proceed) return;
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
        reason: reason
      })
    });

    const cancelledCount = res.cancelled_count || 0;
    if (cancelledCount > 0) {
      showToast(`Bloqueo guardado. Se cancelaron ${cancelledCount} turnos afectados automáticamente`, 'warning');
    } else {
      showToast('Bloqueo registrado correctamente en la agenda', 'success');
    }

    renderBlockedDaysList();
    if (window.loadAgenda) window.loadAgenda();
  } catch (err) {
    showToast(err.message || 'Error al guardar bloqueo', 'error');
  }
}
