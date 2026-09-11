/**
 * chat-inbox-data.js - Gestión de datos de pacientes, teléfonos compartidos y estado de chats
 */

const openedChatsThisSession = new Set();

export function initializeDataState() {
  return {
    currentPatients: [],
    currentProfessionals: [],
    currentAppointments: [],
    conversations: [],
    conversationsLoadedCount: 0,
    conversationsTotalCount: 0,
    conversationsHasMore: false,
    conversationsLoadingMore: false,
    wppIdMap: {},
    selectedChat: null,
    aiEnabled: false,
    aiStatusForChat: {}
  };
}

export function normalizeId(id) {
  return (id || '').toString().replace(/\D/g, '');
}

export function extractDigitsFromWppId(wppId) {
  if (!wppId) return '';
  return wppId.replace(/@.*$/, '');
}

export async function refreshDataFromState(dataState) {
  try {
    const { state } = await import('./app-state.js');
    if (state.patients?.length >= dataState.currentPatients.length) dataState.currentPatients = state.patients;
    if (state.professionals) dataState.currentProfessionals = state.professionals;
    if (state.appointments?.length >= dataState.currentAppointments.length) dataState.currentAppointments = state.appointments;
  } catch (e) {
    // Silent fail
  }
}

export function markChatOpened(wppId) {
  if (wppId) {
    openedChatsThisSession.add(wppId);
  }
}

export function wasChatOpened(wppId) {
  return openedChatsThisSession.has(wppId);
}

export function findPatientByPhone(patients, phoneForSearch) {
  if (!phoneForSearch || phoneForSearch.startsWith('ID:')) return null;
  
  const searchDigits = normalizeId(phoneForSearch);
  if (!searchDigits || searchDigits.length < 8) return null;
  
  return (patients || []).find(p => {
    if (!p.phone) return false;
    const patientDigits = normalizeId(p.phone);
    if (!patientDigits) return false;
    
    const minLength = Math.min(patientDigits.length, searchDigits.length, 10);
    const patientSuffix = patientDigits.slice(-minLength);
    const searchSuffix = searchDigits.slice(-minLength);
    
    return patientSuffix === searchSuffix;
  });
}

export function findAllPatientsByPhone(patients, phoneForSearch) {
  if (!phoneForSearch || phoneForSearch.startsWith('ID:')) return [];
  
  const searchDigits = normalizeId(phoneForSearch);
  if (!searchDigits || searchDigits.length < 8) return [];
  
  return (patients || []).filter(p => {
    if (!p.phone) return false;
    const patientDigits = normalizeId(p.phone);
    if (!patientDigits) return false;
    
    const minLength = Math.min(patientDigits.length, searchDigits.length, 10);
    const patientSuffix = patientDigits.slice(-minLength);
    const searchSuffix = searchDigits.slice(-minLength);
    
    return patientSuffix === searchSuffix;
  });
}

export function buildSharedPhoneName(patients) {
  if (!patients || patients.length === 0) return null;
  if (patients.length === 1) return patients[0].name;
  const names = patients.map(p => (p.name || '').split(' ')[0]);
  return names.join(', ');
}
