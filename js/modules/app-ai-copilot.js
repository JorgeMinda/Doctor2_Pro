/**
 * app-ai-copilot.js - Copiloto Clínico Inteligente y Motor de Automatización inspirado en Operit AI
 * Soporte para Dictado Clínico Inteligente, Marcado de Odontograma por Voz/Texto, Workflows 1-Click y Resúmenes Clínicos.
 */
import { state, api } from './app-state.js';
import { el, showToast, apiFetch, formatDate } from './app-utils.js';
import { setNav } from './app-navigation.js';
import { speakText, formatClinicalDictation } from './app-voice-assistant.js';

let isCopilotOpen = false;
let copilotHistory = [];

export function initAICopilot() {
  injectCopilotDOM();
  attachCopilotEvents();
}

/**
 * Inyecta el panel del Copiloto IA en el DOM
 */
function injectCopilotDOM() {
  if (document.getElementById('operitCopilotPanel')) return;

  const panel = document.createElement('div');
  panel.id = 'operitCopilotPanel';
  panel.className = 'operit-copilot-panel hidden';
  panel.innerHTML = `
    <div class="copilot-container">
      <!-- Header -->
      <div class="copilot-head">
        <div class="copilot-brand">
          <div class="copilot-avatar">
            <i class="fas fa-brain"></i>
          </div>
          <div>
            <div class="copilot-title">
              <strong>Operit AI Copilot</strong>
              <span class="copilot-status-badge">Online</span>
            </div>
            <span class="copilot-subtitle">Asistente Clínico & Automatizaciones</span>
          </div>
        </div>
        <div class="copilot-controls">
          <button type="button" class="copilot-icon-btn" id="copilotSettingsBtn" title="Configurar Modelos IA (Cloud / Local Ollama)">
            <i class="fas fa-sliders"></i>
          </button>
          <button type="button" class="copilot-icon-btn" id="copilotMinimizeBtn" title="Minimizar panel">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Settings Drawer (Opcional para API Keys / Ollama) -->
      <div class="copilot-settings-drawer hidden" id="copilotSettingsDrawer">
        <div id="copilotSettingsForm" class="copilot-settings-form">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong style="font-size:0.85rem; color:var(--text);"><i class="fas fa-microchip"></i> Motor de Inteligencia Artificial</strong>
            <button type="button" class="ghost" style="padding:2px 6px; font-size:0.75rem;" id="closeCopilotSettings"><i class="fas fa-times"></i></button>
          </div>
          <label style="font-size:0.75rem; color:var(--muted); display:block; margin-bottom:4px;">Proveedor de IA:</label>
          <select id="copilotProviderSelect" class="field-input" style="width:100%; font-size:0.82rem; padding:6px; margin-bottom:8px;">
            <option value="offline">⚡ Motor Clínico Nativo (Offline / Privacidad Total)</option>
            <option value="gemini">Google Gemini AI</option>
            <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
            <option value="deepseek">DeepSeek AI</option>
            <option value="ollama">Ollama (Modelo Local http://localhost:11434)</option>
          </select>
          <div id="copilotApiKeyWrap" class="hidden">
            <label style="font-size:0.75rem; color:var(--muted); display:block; margin-bottom:4px;">API Key:</label>
            <input type="password" id="copilotApiKeyInput" class="field-input" placeholder="sk-..." autocomplete="off" style="width:100%; font-size:0.82rem; padding:6px; margin-bottom:8px;">
          </div>
          <button type="button" class="primary" id="saveCopilotSettingsBtn" style="width:100%; font-size:0.8rem; padding:6px;">
            <i class="fas fa-check"></i> Guardar Preferencias
          </button>
        </div>
      </div>

      <!-- Quick Skills Bar (Operit Tools) -->
      <div class="copilot-skills-bar">
        <button type="button" class="copilot-skill-pill" data-action="workflow_checkout" title="Workflow 1-Click: Cierre de consulta, caja y WhatsApp">
          <i class="fas fa-bolt" style="color:#eab308;"></i> Cierre Consulta
        </button>
        <button type="button" class="copilot-skill-pill" data-action="summarize_patient" title="Resumen Clínico Inteligente 360°">
          <i class="fas fa-file-waveform" style="color:#3b82f6;"></i> Resumen Paciente
        </button>
        <button type="button" class="copilot-skill-pill" data-action="certificate" title="Emitir Certificado Médico Oficial">
          <i class="fas fa-certificate" style="color:#10b981;"></i> Certificado
        </button>
        <button type="button" class="copilot-skill-pill" data-action="new_appointment" title="Agendar Cita Rápida">
          <i class="fas fa-calendar-plus" style="color:#8b5cf6;"></i> Turno
        </button>
      </div>

      <!-- Stream de Actividad y Respuestas -->
      <div class="copilot-messages" id="copilotMessages">
        <div class="copilot-msg bot">
          <div class="msg-bubble">
            👋 <strong>¡Hola, Doctor!</strong> Soy tu copiloto <strong>Operit AI</strong>.<br>
            Puedo interpretar tu dictado clínico, marcar el odontograma por voz, cerrar consultas con 1 clic o resumir el historial del paciente.<br>
            <small style="color:var(--muted); display:block; margin-top:6px;">💬 Escribe o presiona el micrófono para hablar.</small>
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <div class="copilot-input-bar">
        <button type="button" class="copilot-mic-btn" id="copilotMicBtn" title="Dictar por voz (Español)">
          <i class="fas fa-microphone" id="copilotMicIcon"></i>
        </button>
        <input type="text" id="copilotTextInput" placeholder="Escribe un comando o dictado clínico..." autocomplete="off">
        <button type="button" class="copilot-send-btn" id="copilotSendBtn" title="Enviar comando">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
}

/**
 * Conecta los eventos del Copiloto
 */
function attachCopilotEvents() {
  const panel = document.getElementById('operitCopilotPanel');
  const minBtn = document.getElementById('copilotMinimizeBtn');
  const settingsBtn = document.getElementById('copilotSettingsBtn');
  const settingsDrawer = document.getElementById('copilotSettingsDrawer');
  const closeSettings = document.getElementById('closeCopilotSettings');
  const providerSelect = document.getElementById('copilotProviderSelect');
  const apiKeyWrap = document.getElementById('copilotApiKeyWrap');
  const saveSettings = document.getElementById('saveCopilotSettingsBtn');
  const textInput = document.getElementById('copilotTextInput');
  const sendBtn = document.getElementById('copilotSendBtn');
  const micBtn = document.getElementById('copilotMicBtn');

  // Cargar configuración guardada
  const savedConfig = JSON.parse(localStorage.getItem('operit_ai_config') || '{}');
  if (providerSelect) providerSelect.value = savedConfig.provider || 'offline';
  if (apiKeyWrap && providerSelect) {
    apiKeyWrap.classList.toggle('hidden', providerSelect.value === 'offline' || providerSelect.value === 'ollama');
  }
  if (el('copilotApiKeyInput')) {
    el('copilotApiKeyInput').value = savedConfig.apiKey || '';
  }

  // Toggle settings
  settingsBtn?.addEventListener('click', () => {
    settingsDrawer?.classList.toggle('hidden');
  });
  closeSettings?.addEventListener('click', () => {
    settingsDrawer?.classList.add('hidden');
  });

  providerSelect?.addEventListener('change', () => {
    const val = providerSelect.value;
    apiKeyWrap?.classList.toggle('hidden', val === 'offline' || val === 'ollama');
  });

  saveSettings?.addEventListener('click', () => {
    const provider = providerSelect?.value || 'offline';
    const apiKey = el('copilotApiKeyInput')?.value.trim() || '';
    localStorage.setItem('operit_ai_config', JSON.stringify({ provider, apiKey }));
    showToast('Configuración de IA actualizada', 'success');
    settingsDrawer?.classList.add('hidden');
  });

  minBtn?.addEventListener('click', () => {
    toggleAICopilot(false);
  });

  // Envío por texto
  const handleSend = () => {
    const text = textInput?.value.trim();
    if (!text) return;
    textInput.value = '';
    appendCopilotMessage('user', text);
    processCopilotCommand(text);
  };

  sendBtn?.addEventListener('click', handleSend);
  textInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // Acciones rápidas (Skills)
  panel?.querySelectorAll('.copilot-skill-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      executeCopilotSkill(action);
    });
  });

  // Manejo de micrófono directo
  micBtn?.addEventListener('click', () => {
    if (window.toggleVoiceRecognition) {
      window.toggleVoiceRecognition();
      const isRecListening = el('floatingVoiceBtn')?.classList.contains('is-listening');
      micBtn.classList.toggle('active', !isRecListening);
    }
  });
}

/**
 * Alterna visibilidad del Copiloto
 */
export function toggleAICopilot(forceOpen = null) {
  const panel = document.getElementById('operitCopilotPanel');
  if (!panel) return;

  isCopilotOpen = (forceOpen !== null) ? forceOpen : !isCopilotOpen;
  panel.classList.toggle('hidden', !isCopilotOpen);

  if (isCopilotOpen) {
    const input = document.getElementById('copilotTextInput');
    setTimeout(() => input?.focus(), 150);
  }
}
window.toggleAICopilot = toggleAICopilot;

/**
 * Agrega un mensaje a la conversación del copiloto
 */
export function appendCopilotMessage(sender, text, isHtml = false) {
  const container = document.getElementById('copilotMessages');
  if (!container) return;

  const msg = document.createElement('div');
  msg.className = `copilot-msg ${sender}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (isHtml) {
    bubble.innerHTML = text;
  } else {
    bubble.textContent = text;
  }

  msg.appendChild(bubble);
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

/**
 * Ejecuta una habilidad / skill rápida de Operit
 */
export async function executeCopilotSkill(action) {
  const currentPatient = state.selectedPatient;

  switch (action) {
    case 'workflow_checkout':
      if (!currentPatient) {
        appendCopilotMessage('bot', '⚠️ Selecciona primero un paciente para ejecutar el Workflow de Cierre de Consulta.');
        showToast('Selecciona un paciente en el padrón', 'warning');
        return;
      }
      triggerWorkflowCheckout(currentPatient);
      break;

    case 'summarize_patient':
      if (!currentPatient) {
        appendCopilotMessage('bot', '⚠️ Selecciona un paciente para ver su Resumen Clínico 360°.');
        showToast('Selecciona un paciente en el padrón', 'warning');
        return;
      }
      generatePatientSummary(currentPatient);
      break;

    case 'certificate':
      if (!currentPatient) {
        appendCopilotMessage('bot', '⚠️ Selecciona un paciente para generar su Certificado de Asistencia.');
        showToast('Selecciona un paciente', 'warning');
        return;
      }
      if (window.openCertificateModal) {
        window.openCertificateModal(currentPatient);
        appendCopilotMessage('bot', `📜 Abriendo el Generador de Certificados para <strong>${currentPatient.name}</strong>.`, true);
      }
      break;

    case 'new_appointment':
      if (window.quickNewAptForPatient && currentPatient) {
        window.quickNewAptForPatient(currentPatient.id, currentPatient.name, currentPatient.phone || '');
      } else if (window.openModal) {
        window.openModal({ date: formatDate(new Date()) });
      }
      appendCopilotMessage('bot', '📅 Abriendo formulario de turno...', false);
      break;

    default:
      break;
  }
}

/**
 * Motor de Interpretación Clínica y Ejecución de Comandos (NLP)
 */
export async function processCopilotCommand(inputQuery) {
  const query = inputQuery.toLowerCase().trim();
  const currentPatient = state.selectedPatient;

  // 1. COMANDO: RESUMEN CLÍNICO
  if (query.includes('resumen') || query.includes('resumir') || query.includes('sintesis') || query.includes('historial')) {
    if (currentPatient) {
      generatePatientSummary(currentPatient);
    } else {
      appendCopilotMessage('bot', 'Selecciona primero un paciente para resumir su historial.');
    }
    return;
  }

  // 2. COMANDO: CIERRE DE CONSULTA / WORKFLOW
  if (query.includes('cierre') || query.includes('cerrar consulta') || query.includes('finalizar consulta') || query.includes('checkout')) {
    if (currentPatient) {
      triggerWorkflowCheckout(currentPatient);
    } else {
      appendCopilotMessage('bot', 'Selecciona un paciente activo para realizar el cierre de consulta.');
    }
    return;
  }

  // 3. COMANDO: CERTIFICADO
  if (query.includes('certificado') || query.includes('constancia') || query.includes('justificativo')) {
    if (currentPatient && window.openCertificateModal) {
      window.openCertificateModal(currentPatient);
      appendCopilotMessage('bot', `📜 He abierto el Certificado de Atención para <strong>${currentPatient.name}</strong>.`, true);
    } else {
      appendCopilotMessage('bot', 'Selecciona un paciente para emitir el certificado.');
    }
    return;
  }

  // 4. COMANDO: CONSULTA DE INVENTARIO / STOCK
  if (query.includes('stock') || query.includes('inventario') || query.includes('insumo') || query.includes('farmacia')) {
    handleInventoryQuery(query);
    return;
  }

  // 5. PARSER CLÍNICO DE DIENTES Y ODONTOGRAMA (Dictado en tiempo real)
  const odontogramParsed = parseOdontogramDictation(inputQuery);
  if (odontogramParsed.detected) {
    applyParsedOdontogramActions(odontogramParsed, currentPatient);
    return;
  }

  // 6. COMANDO: NAVEGACIÓN Y BÚSQUEDA GENERAL
  if (query.includes('agenda') || query.includes('turnos')) {
    setNav('agenda');
    appendCopilotMessage('bot', '📅 Mostrando la Agenda de Turnos.');
    return;
  }
  if (query.includes('tesoreria') || query.includes('caja') || query.includes('banco')) {
    setNav('treasury');
    appendCopilotMessage('bot', '💵 Abriendo el módulo de Tesorería y Cajas.');
    return;
  }
  if (query.includes('paciente')) {
    setNav('patients');
    appendCopilotMessage('bot', '👥 Abriendo el Padrón de Pacientes.');
    return;
  }

  // 7. RESPUESTA CLÍNICA GENERAL
  appendCopilotMessage('bot', `💡 Entendido: <em>"${inputQuery}"</em>.<br>Si estás en la consulta, puedes decirme por ejemplo:<br>• <em>"Pieza 16 con caries oclusal y endodoncia"</em><br>• <em>"Resumir paciente"</em><br>• <em>"Cierre de consulta"</em><br>• <em>"Consultar stock de anestesia"</em>`, true);
}

/**
 * Parser de Odontograma y Dictado Clínico Inteligente
 */
function parseOdontogramDictation(text) {
  const norm = text.toLowerCase();
  
  // Detectar números de pieza (11-48, 51-85)
  const pieceMatches = norm.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
  const pieces = pieceMatches ? Array.from(new Set(pieceMatches.map(Number))) : [];

  // Detectar caras
  const surfaces = [];
  if (norm.includes('oclusal') || norm.includes('centro')) surfaces.push('o');
  if (norm.includes('vestibular')) surfaces.push('v');
  if (norm.includes('palatino') || norm.includes('palatina')) surfaces.push('p');
  if (norm.includes('lingual')) surfaces.push('l');
  if (norm.includes('mesial')) surfaces.push('m');
  if (norm.includes('distal')) surfaces.push('d');
  if (surfaces.length === 0) surfaces.push('o'); // Por defecto cara oclusal

  // Detectar procedimientos / herramientas
  let tool = null;
  let color = '#E24B4A';

  if (norm.includes('caries') || norm.includes('cavi')) {
    tool = 'caries';
    color = '#E24B4A';
  } else if (norm.includes('obturaci') || norm.includes('resina') || norm.includes('amalgama') || norm.includes('calza')) {
    tool = 'obturacion';
    color = '#378ADD';
  } else if (norm.includes('sellante') || norm.includes('sellador')) {
    tool = 'sellante';
    color = '#378ADD';
  } else if (norm.includes('endodoncia') || norm.includes('conducto') || norm.includes('pulpectom')) {
    tool = 'endodoncia';
    color = norm.includes('azul') || norm.includes('realizada') ? '#378ADD' : '#E24B4A';
  } else if (norm.includes('extra') || norm.includes('perdida') || norm.includes('ausente')) {
    tool = 'extraccion';
    color = '#E24B4A';
  } else if (norm.includes('corona') || norm.includes('funda')) {
    tool = 'corona';
    color = '#378ADD';
  } else if (norm.includes('sano') || norm.includes('borrar') || norm.includes('limpiar')) {
    tool = 'sano';
  }

  return {
    detected: pieces.length > 0 && tool !== null,
    pieces,
    surfaces,
    tool,
    color,
    rawText: text
  };
}

/**
 * Aplica los hallazgos del dictado en el Odontograma y en la Historia Clínica
 */
function applyParsedOdontogramActions(parsed, patient) {
  if (!patient) {
    appendCopilotMessage('bot', `🦷 Detecté: <strong>${parsed.tool.toUpperCase()}</strong> en pieza(s) <strong>${parsed.pieces.join(', ')}</strong>.<br>Selecciona un paciente para aplicarlo en su odontograma oficial.`, true);
    return;
  }

  if (!patient.odontogramData) {
    patient.odontogramData = { surfaces: {}, teeth: {}, recesion: {}, movilidad: {}, notes: '' };
  }
  const data = patient.odontogramData;
  if (!data.surfaces) data.surfaces = {};
  if (!data.teeth) data.teeth = {};

  const toolLabels = {
    caries: '● Caries',
    obturacion: '● Obturación',
    sellante: '✱ Sellante',
    endodoncia: '△ Endodoncia',
    extraccion: '✕ Extracción',
    corona: 'Corona',
    sano: 'Sano / Limpio'
  };

  parsed.pieces.forEach(pNum => {
    if (parsed.tool === 'endodoncia' || parsed.tool === 'extraccion' || parsed.tool === 'corona') {
      data.teeth[pNum] = { tool: parsed.tool, color: parsed.color };
    } else if (parsed.tool === 'sano') {
      delete data.teeth[pNum];
      delete data.surfaces[pNum];
    } else {
      if (!data.surfaces[pNum]) data.surfaces[pNum] = {};
      parsed.surfaces.forEach(sKey => {
        data.surfaces[pNum][sKey] = { tool: parsed.tool, color: parsed.color };
      });
    }
  });

  // Re-renderizar odontograma si está visible
  const odontoContainer = document.getElementById('odontoContainer');
  if (odontoContainer && window.renderOdontogram) {
    window.renderOdontogram('odontoContainer', patient);
  }

  // Guardar en la base de datos
  apiFetch(api.patients, {
    method: 'PATCH',
    body: JSON.stringify({
      id: patient.id,
      odontogramData: data
    })
  }).catch(e => console.warn(e));

  const msgHtml = `
    ✅ <strong>Odontograma Actualizado</strong>:<br>
    • Pieza(s): <strong>${parsed.pieces.join(', ')}</strong><br>
    • Hallazgo: <span style="color:${parsed.color}; font-weight:700;">${toolLabels[parsed.tool] || parsed.tool}</span><br>
    • Cara(s): <code>${parsed.surfaces.join(', ').toUpperCase()}</code>
  `;

  appendCopilotMessage('bot', msgHtml, true);
  speakText(`Registrado ${parsed.tool} en pieza ${parsed.pieces.join(' y ')}`);
  showToast('Odontograma actualizado automáticamente por IA', 'success');
}

/**
 * Genera el Resumen Clínico 360° del paciente
 */
function generatePatientSummary(patient) {
  const notes = patient.clinicalNotes || [];
  const hc = patient.clinicalHistory || {};
  const ant = hc.antecedentes || {};
  const antDet = ant.detalles || {};
  
  const alertList = [];
  if (patient.allergies) alertList.push(`⚠️ Alergias: ${patient.allergies}`);
  if (ant.hipertension) alertList.push(`⚠️ Hipertensión Arterial`);
  if (ant.diabetes) alertList.push(`⚠️ Diabetes`);
  if (ant.hemorragias) alertList.push(`⚠️ Riesgo de Hemorragia / Anticoagulado`);
  if (hc.bifosfonatos) alertList.push(`⚠️ Tratamiento con Bifosfonatos (Precaución Ósea)`);

  const summaryHtml = `
    <div style="background:var(--bg-page); border-radius:8px; padding:10px; border-left:3px solid var(--primary); font-size:0.83rem;">
      <strong style="color:var(--primary); font-size:0.9rem;"><i class="fas fa-id-card-clip"></i> Resumen Clínico: ${patient.name}</strong><br>
      <small class="muted">Edad: ${patient.birthdate ? (new Date().getFullYear() - new Date(patient.birthdate).getFullYear()) + ' años' : '-'} · Cédula: ${patient.dni || '-'} · Cobertura: ${patient.health_insurance || 'Particular'}</small>
      
      ${alertList.length > 0 ? `
        <div style="margin:6px 0; padding:6px; background:#fee2e2; border-radius:6px; color:#991b1b; font-weight:600; font-size:0.78rem;">
          ${alertList.join('<br>')}
        </div>
      ` : '<div style="margin:4px 0; color:#16a34a; font-size:0.78rem;"><i class="fas fa-check-circle"></i> Sin alertas patológicas críticas registradas.</div>'}

      <div style="margin-top:6px;">
        <strong>Historial de Visitas:</strong> ${notes.length} evolución(es).<br>
        ${notes.length > 0 ? `<small style="color:var(--muted);">Última atención (${notes[0].date}): <em>${notes[0].procedimiento || notes[0].motivoTipo || 'Consulta general'}</em></small>` : '<small class="muted">Sin evoluciones previas registradas.</small>'}
      </div>
    </div>
  `;

  appendCopilotMessage('bot', summaryHtml, true);
  speakText(`Resumen clínico de ${patient.name} generado`);
}

/**
 * Ejecuta el Workflow de Cierre de Consulta (1-Click Automation)
 */
function triggerWorkflowCheckout(patient) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-body" style="max-width:480px;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fas fa-bolt" style="color:#eab308; font-size:1.3rem;"></i>
          <h3 style="margin:0;">Workflow: Cierre de Consulta</h3>
        </div>
        <button class="ghost close-wf-modal"><i class="fas fa-times"></i></button>
      </div>

      <p class="muted" style="margin:10px 0 16px; font-size:0.85rem;">
        Automatización inteligente para <strong>${patient.name}</strong>. Marca las acciones a ejecutar en un solo paso:
      </p>

      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:18px;">
        <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; cursor:pointer;">
          <input type="checkbox" id="wfSaveNote" checked>
          <span><i class="fas fa-notes-medical" style="color:var(--primary);"></i> Guardar Sesión en Historia Clínica</span>
        </label>
        <div style="padding-left:26px;">
          <input type="text" id="wfNoteProc" placeholder="Procedimiento realizado..." value="Atención odontológica integral y control" class="field-input" style="width:100%; font-size:0.85rem; padding:6px;">
        </div>

        <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; cursor:pointer;">
          <input type="checkbox" id="wfCreateReceipt" checked>
          <span><i class="fas fa-receipt" style="color:#10b981;"></i> Registrar Cobro / Recibo en Tesorería</span>
        </label>
        <div style="padding-left:26px; display:flex; gap:8px;">
          <input type="number" id="wfReceiptAmount" placeholder="Monto $" value="15000" class="field-input" style="flex:1; font-size:0.85rem; padding:6px;">
          <select id="wfReceiptMethod" class="field-input" style="flex:1; font-size:0.82rem; padding:6px;">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta Débito/Crédito</option>
            <option value="galicia_nave">QR Nave / Galicia</option>
          </select>
        </div>

        <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; cursor:pointer;">
          <input type="checkbox" id="wfGenCert" checked>
          <span><i class="fas fa-certificate" style="color:#f59e0b;"></i> Emitir Certificado de Asistencia Oficial</span>
        </label>

        <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; cursor:pointer;">
          <input type="checkbox" id="wfSendWa" checked>
          <span><i class="fab fa-whatsapp" style="color:#22c55e;"></i> Preparar WhatsApp de Agradecimiento & Cuidados</span>
        </label>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="ghost close-wf-modal">Cancelar</button>
        <button class="primary" id="btnExecuteWorkflow" style="font-weight:700; background:linear-gradient(135deg, var(--primary), #8b5cf6);">
          <i class="fas fa-bolt"></i> Ejecutar Automatización
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelectorAll('.close-wf-modal').forEach(b => b.addEventListener('click', closeModal));

  modal.querySelector('#btnExecuteWorkflow')?.addEventListener('click', async () => {
    const btn = modal.querySelector('#btnExecuteWorkflow');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ejecutando...';

    const saveNote = modal.querySelector('#wfSaveNote')?.checked;
    const noteProc = modal.querySelector('#wfNoteProc')?.value.trim();
    const createReceipt = modal.querySelector('#wfCreateReceipt')?.checked;
    const amount = parseFloat(modal.querySelector('#wfReceiptAmount')?.value) || 0;
    const method = modal.querySelector('#wfReceiptMethod')?.value || 'efectivo';
    const genCert = modal.querySelector('#wfGenCert')?.checked;
    const sendWa = modal.querySelector('#wfSendWa')?.checked;

    try {
      // 1. Guardar Nota Clínica
      if (saveNote && noteProc) {
        const newNote = {
          date: formatDate(new Date()),
          procedimiento: noteProc,
          diagnosticoTipo: 'Atención Clínica',
          observaciones: 'Sesión completada y cerrada con Operit AI Copilot.',
          professional_name: patient.assignedProfessionalName || 'Dr. Médico'
        };
        await apiFetch(api.patients, {
          method: 'POST',
          body: JSON.stringify({
            action: 'save_clinical_note',
            patientId: patient.id,
            note: newNote
          })
        });
        if (!patient.clinicalNotes) patient.clinicalNotes = [];
        patient.clinicalNotes.unshift(newNote);
      }

      // 2. Registrar en Tesorería
      if (createReceipt && amount > 0) {
        await apiFetch(api.treasury, {
          method: 'POST',
          body: JSON.stringify({
            action: 'add_movement',
            type: 'income',
            category: 'Consultas & Tratamientos',
            amount: amount,
            payment_method: method,
            description: `Cobro consulta: ${noteProc || 'Tratamiento'} - ${patient.name}`,
            patient_id: patient.id,
            patient_name: patient.name,
            receipt_number: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
          })
        });
      }

      closeModal();
      showToast('Workflow completado con éxito', 'success');

      appendCopilotMessage('bot', `
        ⚡ <strong>Workflow de Cierre Ejecutado</strong>:<br>
        • Nota clínica registrada para <strong>${patient.name}</strong>.<br>
        • Cobro de <strong>$${amount.toLocaleString('es-AR')}</strong> asentado en Tesorería.<br>
        • Todo sincronizado en el expediente.
      `, true);

      // 3. Abrir Certificado si se seleccionó
      if (genCert && window.openCertificateModal) {
        window.openCertificateModal(patient, { treatment: noteProc });
      }

      // 4. Abrir WhatsApp si se seleccionó
      if (sendWa && patient.phone) {
        const cleanPhone = patient.phone.replace(/\D/g, '');
        const text = `Hola ${patient.name}, muchas gracias por tu visita hoy en Consultorios.pro. Tu sesión de "${noteProc}" ha sido registrada exitosamente. Quedamos a tu disposición para cualquier consulta. ¡Que tengas una excelente recuperación!`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
      }

    } catch (err) {
      showToast('Error al ejecutar workflow: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-bolt"></i> Ejecutar Automatización';
    }
  });
}

/**
 * Consulta de stock de insumos en tiempo real
 */
function handleInventoryQuery(query) {
  const inv = state.inventory || [];
  if (inv.length === 0) {
    appendCopilotMessage('bot', '📦 El inventario se encuentra actualmente sin registros.');
    return;
  }

  // Filtrar insumo por nombre si se especificó
  const term = query.replace(/stock|de|en|inventario|insumo|farmacia|consultar|ver/gi, '').trim();
  let matches = inv;
  if (term) {
    matches = inv.filter(i => (i.name || '').toLowerCase().includes(term));
  }

  if (matches.length === 0) {
    appendCopilotMessage('bot', `📦 No encontré insumos que coincidan con <em>"${term}"</em>.`, true);
    return;
  }

  const listHtml = matches.slice(0, 5).map(item => `
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <span><strong>${item.name}</strong></span>
      <span style="color:${item.stock <= (item.minStock || 5) ? 'var(--danger)' : 'var(--success)'}; font-weight:700;">
        ${item.stock} ${item.unit || 'uds'}
      </span>
    </div>
  `).join('');

  appendCopilotMessage('bot', `
    📦 <strong>Estado de Inventario:</strong><br>
    ${listHtml}
  `, true);
}

window.processCopilotCommand = processCopilotCommand;
window.appendCopilotMessage = appendCopilotMessage;
