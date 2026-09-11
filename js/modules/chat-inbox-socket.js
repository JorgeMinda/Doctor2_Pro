/**
 * chat-inbox-socket.js - Socket.IO Client para Mensajería en Tiempo Real y Estado de IA
 */
import { escapeHtml, showToast } from './chat-inbox-ui.js';

const WA_SERVICE = '/wa-api';

export function initSocketIO(dataState, container, handlers = {}) {
  try {
    if (typeof io !== 'undefined') {
      const socketUrl = window.location.origin;
      const socket = io(socketUrl, {
        path: '/wa-api/socket.io',
        transports: ['websocket', 'polling']
      });
      
      const hostname = window.location.hostname;
      const tenantId = hostname.split('.')[0];
      
      socket.on('connect', () => {
        if (tenantId && tenantId !== 'www' && tenantId !== 'localhost') {
          socket.emit('join', tenantId);
        }
      });
      
      socket.on('appMessage', (data) => {
        if (data?.action === 'create' && data?.message) {
          const msg = data.message;
          const hasText = msg.body && msg.body.trim() !== '';
          const hasMedia = msg.mediaType && msg.mediaUrl;
          if (!hasText && !hasMedia) return;
          
          if (handlers.addMessageToChat) {
            handlers.addMessageToChat(
              data.wppId,
              msg.body || '', 
              msg.id, 
              msg.fromMe, 
              msg.time,
              data.displayPhone,
              data.pushName,
              msg.isAIResponse,
              msg.mediaType,
              msg.mediaUrl,
              msg.mediaCaption
            );
          }
        }
      });
      
      socket.on('whatsappStatus', () => {
        if (handlers.checkConnection) handlers.checkConnection();
      });
      
      socket.on('aiStatusUpdate', (data) => {
        if (data.wppId && data.status) {
          dataState.aiStatusForChat[data.wppId] = data.status;
          if (dataState.selectedChat?.wppId === data.wppId && handlers.updateAIChatStatus) {
            handlers.updateAIChatStatus();
          }
        }
      });
      
      socket.on('historyCleared', () => {
        dataState.conversations = [];
        dataState.wppIdMap = {};
        if (handlers.renderConversations) handlers.renderConversations();
      });
      
      return socket;
    }
  } catch (e) {
    console.warn('Socket.IO initialization:', e);
  }
  return null;
}

export function joinChatRoom(socket, wppId) {
  if (!socket || !wppId) return;
  socket.emit('joinChat', wppId);
}

export function leaveChatRoom(socket, wppId) {
  if (!socket || !wppId) return;
  socket.emit('leaveChat', wppId);
}

export async function checkAIStatus(dataState, handlers = {}) {
  try {
    const res = await fetch(`${WA_SERVICE}/api/ai-assistant/config`);
    const data = await res.json();
    if (data.success && data.config) {
      dataState.aiEnabled = data.config.enabled;
      if (handlers.updateAIGlobalStatus) handlers.updateAIGlobalStatus();
    }
  } catch (e) {
    console.warn('[AI] Check status:', e);
  }
}

export async function toggleAIForChat(dataState, container, handlers = {}) {
  if (!dataState.selectedChat?.wppId) return;
  const chatStatus = dataState.aiStatusForChat[dataState.selectedChat.wppId];
  const isPaused = chatStatus?.chatPaused;
  
  try {
    const endpoint = isPaused ? 'resume' : 'pause';
    const res = await fetch(`${WA_SERVICE}/api/ai-assistant/${endpoint}/${encodeURIComponent(dataState.selectedChat.wppId)}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      dataState.aiStatusForChat[dataState.selectedChat.wppId] = data.status;
      if (handlers.updateAIChatStatus) handlers.updateAIChatStatus();
      showToast(isPaused ? 'IA reanudada para este chat' : 'IA pausada para este chat');
    }
  } catch (e) {
    console.error('[AI] Toggle error:', e);
  }
}
