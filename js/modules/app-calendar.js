/**
 * app-calendar.js - Gestión de Agenda, Vistas de Calendario y Turnos
 */
import { state, api } from './app-state.js';
import { el, formatDate, formatReadableDate, apiFetch, showToast } from './app-utils.js';
import { openModal } from './app-modal.js';

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
    const data = await apiFetch(url);
    state.appointments = data.appointments || [];

    scheduleAgendaRender();
  } catch (err) {
    console.warn('No se pudieron cargar los turnos del mes', err);
  }
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

    cell.innerHTML = `
      <div class="date">${day}</div>
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

  grid.className = 'calendar-grid week-view';
  grid.innerHTML = '';

  const startOfWeek = getStartOfWeek(state.selectedDate);
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  grid.style.gridTemplateColumns = `60px repeat(5, 1fr)`;

  // Esquina
  const corner = document.createElement('div');
  corner.className = 'week-corner';
  grid.appendChild(corner);

  const selectedDateStr = formatDate(state.selectedDate);
  const todayStr = formatDate(new Date());

  // Encabezados de días
  days.forEach(d => {
    const dStr = formatDate(d);
    const head = document.createElement('div');
    head.className = 'week-day-header';
    if (dStr === selectedDateStr) head.classList.add('selected');
    if (dStr === todayStr) head.classList.add('today');

    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
    head.innerHTML = `<span>${dayName}</span> <strong>${d.getDate()}</strong>`;
    head.addEventListener('click', () => {
      state.selectedDate = d;
      scheduleAgendaRender();
    });
    grid.appendChild(head);
  });

  // Horas (08:00 a 20:00)
  for (let h = 8; h <= 20; h++) {
    const hourStr = `${String(h).padStart(2, '0')}:00`;

    const hourCell = document.createElement('div');
    hourCell.className = 'week-hour-cell';
    hourCell.textContent = hourStr;
    grid.appendChild(hourCell);

    days.forEach(d => {
      const dStr = formatDate(d);
      const timeCell = document.createElement('div');
      timeCell.className = 'week-time-cell';
      timeCell.dataset.date = dStr;
      timeCell.dataset.time = hourStr;

      // Buscar turnos en esta hora
      const apts = state.appointments.filter(a => a.date === dStr && a.time.startsWith(String(h).padStart(2, '0')));
      apts.forEach(apt => {
        const aptEl = document.createElement('div');
        aptEl.className = 'week-apt-block';
        aptEl.textContent = `${apt.time} ${apt.patient_name}`;
        aptEl.title = `${apt.patient_name} (${apt.reason || 'Consulta'})`;
        aptEl.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal({ appointment: apt });
        });
        timeCell.appendChild(aptEl);
      });

      timeCell.addEventListener('click', () => {
        state.selectedDate = d;
        openModal({ date: dStr, time: hourStr });
      });

      grid.appendChild(timeCell);
    });
  }
}

export function renderDayTimeline() {
  const timeline = el('dayTimeline');
  const title = el('dayTitle');
  if (!timeline) return;

  const dateStr = formatDate(state.selectedDate);
  if (title) title.textContent = formatReadableDate(dateStr);

  const dayApts = state.appointments.filter(a => a.date === dateStr);

  if (dayApts.length === 0) {
    timeline.innerHTML = '<div class="empty"><i class="fas fa-calendar-day" style="font-size:2rem; color:var(--muted); margin-bottom:8px; display:block;"></i>Sin turnos agendados para este día.</div>';
    return;
  }

  const now = new Date();

  timeline.innerHTML = dayApts.map(apt => {
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
