/**
 * app-reminders.js - Centro de Recordatorios Automáticos 24h por WhatsApp (Doctor2_Pro)
 * Genera recordatorios con 1 clic para todos los pacientes con turno al día siguiente.
 */
import { state, api } from './app-state.js';
import { el, formatDate, formatReadableDate, showToast, apiFetch } from './app-utils.js';
import { sendWhatsAppReport } from './whatsapp-manager.js';

export function getTomorrowDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

export function getTomorrowAppointments(targetDateStr = null) {
  const dateStr = targetDateStr || getTomorrowDateStr();
  const apts = state.appointments || [];
  return apts.filter(a => (a.date === dateStr) && a.status !== 'cancelled');
}

export function updateRemindersCountBadge() {
  const badge = el('remindersCountBadge');
  if (!badge) return;
  const tomorrowApts = getTomorrowAppointments();
  badge.textContent = tomorrowApts.length;
  badge.style.display = tomorrowApts.length > 0 ? 'inline-block' : 'none';
}

export function openRemindersModal() {
  let modal = el('remindersModal');
  if (!modal) {
    createRemindersModalDOM();
    modal = el('remindersModal');
  }

  const targetDateInput = el('remindersTargetDate');
  if (targetDateInput) {
    targetDateInput.value = getTomorrowDateStr();
  }

  renderRemindersList();
  modal.classList.remove('hidden');
}

function createRemindersModalDOM() {
  const modalDiv = document.createElement('div');
  modalDiv.id = 'remindersModal';
  modalDiv.className = 'modal hidden';
  modalDiv.innerHTML = `
    <div class="modal-body" style="max-width:720px; width:95%;">
      <div class="modal-head" style="border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:40px; height:40px; border-radius:10px; background:rgba(37,211,102,0.15); display:flex; align-items:center; justify-content:center; color:#25d366; font-size:1.4rem;">
            <i class="fab fa-whatsapp"></i>
          </div>
          <div>
            <h3 style="margin:0; font-size:1.25rem;">Recordatorios de Citas 24h por WhatsApp</h3>
            <p class="muted" style="margin:2px 0 0; font-size:0.83rem;">Envío asistido con 1 clic sin riesgo de baneo para los pacientes citados</p>
          </div>
        </div>
        <button id="closeRemindersModal" class="ghost" style="font-size:1.1rem;"><i class="fas fa-times"></i></button>
      </div>

      <!-- Filtro de Fecha de Recordatorio -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; background:var(--bg-page); padding:10px 14px; border-radius:10px; border:1px solid var(--border); flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:0.85rem; font-weight:700; color:var(--text); margin:0;">Fecha de citas:</label>
          <input type="date" id="remindersTargetDate" style="padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--surface); font-size:0.85rem;">
        </div>
        <div id="remindersSummaryCount" style="font-size:0.85rem; font-weight:700; color:var(--primary);">
          Cargando citas...
        </div>
      </div>

      <!-- Lista de Citas con Botón de Envío -->
      <div id="remindersAptList" style="max-height:380px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px;">
        <!-- Renderizado dinámico -->
      </div>

      <div class="modal-actions" style="margin-top:18px; padding-top:14px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
        <small class="muted" style="font-size:0.78rem;">
          <i class="fas fa-shield-halved" style="color:#22c55e;"></i> Envío seguro oficial: abre WhatsApp Web o App con el texto personalizado listo.
        </small>
        <button id="btnDoneReminders" class="primary" style="padding:8px 18px;">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  modalDiv.querySelector('#closeRemindersModal')?.addEventListener('click', () => modalDiv.classList.add('hidden'));
  modalDiv.querySelector('#btnDoneReminders')?.addEventListener('click', () => modalDiv.classList.add('hidden'));

  modalDiv.querySelector('#remindersTargetDate')?.addEventListener('change', () => {
    renderRemindersList();
  });
}

export function renderRemindersList() {
  const targetDateInput = el('remindersTargetDate');
  const targetDate = targetDateInput?.value || getTomorrowDateStr();
  const summaryCount = el('remindersSummaryCount');
  const listContainer = el('remindersAptList');

  if (!listContainer) return;

  const apts = getTomorrowAppointments(targetDate);
  apts.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  if (summaryCount) {
    summaryCount.textContent = `${apts.length} cita${apts.length === 1 ? '' : 's'} para ${formatReadableDate(targetDate) || targetDate}`;
  }

  if (apts.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding:32px 16px; background:var(--bg-page); border:1px dashed var(--border); border-radius:12px; color:var(--muted);">
        <i class="fas fa-calendar-check" style="font-size:2.2rem; margin-bottom:8px; display:block; color:var(--primary); opacity:0.6;"></i>
        <strong style="font-size:0.95rem; color:var(--text);">No hay citas agendadas para esta fecha</strong>
        <p style="margin:4px 0 0; font-size:0.83rem;">Todos los pacientes están al día o no hay turnos registrados.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = apts.map(apt => {
    const patientName = apt.patient_name || apt.patientName || 'Paciente';
    const patientPhone = apt.patient_phone || apt.patientPhone || '';
    const profName = apt.professional_name || apt.professionalName || 'Especialista';
    const time = apt.start_time || '08:00';
    const treatment = apt.treatment || apt.reason || 'Consulta Odontológica';
    const isConfirmed = apt.status === 'confirmed';

    return `
      <div class="reminder-card" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--surface); border:1px solid var(--border); border-radius:12px; gap:12px; flex-wrap:wrap; transition:all 0.2s;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-weight:800; font-size:1rem; color:var(--primary); background:rgba(99,102,241,0.1); padding:8px 12px; border-radius:8px; white-space:nowrap;">
            <i class="far fa-clock"></i> ${time}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:0.95rem; color:var(--text);">${patientName}</strong>
              <span class="badge ${isConfirmed ? 'confirmed' : 'pending'}" style="font-size:0.72rem; padding:2px 6px;">
                ${isConfirmed ? 'Confirmado' : 'Pendiente'}
              </span>
            </div>
            <div style="font-size:0.8rem; color:var(--muted); margin-top:2px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <span><i class="fab fa-whatsapp" style="color:#25d366;"></i> ${patientPhone || '<span style="color:var(--danger);">Sin teléfono</span>'}</span>
              <span><i class="fas fa-user-md" style="color:var(--primary);"></i> ${profName}</span>
              <span><i class="fas fa-tooth" style="color:var(--muted);"></i> ${treatment}</span>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" class="ghost btn-copy-msg" data-id="${apt.id}" style="font-size:0.8rem; padding:6px 10px;" title="Copiar mensaje al portapapeles">
            <i class="fas fa-copy"></i>
          </button>
          <button type="button" class="primary btn-send-wa-remind" data-id="${apt.id}" style="background:#25d366; border-color:#25d366; font-size:0.82rem; padding:6px 14px; display:inline-flex; align-items:center; gap:6px;">
            <i class="fab fa-whatsapp"></i> Enviar Recordatorio
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Event Listeners para cada cita
  listContainer.querySelectorAll('.btn-send-wa-remind').forEach(btn => {
    btn.addEventListener('click', async () => {
      const aptId = btn.dataset.id;
      const apt = apts.find(a => a.id === aptId);
      if (!apt) return;

      const pName = apt.patient_name || apt.patientName || 'Paciente';
      const pPhone = apt.patient_phone || apt.patientPhone || '';
      const prof = apt.professional_name || apt.professionalName || 'su especialista';
      const time = apt.start_time || '10:00';
      const dateText = formatReadableDate(apt.date) || apt.date;

      if (!pPhone) {
        showToast(`El paciente ${pName} no tiene un teléfono registrado`, 'warning');
        return;
      }

      const msg = `Estimad@ ${pName}, le recordamos su cita odontológica para mañana ${dateText} a las ${time} hs con ${prof} en Nani Dent. Por favor responda con un 1 para confirmar o un 2 para reprogramar. ¡Muchas gracias!`;

      // Enviar vía WhatsApp Web / App
      sendWhatsAppReport(pPhone, pName, msg);

      // Actualizar automáticamente a confirmado si estaba pendiente
      try {
        if (apt.status !== 'confirmed') {
          apt.status = 'confirmed';
          await apiFetch(api.appointments, {
            method: 'POST',
            body: JSON.stringify({ ...apt, status: 'confirmed' })
          });
          renderRemindersList();
        }
      } catch (err) {
        console.warn('Error al actualizar estado de turno:', err);
      }
    });
  });

  listContainer.querySelectorAll('.btn-copy-msg').forEach(btn => {
    btn.addEventListener('click', () => {
      const aptId = btn.dataset.id;
      const apt = apts.find(a => a.id === aptId);
      if (!apt) return;

      const pName = apt.patient_name || apt.patientName || 'Paciente';
      const prof = apt.professional_name || apt.professionalName || 'su especialista';
      const time = apt.start_time || '10:00';
      const dateText = formatReadableDate(apt.date) || apt.date;
      const msg = `Estimad@ ${pName}, le recordamos su cita odontológica para mañana ${dateText} a las ${time} hs con ${prof} en Nani Dent. Por favor responda con un 1 para confirmar o un 2 para reprogramar.`;

      navigator.clipboard.writeText(msg);
      showToast('Mensaje copiado al portapapeles', 'success');
    });
  });
}
