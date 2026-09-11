/**
 * chat-inbox.js - WhatsApp Inbox Master Component (Consultorios.pro)
 */
import { initializeDataState, refreshDataFromState } from './chat-inbox-data.js';
import { createChatInboxHTML, updateMenuBadge, showToast } from './chat-inbox-ui.js';
import { initSocketIO } from './chat-inbox-socket.js';
import { loadConversations } from './chat-inbox-conversations.js';

export function createChatInbox(patients = [], appointments = [], professionals = [], onScheduleAppointment) {
  const container = document.createElement('div');
  container.className = 'chat-inbox';
  
  const dataState = initializeDataState();
  dataState.currentPatients = patients;
  dataState.currentAppointments = appointments;
  dataState.currentProfessionals = professionals;
  
  container.innerHTML = createChatInboxHTML();
  
  setTimeout(() => {
    refreshDataFromState(dataState);
    initSocketIO(dataState, container, {});
  }, 0);
  
  return container;
}
