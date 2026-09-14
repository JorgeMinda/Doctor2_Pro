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
let lastFocusedElement = null;

// Rastrear el último input o textarea activo para el dictado directo
document.addEventListener('focusin', (e) => {
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    if (target.id !== 'floatingVoiceBtn' && target.id !== 'patientSearch') {
      lastFocusedElement = target;
    }
  }
});

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
    console.log('🎤 Dictado por voz recibido:', transcript);
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
    <button id="floatingVoiceBtn" class="voice-btn-pulse" type="button" title="Asistente de Voz Clínico (Presioná para hablar)">
      <i class="fas fa-microphone" id="voiceMicIcon"></i>
      <span class="voice-wave-ring"></span>
    </button>
    <div id="voiceFeedbackPopup" class="voice-feedback-popup hidden">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="voice-dot-live"></span>
        <strong id="voiceStatusText" style="font-size:0.85rem; color:var(--text);">Asistente Clínico Doctor2</strong>
      </div>
      <p id="voiceTranscriptText" style="margin:4px 0 0; font-size:0.8rem; color:var(--muted);">Decí: "Buscar paciente María...", "Agendar turno...", o dictá directamente tu nota clínica.</p>
    </div>
  `;

  document.body.appendChild(widget);

  const btn = document.getElementById('floatingVoiceBtn');
  // Evitar que el click en el botón descarte el foco del elemento previo
  btn?.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });
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
 * Normaliza cadenas para comparación fonética e insensible a tildes
 */
function normalizeText(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Formateador de dictado clínico inteligente (convierte puntuación verbal en signos reales)
 */
export function formatClinicalDictation(text) {
  let formatted = text
    .replace(/\bpunto y aparte\b|\bpunto aparte\b|\bnueva l[ií]nea\b|\bsalto de l[ií]nea\b/gi, '\n\n')
    .replace(/\bpunto y seguido\b|\bpunto seguido\b/gi, '. ')
    .replace(/\bpunto\b/gi, '. ')
    .replace(/\bcoma\b/gi, ', ')
    .replace(/\bdos puntos\b/gi, ': ')
    .replace(/\bpunto y coma\b/gi, '; ')
    .replace(/\babrir signo de pregunta\b|\babrir signo de interrogaci[oó]n\b|\babre interrogaci[oó]n\b/gi, ' ¿')
    .replace(/\bcerrar signo de pregunta\b|\bcerrar signo de interrogaci[oó]n\b|\bsigno de pregunta\b|\bcierra interrogaci[oó]n\b/gi, '? ')
    .replace(/\babrir signo de exclamaci[oó]n\b|\babre exclamaci[oó]n\b/gi, ' ¡')
    .replace(/\bcerrar signo de exclamaci[oó]n\b|\bsigno de admiraci[oó]n\b|\bcierra exclamaci[oó]n\b/gi, '! ')
    .replace(/\babrir par[eé]ntesis\b|\babre par[eé]ntesis\b/gi, ' (')
    .replace(/\bcerrar par[eé]ntesis\b|\bcierra par[eé]ntesis\b/gi, ') ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:?!])/g, '$1')
    .replace(/([.,?!])\s*([a-z])/g, (m, p1, p2) => `${p1} ${p2.toUpperCase()}`)
    .trim();

  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  return formatted;
}

/**
 * Inserta texto en el elemento de entrada preservando el cursor y disparando eventos
 */
function insertTextIntoInput(inputElem, textToInsert) {
  if (!inputElem) return false;
  inputElem.focus();

  if (typeof inputElem.selectionStart === 'number' && typeof inputElem.selectionEnd === 'number') {
    const start = inputElem.selectionStart;
    const end = inputElem.selectionEnd;
    const currentVal = inputElem.value;
    const prefix = (start > 0 && currentVal.charAt(start - 1) !== ' ' && currentVal.charAt(start - 1) !== '\n') ? ' ' : '';
    const newText = prefix + textToInsert;
    inputElem.setRangeText(newText, start, end, 'end');
  } else {
    inputElem.value += (inputElem.value ? ' ' : '') + textToInsert;
  }

  // Disparar eventos de input y change para reactividad y autoguardado
  inputElem.dispatchEvent(new Event('input', { bubbles: true }));
  inputElem.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/**
 * Orquestador de Intents y Comandos Clínicos
 */
export function handleVoiceIntent(rawText) {
  const norm = normalizeText(rawText);

  // 1. INTENT: BUSCAR PACIENTE / ABRIR FICHA / HISTORIA CLÍNICA
  const searchTriggers = ['buscar paciente', 'busca paciente', 'buscar a', 'busca a', 'abrir ficha de', 'abrir ficha', 'abrir historia de', 'abrir historia', 'historia clinica de', 'historia clinica', 'ver paciente', 'paciente'];
  const hasSearchTrigger = searchTriggers.some(t => norm.includes(t));

  if (hasSearchTrigger) {
    let query = norm
      .replace(/buscar paciente|busca paciente|abrir ficha de|abrir ficha|abrir historia de|abrir historia|historia clinica de|historia clinica|ver paciente|buscar a|busca a|paciente/gi, '')
      .replace(/^(el|la|al|a|de)\s+/i, '')
      .trim();

    setNav('patients');
    const searchInp = el('patientSearch');

    if (query) {
      if (searchInp) {
        searchInp.value = query;
        searchInp.dispatchEvent(new Event('input'));
      }

      // Buscar coincidencia directa en state.patients
      let matchedPatient = null;
      if (state.patients && state.patients.length > 0) {
        // Prioridad 1: Coincidencia de nombre exacto o que comience con el query
        matchedPatient = state.patients.find(p => normalizeText(p.name).startsWith(query) || normalizeText(p.name) === query);
        // Prioridad 2: Substring en el nombre o coincidencia en DNI
        if (!matchedPatient) {
          matchedPatient = state.patients.find(p => normalizeText(p.name).includes(query) || (p.dni && p.dni.includes(query)));
        }
      }

      if (matchedPatient) {
        if (typeof window.selectPatient === 'function') {
          window.selectPatient(matchedPatient.id, 'historia');
        }
        speakText(`Abriendo historia clínica de ${matchedPatient.name}`);
        showToast(`✓ Ficha abierta: ${matchedPatient.name}`, 'success');
        return;
      } else {
        speakText(`Buscando pacientes con ${query}`);
        showToast(`Filtrando lista por: "${query}"`, 'info');
        return;
      }
    } else {
      speakText('Abriendo padrón de pacientes');
      return;
    }
  }

  // 2. INTENT: VERIFICACIÓN FARMACOLÓGICA / ALERGIAS
  if (norm.includes('recetar') || norm.includes('medicamento') || norm.includes('alergia') || norm.includes('puedo darle') || norm.includes('contraindicad') || norm.includes('interaccion')) {
    const detected = detectDrugsInText(rawText);
    if (detected.length > 0) {
      const currentPatient = state.selectedPatient || (state.patients && state.patients[0]);
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

  // 3. INTENT: AGENDAR TURNO / NUEVO TURNO
  if (norm.includes('agendar turno') || norm.includes('nuevo turno') || norm.includes('crear cita') || norm.includes('agendar cita')) {
    setNav('agenda');
    const quickBtn = el('newAptBtn');
    quickBtn?.click();
    speakText('Abriendo formulario de nuevo turno');
    return;
  }

  // 4. INTENT: CONSULTAR SALDO DE CAJA / TESORERÍA / ARQUEO
  if (norm.includes('caja') || norm.includes('tesoreria') || norm.includes('saldo') || norm.includes('arqueo') || norm.includes('cuanto hay')) {
    setNav('treasury');
    speakText('Abriendo el módulo de Tesorería y Cajas');
    return;
  }

  // 5. INTENT: NAVEGACIÓN GENERAL
  if (norm.startsWith('ir a agenda') || norm === 'agenda' || norm === 'calendario') {
    setNav('agenda');
    speakText('Cargando la agenda');
    return;
  }
  if (norm.startsWith('ir a inventario') || norm === 'inventario' || norm === 'stock') {
    setNav('inventory');
    speakText('Abriendo inventario');
    return;
  }
  if (norm.startsWith('ir a estadisticas') || norm === 'estadisticas' || norm === 'reportes') {
    setNav('analytics');
    speakText('Mostrando estadísticas');
    return;
  }

  // 6. DICTADO DIRECTO EN CAMPO DE TEXTO / NOTA CLÍNICA
  // Si el usuario tenía foco en un textarea o input (ej: evolución clínica, diagnóstico, observaciones)
  if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
    const formattedNote = formatClinicalDictation(rawText);
    const inserted = insertTextIntoInput(lastFocusedElement, formattedNote);
    if (inserted) {
      showToast('✓ Texto dictado e insertado en la nota', 'success');
      return;
    }
  }

  // Fallback conversacional si no es un comando ni había un campo activo
  speakText(`Comando: ${rawText}`);
  showToast(`Dictado: "${rawText}"`, 'info');
}

