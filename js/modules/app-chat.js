/**
 * app-chat.js - Integración de WhatsApp y Mensajes Rápidos
 */
import { state } from './app-state.js';
import { el, showToast } from './app-utils.js';
import { sendWhatsAppReport } from './whatsapp-manager.js';


const mockChats = [
  { id: '1', name: 'María Rodríguez', phone: '+5491155551234', lastMsg: 'Hola, quería confirmar mi turno para mañana', time: '10:45' },
  { id: '2', name: 'Carlos Benítez', phone: '+5491144449876', lastMsg: 'Muchas gracias por la atención doctor', time: 'Ayer' },
  { id: '3', name: 'Lucía Fernández', phone: '+5491133332211', lastMsg: '¿Cuánto sale la consulta particular?', time: '08/09' }
];

let activeChat = mockChats[0];

export function initChat() {
  const container = el('chatContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div class="chat-sidebar-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h4><i class="fab fa-whatsapp" style="color:#25d366;"></i> WhatsApp</h4>
          <button id="btnOpenWaConnect" class="ghost" style="padding:4px 8px; font-size:0.8rem;" title="Ajustes de Conexión"><i class="fas fa-qrcode"></i> Conectar</button>
        </div>
        <div class="chat-search-box">
          <input type="search" placeholder="Buscar conversación..." id="waChatSearch">
        </div>
        <div class="chat-list" id="waChatList">
          ${mockChats.map(c => `
            <div class="chat-item ${c.id === activeChat.id ? 'active' : ''}" onclick="window.selectWaChat('${c.id}')">
              <div class="chat-item-avatar">${c.name.charAt(0)}</div>
              <div class="chat-item-info">
                <div class="chat-item-name">${c.name}</div>
                <div class="chat-item-preview">${c.lastMsg}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="chat-main">
        <div class="chat-header">
          <div class="chat-item-avatar">${activeChat.name.charAt(0)}</div>
          <div>
            <strong>${activeChat.name}</strong><br>
            <small class="muted">${activeChat.phone}</small>
          </div>
        </div>

        <div class="chat-messages" id="waMessagesArea">
          <div class="message-bubble incoming">
            Hola, quería confirmar mi turno para mañana a las 10:00 hs con el Dr. Juan Carlos.
            <div class="message-time">10:45</div>
          </div>
          <div class="message-bubble outgoing">
            ¡Hola María! Sí, tu turno está confirmado para mañana 10:00 hs. Te esperamos 10 minutos antes.
            <div class="message-time">10:48</div>
          </div>
        </div>

        <!-- Barra de Respuestas Rápidas -->
        <div class="quick-replies-bar">
          <span class="quick-reply-chip" onclick="window.insertQuickReply('confirmacion')">📅 Confirmación Turno</span>
          <span class="quick-reply-chip" onclick="window.insertQuickReply('recordatorio')">⏰ Recordatorio 24hs</span>
          <span class="quick-reply-chip" onclick="window.insertQuickReply('ubicacion')">📍 Dirección Consultorio</span>
          <span class="quick-reply-chip" onclick="window.insertQuickReply('pago')">💳 Datos de Transferencia</span>
        </div>

        <div class="chat-input-row">
          <textarea id="waMessageInput" placeholder="Escribí un mensaje de WhatsApp..."></textarea>
          <button class="primary" onclick="window.sendWaMessage()"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btnOpenWaConnect')?.addEventListener('click', () => {
    import('./whatsapp-manager.js').then(mod => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-body" style="max-width:550px; position:relative;">
          <button class="ghost" id="closeWaModal" style="position:absolute; top:16px; right:16px; font-size:1.2rem;"><i class="fas fa-times"></i></button>
          <div id="waManagerMount"></div>
        </div>
      `;
      document.body.appendChild(modal);
      const mount = modal.querySelector('#waManagerMount');
      const managerNode = mod.createWhatsAppManager((status) => {
        showToast(`WhatsApp status: ${status}`, 'info');
      });
      mount.appendChild(managerNode);
      modal.querySelector('#closeWaModal')?.addEventListener('click', () => {
        if (managerNode.destroy) managerNode.destroy();
        modal.remove();
      });
    });
  });
}

window.selectWaChat = (id) => {
  const c = mockChats.find(x => x.id === id);
  if (c) {
    activeChat = c;
    initChat();
  }
};

window.insertQuickReply = (type) => {
  const input = el('waMessageInput');
  if (!input) return;

  const replies = {
    confirmacion: `¡Hola ${activeChat.name}! Tu turno ha sido confirmado con éxito. Te esperamos en el consultorio.`,
    recordatorio: `Hola ${activeChat.name}, te recordamos tu cita médica para el día de mañana. Por favor confirmanos tu asistencia.`,
    ubicacion: `📍 Estamos en Av. Santa Fe 1234, Piso 3, Consultorio B. ¡Te esperamos!`,
    pago: `💳 Alias de transferencia: CONSULTORIO.PRO · CBU: 0070000000001234567890.`
  };

  input.value = replies[type] || '';
  input.focus();
};

window.sendWaMessage = () => {
  const input = el('waMessageInput');
  const text = input?.value.trim();
  if (!text) return;

  const area = el('waMessagesArea');
  if (area) {
    const msg = document.createElement('div');
    msg.className = 'message-bubble outgoing';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    msg.innerHTML = `${text}<div class="message-time">${timeStr}</div>`;
    area.appendChild(msg);
    area.scrollTop = area.scrollHeight;
  }

  input.value = '';
  if (activeChat && activeChat.phone) {
    sendWhatsAppReport(activeChat.phone, activeChat.name, text);
  } else {
    showToast('Mensaje registrado', 'success');
  }
};

