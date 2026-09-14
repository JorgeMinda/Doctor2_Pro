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
 * Limpieza rigurosa de texto para comandos y búsquedas por voz
 * Elimina tildes, signos de puntuación (. , ? ! etc), y espacios redundantes
 */
export function cleanVoiceQuery(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'¿¡]/g, ' ') // Quitar signos de puntuación
    .toLowerCase()
    .replace(/\s+/g, ' ')
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
 * Muestra tarjeta de decisiones del asistente para el paciente encontrado
 */
function showVoicePatientOptions(patient) {
  const popup = document.getElementById('voiceFeedbackPopup');
  if (!popup) return;

  popup.classList.remove('hidden');
  popup.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="voice-dot-live"></span>
        <strong style="font-size:0.9rem; color:var(--text);">${patient.name}</strong>
      </div>
      <button class="ghost" style="padding:2px 6px; font-size:0.75rem;" onclick="document.getElementById('voiceFeedbackPopup').classList.add('hidden')">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <p style="margin:0 0 10px; font-size:0.8rem; color:var(--muted);">¿Qué deseas consultar de este paciente?</p>
    <div style="display:flex; flex-direction:column; gap:6px;">
      <button class="primary" style="padding:6px 12px; font-size:0.82rem; text-align:left; display:flex; align-items:center; gap:8px; justify-content:flex-start;" onclick="window.voiceOpenPatientHistory('${patient.id}')">
        <i class="fas fa-file-medical"></i> <span>Ver Historia Clínica y Ficha</span>
      </button>
      <button class="ghost" style="padding:6px 12px; font-size:0.82rem; text-align:left; display:flex; align-items:center; gap:8px; justify-content:flex-start;" onclick="window.voiceSearchPatientAppointments('${patient.name.replace(/'/g, "\\'")}')">
        <i class="fas fa-calendar-check"></i> <span>Ver Citas y Turnos Agendados</span>
      </button>
      <button class="ghost" style="padding:6px 12px; font-size:0.82rem; text-align:left; display:flex; align-items:center; gap:8px; justify-content:flex-start;" onclick="window.voiceNewAppointmentForPatient('${patient.id}', '${patient.name.replace(/'/g, "\\'")}', '${patient.phone || ''}')">
        <i class="fas fa-calendar-plus"></i> <span>Dar Nuevo Turno</span>
      </button>
    </div>
  `;
}

// Acciones globales invocables desde la tarjeta de voz
window.voiceOpenPatientHistory = (patientId) => {
  setNav('patients');
  if (typeof window.selectPatient === 'function') {
    window.selectPatient(patientId, 'historia');
  }
  document.getElementById('voiceFeedbackPopup')?.classList.add('hidden');
};

window.voiceSearchPatientAppointments = (patientName) => {
  setNav('agenda');
  const searchInp = el('agendaPatientSearch');
  if (searchInp) {
    searchInp.value = patientName;
    searchInp.dispatchEvent(new Event('input'));
  }
  document.getElementById('voiceFeedbackPopup')?.classList.add('hidden');
};

window.voiceNewAppointmentForPatient = (id, name, phone) => {
  if (typeof window.quickNewAptForPatient === 'function') {
    window.quickNewAptForPatient(id, name, phone);
  }
  document.getElementById('voiceFeedbackPopup')?.classList.add('hidden');
};

/**
 * Orquestador de Intents y Comandos Clínicos
 */
export function handleVoiceIntent(rawText) {
  // Limpieza rigurosa sin tildes ni puntos finales que agrega el navegador
  const clean = cleanVoiceQuery(rawText);
  console.log('🎤 Query procesado y sanitizado:', clean);

  // 1. INTENT: BUSCAR CITAS / TURNOS EN AGENDA
  const isAptSearch = clean.includes('cita') || clean.includes('turno') || clean.includes('turnos') || clean.includes('citas') || clean.includes('agenda de');
  if (isAptSearch && !clean.includes('agendar') && !clean.includes('nuevo')) {
    let nameQuery = clean
      .replace(/buscar citas de|buscar cita de|buscar turnos de|buscar turno de|ver citas de|ver cita de|ver turnos de|ver turno de|citas de|cita de|turnos de|turno de|agenda de|citas|turnos/gi, '')
      .replace(/^(el|la|al|a|de|del|para)\s+/i, '')
      .trim();

    if (nameQuery) {
      setNav('agenda');
      const searchInp = el('agendaPatientSearch');
      if (searchInp) {
        searchInp.value = nameQuery;
        searchInp.dispatchEvent(new Event('input'));
      }
      speakText(`Mostrando las citas y turnos agendados de ${nameQuery}`);
      showToast(`Turnos de: "${nameQuery}"`, 'info');
      return;
    }
  }

  // 2. INTENT: BUSCAR PACIENTE / ABRIR FICHA / HISTORIA CLÍNICA
  const searchPatientTriggers = [
    'buscar paciente', 'busca paciente', 'buscar a', 'busca a',
    'abrir ficha de', 'abrir ficha', 'abrir historia de', 'abrir historia',
    'historia clinica de', 'historia clinica', 'ficha de', 'ficha medica de',
    'ver paciente', 'paciente'
  ];
  const hasSearchTrigger = searchPatientTriggers.some(t => clean.includes(t));

  if (hasSearchTrigger) {
    let query = clean
      .replace(/buscar paciente|busca paciente|abrir ficha de|abrir ficha|abrir historia de|abrir historia|historia clinica de|historia clinica|ficha de|ficha medica de|ver paciente|buscar a|busca a|paciente/gi, '')
      .replace(/^(el|la|al|a|de|del)\s+/i, '')
      .trim();

    setNav('patients');
    const searchInp = el('patientSearch');

    if (query) {
      if (searchInp) {
        searchInp.value = query; // ¡Limpio sin puntos finales!
        searchInp.dispatchEvent(new Event('input'));
      }

      // Buscar coincidencia directa en state.patients (comparando sin tildes ni puntuación)
      let matchedPatient = null;
      if (state.patients && state.patients.length > 0) {
        // Prioridad 1: Coincidencia exacta o que comience con el nombre buscado
        matchedPatient = state.patients.find(p => {
          const pName = cleanVoiceQuery(p.name);
          return pName === query || pName.startsWith(query);
        });
        // Prioridad 2: Substring en el nombre o coincidencia en DNI
        if (!matchedPatient) {
          matchedPatient = state.patients.find(p => {
            const pName = cleanVoiceQuery(p.name);
            const pDni = cleanVoiceQuery(p.dni || '');
            return pName.includes(query) || (pDni && pDni === query);
          });
        }
      }

      if (matchedPatient) {
        if (typeof window.selectPatient === 'function') {
          window.selectPatient(matchedPatient.id, 'historia');
        }
        
        // Mostrar tarjeta interactiva con opciones de acción rápida
        showVoicePatientOptions(matchedPatient);

        speakText(`Encontré a ${matchedPatient.name}. ¿Deseas ver su historia clínica o sus citas agendadas?`);
        showToast(`✓ Ficha cargada: ${matchedPatient.name}`, 'success');
        return;
      } else {
        // Si no está en el padrón, revisar si tiene turnos agendados en la clínica
        const hasApt = state.appointments && state.appointments.find(a => cleanVoiceQuery(a.patient_name).includes(query));
        if (hasApt) {
          setNav('agenda');
          const aptSearch = el('agendaPatientSearch');
          if (aptSearch) {
            aptSearch.value = query;
            aptSearch.dispatchEvent(new Event('input'));
          }
          speakText(`No está registrado en el padrón de pacientes, pero encontré citas agendadas para ${query}`);
          showToast(`Turnos encontrados para: "${query}"`, 'info');
          return;
        }

        speakText(`Buscando ${query} en el padrón de pacientes`);
        showToast(`Filtrando lista por: "${query}"`, 'info');
        return;
      }
    } else {
      speakText('Abriendo padrón de pacientes');
      return;
    }
  }

  // 3. INTENT: VERIFICACIÓN FARMACOLÓGICA / ALERGIAS
  if (clean.includes('recetar') || clean.includes('medicamento') || clean.includes('alergia') || clean.includes('puedo darle') || clean.includes('contraindicad') || clean.includes('interaccion')) {
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

  // 4. INTENT: AGENDAR TURNO / NUEVO TURNO
  if (clean.includes('agendar turno') || clean.includes('nuevo turno') || clean.includes('crear cita') || clean.includes('agendar cita')) {
    setNav('agenda');
    const quickBtn = el('newAptBtn');
    quickBtn?.click();
    speakText('Abriendo formulario de nuevo turno');
    return;
  }

  // 5. INTENT: CONSULTAR SALDO DE CAJA / TESORERÍA / ARQUEO
  if (clean.includes('caja') || clean.includes('tesoreria') || clean.includes('saldo') || clean.includes('arqueo') || clean.includes('cuanto hay')) {
    setNav('treasury');
    speakText('Abriendo el módulo de Tesorería y Cajas');
    return;
  }

  // 6. INTENT: NAVEGACIÓN GENERAL
  if (clean.startsWith('ir a agenda') || clean === 'agenda' || clean === 'calendario') {
    setNav('agenda');
    speakText('Cargando la agenda');
    return;
  }
  if (clean.startsWith('ir a inventario') || clean === 'inventario' || clean === 'stock') {
    setNav('inventory');
    speakText('Abriendo inventario');
    return;
  }
  if (clean.startsWith('ir a estadisticas') || clean === 'estadisticas' || clean === 'reportes') {
    setNav('analytics');
    speakText('Mostrando estadísticas');
    return;
  }

  // 7. DICTADO DIRECTO EN CAMPO DE TEXTO / NOTA CLÍNICA
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


