import { computeDaySlots, generateDaySlots } from './slot-states.js';
import { renderSlotChip } from './slot-chip.js';

export function createSlotPicker(config) {
  const {
    mode = 'single+duration',
    containerFrom,
    containerTo,
    inputFrom,
    inputTo,
    badgeFrom,
    badgeTo,
    getContext,
    onChange,
    initialSelection = {}
  } = config;

  let selection = {
    from: initialSelection.from || '',
    to: initialSelection.to || '',
    duration: initialSelection.duration || 30,
    mode: initialSelection.mode || mode,
    ...initialSelection
  };


  function render(opts = {}) {
    const context = getContext() || {};
    const slots = computeSlots(context);

    if (config.containerFrom) {
      config.containerFrom.innerHTML = renderContainer(slots, true);
      bindClicks(config.containerFrom, true);
    } else {
    }

    if (config.mode === 'range' && config.containerTo) {
      config.containerTo.innerHTML = renderContainer(slots, false);
      bindClicks(config.containerTo, false);
    } else {
    }

    updateBadges();
    config.onChange?.(getSelection());
  }

  function computeSlots(context) {
    const { appointments = [], blockedDays = [], profId = 'all', date = '', now = new Date().toISOString() } = context;
    
    if (config.mode === 'range') {
      return computeRangeSlots(context);
    }
    
    return computeSingleDaySlots(context);
  }

  function computeSingleDaySlots(context) {
    const { appointments = [], blockedDays = [], profId = 'all', date = '', now = new Date().toISOString() } = context;
    
    return computeDaySlots({
      appointments: context.appointments || [],
      blockedDays: context.blockedDays || [],
      profId: context.profId || 'all',
      date: context.date || '',
      now: context.now || new Date().toISOString(),
      selection: {
        from: selection.from,
        to: selection.to,
        duration: selection.duration,
        mode: selection.mode
      },
      startHour: 0,
      endHour: 23
    });
  }

  function computeRangeSlots(context) {
    return computeDaySlots({
      appointments: context.appointments || [],
      blockedDays: context.blockedDays || [],
      profId: context.profId || 'all',
      date: context.dateFrom || '',
      now: context.now || new Date().toISOString(),
      selection: {
        from: selection.from,
        to: selection.to,
        duration: selection.duration,
        mode: selection.mode
      },
      startHour: 0,
      endHour: 23
    });
  }

  function renderContainer(slots, isFrom) {
    return slots.map(slot => renderSlotHTML(slot, isFrom)).join('');
  }

  function renderSlotHTML(slot, isFrom) {
    const isSelFrom = isFrom && slot.time === selection.from;
    const isSelTo = !isFrom && slot.time === selection.to;
    const isSelected = slot.isSelected || isSelFrom || isSelTo;
    const isInRange = slot.isInRange && !isSelected;
    const isPast = slot.isPast;
    const isBlocked = slot.isBlocked;
    const hasAppointment = slot.hasAppointment;
    const isDisabled = slot.isDisabled;

    const clockIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="slot-icon"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>';

    // Seleccionado
    if (isSelected) {
      return `<button type="button" class="slot-chip-btn slot-selected" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px;padding:8px 6px;border:1px solid rgba(20,184,166,0.9);border-radius:10px;background:linear-gradient(135deg,#14b8a6 0%,#059669 100%);color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:600;cursor:pointer;transform:scale(1.04);box-shadow:0 0 18px rgba(45,212,191,0.4),0 6px 18px rgba(15,118,110,0.16);z-index:2;transition:transform 180ms ease,box-shadow 180ms ease;" data-time="${slot.time}" data-${isFrom ? 'from' : 'to'}="true"><span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;">${getClockIcon()}${slot.time}</span></button>`;
    }

    // En rango
    if (isInRange && !isSelected) {
      return `<button type="button" class="slot-chip-btn slot-in-range" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px;padding:8px 6px;border:1.5px solid rgba(20,184,166,0.5);border-radius:10px;background:linear-gradient(145deg,rgba(204,251,241,0.9),rgba(236,253,250,0.7));color:#00a8b5;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:600;cursor:pointer;border-radius:10px;transition:transform 180ms ease,border-color 180ms ease,background 180ms ease;" data-time="${slot.time}" data-${isFrom ? 'from' : 'to'}="true"><span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;">${getClockIcon()}${formatTime(slot.time)}</span></button>`;
    }

    // Ocupado (seleccionable para bloqueo)
    if (slot.hasAppointment) {
      const apt = slot.metadata.appointment;
      const patientName = apt?.patient_name || 'Paciente';
      const reason = apt?.reason || 'Consulta';
      const title = `📅🏥 Cita Médica: ${patientName} - ${reason}`;

      return `<button type="button" title="📅🏥 Cita Médica: ${patientName} - ${reason}" class="slot-chip-btn slot-occupied-indicator" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px;padding:7px 5px;border:1.5px solid rgba(249,115,22,0.45);border-radius:10px;background:linear-gradient(145deg,rgba(255,247,237,0.95),rgba(255,237,213,0.7));color:#ea580c;cursor:pointer;opacity:0.88;transition:transform 180ms ease,border-color 180ms ease,background 180ms ease,box-shadow 180ms ease;" data-time="${slot.time}" data-${isFrom ? 'from' : 'to'}="true">
        <span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;">${getClockIcon()}${slot.time}</span>
        <span style="display:flex;align-items:center;gap:1;margin-top:4px;font-size:9px;color:#ea580c;font-weight:500;">${getMedicalIcon()}${escapeHtml(apt?.patient_name || 'Paciente')}</span>
        <span class="slot-status-dot" style="width:5px;height:5px;margin-top:4px;border-radius:50%;background:#f97316;"></span>
      </button>`;
    }

    // Disponible
    return `<button type="button" class="slot-chip-btn slot-available" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px;padding:8px 6px;border:1.5px solid rgba(45,212,191,0.28);border-radius:10px;background:linear-gradient(145deg,rgba(240,253,250,0.96),rgba(236,253,250,0.72));color:#00a8b5;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(15,118,110,0.04);transition:transform 180ms ease,border-color 180ms ease,background 180ms ease,box-shadow 180ms ease,color 180ms ease;" onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='rgba(20,184,166,0.65)';this.style.background='linear-gradient(145deg,rgba(204,251,241,0.98),rgba(240,253,250,0.92))';this.style.color='#008f99';this.style.boxShadow='0 0 0 1px rgba(45,212,191,0.06),0 0 16px rgba(45,212,191,0.20),0 5px 14px rgba(15,118,110,0.10)'" onmouseout="this.style.transform='';this.style.borderColor='';this.style.background='';this.style.color='';this.style.boxShadow=''" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform=''" data-time="${slot.time}" data-${isFrom ? 'from' : 'to'}="true"><span class="slot-time" style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:600;color:#00a8b5;">${getClockIcon()}${slot.time}</span></button>`;
  }

  function getTooltip(slot) {
    if (slot.isSelected) return `Hora seleccionada (${slot.time} hs)`;
    if (slot.hasAppointment) {
      const apt = slot.metadata.appointment;
      return `📅🏥 Cita Médica: ${apt?.patient_name || 'Paciente'} - ${apt?.reason || 'Consulta'}`;
    }
    if (slot.state === 'blocked') return `Bloqueado: ${formatBlockInfo(slot.metadata.blockInfo)}`;
    if (slot.isPast) return 'Horario ya transcurrido';
    return `Disponible para bloquear (${slot.time} hs)`;
  }

  /**
   * Maneja el clic en un slot de horario del bloqueo.
   * Selecciona/deseleciona el slot como inicio o fin del rango de bloqueo.
   */
  function handleClick(time, isFromStr) {
    const inputFrom = el('newBlockedTimeFrom');
    const inputTo = el('newBlockedTimeTo');
    const badgeFrom = el('blockedTimeFromBadge');
    const badgeTo = el('blockedTimeToBadge');

    const isFrom = isFromStr === 'from';

    // Si es el mismo slot que ya está seleccionado, deseleccionar
    if (isFrom && selection.from === time) {
      selection.from = '';
      if (inputFrom) inputFrom.value = '';
      if (badgeFrom) badgeFrom.textContent = '--:-- hs';
    } else if (!isFrom && selection.to === time) {
      selection.to = '';
      if (inputTo) inputTo.value = '';
      if (badgeTo) badgeTo.textContent = '--:-- hs';
    } else {
      // Seleccionar el slot
      if (isFrom) {
        selection.from = time;
        if (inputFrom) inputFrom.value = time;
        if (badgeFrom) badgeFrom.textContent = `${time} hs`;
      } else {
        selection.to = time;
        if (inputTo) inputTo.value = time;
        if (badgeTo) badgeTo.textContent = `${time} hs`;
      }
    }

    // Re-renderizar ambos contenedores
    render();
  }

  function toMinutes(time) {
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    return hh * 60 + mm;
  }

  function toMinutesToString(total) {
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }

  function updateBadges() {
    if (config.badgeFrom) config.badgeFrom.textContent = `${selection.from || '--:--'} hs`;
    if (config.badgeTo) config.badgeTo.textContent = `${selection.to || '--:--'} hs`;
  }

  /**
   * Vincula los clics a los slots renderizados
   */
  function bindClicks(container, isFrom) {
    if (!container) return;
    container.querySelectorAll('[data-time]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const time = btn.dataset.time;
        if (!time) return;
        handleClick(time, isFrom ? 'from' : 'to');
      });
    });
  }

  // API pública
  return {
    render,
    getSelection,
    setSelection,
    setContext,
    destroy: () => {}
  };
}

/**
 * Obtiene la selección actual
 */
function getSelection() {
  return { ...selection };
}

/**
 * Actualiza la selección
 */
function setSelection(newSelection) {
  selection = { ...selection, ...newSelection };
}

/**
 * Actualiza el contexto (profesional, fechas)
 */
function setContext(context) {
  currentProfId = context.profId || 'all';
  currentDateFrom = context.dateFrom || '';
  currentDateTo = context.dateTo || '';
}

function getClockIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="slot-icon"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>`;
}

function formatBlockInfo(blockInfo) {
  if (!blockInfo) return 'Bloqueo';
  const isAllDay = blockInfo.all_day !== false && (!blockInfo.time_from || !blockInfo.time_to);
  const who = blockInfo.professional_name || (blockInfo.professional_id === 'all' || !blockInfo.professional_id ? 'Todos' : 'Profesional');
  const when = blockInfo.all_day ? 'día completo' : `${blockInfo.time_from} a ${blockInfo.time_to} hs`;
  return `${who} (${when})`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}