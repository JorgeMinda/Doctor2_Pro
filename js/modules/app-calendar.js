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
    const [aptData, blockData] = await Promise.all([
      apiFetch(url),
      apiFetch(api.blockedDays).catch(() => ({ blocked_days: [] }))
    ]);

    state.appointments = aptData.appointments || [];
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
  if (!monthText) return;

  if (state.calendarView === 'week') {
    const startOfWeek = getStartOfWeek(state.selectedDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 4); // Lunes a Viernes

    const opt = { day: 'numeric', month: 'short' };
    monthText.textContent = `${startOfWeek.toLocaleDateString('es-ES', opt)} - ${endOfWeek.toLocaleDateString('es-ES', opt)}`;
  } else {
    const opt = { month: 'long', year: 'numeric' };
    monthText.textContent = state.monthDate.toLocaleDateString('es-ES', opt);
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
      ${dayApts.length > 0 ? `
        <div class="count" title="Hacé clic para ver el detalle de los ${dayApts.length} turnos" onclick="event.stopPropagation(); window.viewDayAppointments('${dateStr}')">
          <i class="fas fa-calendar-check"></i> ${dayApts.length} ${dayApts.length === 1 ? 'turno' : 'turnos'}
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

export function renderWeekView() {
  const grid = el('calendarGrid');
  if (!grid) return;

  // Contenedor: ahora usamos un diseño de tarjetas por columna (sin grid de horas)
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

  // Mapa de colores por estado (concordante con la leyenda)
  const statusColors = {
    'Reservado':    { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb',  border: '#3b82f6'  },
    'Confirmado':   { bg: 'rgba(16,185,129,0.12)',  color: '#059669',  border: '#10b981'  },
    'Cancelado':    { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626',  border: '#ef4444'  },
    'Atendido':     { bg: 'rgba(99,102,241,0.12)',  color: '#4f46e5',  border: '#6366f1'  },
    'Reprogramado': { bg: 'rgba(245,158,11,0.12)',  color: '#d97706',  border: '#f59e0b'  },
    'Ausente':      { bg: 'rgba(100,116,139,0.12)', color: '#475569',  border: '#64748b'  },
  };

  days.forEach(d => {
    const dStr = formatDate(d);
    const isToday = dStr === todayStr;
    const isSelected = dStr === selectedDateStr;
    const isPastDay = dStr < todayStr;

    const dayCard = document.createElement('div');
    dayCard.className = `week-day-card${isToday ? ' week-day-card--today' : ''}${isSelected && !isToday ? ' week-day-card--selected' : ''}${isPastDay ? ' week-day-card--past' : ''}`;

    // Encabezado del día
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
    const dayNum = d.getDate();
    const headerDiv = document.createElement('div');
    headerDiv.className = 'week-card-header';
    headerDiv.innerHTML = `
      <p class="week-card-dayname">${dayName.toUpperCase()}</p>
      <p class="week-card-daynum${isToday ? ' week-card-daynum--today' : ''}">${dayNum}</p>
    `;
    headerDiv.style.cursor = 'pointer';
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
      const sc = statusColors[apt.status] || statusColors['Reservado'];
      const isCancelled = apt.status === 'Cancelado';
      const aptEl = document.createElement('div');
      aptEl.className = 'week-card-apt-block';
      aptEl.style.background = sc.bg;
      aptEl.style.borderLeft = `3.5px solid ${sc.border}`;
      if (isCancelled) {
        aptEl.style.opacity = '0.75';
      }
      aptEl.title = `${apt.patient_name} (${apt.time} hs) · ${apt.reason || 'Consulta'} · Estado: ${apt.status}`;
      aptEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
          <span class="week-card-apt-time" style="color:var(--text);">${apt.time} hs</span>
          <span class="week-card-apt-status" style="background:${sc.border}; color:#ffffff; padding:1px 6px; border-radius:4px; font-size:0.65rem; font-weight:700;">${apt.status}</span>
        </div>
        <span class="week-card-apt-name" style="color:var(--text); ${isCancelled ? 'text-decoration:line-through; opacity:0.8;' : ''}">${apt.patient_name}</span>
        ${apt.reason ? `<span style="font-size:0.7rem; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${apt.reason}</span>` : ''}
      `;
      aptEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal({ appointment: apt });
      });
      aptsDiv.appendChild(aptEl);
    });

    if (dayApts.length === 0) {
      aptsDiv.innerHTML = `<div class="week-card-empty">Sin turnos</div>`;
    }

    dayCard.appendChild(aptsDiv);

    // Botón + Cita al fondo
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'week-card-add-btn';
    addBtn.innerHTML = `<i class="fas fa-plus" style="font-size:0.7rem;"></i> Cita`;
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
  const dayBlock = isDateBlocked(dateStr, state.selectedProfessional);

  let bannerHtml = '';
  if (dayBlock) {
    const isAllDay = dayBlock.all_day !== false && (!dayBlock.time_from || !dayBlock.time_to);
    const timeDetail = isAllDay ? 'Día Completo' : `${dayBlock.time_from} a ${dayBlock.time_to} hs`;
    bannerHtml = `
      <div style="background:rgba(239,68,68,0.12); border:1.5px solid var(--danger); border-radius:8px; padding:12px 16px; margin-bottom:14px; color:var(--danger); display:flex; align-items:center; gap:10px;">
        <i class="fas fa-ban" style="font-size:1.4rem;"></i>
        <div>
          <strong style="font-size:0.92rem;">${isAllDay ? 'Día Bloqueado por Emergencia / Ausencia' : 'Horario Bloqueado por Emergencia'}</strong>
          <br><span style="color:var(--text); font-size:0.8rem;"><strong>${dayBlock.professional_name || 'Todos'} (${timeDetail}):</strong> ${dayBlock.reason || 'Sin atención'}</span>
        </div>
      </div>
    `;
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
          <span class="badge ${apt.status}">${apt.status}</span>
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
  if (dayApts.length === 1) {
    // Si hay un único turno, abrir su modal con toda la información
    openModal({ appointment: dayApts[0] });
  } else if (dayApts.length > 1) {
    // Si hay varios, hacer scroll suave al panel diario para ver el listado
    const timelineCard = el('dayTimeline')?.closest('.card');
    timelineCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(`Mostrando los ${dayApts.length} turnos del día`, 'info');
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

