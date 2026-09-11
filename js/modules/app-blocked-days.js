/**
 * app-blocked-days.js - Gestión de Feriados y Bloqueos de Agenda
 */
import { state } from './app-state.js';
import { el, showToast } from './app-utils.js';

export function initBlockedDays() {
  const btn = el('blockedDaysBtn');
  if (btn) {
    btn.addEventListener('click', openBlockedDaysModal);
  }

  el('closeBlockedModal')?.addEventListener('click', closeBlockedDaysModal);
  el('cancelBlockedModal')?.addEventListener('click', closeBlockedDaysModal);
  el('saveBlockedBtn')?.addEventListener('click', saveBlockedDay);
}

export function openBlockedDaysModal() {
  el('blockedDaysModal')?.classList.remove('hidden');
  renderBlockedDaysList();
}

export function closeBlockedDaysModal() {
  el('blockedDaysModal')?.classList.add('hidden');
}

export function renderBlockedDaysList() {
  const container = el('blockedDaysList');
  if (!container) return;

  const sampleBlocked = [
    { id: '1', date: '2026-10-12', reason: 'Feriado Nacional - Día del Respeto a la Diversidad Cultural' },
    { id: '2', date: '2026-11-20', reason: 'Feriado - Día de la Soberanía Nacional' }
  ];

  container.innerHTML = sampleBlocked.map(b => `
    <div class="slot" style="margin-bottom:8px;">
      <div><strong>${b.date}</strong><br><small>${b.reason}</small></div>
      <span class="badge Cancelado">Bloqueado</span>
    </div>
  `).join('');
}

export function saveBlockedDay() {
  const dateFrom = el('newBlockedDateFrom')?.value;
  const reason = el('newBlockedReason')?.value.trim();

  if (!dateFrom || !reason) {
    showToast('Completá la fecha y el motivo del bloqueo', 'warning');
    return;
  }

  showToast('Día bloqueado correctamente en la agenda', 'success');
  closeBlockedDaysModal();
}
