/**
 * app-blocked-days.js - Gestión de Feriados y Bloqueos de Agenda
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';

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
      hoursContainer.style.display = e.target.checked ? 'none' : 'grid';
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

      return `
        <div class="slot" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:0.85rem;"><i class="fas fa-calendar-times" style="color:var(--danger);"></i> ${b.date_from === b.date_to ? b.date_from : `${b.date_from} al ${b.date_to}`}</strong>
            ${timeBadge}
            <span style="font-size:0.75rem; color:var(--text); margin-left:6px; font-weight:600;">[${b.professional_name || 'Todos'}]</span>
            <br><small style="color:var(--muted); font-size:0.75rem;">${b.reason || 'Bloqueado'}</small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="badge Cancelado" style="font-size:0.7rem;">${b.type === 'emergency' ? 'Emergencia' : 'Bloqueado'}</span>
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
    showToast('Error al eliminar bloqueo', 'error');
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
        reason: reason,
        type: profId === 'all' ? 'holiday' : 'emergency'
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
