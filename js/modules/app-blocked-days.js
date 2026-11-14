/**
 * app-blocked-days.js - Gestión de Feriados y Bloqueos de Agenda
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';

const BLOCKED_HOURS_LIST = [];
for (let h = 7; h <= 21; h++) {
  const hh = String(h).padStart(2, '0');
  BLOCKED_HOURS_LIST.push(`${hh}:00`);
  if (h < 21) {
    BLOCKED_HOURS_LIST.push(`${hh}:30`);
  }
}

/**
 * Renderiza los slots de hora para el selector de bloqueo (Hora Desde / Hora Hasta)
 * Ahora muestra información de citas existentes en cada slot
 * @param {Object} opts - Opciones: { profId, dateFrom, dateTo, selectedFrom, selectedTo }
 */
export function renderBlockedHoursSlots(opts = {}) {
  const inputFrom = el('newBlockedTimeFrom');
  const inputTo = el('newBlockedTimeTo');
  const containerFrom = el('blockedTimeFromSlots');
  const containerTo = el('blockedTimeToSlots');
  const badgeFrom = el('blockedTimeFromBadge');
  const badgeTo = el('blockedTimeToBadge');

  const { profId = 'all', dateFrom = '', dateTo = '' } = opts;
  const selectedFrom = opts.selectedFrom || inputFrom?.value || '08:00';
  const selectedTo = opts.selectedTo || inputTo?.value || '13:00';

  if (badgeFrom) badgeFrom.textContent = `${selectedFrom} hs`;
  if (badgeTo) badgeTo.textContent = `${selectedTo} hs`;

  // Obtener citas existentes para el rango de fechas y profesional
  const existingApts = (state.appointments || []).filter(a => {
    if (a.status === 'Cancelado' || a.status === 'Atendido') return false;
    if (profId !== 'all' && a.professional_id !== profId) return false;
    if (dateFrom && a.date < dateFrom) return false;
    if (dateTo && a.date > dateTo) return false;
    return true;
  });

  // Función para determinar el estado de un slot
  const getSlotStatus = (time) => {
    const apt = existingApts.find(a => a.time === time);
    if (!apt) return 'available';
    if (apt.status === 'Cancelado' || apt.status === 'Atendido') return 'available';
    return 'occupied';
  };

  // Función para renderizar un botón de slot con el mismo estilo que #slotsGridContainer
  const renderSlotBtn = (time, isFrom) => {
    const status = getSlotStatus(time);
    const isSelFrom = isFrom && time === selectedFrom;
    const isSelTo = !isFrom && time === selectedTo;

    const clockIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 shrink-0" aria-hidden="true"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>';

    if (isSelFrom || isSelTo) {
      return `
        <button type="button" title="Hora ${isFrom ? 'desde' : 'hasta'} seleccionada (${time} hs)" class="slot-chip-btn slot-selected flex flex-col items-center justify-center rounded-lg border-2 border-transparent bg-gradient-to-br from-teal-500 to-emerald-600 py-2 px-1.5 text-[13px] font-mono font-semibold leading-none text-white scale-105 shadow-[0_0_18px_rgba(45,212,191,0.5)] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(45,212,191,0.6)] active:scale-95" data-time="${time}" data-${isFrom ? 'from' : 'to'}="true">
          <span class="flex items-center gap-1.5">${clockIcon}${time}</span>
        </button>
      `;
    }

    if (status === 'occupied') {
      const apt = existingApts.find(a => a.time === time);
      const title = `Ocupado: ${apt.patient_name} (${apt.reason || 'Consulta'})`;
      return `
        <button type="button" disabled aria-disabled="true" title="${title}" class="slot-chip-btn slot-occupied flex flex-col items-center justify-center rounded-lg border-2 border-rose-500/70 bg-rose-950/30 py-2 px-1.5 text-[13px] font-mono font-semibold leading-none text-rose-300 cursor-not-allowed select-none">
          <span class="flex items-center gap-1.5"><span class="slot-occupied-dot inline-block size-1.5 rounded-full bg-rose-400 shrink-0"></span><span class="slot-occupied-time line-through">${time}</span></span>
          <span class="slot-occupied-text text-[10px] font-sans font-medium line-through text-rose-400/80 mt-1">Ocupado</span>
        </button>
      `;
    }

    return `
      <button type="button" title="Disponible para bloquear (${time} hs)" class="slot-chip-btn slot-available flex flex-col items-center justify-center rounded-lg border-2 border-teal-500/80 bg-teal-950/40 py-2 px-1.5 text-[13px] font-mono font-semibold leading-none text-teal-300 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400 hover:bg-teal-500/15 hover:shadow-[0_0_14px_rgba(45,212,191,0.35)] active:scale-95" data-time="${time}" data-${isFrom ? 'from' : 'to'}="true">
        <span class="flex items-center gap-1.5">${clockIcon}${time}</span>
      </button>
    `;
  };

  // Renderizar contenedor "Hora Desde"
  if (containerFrom) {
    containerFrom.innerHTML = BLOCKED_HOURS_LIST.map(time => renderSlotBtn(time, true)).join('');

    containerFrom.querySelectorAll('[data-from="true"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const t = btn.dataset.time;
        if (!t) return;
        if (inputFrom) inputFrom.value = t;
        if (inputTo && inputTo.value <= t) {
          const fromIdx = BLOCKED_HOURS_LIST.indexOf(t);
          if (fromIdx !== -1 && fromIdx + 1 < BLOCKED_HOURS_LIST.length) {
            inputTo.value = BLOCKED_HOURS_LIST[fromIdx + 1];
          }
        }
        renderBlockedHoursSlots({ profId, dateFrom, dateTo, selectedFrom: t, selectedTo: inputTo?.value });
      });
    });
  }

  // Renderizar contenedor "Hora Hasta"
  if (containerTo) {
    containerTo.innerHTML = BLOCKED_HOURS_LIST.map(time => renderSlotBtn(time, false)).join('');

    containerTo.querySelectorAll('[data-to="true"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const t = btn.dataset.time;
        if (!t) return;
        if (inputTo) inputTo.value = t;
        if (inputFrom && inputFrom.value >= t) {
          const toIdx = BLOCKED_HOURS_LIST.indexOf(t);
          if (toIdx > 0) {
            inputFrom.value = BLOCKED_HOURS_LIST[toIdx - 1];
          }
        }
        renderBlockedHoursSlots({ profId, dateFrom, dateTo, selectedFrom: inputFrom?.value, selectedTo: t });
      });
    });
  }

  if (badgeFrom) badgeFrom.textContent = `${selectedFrom} hs`;
  if (badgeTo) badgeTo.textContent = `${selectedTo} hs`;
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
        renderBlockedHoursSlots({ profId, dateFrom, dateTo });
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
  renderBlockedHoursSlots({ profId, dateFrom, dateTo });
  renderBlockedDaysList();

  // Actualizar slots cuando cambie el profesional o las fechas
  ['newBlockedProfessional', 'newBlockedDateFrom', 'newBlockedDateTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const p = el('newBlockedProfessional')?.value || 'all';
        const dF = el('newBlockedDateFrom')?.value || '';
        const dT = el('newBlockedDateTo')?.value || '';
        renderBlockedHoursSlots({ profId: p, dateFrom: dF, dateTo: dT });
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
    const patientNames = affectedAppointments.map(a => `- ${a.patient_name} (${a.time} hs · ${a.status})`).join('\n');
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
