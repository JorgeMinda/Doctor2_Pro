/**
 * app-calendar.js - Gestión de Agenda, Vistas de Calendario y Turnos
 */
import { state, api } from './app-state.js';
import { el, formatDate, formatReadableDate, apiFetch, showToast } from './app-utils.js';
import { openModal } from './app-modal.js';
import { updateRemindersCountBadge } from './app-reminders.js';

export async function loadMonth(opts = {}) {
  const y = state.monthDate.getFullYear();
  const m = String(state.monthDate.getMonth() + 1).padStart(2, '0');
  const monthStr = `${y}-${m}`;

  updateDateNavLabels();

  try {
    let url = `${api.appointments}?month=${monthStr}`;
    if (state.selectedProfessional) {
      url += `&professional=${encodeURIComponent(state.selectedProfessional)}`;
    }

    const startOfWeek = getStartOfWeek(state.selectedDate || state.monthDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const m1 = formatDate(startOfWeek).substring(0, 7);
    const m2 = formatDate(endOfWeek).substring(0, 7);

    const aptPromises = [apiFetch(url)];
    if (state.calendarView === 'week' && m1 !== m2) {
      const otherMonth = (monthStr === m1) ? m2 : m1;
      let otherUrl = `${api.appointments}?month=${otherMonth}`;
      if (state.selectedProfessional) {
        otherUrl += `&professional=${encodeURIComponent(state.selectedProfessional)}`;
      }
      aptPromises.push(apiFetch(otherUrl).catch(() => ({ appointments: [] })));
    }

    const [aptResults, blockData] = await Promise.all([
      Promise.all(aptPromises),
      apiFetch(api.blockedDays).catch(() => ({ blocked_days: [] }))
    ]);

    let combinedApts = [];
    aptResults.forEach(res => {
      if (Array.isArray(res?.appointments)) {
        combinedApts = combinedApts.concat(res.appointments);
      }
    });

    const aptMap = new Map();
    combinedApts.forEach(a => {
      if (a && a.id) aptMap.set(a.id, a);
    });

    state.appointments = Array.from(aptMap.values());
    state.blockedDays = blockData.blocked_days || [];

    updateRemindersCountBadge();
    scheduleAgendaRender();
  } catch (err) {
    console.warn('No se pudieron cargar los turnos del mes', err);
  }
}

export function isDateBlocked(dateStr, profId = null, timeStr = null) {
  if (!state.blockedDays || state.blockedDays.length === 0) return null;
  return state.blockedDays.find(b => {
    const from = b.date_from || b.date;
    const to = b.date_to || from;
    const inRange = dateStr >= from && dateStr <= to;
    if (!inRange) return false;

    const matchProf = (!profId || b.professional_id === 'all' || b.professional_id === profId);
    if (!matchProf) return false;

    const isAllDay = b.all_day !== false && (!b.time_from || !b.time_to);
    if (isAllDay) return true;

    if (timeStr) {
      return (timeStr >= b.time_from && timeStr <= b.time_to);
    }
    return true;
  });
}

export function scheduleAgendaRender() {
  if (state.calendarView === 'week') {
    renderWeekView();
  } else {
    renderMonthView();
  }
  renderDayTimeline();
}

function updateDateNavLabels() {
  const monthText = el('monthText');
  const calTitle = el('calendarTitle');

  if (state.calendarView === 'week') {
    const startOfWeek = getStartOfWeek(state.selectedDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Lunes a Domingo

    const opt = { day: 'numeric', month: 'short' };
    const label = `${startOfWeek.toLocaleDateString('es-ES', opt)} - ${endOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    if (monthText) monthText.textContent = label;
    if (calTitle) calTitle.textContent = label;
  } else {
    const opt = { month: 'long', year: 'numeric' };
    const label = state.monthDate.toLocaleDateString('es-ES', opt);
    if (monthText) monthText.textContent = label;
    if (calTitle) calTitle.textContent = label;
  }
}

function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lunes
  return new Date(date.setDate(diff));
}

export function renderMonthView() {
  const grid = el('calendarGrid');
  if (!grid) return;

  grid.className = 'calendar-grid month-view';
  grid.innerHTML = '';

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  weekdays.forEach(day => {
    const h = document.createElement('div');
    h.className = 'weekday-header';
    h.textContent = day;
    grid.appendChild(h);
  });

  const year = state.monthDate.getFullYear();
  const month = state.monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startOffset = firstDay.getDay() - 1;
  if (startOffset === -1) startOffset = 6;

  // Celdas vacías previas
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty-prev';
    empty.style.opacity = '0.3';
    grid.appendChild(empty);
  }

  const selectedDateStr = formatDate(state.selectedDate);
  const todayStr = formatDate(new Date());

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const dateStr = formatDate(currentDate);

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (dateStr === selectedDateStr) cell.classList.add('selected');
    if (dateStr === todayStr) cell.classList.add('today');

    const dayApts = state.appointments.filter(a => a.date === dateStr);
    const activeApts = dayApts.filter(a => {
      const normStatus = normalizeStatus(a.status);
      return normStatus !== 'Cancelado';
    });
    const dayBlock = isDateBlocked(dateStr, state.selectedProfessional);

    if (dayBlock) {
      cell.classList.add('blocked');
    }

    cell.innerHTML = `
      <div class="date">${day}</div>
      ${dayBlock ? `
        <div style="font-size:0.68rem; font-weight:700; color:var(--danger); background:rgba(239,68,68,0.12); border-radius:4px; padding:2px 4px; margin-top:2px; display:inline-block;" title="${dayBlock.reason} (${dayBlock.professional_name || 'Todos'}) ${dayBlock.time_from && dayBlock.time_to ? `${dayBlock.time_from} a ${dayBlock.time_to} hs` : ''}">
          <i class="fas fa-ban"></i> ${dayBlock.time_from && dayBlock.time_to ? `${dayBlock.time_from}-${dayBlock.time_to}` : (dayBlock.type === 'emergency' ? 'Emergencia' : 'Bloqueado')}
        </div>
      ` : ''}
      ${activeApts.length > 0 ? `
        <div class="count" title="Hacé clic para ver el detalle de los ${activeApts.length} turnos" onclick="event.stopPropagation(); window.viewDayAppointments('${dateStr}')">
          <i class="fas fa-calendar-check"></i> ${activeApts.length} ${activeApts.length === 1 ? 'turno' : 'turnos'}
        </div>
      ` : ''}
    `;

    cell.addEventListener('click', () => {
      state.selectedDate = currentDate;
      scheduleAgendaRender();
    });

    grid.appendChild(cell);
  }
}

function normalizeStatus(status) {
  if (!status) return 'Reservado';
  const s = String(status).toLowerCase();
  if (s === 'scheduled' || s === 'reservado') return 'Reservado';
  if (s === 'confirmed' || s === 'confirmado') return 'Confirmado';
  if (s === 'en curso' || s === 'in_progress' || s === 'in-progress') return 'En curso';
  if (s === 'cancelled' || s === 'cancelado') return 'Cancelado';
  if (s === 'completed' || s === 'atendido' || s === 'done') return 'Atendido';
  if (s === 'rescheduled' || s === 'reprogramado') return 'Reprogramado';
  if (s === 'absent' || s === 'ausente') return 'Ausente';
  return status;
}

// Iniciales compactas para los pills de estado en las tarjetas de la semana
const STATUS_INITIALS = {
  'Reservado': 'RES',
  'Confirmado': 'CONF',
  'Cancelado': 'CANC',
  'Atendido': 'ATEN',
  'Reprogramado': 'REPR',
  'Ausente': 'AUS',
  'En curso': 'CURSO'
};

function statusSlug(status) {
  return String(status).toLowerCase().replace(/\s+/g, '-');
}

export function initCalendarNavListeners() {
  const todayBtn = el('calTodayBtn');
  if (todayBtn && !todayBtn.dataset.hasListener) {
    todayBtn.dataset.hasListener = 'true';
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      state.selectedDate = now;
      state.monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
      loadMonth();
    });
  }

  const prevBtn = el('calPrevBtn');
  if (prevBtn && !prevBtn.dataset.hasListener) {
    prevBtn.dataset.hasListener = 'true';
    prevBtn.addEventListener('click', () => {
      if (state.calendarView === 'week') {
        const d = new Date(state.selectedDate);
        d.setDate(d.getDate() - 7);
        state.selectedDate = d;
        state.monthDate = new Date(d.getFullYear(), d.getMonth(), 1);
      } else {
        state.monthDate.setMonth(state.monthDate.getMonth() - 1);
      }
      loadMonth();
    });
  }

  const nextBtn = el('calNextBtn');
  if (nextBtn && !nextBtn.dataset.hasListener) {
    nextBtn.dataset.hasListener = 'true';
    nextBtn.addEventListener('click', () => {
      if (state.calendarView === 'week') {
        const d = new Date(state.selectedDate);
        d.setDate(d.getDate() + 7);
        state.selectedDate = d;
        state.monthDate = new Date(d.getFullYear(), d.getMonth(), 1);
      } else {
        state.monthDate.setMonth(state.monthDate.getMonth() + 1);
      }
      loadMonth();
    });
  }
}

export function renderWeekView() {
  const grid = el('calendarGrid');
  if (!grid) return;

  initCalendarNavListeners();

  grid.className = 'calendar-grid week-cards-view';
  grid.style.gridTemplateColumns = '';
  grid.innerHTML = '';

  const startOfWeek = getStartOfWeek(state.selectedDate);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const now = new Date();
  const selectedDateStr = formatDate(state.selectedDate);
  const todayStr = formatDate(now);

  days.forEach(d => {
    const dStr = formatDate(d);
    const isToday = dStr === todayStr;
    const isPastDay = dStr < todayStr;

    const dayCard = document.createElement('div');
    dayCard.className = `week-day-card${isToday ? ' week-day-card--today' : ''}${isPastDay ? ' week-day-card--past' : ''}`;

    // Encabezado del día
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const dayNum = d.getDate();
    const headerDiv = document.createElement('div');
    headerDiv.className = 'week-card-header';
    headerDiv.innerHTML = `
      <p class="week-card-dayname">${dayName.toLowerCase()}</p>
      <p class="week-card-daynum${isToday ? ' week-card-daynum--today' : ''}">${dayNum}</p>
    `;
    headerDiv.style.cursor = 'pointer';
    headerDiv.title = `Seleccionar ${dayName} ${dayNum}`;
    headerDiv.addEventListener('click', () => {
      state.selectedDate = d;
      scheduleAgendaRender();
    });
    dayCard.appendChild(headerDiv);

    // Contenedor de citas
    const aptsDiv = document.createElement('div');
    aptsDiv.className = 'week-card-apts';

    const dayApts = (state.appointments || [])
      .filter(a => a.date === dStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    dayApts.forEach(apt => {
      const normStatus = normalizeStatus(apt.status);
      const isCancelled = normStatus === 'Cancelado';
      const aptEl = document.createElement('div');
      aptEl.className = `week-card-apt-block status-${statusSlug(normStatus)}`;
      aptEl.title = `${apt.patient_name} (${apt.time} hs) · ${apt.reason || 'Consulta'} · Estado: ${normStatus}`;
      aptEl.innerHTML = `
        <div class="apt-block-top">
          <span class="apt-block-time"><i class="far fa-clock" style="font-size:0.65rem; opacity:0.8; margin-right:3px;"></i>${apt.time} hs</span>
          <span class="apt-block-pill pill-${statusSlug(normStatus)}" title="Estado: ${normStatus}">${STATUS_INITIALS[normStatus] || normStatus}</span>
        </div>
        <div class="apt-block-patient${isCancelled ? ' text-strikethrough' : ''}">${apt.patient_name}</div>
        ${apt.reason ? `<div class="apt-block-reason">${apt.reason}</div>` : ''}
      `;
      aptEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal({ appointment: apt });
      });
      aptsDiv.appendChild(aptEl);
    });

    if (dayApts.length === 0) {
      aptsDiv.innerHTML = `<div class="week-card-empty-slot"></div>`;
    }

    dayCard.appendChild(aptsDiv);

    // Botón + Cita al fondo
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'week-card-add-btn';
    addBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus" style="margin-right:4px;"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
      <span>Cita</span>
    `;
    addBtn.addEventListener('click', () => {
      if (isPastDay) {
        showToast('⚠️ No es posible agendar turnos en fechas que ya han transcurrido.', 'warning');
        return;
      }
      state.selectedDate = d;
      openModal({ date: dStr });
    });
    dayCard.appendChild(addBtn);

    grid.appendChild(dayCard);
  });
}



export function renderDayTimeline() {
  const timeline = el('dayTimeline');
  const title = el('dayTitle');
  if (!timeline) return;

  const dateStr = formatDate(state.selectedDate);
  if (title) title.textContent = formatReadableDate(dateStr);

  const dayApts = state.appointments.filter(a => a.date === dateStr);
  const dayBlocks = (state.blockedDays || []).filter(b => {
    const from = b.date_from || b.date;
    const to = b.date_to || from;
    return dateStr >= from && dateStr <= to &&
      (b.professional_id === 'all' || b.professional_id === state.selectedProfessional);
  });

  let bannerHtml = '';
  if (dayBlocks.length > 0) {
    bannerHtml = dayBlocks.map(dayBlock => {
      const isAllDay = dayBlock.all_day !== false && (!dayBlock.time_from || !dayBlock.time_to);
      const timeDetail = isAllDay ? 'Día Completo' : `${dayBlock.time_from} a ${dayBlock.time_to} hs`;
      return `
        <div style="background:rgba(239,68,68,0.12); border:1.5px solid var(--danger); border-radius:8px; padding:12px 16px; margin-bottom:14px; color:var(--danger); display:flex; align-items:center; gap:10px;">
          <i class="fas fa-ban" style="font-size:1.4rem;"></i>
          <div>
            <strong style="font-size:0.92rem;">${isAllDay ? 'Día Bloqueado por Emergencia / Ausencia' : 'Horario Bloqueado por Emergencia'}</strong>
            <br><span style="color:var(--text); font-size:0.8rem;"><strong>${dayBlock.professional_name || 'Todos'} (${timeDetail}):</strong> ${dayBlock.reason || 'Sin atención'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  if (dayApts.length === 0) {
    timeline.innerHTML = `${bannerHtml}<div class="empty"><i class="fas fa-calendar-day" style="font-size:2rem; color:var(--muted); margin-bottom:8px; display:block;"></i>Sin turnos agendados para este día.</div>`;
    return;
  }

  const now = new Date();

  timeline.innerHTML = bannerHtml + dayApts.map(apt => {
    // Validar si la fecha/hora del turno ya pasó
    const timeClean = apt.time && apt.time.length === 5 ? apt.time : '00:00';
    const aptDateTime = new Date(`${apt.date}T${timeClean}:00`);
    const isPast = aptDateTime < now;
    const isNotDone = apt.status !== 'Atendido' && apt.status !== 'Cancelado';

    const normStatus = normalizeStatus(apt.status);
    const badgeClass = normStatus === 'En curso' ? 'en-curso' : normStatus;
    // Solo se puede iniciar una consulta cuya fecha/hora aún no haya transcurrido
    const canStart = !isPast && ['Reservado', 'Confirmado', 'Reprogramado'].includes(normStatus);
    const startBtn = canStart ? `
      <button type="button" class="apt-action-btn apt-action-btn--primary" onclick="window.startApt('${apt.id}')" title="Iniciar consulta (queda En curso)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="apt-action-icon" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>Iniciar
      </button>
    ` : '';
    const completeBtn = normStatus === 'En curso' ? `
      <button type="button" class="apt-action-btn apt-action-btn--outline" onclick="window.completeApt('${apt.id}')" title="Completar atención">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="apt-action-icon" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>Completar
      </button>
    ` : '';

    return `
      <div class="slot" data-id="${apt.id}" style="cursor:pointer;" onclick="window.editApt('${apt.id}')">
        <div class="info">
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
            <strong>${apt.time} · ${apt.patient_name}</strong>
            ${isPast && isNotDone ? `
              <span class="time-passed-tag" title="El horario establecido (${apt.time} hs) ya ha transcurrido">
                <i class="fas fa-clock-rotate-left"></i> Horario pasado
              </span>
            ` : ''}
          </div>
          <small>${apt.reason || 'Consulta general'} ${apt.patient_phone ? `· 📱 ${apt.patient_phone}` : ''} ${apt.cost ? `· 💵 $${parseFloat(apt.cost).toLocaleString('es-AR')}` : ''}</small>
        </div>
        <div class="actions" onclick="event.stopPropagation()">
          <span class="badge ${badgeClass}">${normStatus}</span>
          ${startBtn}${completeBtn}
          <button class="ghost" onclick="window.editApt('${apt.id}')" title="Ver / Editar turno"><i class="fas fa-edit"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

window.viewDayAppointments = (dateStr) => {
  const parts = dateStr.split('-');
  state.selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  scheduleAgendaRender();

  const dayApts = state.appointments.filter(a => a.date === dateStr);
  const activeApts = dayApts.filter(a => normalizeStatus(a.status) !== 'Cancelado');
  if (activeApts.length === 1) {
    openModal({ appointment: activeApts[0] });
  } else if (activeApts.length > 1) {
    const timelineCard = el('dayTimeline')?.closest('.card');
    timelineCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(`Mostrando los ${activeApts.length} turnos del día`, 'info');
  }
};

window.editApt = (id) => {
  const apt = state.appointments.find(a => a.id === id);
  if (apt) openModal({ appointment: apt });
};

export function fillFormProfessionals() {
  const filter = el('professionalFilter');
  const formSelect = el('formProfessional');

  if (filter) {
    filter.innerHTML = '<option value="">Todos los profesionales</option>' +
      state.professionals.map(p => `<option value="${p.id}" ${state.selectedProfessional === p.id ? 'selected' : ''}>${p.name} · ${p.specialty}</option>`).join('');
  }

  if (formSelect) {
    formSelect.innerHTML = state.professionals.map(p => `<option value="${p.id}">${p.name} · ${p.specialty}</option>`).join('');
  }
}

window.loadAgenda = loadMonth;

