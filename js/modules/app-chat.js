/**
 * app-chat.js - Centro de Comunicaciones WhatsApp para Pacientes Reales (Doctor2_Pro)
 * Conectado en vivo con la base de datos de pacientes (Supabase / Local)
 */
import { state, api } from './app-state.js';
import { el, showToast, apiFetch, formatReadableDate } from './app-utils.js';
import { sendWhatsAppReport } from './whatsapp-manager.js';

let activePatientId = null;
const sessionMessageHistory = {}; // Historial en memoria de mensajes enviados en la sesión

export async function initChat() {
  const container = el('chatContainer');
  if (!container) return;

  // Asegurar que los pacientes estén cargados
  if (!state.patients || state.patients.length === 0) {
    try {
      const data = await apiFetch(api.patients);
      state.patients = data.patients || [];
    } catch (e) {
      console.warn('Error al cargar pacientes para el chat:', e);
    }
  }

  const patients = state.patients || [];

  if (patients.length > 0 && !activePatientId) {
    activePatientId = patients[0].id;
  }

  renderChatView(container);
}

function getPatientNextAppointment(patientId, patientName) {
  if (!state.appointments || state.appointments.length === 0) return null;
  const nowStr = new Date().toISOString().slice(0, 10);
  const apts = state.appointments.filter(a => {
    const matchId = a.patient_id === patientId || a.patientId === patientId;
    const matchName = a.patient_name === patientName || a.patientName === patientName;
    return (matchId || matchName) && (a.date >= nowStr) && a.status !== 'cancelled';
  });
  apts.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  return apts[0] || null;
}

function renderChatView(container) {
  const patients = state.patients || [];
  const activePatient = patients.find(p => p.id === activePatientId) || patients[0] || null;
  const nextApt = activePatient ? getPatientNextAppointment(activePatient.id, activePatient.name) : null;

  container.innerHTML = `
    <div class="chat-layout">
      <!-- Barra Lateral: Lista de Pacientes Reales -->
      <div class="chat-sidebar">
        <div class="chat-sidebar-header" style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fab fa-whatsapp" style="color:#25d366; font-size:1.4rem;"></i>
            <h4 style="margin:0; font-size:1.05rem;">Pacientes WhatsApp</h4>
          </div>
          <span class="badge" style="background:rgba(37,211,102,0.15); color:#16a34a; font-weight:700; font-size:0.75rem;">
            ${patients.length} Pacientes
          </span>
        </div>

        <div class="chat-search-box" style="padding:10px 14px; border-bottom:1px solid var(--border);">
          <div style="position:relative;">
            <i class="fas fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:0.85rem;"></i>
            <input type="search" placeholder="Buscar por nombre o teléfono..." id="waChatSearch" style="width:100%; padding-left:34px; font-size:0.85rem;">
          </div>
        </div>

        <div class="chat-list" id="waChatList" style="overflow-y:auto; flex:1;">
          ${renderPatientChatItems(patients, activePatient?.id)}
        </div>
      </div>

      <!-- Ventana Principal del Chat -->
      <div class="chat-main">
        ${activePatient ? `
          <div class="chat-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; border-bottom:1px solid var(--border); background:var(--surface);">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="chat-item-avatar" style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, var(--primary), #8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem;">
                ${(activePatient.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <strong style="font-size:1.05rem; color:var(--text);">${activePatient.name}</strong>
                  <span class="badge primary" style="font-size:0.72rem; padding:2px 6px;">${activePatient.hcNumber || 'ND-0001'}</span>
                </div>
                <div style="font-size:0.82rem; color:var(--muted); display:flex; align-items:center; gap:10px; margin-top:2px;">
                  <span><i class="fab fa-whatsapp" style="color:#25d366;"></i> ${activePatient.phone || 'Sin teléfono'}</span>
                  ${nextApt ? `
                    <span style="color:#16a34a; font-weight:600;"><i class="fas fa-calendar-check"></i> Próxima cita: ${nextApt.date} ${nextApt.start_time || ''}</span>
                  ` : '<span class="muted"><i class="fas fa-calendar-times"></i> Sin citas próximas</span>'}
                </div>
              </div>
            </div>

            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" class="ghost" id="waBtnOpenHC" style="font-size:0.8rem; padding:6px 12px;" title="Ver Historia Clínica">
                <i class="fas fa-notes-medical" style="color:var(--primary);"></i> Ficha Clínica
              </button>
              <button type="button" class="primary" id="waBtnDirectChat" style="background:#25d366; border-color:#25d366; font-size:0.8rem; padding:6px 14px;">
                <i class="fab fa-whatsapp"></i> Abrir WhatsApp
              </button>
            </div>
          </div>

          <div class="chat-messages" id="waMessagesArea" style="flex:1; padding:20px; overflow-y:auto; background:var(--bg-page); display:flex; flex-direction:column; gap:12px;">
            ${renderMessagesForPatient(activePatient)}
          </div>

          <!-- Barra de Respuestas Rápidas Clínicas -->
          <div class="quick-replies-bar" style="padding:10px 16px; background:var(--surface); border-top:1px solid var(--border); display:flex; gap:8px; overflow-x:auto; scrollbar-width:thin;">
            <span class="quick-reply-chip" onclick="window.insertQuickReply('confirmacion')"><i class="fas fa-calendar-check" style="color:#10b981;"></i> Confirmar Cita</span>
            <span class="quick-reply-chip" onclick="window.insertQuickReply('recordatorio')"><i class="fas fa-clock" style="color:#3b82f6;"></i> Recordatorio 24hs</span>
            <span class="quick-reply-chip" onclick="window.insertQuickReply('postoperatorio')"><i class="fas fa-tooth" style="color:#8b5cf6;"></i> Indicaciones Post-Op</span>
            <span class="quick-reply-chip" onclick="window.insertQuickReply('ubicacion')"><i class="fas fa-map-marker-alt" style="color:#ef4444;"></i> Ubicación Nani Dent</span>
            <span class="quick-reply-chip" onclick="window.insertQuickReply('pago')"><i class="fas fa-credit-card" style="color:#f59e0b;"></i> Datos de Pago</span>
          </div>

          <!-- Input de Envío -->
          <div class="chat-input-row" style="padding:14px 16px; background:var(--surface); border-top:1px solid var(--border); display:flex; gap:10px; align-items:center;">
            <textarea id="waMessageInput" placeholder="Escribe el mensaje para ${activePatient.name}..." style="flex:1; resize:none; height:44px; padding:10px 14px; font-size:0.9rem; border-radius:10px; border:1px solid var(--border); background:var(--bg-page); color:var(--text);"></textarea>
            <button class="primary" id="waSendBtn" style="background:#25d366; border-color:#25d366; width:48px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.1rem;" title="Enviar por WhatsApp">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        ` : `
          <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--muted); flex-direction:column; gap:12px;">
            <i class="fab fa-whatsapp" style="font-size:3.5rem; color:#25d366; opacity:0.5;"></i>
            <p style="font-size:1rem; margin:0;">Selecciona un paciente del menú izquierdo para enviar mensajes.</p>
          </div>
        `}
      </div>
    </div>
  `;

  // Event Listeners
  setupChatEventListeners(container, activePatient, nextApt);
}

function renderPatientChatItems(patients, currentActiveId, query = '') {
  const cleanQ = query.toLowerCase().trim();
  const filtered = patients.filter(p => {
    if (!cleanQ) return true;
    return (p.name || '').toLowerCase().includes(cleanQ) || (p.phone || '').includes(cleanQ);
  });

  if (filtered.length === 0) {
    return `<div style="padding:24px; text-align:center; color:var(--muted); font-size:0.85rem;">No se encontraron pacientes para "${cleanQ}".</div>`;
  }

  return filtered.map(p => {
    const nextApt = getPatientNextAppointment(p.id, p.name);
    const hasAptBadge = nextApt ? `<span title="Tiene turno próximo" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e;"></span>` : '';
    const phoneClean = p.phone || 'Sin teléfono';
    const isActive = p.id === currentActiveId;

    return `
      <div class="chat-item ${isActive ? 'active' : ''}" onclick="window.selectWaChat('${p.id}')" style="padding:12px 14px; border-bottom:1px solid var(--border); cursor:pointer; display:flex; align-items:center; gap:12px; transition:background 0.2s;">
        <div class="chat-item-avatar" style="width:38px; height:38px; border-radius:50%; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem; flex-shrink:0;">
          ${(p.name || 'P').charAt(0).toUpperCase()}
        </div>
        <div class="chat-item-info" style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="chat-item-name" style="font-weight:700; font-size:0.9rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${p.name}
            </div>
            ${hasAptBadge}
          </div>
          <div class="chat-item-preview" style="font-size:0.78rem; color:var(--muted); margin-top:2px;">
            <i class="fab fa-whatsapp" style="color:#25d366;"></i> ${phoneClean}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderMessagesForPatient(patient) {
  const history = sessionMessageHistory[patient.id] || [];

  if (history.length === 0) {
    return `
      <div style="text-align:center; margin:auto; max-width:420px; padding:24px; background:var(--surface); border:1px dashed var(--border); border-radius:14px;">
        <i class="fab fa-whatsapp" style="font-size:2.4rem; color:#25d366; margin-bottom:8px; display:block;"></i>
        <strong style="color:var(--text); font-size:0.95rem;">Comenzar comunicación con ${patient.name}</strong>
        <p class="muted" style="font-size:0.83rem; margin:6px 0 0;">
          Haz clic en las respuestas rápidas inferiores o redacta un mensaje para enviar directamente al WhatsApp del paciente.
        </p>
      </div>
    `;
  }

  return history.map(m => `
    <div class="message-bubble outgoing" style="align-self:flex-end; max-width:75%; padding:10px 14px; background:rgba(37,211,102,0.18); border:1px solid rgba(37,211,102,0.3); border-radius:12px 12px 2px 12px; font-size:0.9rem; line-height:1.45; color:var(--text);">
      ${m.text}
      <div class="message-time" style="font-size:0.72rem; color:var(--muted); text-align:right; margin-top:4px;">
        <i class="fas fa-check-double" style="color:#16a34a;"></i> ${m.time}
      </div>
    </div>
  `).join('');
}

function setupChatEventListeners(container, activePatient, nextApt) {
  const searchInput = container.querySelector('#waChatSearch');
  const chatList = container.querySelector('#waChatList');
  const msgInput = container.querySelector('#waMessageInput');
  const sendBtn = container.querySelector('#waSendBtn');
  const directBtn = container.querySelector('#waBtnDirectChat');
  const openHcBtn = container.querySelector('#waBtnOpenHC');

  // Búsqueda en vivo de pacientes
  searchInput?.addEventListener('input', () => {
    if (chatList) {
      chatList.innerHTML = renderPatientChatItems(state.patients || [], activePatientId, searchInput.value);
    }
  });

  // Abrir Ficha Clínica del paciente
  openHcBtn?.addEventListener('click', () => {
    if (activePatient && window.selectPatient) {
      window.selectPatient(activePatient.id, 'historia');
    }
  });

  // Abrir chat directo en WhatsApp
  directBtn?.addEventListener('click', () => {
    if (activePatient) {
      sendWhatsAppReport(activePatient.phone, activePatient.name);
    }
  });

  // Enviar mensaje redactado
  const executeSend = () => {
    const text = msgInput?.value.trim();
    if (!text) {
      showToast('Por favor escribe un mensaje para enviar', 'warning');
      return;
    }

    if (!activePatient.phone) {
      showToast(`El paciente ${activePatient.name} no tiene un número telefónico registrado`, 'warning');
      return;
    }

    // Registrar en el historial de sesión
    if (!sessionMessageHistory[activePatient.id]) {
      sessionMessageHistory[activePatient.id] = [];
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    sessionMessageHistory[activePatient.id].push({ text, time: timeStr });

    // Enviar vía WhatsApp Web / App
    sendWhatsAppReport(activePatient.phone, activePatient.name, text);
    msgInput.value = '';

    // Actualizar vista de mensajes
    const area = container.querySelector('#waMessagesArea');
    if (area) {
      area.innerHTML = renderMessagesForPatient(activePatient);
      area.scrollTop = area.scrollHeight;
    }
  };

  sendBtn?.addEventListener('click', executeSend);
  msgInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeSend();
    }
  });
}

window.selectWaChat = (id) => {
  activePatientId = id;
  const container = el('chatContainer');
  if (container) {
    renderChatView(container);
  }
};

window.insertQuickReply = (type) => {
  const input = el('waMessageInput');
  if (!input) return;

  const activePatient = (state.patients || []).find(p => p.id === activePatientId);
  if (!activePatient) return;

  const nextApt = getPatientNextAppointment(activePatient.id, activePatient.name);
  const aptDate = nextApt ? formatReadableDate(nextApt.date) : 'próximamente';
  const aptTime = nextApt ? (nextApt.start_time || '10:00') : '10:00';
  const profName = nextApt?.professional_name || 'su especialista';

  const templates = {
    confirmacion: `Estimad@ ${activePatient.name}, le confirmamos su cita odontológica para el ${aptDate} a las ${aptTime} hs con ${profName} en Nani Dent. Por favor llegue 10 minutos antes. ¡Le esperamos!`,
    recordatorio: `Estimad@ ${activePatient.name}, le recordamos su cita odontológica programada para mañana a las ${aptTime} hs con ${profName} en Nani Dent. Por favor responda a este mensaje con un 1 para confirmar o un 2 para reprogramar.`,
    postoperatorio: `Estimad@ ${activePatient.name}, le recordamos las indicaciones post-tratamiento: evitar enjuagues bruscos, no consumir alimentos duros ni calientes por 24 horas y tomar la medicación indicada. Ante cualquier consulta, estamos a su disposición.`,
    ubicacion: `📍 Consultorio Nani Dent · Amor en cada sonrisa.\nDirección: Av. Principal y Consultorios Médicos.\nSi necesita asistencia para llegar, con gusto le guiamos.`,
    pago: `Estimad@ ${activePatient.name}, adjuntamos los datos para realizar su pago o abono:\n• Banco Pichincha / Produbanco\n• A nombre de: Nani Dent\nPor favor envíenos el comprobante una vez realizada la transferencia. ¡Muchas gracias!`
  };

  input.value = templates[type] || '';
  input.focus();
};
