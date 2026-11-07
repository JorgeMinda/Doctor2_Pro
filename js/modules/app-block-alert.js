/**
 * app-block-alert.js - Detección de horarios bloqueados y aviso al paciente (toast WhatsApp)
 */
import { state } from './app-state.js';

/**
 * Devuelve el bloqueo activo que cubre (fecha, hora y profesional) o null.
 * Formato de state.blockedDays: { date_from, date_to, all_day, time_from, time_to, professional_id, professional_name, reason }
 */
export function checkIsTimeBlocked(date, timeStr, profId) {
  if (!date || !state.blockedDays || state.blockedDays.length === 0) return null;

  return state.blockedDays.find(b => {
    const from = b.date_from || b.date;
    const to = b.date_to || from;
    const sameDate = date >= from && date <= to;
    if (!sameDate) return false;

    const sameProf = !profId || b.professional_id === 'all' || b.professional_id === profId;
    if (!sameProf) return false;

    const isAllDay = b.all_day !== false && (!b.time_from || !b.time_to);
    if (isAllDay) return true;
    if (!timeStr) return true;

    return timeStr >= b.time_from && timeStr < b.time_to;
  }) || null;
}

/** Texto descriptivo del bloqueo: "Dr. López (19:00 a 20:00 hs)" */
export function describeBlock(block) {
  if (!block) return '';
  const isAllDay = block.all_day !== false && (!block.time_from || !block.time_to);
  const who = block.professional_name || (block.professional_id === 'all' || !block.professional_id ? 'Todos' : 'Profesional');
  const when = isAllDay ? 'día completo' : `${block.time_from} a ${block.time_to} hs`;
  return `${who} (${when})`;
}

/**
 * Toast con panel de mensaje editable y envío directo por WhatsApp.
 * Reemplaza al toast simple cuando la cita cae dentro de un horario bloqueado.
 */
export function showBlockedNotificationToast(data = {}) {
  const existing = document.getElementById('customNotificationToast');
  if (existing) existing.remove();

  const patientName = data.patientName || 'Paciente';
  const phone = String(data.phone || '').replace(/[^0-9]/g, '');
  const date = data.date || '';
  const time = data.time || '';
  const reason = data.reason || 'Bloqueo de agenda';
  const blockText = data.blockText ? ` (${data.blockText})` : '';

  const messageText = `Hola ${patientName}, tu cita del ${date} a las ${time} hs ha sido suspendida por: ${reason}. Por favor contáctanos para reordenar tu turno.`;

  const toast = document.createElement('div');
  toast.id = 'customNotificationToast';
  toast.className = 'block-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.innerHTML = `
    <div class="block-toast__card">
      <div class="block-toast__head">
        <span class="block-toast__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </span>
        <span class="block-toast__title">Cita Bloqueada — Enviar Aviso</span>
        <button type="button" class="block-toast__close" data-toast-close aria-label="Cerrar aviso">✕</button>
      </div>
      <div class="block-toast__body">
        <p class="block-toast__note">No se puede iniciar la cita de <strong>${patientName} (${time} hs)</strong> debido al bloqueo activo${blockText}.</p>
        <label class="block-toast__label" for="toastMessageInput">Mensaje para el paciente:</label>
        <textarea id="toastMessageInput" class="block-toast__textarea" rows="3" spellcheck="true"></textarea>
        <div class="block-toast__actions">
          <a id="whatsappSendBtn" class="block-toast__btn block-toast__btn--wa" href="https://wa.me/${phone}?text=${encodeURIComponent(messageText)}" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            Enviar WhatsApp
          </a>
          <button type="button" class="block-toast__btn block-toast__btn--ghost" data-toast-close>Cerrar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(toast);

  const textarea = toast.querySelector('#toastMessageInput');
  const waBtn = toast.querySelector('#whatsappSendBtn');
  if (textarea) textarea.value = messageText;

  // Si el usuario edita el mensaje, el enlace de WhatsApp se actualiza en vivo
  if (textarea && waBtn) {
    textarea.addEventListener('input', () => {
      waBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(textarea.value)}`;
    });
  }

  toast.querySelectorAll('[data-toast-close]').forEach(btn => {
    btn.addEventListener('click', closeBlockedNotificationToast);
  });

  return toast;
}

export function closeBlockedNotificationToast() {
  const toast = document.getElementById('customNotificationToast');
  if (toast) toast.remove();
}

// Invocables desde atributos inline (onclick) en el timeline
window.showBlockedToast = showBlockedNotificationToast;
window.closeNotificationToast = closeBlockedNotificationToast;
