/**
 * app-internal-chat.js - Mensajería Interna para el Equipo del Consultorio
 */
import { state } from './app-state.js';
import { el, showToast } from './app-utils.js';

export const internalChat = {
  messages: [
    { sender: 'Dra. Laura', text: 'Dr. Jorge, ya llegó el paciente de las 10:30 hs a la sala de espera.', time: '10:28' },
    { sender: 'Dr. Jorge', text: 'Excelente, en 2 minutos lo hago pasar al gabinete.', time: '10:29' }
  ],

  init() {
    this.renderMessages();
  },

  renderMessages() {
    const container = el('icMessagesContainer');
    if (!container) return;

    container.innerHTML = this.messages.map(m => `
      <div class="message-bubble ${m.sender.includes('Jorge') ? 'outgoing' : 'incoming'}" style="margin-bottom:8px;">
        <strong>${m.sender}</strong><br>
        ${m.text}
        <div class="message-time">${m.time}</div>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  },

  sendMessage() {
    const input = el('icMessageInput');
    const text = input?.value.trim();
    if (!text) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const sender = state.user?.name || 'Dr. Jorge';

    this.messages.push({ sender, text, time });
    this.renderMessages();
    input.value = '';
  }
};

window._ic = {
  openNewICChatModal: () => showToast('Iniciando nueva conversación...', 'info'),
  refreshIC: () => internalChat.renderMessages(),
  closeMobileIC: () => {},
  deleteCurrentChat: () => {
    internalChat.messages = [];
    internalChat.renderMessages();
    showToast('Conversación vaciada', 'info');
  },
  handleICKeydown: (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      internalChat.sendMessage();
    }
  },
  icSendMessage: () => internalChat.sendMessage(),
  filterICChats: () => {}
};
