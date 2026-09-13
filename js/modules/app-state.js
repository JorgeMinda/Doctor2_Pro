/**
 * app-state.js - Estado Centralizado Reactivo para Doctor2
 */

export const state = {
  user: null,
  token: null,
  currentNav: 'agenda',
  calendarView: 'week', // 'month' o 'week'
  selectedDate: new Date(),
  monthDate: new Date(),
  selectedProfessional: '',
  selectedPatient: null,
  professionals: [],
  patients: [],
  appointments: [],
  notifications: [],
  blockedDays: [],
  inventory: [],
  inventoryCategories: []
};

export const api = {
  auth: 'api/auth.php',
  profile: 'api/auth.php?action=profile',
  appointments: 'api/appointments.php',
  patients: 'api/patients.php',
  professionals: 'api/professionals.php',
  inventory: 'api/inventory.php',
  notifications: 'api/notifications.php',
  suscripcion: 'api/suscripcion.php',
  galiciaNave: 'api/galicia-nave.php',
  treasury: 'api/treasury.php'
};

