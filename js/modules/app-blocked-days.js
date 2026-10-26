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

export function renderBlockedHoursSlots() {
  const inputFrom = el('newBlockedTimeFrom');
  const inputTo = el('newBlockedTimeTo');
  const containerFrom = el('blockedTimeFromSlots');
  const containerTo = el('blockedTimeToSlots');
  const badgeFrom = el('blockedTimeFromBadge');
  const badgeTo = el('blockedTimeToBadge');

  const selectedFrom = inputFrom?.value || '08:00';
  const selectedTo = inputTo?.value || '13:00';

  if (badgeFrom) badgeFrom.textContent = `${selectedFrom} hs`;
  if (badgeTo) badgeTo.textContent = `${selectedTo} hs`;

  if (containerFrom) {
    containerFrom.innerHTML = BLOCKED_HOURS_LIST.map(time => {
      const isSel = time === selectedFrom;
      if (isSel) {
        return `
          <button type="button" title="Hora desde seleccionada (${time} hs)" class="time-slot-btn badge primary selected" data-time="${time}">
            <i class="fas fa-check-circle" style="font-size:0.75rem;"></i>
            <span>${time} hs</span>
          </button>
        `;
      }
      return `
        <button type="button" title="Seleccionar hora desde (${time} hs)" class="time-slot-btn badge available" data-time="${time}">
          <i class="far fa-clock" style="font-size:0.68rem; opacity:0.85;"></i>
          <span>${time} hs</span>
        </button>
      `;
    }).join('');

    containerFrom.querySelectorAll('.time-slot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const t = btn.dataset.time;
        if (!t) return;
        if (inputFrom) inputFrom.value = t;
        // Si hora hasta queda igual o menor que hora desde, mover hasta al siguiente slot
        if (inputTo && inputTo.value <= t) {
          const fromIdx = BLOCKED_HOURS_LIST.indexOf(t);
          if (fromIdx !== -1 && fromIdx + 1 < BLOCKED_HOURS_LIST.length) {
            inputTo.value = BLOCKED_HOURS_LIST[fromIdx + 1];
          }
        }
        renderBlockedHoursSlots();
      });
    });
  }

  if (containerTo) {
    containerTo.innerHTML = BLOCKED_HOURS_LIST.map(time => {
      const isSel = time === selectedTo;
      if (isSel) {
        return `
          <button type="button" title="Hora hasta seleccionada (${time} hs)" class="time-slot-btn badge primary selected" data-time="${time}">
            <i class="fas fa-check-circle" style="font-size:0.75rem;"></i>
            <span>${time} hs</span>
          </button>
        `;
      }
      return `
        <button type="button" title="Seleccionar hora hasta (${time} hs)" class="time-slot-btn badge available" data-time="${time}">
          <i class="far fa-clock" style="font-size:0.68rem; opacity:0.85;"></i>
          <span>${time} hs</span>
        </button>
      `;
    }).join('');

    containerTo.querySelectorAll('.time-slot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const t = btn.dataset.time;
        if (!t) return;
        if (inputTo) inputTo.value = t;
        // Si hora desde queda igual o mayor que hora hasta, mover desde al slot anterior
        if (inputFrom && inputFrom.value >= t) {
          const toIdx = BLOCKED_HOURS_LIST.indexOf(t);
          if (toIdx > 0) {
            inputFrom.value = BLOCKED_HOURS_LIST[toIdx - 1];
          }
        }
        renderBlockedHoursSlots();
      });
    });
  }
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
        renderBlockedHoursSlots();
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

  renderBlockedHoursSlots();
  renderBlockedDaysList();
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
