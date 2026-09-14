/**
 * app-voice-assistant.js - Asistente de Voz Clínico Nativo (STT / TTS + Orquestador de Intents)
 * 100% Gratuito, sin APIs de pago, HIPAA/GDPR compatible.
 */
import { state } from './app-state.js';
import { el, showToast } from './app-utils.js';
import { setNav } from './app-navigation.js';
import { evaluatePrescriptionSafety, showClinicalSafetyModal, detectDrugsInText } from './drug-interactions.js';

let recognition = null;
let isListening = false;
let isSpeaking = false;

export function initVoiceAssistant() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition no está soportado en este navegador.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'es-AR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    updateVoiceUI(true, 'Escuchando...');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('🎤 Dictado por voz:', transcript);
    updateVoiceUI(false, `"${transcript}"`);
    handleVoiceIntent(transcript);
  };

  recognition.onerror = (event) => {
    console.warn('Error de reconocimiento de voz:', event.error);
    isListening = false;
    updateVoiceUI(false, 'Micrófono en reposo');
  };

  recognition.onend = () => {
    isListening = false;
    updateVoiceUI(false, 'Micrófono en reposo');
  };

  injectVoiceWidget();
}

/**
 * Inyecta el botón flotante del micrófono en la interfaz
 */
function injectVoiceWidget() {
  if (document.getElementById('floatingVoiceAssistant')) return;

  const widget = document.createElement('div');
  widget.id = 'floatingVoiceAssistant';
  widget.innerHTML = `
    <button id="floatingVoiceBtn" class="voice-btn-pulse" title="Asistente de Voz Clínico (Presioná para hablar)">
      <i class="fas fa-microphone" id="voiceMicIcon"></i>
      <span class="voice-wave-ring"></span>
    </button>
    <div id="voiceFeedbackPopup" class="voice-feedback-popup hidden">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="voice-dot-live"></span>
        <strong id="voiceStatusText" style="font-size:0.85rem; color:var(--text);">Asistente Clínico Doctor2</strong>
      </div>
      <p id="voiceTranscriptText" style="margin:4px 0 0; font-size:0.8rem; color:var(--muted);">Decí: "Agendar turno...", "Buscar paciente...", o "Verificar Amoxicilina"</p>
    </div>
  `;

  document.body.appendChild(widget);

  const btn = document.getElementById('floatingVoiceBtn');
  btn?.addEventListener('click', toggleVoiceRecognition);
}

export function toggleVoiceRecognition() {
  if (!recognition) {
    showToast('El reconocimiento de voz no está soportado en este navegador.', 'warning');
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
    }
  }
}

function updateVoiceUI(listening, message) {
  const btn = document.getElementById('floatingVoiceBtn');
  const popup = document.getElementById('voiceFeedbackPopup');
  const status = document.getElementById('voiceStatusText');
  const text = document.getElementById('voiceTranscriptText');

  if (listening) {
    btn?.classList.add('is-listening');
    popup?.classList.remove('hidden');
    if (status) status.textContent = 'Escuchando tu voz...';
    if (text) text.textContent = 'Hablá ahora con claridad';
  } else {
    btn?.classList.remove('is-listening');
    if (message && message !== 'Micrófono en reposo') {
      popup?.classList.remove('hidden');
      if (status) status.textContent = 'Procesando comando...';
      if (text) text.textContent = message;
      setTimeout(() => popup?.classList.add('hidden'), 4000);
    } else {
      setTimeout(() => popup?.classList.add('hidden'), 2000);
    }
  }
}

/**
 * Sintetizador de voz nativo (TTS)
 */
export function speakText(text) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-AR';
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const esVoice = voices.find(v => v.lang.startsWith('es'));
  if (esVoice) utterance.voice = esVoice;

  utterance.onstart = () => { isSpeaking = true; };
  utterance.onend = () => { isSpeaking = false; };

  window.speechSynthesis.speak(utterance);
}

/**
 * Orquestador de Intents y Comandos Clínicos
 */
export function handleVoiceIntent(rawText) {
  const text = rawText.toLowerCase().trim();

  // 1. INTENT: VERIFICACIÓN FARMACOLÓGICA / ALERGIAS
  if (text.includes('recetar') || text.includes('medicamento') || text.includes('alergia') || text.includes('puedo darle') || text.includes('contraindicad')) {
    const detected = detectDrugsInText(text);
    if (detected.length > 0) {
      const currentPatient = state.selectedPatient || state.patients[0];
      if (currentPatient) {
        const safety = evaluatePrescriptionSafety(detected, currentPatient);
        if (!safety.isSafe) {
          const crit = safety.alerts.find(a => a.severity === 'CRITICAL');
          const voiceResp = `Atención: ${crit.drug} está contraindicado para ${currentPatient.name}. ${crit.reason}`;
          speakText(voiceResp);
          showClinicalSafetyModal(safety);
          return;
        } else if (safety.alerts.length > 0) {
          const warn = safety.alerts[0];
          speakText(`Advertencia: ${warn.drug}. ${warn.reason}`);
          showClinicalSafetyModal(safety);
          return;
        } else {
          speakText(`El medicamento ${detected[0].name} es seguro para ${currentPatient.name}.`);
          showToast(`✓ ${detected[0].name} no presenta contraindicaciones conocidas`, 'success');
          return;
        }
      }
    }
  }

  // 2. INTENT: BUSCAR PACIENTE / ABRIR FICHA
  if (text.includes('buscar paciente') || text.includes('abrir ficha') || text.includes('paciente')) {
    const query = text.replace(/buscar paciente|abrir ficha|paciente/gi, '').trim();
    setNav('patients');
    const searchInp = el('patientSearch');
    if (searchInp && query) {
      searchInp.value = query;
      searchInp.dispatchEvent(new Event('input'));
      speakText(`Buscando paciente ${query}`);
    } else {
      speakText('Abriendo padrón de pacientes');
    }
    return;
  }

  // 3. INTENT: AGENDAR TURNO / NUEVO TURNO
  if (text.includes('agendar turno') || text.includes('nuevo turno') || text.includes('crear cita')) {
    setNav('agenda');
    const quickBtn = el('newAptBtn');
    quickBtn?.click();
    speakText('Abriendo formulario de nuevo turno');
    return;
  }

  // 4. INTENT: CONSULTAR SALDO DE CAJA / TESORERÍA
  if (text.includes('caja') || text.includes('tesoreria') || text.includes('saldo') || text.includes('cuanto hay')) {
    setNav('treasury');
    speakText('Abriendo el módulo de Tesorería y Cajas');
    return;
  }

  // 5. INTENT: NAVEGACIÓN GENERAL
  if (text.includes('agenda') || text.includes('calendario')) {
    setNav('agenda');
    speakText('Cargando la agenda');
    return;
  }
  if (text.includes('inventario') || text.includes('stock')) {
    setNav('inventory');
    speakText('Abriendo inventario');
    return;
  }
  if (text.includes('estadistica') || text.includes('reporte')) {
    setNav('analytics');
    speakText('Mostrando estadísticas');
    return;
  }

  // 6. DICTADO EN CAMPO DE TEXTO ACTIVO (Si el foco está en un textarea o input)
  const activeElem = document.activeElement;
  if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA') && activeElem.id !== 'patientSearch') {
    activeElem.value += (activeElem.value ? ' ' : '') + rawText;
    activeElem.dispatchEvent(new Event('input'));
    showToast('Texto dictado con éxito', 'info');
    return;
  }

  // Fallback conversacional
  speakText(`Comando recibido: ${rawText}`);
  showToast(`Comando: "${rawText}"`, 'info');
}
