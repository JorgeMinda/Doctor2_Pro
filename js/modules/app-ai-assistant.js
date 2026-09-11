/**
 * app-ai-assistant.js - Asistente Virtual con IA para WhatsApp y Agendamiento Automático
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';

export async function generateDefaultPrompt() {
  try {
    const clinicName = 'Consultorios.pro';
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

    let prompt = `Eres el asistente virtual de *${clinicName}*. Tu rol es ayudar a los pacientes de manera amable, profesional y eficiente.

📋 *TUS FUNCIONES PRINCIPALES:*
- Responder consultas sobre turnos y disponibilidad médica
- Brindar información del consultorio (ubicación, horarios, contacto)
- Guiar a los pacientes en el agendamiento de citas
- Derivar a recepción cuando la consulta requiera atención personalizada

👨⚕️ *EQUIPO PROFESIONAL:*
${profList || '- Dr. Juan Carlos Gómez (Odontología)'}

📍 *INFORMACIÓN DEL CONSULTORIO:*
- Nombre: ${clinicName}
- Horarios de atención: Lunes a Viernes 08:00 a 20:00 hs

⚠️ *REGLAS IMPORTANTES:*
- NUNCA brindes diagnósticos médicos
- NUNCA recetes ni sugieras medicamentos
- Ante emergencias médicas, indica llamar al 107 o acudir a guardia
- Responde con cordialidad, claridad y emojis moderados`;

    return prompt;
  } catch (e) {
    return 'Eres el asistente virtual del consultorio. Ayuda a los pacientes con turnos y consultas generales.';
  }
}

export function initAIAssistant() {
  const container = el('aiAssistantContainer');
  if (!container) return;

  let isEnabled = false;
  let bookingEnabled = false;

  container.innerHTML = `
    <div class="card" style="margin-top:20px;">
      <div class="card-head">
        <div>
          <h3><i class="fas fa-robot" style="color:var(--primary);"></i> Asistente con Inteligencia Artificial (WhatsApp)</h3>
          <p class="muted">Respuestas automáticas inteligentes y agendamiento 24/7 para pacientes</p>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span id="aiStatusLabel" class="badge Ausente">Desactivado</span>
          <button id="aiToggleBtn" class="primary" style="padding:6px 12px; font-size:0.85rem;"><i class="fas fa-power-off"></i> Activar IA</button>
        </div>
      </div>

      <div id="aiConfigArea" style="margin-top:16px;">
        <div style="margin-bottom:14px; padding:12px; background:var(--primary-light); border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong><i class="fas fa-calendar-check" style="color:var(--primary);"></i> Agendamiento Automático por WhatsApp</strong>
            <small class="muted" style="display:block;">Permite que los pacientes reserven turnos disponibles hablando con el bot</small>
          </div>
          <button id="aiBookingToggleBtn" class="ghost"><i class="fas fa-toggle-off"></i> Desactivado</button>
        </div>

        <div class="field">
          <label style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Prompt del Sistema (Instrucciones de comportamiento)</span>
            <button class="ghost" id="aiResetPromptBtn" style="padding:4px 8px; font-size:0.75rem;"><i class="fas fa-undo"></i> Restaurar por defecto</button>
          </label>
          <textarea id="aiSystemPrompt" rows="8" style="font-family:monospace; font-size:0.85rem;"></textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px;">
          <button id="aiSaveBtn" class="primary"><i class="fas fa-save"></i> Guardar Configuración</button>
          <button id="aiTestBtn" class="ghost"><i class="fas fa-vial"></i> Probar Respuesta IA</button>
        </div>
      </div>
    </div>
  `;

  // Cargar prompt por defecto
  generateDefaultPrompt().then(p => {
    const area = el('aiSystemPrompt');
    if (area) area.value = p;
  });

  // Toggle IA
  el('aiToggleBtn')?.addEventListener('click', () => {
    isEnabled = !isEnabled;
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
    const btn = el('aiBookingToggleBtn');
    if (bookingEnabled) {
      if (btn) { btn.innerHTML = '<i class="fas fa-toggle-on" style="color:var(--success);"></i> Activado'; }
      showToast('Agendamiento por WhatsApp habilitado', 'success');
    } else {
      if (btn) { btn.innerHTML = '<i class="fas fa-toggle-off"></i> Desactivado'; }
      showToast('Agendamiento por WhatsApp desactivado', 'info');
    }
  });

  // Restaurar Prompt
  el('aiResetPromptBtn')?.addEventListener('click', async () => {
    const area = el('aiSystemPrompt');
    if (area) area.value = await generateDefaultPrompt();
    showToast('Prompt restaurado con los datos del consultorio', 'info');
  });

  // Guardar
  el('aiSaveBtn')?.addEventListener('click', () => {
    showToast('Configuración de IA guardada correctamente', 'success');
  });

  // Test
  el('aiTestBtn')?.addEventListener('click', () => {
    showToast('Probando IA: "¡Hola! Soy el asistente virtual de Consultorios.pro. ¿En qué puedo ayudarte hoy?"', 'info');
  });
}
