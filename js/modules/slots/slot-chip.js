/**
 * slot-chip.js - Renderizado de chips de slots
 * 
 * Un único lugar para generar el HTML de un slot chip según su estado.
 * Sin lógica de negocio, solo presentación.
 */

/**
 * Genera el SVG del icono de reloj
 */
const CLOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="slot-icon" aria-hidden="true"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>`;

/**
 * SVG del icono médico para citas
 */
const MEDICAL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="medical-icon" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0"></path><path d="M12 10v10"></path><path d="M9 13h6"></path></svg>`;

/**
 * Genera el HTML de un slot chip según su estado
 * @param {Object} slotState - Resultado de getSlotState()
 * @param {Object} options - Opciones de renderizado
 * @returns {string} HTML del botón
 */
export function renderSlotChip(slotState, options = {}) {
  const {
    time,
    state,
    metadata = {},
    isDisabled,
    isSelected,
    isInRange,
    isPast,
    isBlocked,
    hasAppointment
  } = slotState;

  const { onClick, dataAttrs = {}, customClass = '' } = options;
  const { appointment, blockInfo } = metadata;

  const timeStr = slotState.time || '';
  const clockIcon = getClockIcon();
  const medicalIcon = getMedicalIcon();

  const baseAttrs = [
    `type="button"`,
    `data-time="${time}"`,
    `data-state="${slotState.state}"`,
    `title="${getTooltip(slotState)}"`,
    ...Object.entries(dataAttrs).map(([k, v]) => `${k}="${v}"`)
  ].join(' ');

  // Estado seleccionado
  if (slotState.isSelected) {
    return renderSelected(time, baseAttrs, customClass);
  }

  // Estado en rango (para modo rango)
  if (slotState.isInRange && !slotState.isSelected) {
    return renderInRange(time, baseAttrs, customClass);
  }

  // Estado ocupado (cita existente)
  if (slotState.hasAppointment) {
    return renderOccupied(slotState, baseAttrs, customClass);
  }

  // Estado bloqueado por bloqueo
  if (slotState.isBlocked) {
    return renderBlocked(slotState, baseAttrs, customClass);
  }

  // Estado pasado
  if (slotState.isPast) {
    return renderPast(time, baseAttrs, customClass);
  }

  // Disponible
  return renderAvailable(time, baseAttrs, customClass);
}

/**
 * Slot seleccionado (verde degradado)
 */
function renderSelected(time, baseAttrs, customClass) {
  const clockIcon = getClockIcon();
  return `
    <button 
      ${baseAttrs}
      class="slot-chip-btn slot-selected ${customClass}"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 8px 6px;
        border: 1px solid rgba(20, 184, 166, 0.9);
        border-radius: 10px;
        background: linear-gradient(135deg, #14b8a6 0%, #059669 100%);
        color: #ffffff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transform: scale(1.04);
        box-shadow: 0 0 18px rgba(45, 212, 191, 0.4), 0 6px 18px rgba(15, 118, 110, 0.16);
        z-index: 2;
        transition: transform 180ms ease, box-shadow 180ms ease;
      "
    >
      <span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;">
        ${getClockIcon()}${formatTime(slotState.time || '')}
      </span>
    </button>
  `;
}

/**
 * Slot en rango (para modo rango - selección de fin)
 */
function renderInRange(time, baseAttrs, customClass) {
  return `
    <button 
      ${baseAttrs}
      class="slot-chip-btn slot-in-range"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 8px 6px;
        border: 1.5px solid rgba(20, 184, 166, 0.5);
        border-radius: 10px;
        background: linear-gradient(145deg, rgba(204, 251, 241, 0.9), rgba(236, 253, 250, 0.7));
        color: #00a8b5;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border-radius: 10px;
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      "
    >
      <span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;">
        ${getClockIcon()}${formatTime(slotState.time || '')}
      </span>
    </button>
  `;
}

/**
 * Slot con cita existente (naranja, clickable, muestra paciente)
 */
function renderOccupied(slotState, baseAttrs, customClass) {
  const { appointment } = slotState.metadata;
  const patientName = appointment?.patient_name || 'Paciente';
  const reason = appointment?.reason || 'Consulta';
  const title = `📅🏥 Cita Médica: ${patientName} - ${reason}`;

  return `
    <button 
      ${baseAttrs}
      class="slot-chip-btn slot-occupied-indicator"
      title="📅🏥 Cita Médica: ${patientName} - ${reason}"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 7px 5px;
        border: 1.5px solid rgba(249, 115, 22, 0.45);
        border-radius: 10px;
        background: linear-gradient(145deg, rgba(255, 247, 237, 0.95), rgba(255, 237, 213, 0.7));
        color: #ea580c;
        cursor: pointer;
        opacity: 0.88;
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
      "
      onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='rgba(249,115,22,0.65)';this.style.boxShadow='0 0 12px rgba(249,115,22,0.12)'"
      onmouseout="this.style.transform='';this.style.borderColor='';this.style.boxShadow=''"
      onmousedown="this.style.transform='scale(0.95)'"
      onmouseup="this.style.transform=''"
    >
      <span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;">
        ${getClockIcon()}${formatTime(slotState.time || '')}
      </span>
      <span style="display:flex;align-items:center;gap:1;margin-top:4px;font-size:9px;color:#ea580c;font-weight:500;">
        ${getMedicalIcon()}${escapeHtml(appointment?.patient_name || 'Paciente')}
      </span>
      <span class="slot-status-dot" style="width:5px;height:5px;margin-top:4px;border-radius:50%;background:#f97316;"></span>
    </button>
  `;
}

/**
 * Slot bloqueado por bloqueo (rojo, no clickable)
 */
function renderBlocked(slotState, baseAttrs, customClass) {
  const { blockInfo } = slotState.metadata;
  const reason = blockInfo?.reason || 'Bloqueo';
  const blockText = formatBlockInfo(blockInfo);

  return `
    <button 
      ${baseAttrs}
      class="slot-chip-btn slot-blocked"
      disabled
      title="Bloqueado: ${blockText}"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 7px 5px;
        border: 1.5px solid rgba(239, 68, 68, 0.5);
        border-radius: 10px;
        background: linear-gradient(145deg, rgba(254, 226, 226, 0.9), rgba(254, 202, 202, 0.6));
        color: #dc2626;
        cursor: not-allowed;
        opacity: 0.7;
      "
    >
      <span style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;color:#dc2626;">
        ${getClockIcon()}${formatTime(slotState.time || '')}
      </span>
      <span style="margin-top:4px;font-size:8px;color:#dc2626;display:flex;align-items:center;gap:3px;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
        BLOQ
      </span>
    </button>
  `;
}

/**
 * Slot pasado (gris, no clickable)
 */
function renderPast(time, baseAttrs, customClass) {
  return `
    <button 
      ${baseAttrs}
      class="slot-chip-btn slot-past"
      disabled
      title="Horario ya transcurrido"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 8px 6px;
        border: 1.5px solid rgba(148, 163, 184, 0.2);
        border-radius: 10px;
        background: rgba(241, 245, 249, 0.8);
        color: #94a3b8;
        cursor: not-allowed;
        opacity: 0.7;
      "
    >
      <span style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;color:#94a3b8;">
        ${getClockIcon()}${formatTime(slotState.time || '')}
      </span>
    </button>
  `;
}

/**
 * Slot disponible (verde teal glass)
 */
function renderAvailable(time, baseAttrs, customClass) {
  return `
    <button 
      ${baseAttrs}
      class="slot-chip-btn slot-available"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 8px 6px;
        border: 1.5px solid rgba(45, 212, 191, 0.28);
        border-radius: 10px;
        background: linear-gradient(145deg, rgba(240, 253, 250, 0.96), rgba(236, 253, 250, 0.72));
        color: #00a8b5;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(15, 118, 110, 0.04);
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, color 180ms ease;
      "
      onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='rgba(20,184,166,0.65)';this.style.background='linear-gradient(145deg,rgba(204,251,241,0.98),rgba(240,253,250,0.92))';this.style.color='#008f99';this.style.boxShadow='0 0 0 1px rgba(45,212,191,0.06),0 0 16px rgba(45,212,191,0.20),0 5px 14px rgba(15,118,110,0.10)'"
      onmouseout="this.style.transform='';this.style.borderColor='';this.style.background='';this.style.color='';this.style.boxShadow=''"
      onmousedown="this.style.transform='scale(0.95)'"
      onmouseup="this.style.transform=''"
    >
      <span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;color:#00a8b5;">
        ${getClockIcon()}${formatTime(slotState.time || '')}
      </span>
    </button>
  `;
}

/**
 * Obtiene el tooltip para el slot
 */
function getTooltip(slotState) {
  const { state, metadata } = slotState;
  
  switch (state) {
    case 'selected':
      return `Hora seleccionada (${slotState.time} hs)`;
    case 'in-range':
      return `En rango seleccionado (${slotState.time} hs)`;
    case 'occupied':
      const apt = metadata.appointment;
      return `📅🏥 Cita Médica: ${apt?.patient_name || 'Paciente'} - ${apt?.reason || 'Consulta'}`;
    case 'blocked':
      const blockInfo = metadata.blockInfo;
      return `Bloqueado: ${formatBlockInfo(blockInfo)}`;
    case 'past':
      return 'Horario ya transcurrido';
    default:
      return `Disponible para bloquear (${slotState.time} hs)`;
  }
}

/**
 * Formatea la hora para mostrar
 */
function formatTime(time) {
  return time || '';
}

/**
 * Icono de reloj
 */
function getClockIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="slot-icon" aria-hidden="true"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>`;
}

/**
 * Icono médico
 */
function getMedicalIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="medical-icon" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0"></path><path d="M12 10v10"></path><path d="M9 13h6"></path></svg>`;
}

/**
 * Formatea información del bloqueo
 */
function formatBlockInfo(blockInfo) {
  if (!blockInfo) return 'Bloqueo';
  const isAllDay = blockInfo.all_day !== false && (!blockInfo.time_from || !blockInfo.time_to);
  const who = blockInfo.professional_name || (blockInfo.professional_id === 'all' || !blockInfo.professional_id ? 'Todos' : 'Profesional');
  const when = isAllDay ? 'día completo' : `${blockInfo.time_from} a ${blockInfo.time_to} hs`;
  return `${who} (${when})`;
}

/**
 * Escapa HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}