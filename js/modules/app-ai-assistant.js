/**
 * app-ai-assistant.js - Asistente Virtual con IA para WhatsApp y Agendamiento Automático
 * Incluye Simulador de Pruebas de WhatsApp en Tiempo Real y Generación Dinámica de Prompts.
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast, formatReadableDate } from './app-utils.js';

const PROMPT_STORAGE_KEY = 'doctor2_ai_system_prompt';

export async function generateDefaultPrompt() {
  try {
    const clinicName = 'Nani Dent';
    const professionals = state.professionals || [];

    let profList = '';
    if (professionals.length > 0) {
      profList = professionals.map(p => {
        let info = `- *${p.name}*`;
        if (p.specialty) info += ` - ${p.specialty}`;
        if (p.phone) info += ` (Tel: ${p.phone})`;
        return info;
      }).join('\n');
    }

    let prompt = `Eres el asistente virtual con Inteligencia Artificial de la clínica odontológica *${clinicName}*. Tu rol es ayudar a los pacientes de manera amable, empática, profesional y eficiente a través de WhatsApp.

📋 *TUS FUNCIONES PRINCIPALES:*
- Responder consultas sobre turnos y disponibilidad médica
- Brindar información del consultorio (ubicación, horarios, contacto)
- Guiar a los pacientes en el agendamiento de citas
- Derivar a recepción cuando la consulta requiera atención personalizada

👨‍⚕️ *EQUIPO PROFESIONAL DE LA CLÍNICA:*
${profList || '- Dr. Juan Carlos Gómez - Odontología General'}

📍 *INFORMACIÓN DEL CONSULTORIO:*
- Nombre: ${clinicName} · Amor en cada sonrisa
- Horarios de atención: Lunes a Viernes 08:00 a 20:00 hs

⚠️ *REGLAS CLÍNICAS IMPORTANTES:*
- NUNCA brindes diagnósticos médicos definitivos
- NUNCA recetes ni sugieras medicamentos
- Ante dolores intensos o emergencias médicas, indica acudir de urgencia al consultorio
- Responde con cordialidad, claridad y emojis moderados (🦷, 📅, ✨)`;

    return prompt;
  } catch (e) {
    return 'Eres el asistente virtual de Nani Dent. Ayuda a los pacientes con turnos y consultas generales.';
  }
}

export function initAIAssistant() {
  const container = el('aiAssistantContainer');
  if (!container) return;

  let isEnabled = localStorage.getItem('doctor2_ai_enabled') === 'true';
  let bookingEnabled = localStorage.getItem('doctor2_ai_booking_enabled') !== 'false';

  container.innerHTML = `
    <div class="card" style="margin-top:20px;">
      <div class="card-head">
        <div>
          <h3><i class="fas fa-robot" style="color:var(--primary);"></i> Asistente con Inteligencia Artificial (WhatsApp)</h3>
          <p class="muted">Respuestas automáticas inteligentes y agendamiento 24/7 para pacientes reales</p>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span id="aiStatusLabel" class="badge ${isEnabled ? 'Confirmado' : 'Ausente'}">
            ${isEnabled ? 'Activado' : 'Desactivado'}
          </span>
          <button id="aiToggleBtn" class="primary" style="padding:6px 12px; font-size:0.85rem; background:${isEnabled ? '#ef4444' : ''};">
            <i class="fas fa-power-off"></i> ${isEnabled ? 'Desactivar IA' : 'Activar IA'}
          </button>
        </div>
      </div>

      <div id="aiConfigArea" style="margin-top:16px;">
        <div style="margin-bottom:14px; padding:12px; background:var(--primary-light); border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong><i class="fas fa-calendar-check" style="color:var(--primary);"></i> Agendamiento Automático en la Base de Datos</strong>
            <small class="muted" style="display:block;">Permite que los pacientes reserven turnos disponibles hablando directamente con el bot</small>
          </div>
          <button id="aiBookingToggleBtn" class="ghost">
            <i class="fas ${bookingEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}" style="color:${bookingEnabled ? 'var(--success)' : 'var(--muted)'};"></i>
            ${bookingEnabled ? 'Activado' : 'Desactivado'}
          </button>
        </div>

        <div class="field">
          <label style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Prompt del Sistema (Instrucciones de comportamiento)</span>
            <button class="ghost" id="aiResetPromptBtn" style="padding:4px 8px; font-size:0.75rem;"><i class="fas fa-undo"></i> Restaurar por defecto</button>
          </label>
          <textarea id="aiSystemPrompt" rows="9" style="font-family:monospace; font-size:0.85rem; line-height:1.5;"></textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; gap:8px;">
            <button id="aiSaveBtn" class="primary"><i class="fas fa-save"></i> Guardar Configuración</button>
          </div>
          <button id="aiTestBtn" class="ghost" style="color:var(--primary); font-weight:700; border-color:var(--primary);">
            <i class="fas fa-comments"></i> Abrir Simulador de WhatsApp en Vivo
          </button>
        </div>
      </div>
    </div>
  `;

  // Cargar prompt guardado o por defecto
  const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
  if (savedPrompt) {
    const area = el('aiSystemPrompt');
    if (area) area.value = savedPrompt;
  } else {
    generateDefaultPrompt().then(p => {
      const area = el('aiSystemPrompt');
      if (area) area.value = p;
    });
  }

  // Toggle IA
  el('aiToggleBtn')?.addEventListener('click', () => {
    isEnabled = !isEnabled;
    localStorage.setItem('doctor2_ai_enabled', isEnabled);
    const label = el('aiStatusLabel');
    const btn = el('aiToggleBtn');
    if (isEnabled) {
      if (label) { label.textContent = 'Activado'; label.className = 'badge Confirmado'; }
      if (btn) { btn.innerHTML = '<i class="fas fa-power-off"></i> Desactivar IA'; btn.style.background = '#ef4444'; }
      showToast('Asistente con IA activado para WhatsApp', 'success');
    } else {
      if (label) { label.textContent = 'Desactivado'; label.className = 'badge Ausente'; }
      if (btn) { btn.innerHTML = '<i class="fas fa-power-off"></i> Activar IA'; btn.style.background = ''; }
      showToast('Asistente con IA pausado', 'info');
    }
  });

  // Toggle Agendamiento
  el('aiBookingToggleBtn')?.addEventListener('click', () => {
    bookingEnabled = !bookingEnabled;
    localStorage.setItem('doctor2_ai_booking_enabled', bookingEnabled);
    const btn = el('aiBookingToggleBtn');
    if (bookingEnabled) {
      if (btn) { btn.innerHTML = '<i class="fas fa-toggle-on" style="color:var(--success);"></i> Activado'; }
      showToast('Agendamiento automático por WhatsApp habilitado', 'success');
    } else {
      if (btn) { btn.innerHTML = '<i class="fas fa-toggle-off" style="color:var(--muted);"></i> Desactivado'; }
      showToast('Agendamiento automático por WhatsApp desactivado', 'info');
    }
  });

  // Restaurar Prompt
  el('aiResetPromptBtn')?.addEventListener('click', async () => {
    const area = el('aiSystemPrompt');
    const def = await generateDefaultPrompt();
    if (area) area.value = def;
    localStorage.removeItem(PROMPT_STORAGE_KEY);
    showToast('Prompt restaurado con los datos de Nani Dent', 'info');
  });

  // Guardar
  el('aiSaveBtn')?.addEventListener('click', () => {
    const promptVal = el('aiSystemPrompt')?.value.trim();
    if (promptVal) {
      localStorage.setItem(PROMPT_STORAGE_KEY, promptVal);
    }
    showToast('Configuración de IA guardada con éxito', 'success');
  });

  // Abrir Simulador Interactivo de WhatsApp
  el('aiTestBtn')?.addEventListener('click', openAISimulatorModal);
}

/**
 * Simulador de Chat de WhatsApp en Tiempo Real para probar el bot
 */
export function openAISimulatorModal() {
  const existingModal = document.getElementById('aiSimulatorModal');
  if (existingModal) existingModal.remove();

  const currentPrompt = el('aiSystemPrompt')?.value || 'Asistente de Nani Dent';
  const profs = state.professionals || [];
  const profNames = profs.map(p => p.name).join(', ') || 'Dr. Juan Carlos Gómez';

  const modal = document.createElement('div');
  modal.id = 'aiSimulatorModal';
  modal.className = 'modal';
  modal.style.zIndex = '999999';

  modal.innerHTML = `
    <div class="modal-body" style="max-width:480px; width:95%; padding:0; border-radius:18px; overflow:hidden; background:#efeae2;">
      <!-- Header Estilo WhatsApp -->
      <div style="background:#075e54; color:#fff; padding:12px 16px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:50%; background:#25d366; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.2rem; font-weight:800;">
            <i class="fas fa-robot"></i>
          </div>
          <div>
            <div style="font-weight:700; font-size:1rem;">Nani Dent · Bot IA</div>
            <small style="opacity:0.85; font-size:0.75rem;"><i class="fas fa-circle" style="color:#25d366; font-size:0.55rem;"></i> En línea (Simulación 24/7)</small>
          </div>
        </div>
        <button id="closeSimModal" class="ghost" style="color:#fff; font-size:1.2rem;"><i class="fas fa-times"></i></button>
      </div>

      <!-- Pantalla de Mensajes -->
      <div id="simMessagesArea" style="height:360px; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px;">
        <div style="align-self:center; background:rgba(0,0,0,0.06); padding:4px 12px; border-radius:6px; font-size:0.72rem; color:#555; margin-bottom:8px;">
          🔒 Esta es una simulación en vivo del comportamiento de tu asistente con IA
        </div>
        <div style="align-self:flex-start; max-width:80%; background:#fff; padding:10px 14px; border-radius:0 12px 12px 12px; font-size:0.88rem; box-shadow:0 1px 2px rgba(0,0,0,0.1); line-height:1.45; color:#111;">
          ¡Hola! Soy el asistente virtual de <strong>Nani Dent</strong> 🦷✨. ¿En qué te puedo ayudar hoy? ¿Te gustaría agendar una cita o tienes alguna consulta sobre nuestros tratamientos?
          <div style="font-size:0.7rem; color:#888; text-align:right; margin-top:4px;">10:00</div>
        </div>
      </div>

      <!-- Preguntas Frecuentes Rápidas -->
      <div style="padding:6px 12px; background:#f0f2f5; border-top:1px solid #ddd; display:flex; gap:6px; overflow-x:auto;">
        <span class="sim-quick-btn" data-txt="¿Qué doctores atienden en la clínica?" style="font-size:0.75rem; background:#fff; border:1px solid #ccc; padding:4px 8px; border-radius:12px; cursor:pointer; white-space:nowrap;">👨‍⚕️ Doctores</span>
        <span class="sim-quick-btn" data-txt="Quiero agendar un turno para mañana a las 10:00" style="font-size:0.75rem; background:#fff; border:1px solid #ccc; padding:4px 8px; border-radius:12px; cursor:pointer; white-space:nowrap;">📅 Turno mañana</span>
        <span class="sim-quick-btn" data-txt="¿Cuánto cuesta una limpieza dental?" style="font-size:0.75rem; background:#fff; border:1px solid #ccc; padding:4px 8px; border-radius:12px; cursor:pointer; white-space:nowrap;">💰 Precios</span>
        <span class="sim-quick-btn" data-txt="Me duele mucho una muela, ¿qué tomo?" style="font-size:0.75rem; background:#fff; border:1px solid #ccc; padding:4px 8px; border-radius:12px; cursor:pointer; white-space:nowrap;">⚠️ Emergencia</span>
      </div>

      <!-- Barra de Input del Paciente -->
      <div style="padding:10px 14px; background:#f0f2f5; display:flex; gap:8px; align-items:center;">
        <input type="text" id="simUserInput" placeholder="Escribe como paciente..." style="flex:1; border:none; padding:10px 14px; border-radius:20px; font-size:0.88rem; background:#fff; color:#000; outline:none; box-shadow:0 1px 2px rgba(0,0,0,0.08);">
        <button id="simSendBtn" style="width:40px; height:40px; border-radius:50%; background:#075e54; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const messagesArea = modal.querySelector('#simMessagesArea');
  const userInput = modal.querySelector('#simUserInput');
  const sendBtn = modal.querySelector('#simSendBtn');
  const closeBtn = modal.querySelector('#closeSimModal');

  closeBtn?.addEventListener('click', () => modal.remove());

  const executeSimReply = (question) => {
    if (!question) return;

    // Agregar mensaje del usuario
    const userBubble = document.createElement('div');
    userBubble.style.cssText = 'align-self:flex-end; max-width:80%; background:#dcf8c6; padding:10px 14px; border-radius:12px 0 12px 12px; font-size:0.88rem; box-shadow:0 1px 2px rgba(0,0,0,0.1); line-height:1.45; color:#111;';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    userBubble.innerHTML = `${question}<div style="font-size:0.7rem; color:#888; text-align:right; margin-top:4px;">${timeStr}</div>`;
    messagesArea.appendChild(userBubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    userInput.value = '';

    // Burbuja de "Escribiendo..."
    const typingBubble = document.createElement('div');
    typingBubble.id = 'simTyping';
    typingBubble.style.cssText = 'align-self:flex-start; background:#fff; padding:6px 12px; border-radius:12px; font-size:0.78rem; color:#888; font-style:italic;';
    typingBubble.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Escribiendo respuesta...';
    messagesArea.appendChild(typingBubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    setTimeout(() => {
      typingBubble.remove();
      const replyText = generateSimulatedBrainReply(question, currentPrompt, profNames);
      const botBubble = document.createElement('div');
      botBubble.style.cssText = 'align-self:flex-start; max-width:80%; background:#fff; padding:10px 14px; border-radius:0 12px 12px 12px; font-size:0.88rem; box-shadow:0 1px 2px rgba(0,0,0,0.1); line-height:1.45; color:#111;';
      botBubble.innerHTML = `${replyText}<div style="font-size:0.7rem; color:#888; text-align:right; margin-top:4px;">${timeStr}</div>`;
      messagesArea.appendChild(botBubble);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 900);
  };

  sendBtn?.addEventListener('click', () => executeSimReply(userInput.value.trim()));
  userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSimReply(userInput.value.trim());
    }
  });

  modal.querySelectorAll('.sim-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      executeSimReply(btn.dataset.txt);
    });
  });
}

function generateSimulatedBrainReply(text, prompt, doctors) {
  const q = text.toLowerCase();

  if (q.includes('doctor') || q.includes('especialista') || q.includes('quién atiende') || q.includes('medico')) {
    return `En <strong>Nani Dent</strong> contamos con un equipo de primer nivel 👨‍⚕️✨:<br>• <strong>${doctors}</strong><br><br>Atendemos de Lunes a Viernes de 08:00 a 20:00 hs. ¿Te gustaría consultar la disponibilidad de algún horario en particular?`;
  }

  if (q.includes('mañana') || q.includes('turno') || q.includes('cita') || q.includes('agendar') || q.includes('hora')) {
    return `¡Por supuesto! 📅 Para mañana tenemos horarios disponibles a las <strong>10:00 hs</strong> y a las <strong>16:00 hs</strong> con el <strong>${doctors.split(',')[0]}</strong>.<br><br>¿Cuál de estos dos horarios te queda más cómodo para registrar tu cita? 😊`;
  }

  if (q.includes('precio') || q.includes('cuánto sale') || q.includes('costo') || q.includes('limpieza') || q.includes('tarifa')) {
    return `¡Con gusto te informamos! 🦷 Una profilaxis dental (limpieza) o consulta inicial tiene valores muy accesibles y se realiza con instrumental ultrasónico de última generación.<br><br>Para darte un presupuesto exacto según tu caso, te invitamos a una valoración previa. ¿Deseas agendarla esta semana?`;
  }

  if (q.includes('duele') || q.includes('tomo') || q.includes('ibuprofeno') || q.includes('medicamento') || q.includes('muela') || q.includes('pastilla')) {
    return `⚠️ <strong>Importante:</strong> Como asistente virtual no puedo prescribirte medicamentos ni darte diagnósticos médicos por bioseguridad.<br><br>Si presentas un dolor dental agudo, te recomendamos <strong>acudir de urgencia a nuestro consultorio</strong> para que el doctor pueda examinarte y darte la medicación apropiada. ¿Deseas que te reservemos un espacio prioritario hoy?`;
  }

  return `¡Hola! Con mucho gusto te atendemos en <strong>Nani Dent</strong> 🦷. Podemos ayudarte a consultar horarios disponibles, agendar citas o resolver dudas sobre nuestros servicios. ¿Te gustaría coordinar una atención para esta semana?`;
}
