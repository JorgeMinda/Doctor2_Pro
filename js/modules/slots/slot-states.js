/**
 * slot-states.js - Lógica pura para determinar el estado de cada slot
 * 
 * Función pura: (slots, citas, bloqueos, ahora, selección) → estado por slot
 * Sin efectos secundarios, sin DOM, 100% testeable.
 */

/**
 * Determina el estado de un slot individual
 * @param {Object} params
 * @param {string} params.time - Hora en formato "HH:MM"
 * @param {Array} params.appointments - Citas existentes
 * @param {Array} params.blockedDays - Bloqueos registrados
 * @param {string} params.profId - ID del profesional (o 'all')
 * @param {string} params.date - Fecha en formato "YYYY-MM-DD"
 * @param {string} params.now - Timestamp actual en formato ISO
 * @param {Object} params.selection - Selección actual { from, to, duration, mode }
 * @returns {Object} Estado del slot
 */
export function getSlotState({
  time,
  appointments = [],
  blockedDays = [],
  profId = 'all',
  date = '',
  now = new Date().toISOString(),
  selection = {}
}) {
  const nowDate = new Date(now);
  const todayStr = nowDate.toISOString().split('T')[0];
  const [h, m] = time.split(':').map(Number);
  const slotMinutes = h * 60 + m;
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const isPast = date < todayStr || (date === todayStr && slotMinutes < nowMinutes);

  // 1. Verificar bloqueos
  const blockInfo = findBlock(time, date, profId, blockedDays);
  const isBlockedByBlock = !!blockInfo;

  // 2. Verificar citas existentes
  const apt = findAppointment(time, date, profId, appointments);
  const hasAppointment = !!apt;
  const appointmentStatus = apt?.status;

  // 3. Verificar selección actual
  const { from, to, duration = 30, mode = 'single' } = selection;
  const isSelected = isTimeInSelection(time, from, to, duration, mode);
  const isInRange = isTimeInRange(time, from, to, duration, mode);

  // Determinar estado final
  let state = 'available';
  let subState = null;
  let metadata = {};

  if (isPast) {
    state = 'past';
  } else if (isBlockedByBlock) {
    state = 'blocked';
    metadata.blockInfo = blockInfo;
  } else if (hasAppointment) {
    state = 'occupied';
    metadata.appointment = apt;
  } else if (isSelected) {
    state = 'selected';
  } else if (isInRange) {
    state = 'in-range';
  }

  return {
    time,
    state,
    subState,
    isPast,
    isBlocked: isBlockedByBlock,
    hasAppointment,
    isSelected,
    isInRange,
    isDisabled: isPast || (hasAppointment && appointmentStatus !== 'Cancelado'),
    metadata,
    // Para compatibilidad con código existente
    isOccupied: hasAppointment && appointmentStatus !== 'Cancelado',
    isBlockedByBlock,
    blockInfo,
    appointment: apt
  };
}

/**
 * Encuentra un bloqueo que afecte al slot
 */
function findBlock(time, date, profId, blockedDays) {
  if (!blockedDays?.length) return null;

  return blockedDays.find(b => {
    const from = b.date_from || b.date;
    const to = b.date_to || from;
    const sameDate = date >= from && date <= to;
    if (!sameDate) return false;

    const sameProf = !profId || profId === 'all' || b.professional_id === 'all' || b.professional_id === profId;
    if (!sameProf) return false;

    const isAllDay = b.all_day !== false && (!b.time_from || !b.time_to);
    if (isAllDay) return true;

    return time >= b.time_from && time < b.time_to;
  }) || null;
}

/**
 * Encuentra una cita que ocupe el slot
 */
function findAppointment(time, date, profId, appointments) {
  if (!appointments?.length) return null;

  return appointments.find(a => {
    if (a.date !== date) return false;
    if (a.status === 'Cancelado' || a.status === 'Atendido') return false;
    
    const profMatch = !profId || a.professional_id === profId || a.professional_id === 'all';
    if (!profMatch) return false;

    const aDur = parseInt(a.duration) || 30;
    const [aH, aM] = (a.time || '00:00').split(':').map(Number);
    const aStart = aH * 60 + aM;
    const aEnd = aStart + aDur;
    const [h, m] = time.split(':').map(Number);
    const slotMin = h * 60 + m;

    return slotMin >= aStart && slotMin < aEnd;
  }) || null;
}

/**
 * Verifica si una hora está en la selección actual
 */
function isTimeInSelection(time, from, to, duration, mode) {
  if (!from) return false;
  
  if (mode === 'range') {
    return time === from;
  }
  
  // Mode single+duration
  const [fh, fm] = from.split(':').map(Number);
  const fromMin = fh * 60 + fm;
  const [th, tm] = time.split(':').map(Number);
  const timeMin = th * 60 + tm;
  
  return timeMin === fromMin;
}

/**
 * Verifica si una hora está en el rango de la selección
 */
function isTimeInRange(time, from, to, duration, mode) {
  if (!from) return false;
  
  const [fh, fm] = from.split(':').map(Number);
  const fromMin = fh * 60 + fm;
  const [th, tm] = time.split(':').map(Number);
  const timeMin = th * 60 + tm;
  
  if (mode === 'range') {
    if (!to) return false;
    const [toH, toM] = to.split(':').map(Number);
    const toMin = toH * 60 + toM;
    return timeMin >= fromMin && timeMin < toMin;
  }
  
  // Mode single+duration
  const endMin = fromMin + (duration || 30);
  return timeMin >= fromMin && timeMin < endMin;
}

/**
 * Genera la lista de slots para un día (00:00 - 23:30 cada 30 min)
 */
export function generateDaySlots(startHour = 0, endHour = 23, interval = 30) {
  const slots = [];
  for (let h = startHour; h <= endHour; h++) {
    const hh = String(h).padStart(2, '0');
    slots.push(`${hh}:00`);
    if (h < endHour || (h === endHour && interval === 30)) {
      slots.push(`${hh}:30`);
    }
  }
  return slots;
}

/**
 * Función principal: genera el estado completo de todos los slots del día
 * @param {Object} params - Parámetros de contexto
 * @returns {Array} Array de estados de slots
 */
export function computeDaySlots(params) {
  const {
    appointments = [],
    blockedDays = [],
    profId = 'all',
    date = '',
    now = new Date().toISOString(),
    selection = {},
    startHour = 0,
    endHour = 23,
    interval = 30
  } = params;

  const slots = generateDaySlots(startHour, endHour, interval);
  
  return slots.map(time => getSlotState({
    time,
    appointments,
    blockedDays,
    profId,
    date,
    now,
    selection
  }));
}