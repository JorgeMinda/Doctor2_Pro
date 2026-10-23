/**
 * app-modal.js - Modales de Turnos, Perfil, Apariencia y Ajustes
 */
import { state, api } from './app-state.js';
import { el, formatDate, apiFetch, showToast } from './app-utils.js';
import { loadMonth } from './app-calendar.js';

let editingAppointmentId = null;

export function openModal(opts = {}) {
  const modal = el('modal');
  if (!modal) return;

  editingAppointmentId = opts.appointment ? opts.appointment.id : null;

  const formProf = el('formProfessional');
  const formDate = el('formDate');
  const formTime = el('formTime');
  const formDuration = el('formDuration');
  const formReason = el('formReason');
  const formPatient = el('formPatient');
  const formPhone = el('formPhone');
  const formEmail = el('formEmail');
  const formCost = el('formCost');
  const formObs = el('formObservation');
  const formStatus = el('formStatus');
  const modalTitle = el('modalTitle');
  const saveBtn = el('saveApt') || el('saveAppointment');
  const deleteBtn = el('deleteAptBtn');
  const cancelBtn = el('cancelAptBtn');

  const now = new Date();
  const todayStr = formatDate(now);

  if (modalTitle) {
    modalTitle.textContent = editingAppointmentId ? 'Editar / Detalle de Cita' : 'Nueva Cita Médica';
  }

  if (opts.appointment) {
    const a = opts.appointment;
    if (formProf) formProf.value = a.professional_id || '';
    if (formDate) {
      formDate.value = a.date || '';
      // Si la cita histórica es del pasado, permitimos ver su fecha pero establecemos min al menor entre a.date y todayStr
      formDate.min = (a.date && a.date < todayStr) ? a.date : todayStr;
      formDate.style.borderColor = '';
    }
    if (formDuration) formDuration.value = String(a.duration || 30);
    if (formReason) formReason.value = a.reason || '';
    if (formPatient) formPatient.value = a.patient_name || '';
    if (formPhone) formPhone.value = a.patient_phone || '';
    if (formCost) formCost.value = a.cost || '';
    if (formObs) formObs.value = a.observation || '';
    if (formStatus) formStatus.value = a.status || 'Reservado';

    // Autocompletar email: primero el de la cita, o buscar en la ficha del paciente
    if (formEmail) {
      formEmail.value = a.patient_email || '';
      if (!formEmail.value && (a.patient_id || a.patient_name) && Array.isArray(state.patients)) {
        const found = state.patients.find(p => p.id === a.patient_id || (p.name && p.name.trim().toLowerCase() === a.patient_name.trim().toLowerCase()));
        if (found && found.email) {
          formEmail.value = found.email;
        }
      }
    }

    // Configurar botones de Eliminar y Cancelar en modo edición
    if (deleteBtn) {
      deleteBtn.style.display = 'inline-flex';
    }
    if (cancelBtn) {
      cancelBtn.style.display = 'inline-flex';
      if (a.status === 'Cancelado') {
        cancelBtn.innerHTML = '<i class="fas fa-redo"></i> Reactivar Cita';
        cancelBtn.style.color = 'var(--primary)';
        cancelBtn.style.borderColor = 'rgba(99,102,241,0.35)';
        cancelBtn.title = 'Reactivar esta cita en la agenda';
      } else {
        cancelBtn.innerHTML = '<i class="fas fa-ban"></i> Cancelar Cita';
        cancelBtn.style.color = '#d97706';
        cancelBtn.style.borderColor = 'rgba(217,119,6,0.35)';
        cancelBtn.title = 'Marcar cita como cancelada (libera el horario)';
      }
    }

    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Turno';
    }

    loadSlots(a.date, a.time);
  } else {
    // Modo Nuevo Turno
    let targetDate = opts.date || formatDate(state.selectedDate);
    if (targetDate < todayStr) {
      targetDate = todayStr;
    }
    if (formDate) {
      formDate.value = targetDate;
      formDate.min = todayStr;
      formDate.style.borderColor = '';
    }
    if (formDuration) formDuration.value = '30';
    if (formReason) formReason.value = '';
    if (formCost) formCost.value = '';
    if (formObs) formObs.value = '';
    if (formStatus) formStatus.value = 'Reservado';

    // Ocultar botones de eliminar/cancelar para citas nuevas
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Turno';

    // Resolver paciente si viene por ID o nombre
    let foundPatient = null;
    if (opts.patientId && Array.isArray(state.patients)) {
      foundPatient = state.patients.find(p => p.id === opts.patientId);
    } else if (opts.patientName && Array.isArray(state.patients)) {
      foundPatient = state.patients.find(p => p.name && p.name.trim().toLowerCase() === opts.patientName.trim().toLowerCase());
    }

    if (foundPatient) {
      if (formPatient) formPatient.value = foundPatient.name;
      if (formPhone) formPhone.value = foundPatient.phone || opts.patientPhone || '';
      if (formEmail) formEmail.value = foundPatient.email || '';
      if (formProf && foundPatient.assignedProfessionalId) formProf.value = foundPatient.assignedProfessionalId;
      if (modal) modal.dataset.patientId = foundPatient.id;
    } else {
      // Sin paciente preseleccionado: limpiar campos del paciente
      if (formPatient) formPatient.value = opts.patientName || '';
      if (formPhone) formPhone.value = opts.patientPhone || '';
      if (formEmail) formEmail.value = opts.patientEmail || '';
      if (opts.patientId && modal) modal.dataset.patientId = opts.patientId;
    }

    loadSlots(targetDate, opts.time || null);
  }

  // Escuchadores de eventos para actualizar horarios reactivamente
  if (formDate && !formDate.dataset.hasSlotListener) {
    formDate.dataset.hasSlotListener = 'true';
    const onDateChange = () => {
      const nowNow = new Date();
      const currentToday = formatDate(nowNow);
      const val = formDate.value;

      if (!editingAppointmentId) {
        if (val && val < currentToday) {
          showToast('⚠️ No es posible seleccionar fechas pasadas. Seleccioná hoy o una fecha posterior.', 'warning');
          formDate.value = currentToday;
          formDate.style.borderColor = 'var(--danger)';
          setTimeout(() => { if (formDate) formDate.style.borderColor = ''; }, 2500);
        }
      } else {
        const origApt = state.appointments?.find(a => a.id === editingAppointmentId);
        const origDate = origApt?.date || currentToday;
        if (val && val < currentToday && val !== origDate) {
          showToast('⚠️ No es posible reprogramar un turno a una fecha pasada.', 'warning');
          formDate.value = origDate >= currentToday ? origDate : currentToday;
          formDate.style.borderColor = 'var(--danger)';
          setTimeout(() => { if (formDate) formDate.style.borderColor = ''; }, 2500);
        }
      }
      loadSlots(formDate.value, formTime ? formTime.value : null);
    };

    formDate.addEventListener('change', onDateChange);
    formDate.addEventListener('input', onDateChange);
  }
  if (formProf && !formProf.dataset.hasSlotListener) {
    formProf.dataset.hasSlotListener = 'true';
    formProf.addEventListener('change', () => loadSlots(formDate ? formDate.value : null, formTime ? formTime.value : null));
  }
  if (formDuration && !formDuration.dataset.hasSlotListener) {
    formDuration.dataset.hasSlotListener = 'true';
    formDuration.addEventListener('change', () => loadSlots(formDate ? formDate.value : null, formTime ? formTime.value : null));
  }

  // Botones de acción cancelar / eliminar
  if (deleteBtn && !deleteBtn.dataset.hasListener) {
    deleteBtn.dataset.hasListener = 'true';
    deleteBtn.addEventListener('click', deleteAppointment);
  }
  if (cancelBtn && !cancelBtn.dataset.hasListener) {
    cancelBtn.dataset.hasListener = 'true';
    cancelBtn.addEventListener('click', toggleCancelAppointment);
  }

  // Inicializar autocompletado de pacientes
  setupPatientAutocomplete();

  modal.classList.remove('hidden');
}

export function closeModal() {
  const modal = el('modal');
  if (modal) {
    modal.classList.add('hidden');
    delete modal.dataset.patientId;
  }
  editingAppointmentId = null;
  el('patientAutocompleteDropdown')?.classList.add('hidden');
}

/**
 * Autocompletado inteligente de pacientes en el formulario de turnos.
 * Usa un atributo data en el input como guardia para no duplicar listeners,
 * pero re-oculta el dropdown y limpia el estado cada vez que se abre el modal.
 */
function setupPatientAutocomplete() {
  const input = el('formPatient');
  const dropdown = el('patientAutocompleteDropdown');
  if (!input || !dropdown) return;

  // Siempre cerrar el dropdown al (re)abrir el modal
  dropdown.classList.add('hidden');
  dropdown.innerHTML = '';

  // Si ya tiene listeners configurados, no duplicar - solo reset UI
  if (input.dataset.autocomplete === 'true') return;
  input.dataset.autocomplete = 'true';

  function renderDropdown(filterText = '') {
    const q = filterText.toLowerCase().trim();
    const matches = (state.patients || []).filter(p => {
      if (!q) return true;
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.dni && p.dni.toString().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    }).slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="patient-autocomplete-item" style="color:var(--muted); cursor:default;">No se encontraron pacientes existentes. Podés escribir uno nuevo.</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = matches.map(p => `
      <div class="patient-autocomplete-item" data-id="${p.id}">
        <div class="pat-info">
          <div class="pat-name"><i class="fas fa-user-circle" style="color:var(--primary);"></i> ${p.name}</div>
          <div class="pat-meta">
            ${p.dni ? `<span>Cédula: ${p.dni}</span>` : ''} 
            ${p.phone ? `<span>· 📱 ${p.phone}</span>` : ''}
            ${p.email ? `<span>· ✉️ ${p.email}</span>` : ''}
            ${p.insurance ? `<span>· 🏥 ${p.insurance}</span>` : ''}
          </div>
        </div>
        <span class="pat-badge">Seleccionar</span>
      </div>
    `).join('');

    dropdown.classList.remove('hidden');
  }

  function selectPatient(patient) {
    input.value = patient.name;
    const formPhone = el('formPhone');
    const formEmail = el('formEmail');
    const formProf = el('formProfessional');
    const modal = el('modal');

    if (formPhone && patient.phone) formPhone.value = patient.phone;
    if (formEmail && patient.email) formEmail.value = patient.email;
    if (formProf && patient.assignedProfessionalId) {
      formProf.value = patient.assignedProfessionalId;
    }
    if (modal) modal.dataset.patientId = patient.id;

    dropdown.classList.add('hidden');
    showToast(`Paciente "${patient.name}" autocompletado`, 'info');

    // Recalcular horarios disponibles del profesional seleccionado
    loadSlots();
  }

  input.addEventListener('input', () => renderDropdown(input.value));
  input.addEventListener('focus', () => renderDropdown(input.value));

  // Autocompletado si escribe el nombre completo exacto y sale del input
  input.addEventListener('blur', () => {
    setTimeout(() => {
      const val = input.value.trim().toLowerCase();
      if (!val || !Array.isArray(state.patients)) return;
      const exactMatch = state.patients.find(p => p.name && p.name.trim().toLowerCase() === val);
      if (exactMatch) {
        selectPatient(exactMatch);
      }
    }, 200);
  });

  // Delegación de eventos en el contenedor del dropdown (evita duplicar listeners por ítem)
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.patient-autocomplete-item[data-id]');
    if (!item) return;
    const patId = item.dataset.id;
    const patient = (state.patients || []).find(p => p.id === patId);
    if (patient) selectPatient(patient);
  });

  // Cerrar al hacer clic afuera
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}


/**
 * Carga y renderiza la cuadrícula interactiva de horarios del día (Estilo Radix / Tailwind)
 * Valida horarios disponibles, ocupados y pasados en tiempo real.
 */
export function loadSlots(selectedDate = null, explicitTime = null) {
  const container = el('slotsGridContainer');
  const select = el('formTime');
  const profSelect = el('formProfessional');
  const dateInput = el('formDate');
  const freeCountEl = el('slotsFreeCount');
  const selectedBadge = el('selectedTimeBadge');
  const saveBtn = el('saveApt') || el('saveAppointment');

  const now = new Date();
  const todayStr = formatDate(now);
  const targetDate = selectedDate || dateInput?.value || todayStr;
  const isPastDate = targetDate < todayStr;
  const isToday = targetDate === todayStr;
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();
  const profId = profSelect?.value || '';

  if (!container && !select) return;

  let currentTime = explicitTime || select?.value || '';

  // VALIDACIÓN ESTRICTA: Fecha pasada en nuevo agendamiento
  if (!editingAppointmentId && isPastDate) {
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 20px 14px; text-align: center; color: #dc2626; font-size: 0.88rem; background: rgba(239,68,68,0.06); border-radius: 10px; border: 1.5px dashed rgba(239,68,68,0.35);">
          <i class="fas fa-calendar-times" style="font-size: 1.6rem; margin-bottom: 6px; display: block; color: #dc2626;"></i>
          <strong>Fecha no disponible:</strong> La fecha seleccionada (${targetDate}) ya ha transcurrido.
          <div style="margin-top: 4px; font-size: 0.8rem; color: var(--muted);">Por favor elegí la fecha de hoy o una fecha posterior para agendar turnos.</div>
          <button type="button" class="btn primary" style="margin-top: 10px; font-size: 0.78rem; padding: 5px 14px; cursor: pointer;" id="btnGoToday">
            <i class="fas fa-calendar-day"></i> Ir a Fecha de Hoy
          </button>
        </div>
      `;
      const btnGoToday = container.querySelector('#btnGoToday');
      if (btnGoToday) {
        btnGoToday.addEventListener('click', () => {
          if (dateInput) {
            dateInput.value = todayStr;
            dateInput.dispatchEvent(new Event('change'));
          } else {
            loadSlots(todayStr);
          }
        });
      }
    }
    if (select) {
      select.innerHTML = '<option value="">(Fecha Pasada - No disponible)</option>';
      select.value = '';
    }
    if (freeCountEl) freeCountEl.textContent = '0 horarios disponibles (Fecha pasada)';
    if (selectedBadge) selectedBadge.style.display = 'none';
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  // 1. Verificar si la fecha está bloqueada por emergencia o feriado
  const dayBlocks = (state.blockedDays || []).filter(b => {
    const from = b.date_from || b.date;
    const to = b.date_to || from;
    const inRange = targetDate >= from && targetDate <= to;
    if (!inRange) return false;
    return b.professional_id === 'all' || b.professional_id === profId;
  });

  const fullDayBlock = dayBlocks.find(b => b.all_day !== false && (!b.time_from || !b.time_to));
  if (fullDayBlock) {
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 20px 14px; text-align: center; color: var(--danger); font-size: 0.88rem; background: rgba(239,68,68,0.06); border-radius: 8px; border: 1px dashed rgba(239,68,68,0.3);">
          <i class="fas fa-ban" style="font-size: 1.4rem; margin-bottom: 6px; display: block;"></i>
          <strong>Fecha no disponible:</strong> Bloqueada por "${fullDayBlock.reason}" (${fullDayBlock.professional_name || 'Todo el consultorio'})
        </div>
      `;
    }
    if (select) select.innerHTML = '<option value="">(Fecha Bloqueada - Día Completo)</option>';
    if (freeCountEl) freeCountEl.textContent = '0 horarios libres (Día bloqueado)';
    if (selectedBadge) selectedBadge.style.display = 'none';
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  if (saveBtn) saveBtn.disabled = false;

  // 2. Obtener citas existentes para esta fecha y profesional (excluyendo canceladas y la cita en edición)
  const existingApts = (state.appointments || []).filter(a => {
    if (a.date !== targetDate) return false;
    if (a.status === 'Cancelado') return false; // Citas canceladas dejan el horario libre
    if (editingAppointmentId && a.id === editingAppointmentId) return false; // La cita propia no se auto-bloquea
    if (profId && a.professional_id && a.professional_id !== profId) return false; // Es de otro profesional
    return true;
  });

  // Generar lista de horarios desde 07:00 hasta 20:30 (cada 30 min)
  const times = [];
  for (let h = 7; h <= 20; h++) {
    const hh = String(h).padStart(2, '0');
    times.push(`${hh}:00`);
    times.push(`${hh}:30`);
  }

  let freeSlotsCount = 0;
  const slotDataList = [];

  for (const t of times) {
    const [h, m] = t.split(':').map(Number);
    const slotMin = h * 60 + m;

    // Verificar bloqueo horario específico por emergencia/feriado
    const hourBlock = dayBlocks.find(b => !b.all_day && b.time_from && b.time_to && t >= b.time_from && t <= b.time_to);

    // Verificar si alguna cita existente ocupa este minuto del día según su hora de inicio y duración
    const occupyingApt = existingApts.find(a => {
      const aDur = parseInt(a.duration) || 30;
      const [aH, aM] = (a.time || '00:00').split(':').map(Number);
      const aStart = aH * 60 + aM;
      const aEnd = aStart + aDur;
      return (slotMin >= aStart && slotMin < aEnd);
    });

    const isPast = isPastDate || (isToday && (slotMin < currentMinutesNow));

    let status = 'available';
    let occupantName = '';

    if (hourBlock) {
      status = 'occupied';
      occupantName = `Bloqueo: ${hourBlock.reason}`;
    } else if (occupyingApt) {
      status = 'occupied';
      occupantName = `Cita: ${occupyingApt.patient_name || 'Paciente'}`;
    } else if (isPast) {
      if (editingAppointmentId && currentTime === t) {
        status = 'selected';
      } else {
        status = 'past';
      }
    } else if (currentTime === t) {
      status = 'selected';
      freeSlotsCount++;
    } else {
      status = 'available';
      freeSlotsCount++;
    }

    slotDataList.push({ time: t, status, occupantName, isSelected: status === 'selected' });
  }

  // Si no hay horario actual seleccionado o el seleccionado ya no es válido (ocupado o pasado en cita nueva):
  const currentSlotObj = slotDataList.find(s => s.time === currentTime);
  const isCurrentInvalid = !currentSlotObj || currentSlotObj.status === 'occupied' || (!editingAppointmentId && currentSlotObj.status === 'past');

  if (!currentTime || isCurrentInvalid) {
    const firstFree = slotDataList.find(s => s.status === 'available');
    if (firstFree) {
      currentTime = firstFree.time;
      firstFree.status = 'selected';
      firstFree.isSelected = true;
    } else {
      currentTime = '';
    }
  }

  // Actualizar contador superior
  if (freeCountEl) {
    if (freeSlotsCount === 0) {
      freeCountEl.textContent = isToday ? '0 horarios libres (Todos transcurridos u ocupados)' : '0 horarios disponibles';
    } else {
      freeCountEl.textContent = `${freeSlotsCount} horario${freeSlotsCount === 1 ? '' : 's'} libre${freeSlotsCount === 1 ? '' : 's'}`;
    }
  }

  // Sincronizar select nativo oculto
  if (select) {
    select.innerHTML = times.map(t => {
      const slot = slotDataList.find(s => s.time === t);
      const disabledAttr = (slot && (slot.status === 'occupied' || (!editingAppointmentId && slot.status === 'past'))) ? 'disabled' : '';
      return `<option value="${t}" ${disabledAttr} ${t === currentTime ? 'selected' : ''}>${t} hs</option>`;
    }).join('');
    select.value = currentTime;
  }

  // Actualizar badge con el horario seleccionado
  if (selectedBadge) {
    if (currentTime) {
      selectedBadge.textContent = `${currentTime} hs`;
      selectedBadge.style.display = 'inline-flex';
    } else {
      selectedBadge.style.display = 'none';
    }
  }

  // Si es cita nueva y no quedan turnos disponibles en el día, deshabilitar botón de guardar
  if (!editingAppointmentId && freeSlotsCount === 0 && !currentTime) {
    if (saveBtn) saveBtn.disabled = true;
  }

  // Renderizar los chips interactivos en el contenedor
  if (container) {
    container.innerHTML = slotDataList.map(s => {
      if (s.status === 'occupied') {
        return `
          <button type="button" disabled title="Horario ocupado (${s.occupantName})" class="time-slot-btn badge occupied">
            <span style="width:6px; height:6px; border-radius:50%; background:currentColor; display:inline-block;"></span>
            <span>${s.time} hs</span>
          </button>
        `;
      }
      if (s.status === 'past') {
        return `
          <button type="button" disabled title="Horario ya transcurrido en el día de hoy" class="time-slot-btn badge past">
            <span style="width:6px; height:6px; border-radius:50%; background:currentColor; opacity:0.6; display:inline-block;"></span>
            <span>${s.time} hs</span>
          </button>
        `;
      }
      if (s.status === 'selected' || s.isSelected) {
        return `
          <button type="button" title="Horario seleccionado (${s.time} hs)" class="time-slot-btn badge primary selected" data-time="${s.time}">
            <i class="fas fa-check-circle" style="font-size:0.75rem;"></i>
            <span>${s.time} hs</span>
          </button>
        `;
      }
      return `
        <button type="button" title="Disponible para agendar (${s.time} hs)" class="time-slot-btn badge available" data-time="${s.time}">
          <i class="far fa-clock" style="font-size:0.68rem; opacity:0.85;"></i>
          <span>${s.time} hs</span>
        </button>
      `;
    }).join('');

    // Listener de clic para seleccionar horario
    container.querySelectorAll('.time-slot-btn.available, .time-slot-btn.selected').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const chosen = btn.dataset.time;
        if (!chosen) return;
        if (select) select.value = chosen;
        loadSlots(targetDate, chosen);
      });
    });
  }
}

/**
 * Guarda o actualiza un turno con validación estricta de colisión horaria.
 */
export async function saveAppointment() {
  const profId = el('formProfessional')?.value;
  const date = el('formDate')?.value;
  const time = el('formTime')?.value;
  const duration = parseInt(el('formDuration')?.value) || 30;
  const reason = el('formReason')?.value.trim();
  const patientName = el('formPatient')?.value.trim();
  const patientPhone = el('formPhone')?.value.trim();
  const patientEmail = el('formEmail')?.value.trim();
  const cost = parseFloat(el('formCost')?.value) || 0;
  const observation = el('formObservation')?.value.trim();

  if (!patientName || !date || !time) {
    showToast('Por favor completá paciente, fecha y horario', 'warning');
    return;
  }

  // 1. Validación de Bloqueo por Emergencia / Feriado
  const blocked = (state.blockedDays || []).find(b => {
    const from = b.date_from || b.date;
    const to = b.date_to || from;
    const inRange = date >= from && date <= to;
    if (!inRange) return false;
    const matchProf = (b.professional_id === 'all' || b.professional_id === profId);
    if (!matchProf) return false;

    const isAllDay = b.all_day !== false && (!b.time_from || !b.time_to);
    if (isAllDay) return true;

    return (time >= b.time_from && time <= b.time_to);
  });

  if (blocked) {
    const blockTimeText = (blocked.time_from && blocked.time_to) ? `en el horario ${blocked.time_from} a ${blocked.time_to} hs` : 'en esta fecha';
    showToast(`No es posible agendar: el profesional no atiende ${blockTimeText} por "${blocked.reason}"`, 'error');
    return;
  }

  // 2. VALIDACIÓN ESTRICTA: Horario ya ocupado por otra cita existente para este profesional
  const [newH, newM] = time.split(':').map(Number);
  const newStartMin = newH * 60 + newM;
  const newEndMin = newStartMin + duration;

  const collision = (state.appointments || []).find(a => {
    if (editingAppointmentId && a.id === editingAppointmentId) return false;
    if (a.status === 'Cancelado') return false;
    if (a.date !== date) return false;

    // Validar profesional coincidente
    const matchProf = !profId || !a.professional_id || a.professional_id === profId;
    if (!matchProf) return false;

    const aDur = parseInt(a.duration) || 30;
    const [aH, aM] = (a.time || '00:00').split(':').map(Number);
    const aStartMin = aH * 60 + aM;
    const aEndMin = aStartMin + aDur;

    return (newStartMin < aEndMin && newEndMin > aStartMin);
  });

  if (collision) {
    showToast(`⚠️ Horario no disponible: ya existe una cita agendada para "${collision.patient_name || 'otro paciente'}" a las ${collision.time} hs con este profesional. Por favor seleccioná otro horario libre.`, 'error');
    loadSlots(date, time);
    return;
  }

  // 3. VALIDACIÓN ESTRICTA: Fecha y Horario en el Pasado
  const now = new Date();
  const todayStr = formatDate(now);
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

  if (!editingAppointmentId) {
    if (date < todayStr) {
      showToast('⚠️ No es posible agendar una cita en una fecha pasada.', 'error');
      return;
    }
    if (date === todayStr && newStartMin < currentMinutesNow) {
      showToast('⚠️ No es posible agendar en un horario que ya transcurrió el día de hoy.', 'error');
      return;
    }
  } else {
    // Si se está editando una cita existente y se reprograma la fecha u hora
    const originalApt = (state.appointments || []).find(a => a.id === editingAppointmentId);
    if (originalApt) {
      const isDateChanged = originalApt.date !== date;
      const isTimeChanged = originalApt.time !== time;
      if (isDateChanged || isTimeChanged) {
        if (date < todayStr) {
          showToast('⚠️ No es posible reagendar una cita a una fecha pasada.', 'error');
          return;
        }
        if (date === todayStr && newStartMin < currentMinutesNow) {
          showToast('⚠️ No es posible reagendar una cita a un horario que ya transcurrió hoy.', 'error');
          return;
        }
      }
    }
  }

  // Resolver patientId si coincide con un paciente registrado
  let patientId = el('modal')?.dataset?.patientId || null;
  if (patientId && Array.isArray(state.patients)) {
    const matched = state.patients.find(p => p.id === patientId);
    if (!matched || matched.name.trim().toLowerCase() !== patientName.toLowerCase()) {
      const nameMatch = state.patients.find(p => p.name.trim().toLowerCase() === patientName.toLowerCase());
      patientId = nameMatch ? nameMatch.id : null;
    }
  } else if (!patientId && Array.isArray(state.patients)) {
    const nameMatch = state.patients.find(p => p.name.trim().toLowerCase() === patientName.toLowerCase());
    if (nameMatch) patientId = nameMatch.id;
  }

  // Resolver profesional existente
  let prof = null;
  if (Array.isArray(state.professionals) && state.professionals.length > 0) {
    prof = state.professionals.find(p => p.id === profId) || state.professionals[0];
  }

  const formStatus = el('formStatus');
  const status = formStatus ? formStatus.value : 'Reservado';

  const payload = {
    id: editingAppointmentId,
    patient_id: patientId,
    professional_id: prof ? prof.id : (profId || null),
    professional_name: prof ? prof.name : '',
    date,
    time,
    duration,
    reason,
    patient_name: patientName,
    patient_phone: patientPhone,
    patient_email: patientEmail,
    cost,
    observation,
    status
  };

  try {
    const method = editingAppointmentId ? 'PATCH' : 'POST';
    await apiFetch(api.appointments, {
      method,
      body: JSON.stringify(payload)
    });

    showToast(editingAppointmentId ? 'Turno actualizado con éxito' : 'Turno agendado con éxito', 'success');
    closeModal();
    loadMonth();
  } catch (err) {
    showToast(err.message || 'Error al guardar el turno', 'error');
  }
}

/**
 * Cancela o reactiva la cita actualmente abierta en edición
 */
export async function toggleCancelAppointment() {
  if (!editingAppointmentId) return;
  const apt = (state.appointments || []).find(a => a.id === editingAppointmentId);
  if (!apt) return;

  const isCurrentlyCancelled = apt.status === 'Cancelado';
  const targetStatus = isCurrentlyCancelled ? 'Reservado' : 'Cancelado';

  const confirmMsg = isCurrentlyCancelled
    ? `¿Deseas reactivar la cita de "${apt.patient_name}" para el ${apt.date} a las ${apt.time} hs?`
    : `¿Estás seguro de que deseas cancelar la cita de "${apt.patient_name}" (${apt.date} a las ${apt.time} hs)?\n\nEl horario se liberará en la agenda para que otros pacientes puedan agendarse.`;

  if (!confirm(confirmMsg)) return;

  try {
    await apiFetch(api.appointments, {
      method: 'PATCH',
      body: JSON.stringify({ id: editingAppointmentId, status: targetStatus })
    });

    apt.status = targetStatus;
    showToast(isCurrentlyCancelled ? 'Cita reactivada con éxito' : 'Cita marcada como Cancelada (Horario liberado)', 'success');
    closeModal();
    loadMonth();
  } catch (err) {
    showToast(err.message || 'Error al actualizar el estado de la cita', 'error');
  }
}

/**
 * Elimina permanentemente la cita de la base de datos
 */
export async function deleteAppointment() {
  if (!editingAppointmentId) return;
  const apt = (state.appointments || []).find(a => a.id === editingAppointmentId);
  const patName = apt ? apt.patient_name : 'esta cita';

  const confirmMsg = `🚨 CONFIRMAR ELIMINACIÓN PERMANENTE\n\n¿Estás seguro de que deseas eliminar permanentemente la cita de "${patName}"?\n\nEsta acción eliminará el registro de la base de datos de forma irreversible.`;
  if (!confirm(confirmMsg)) return;

  try {
    await apiFetch(`${api.appointments}?id=${encodeURIComponent(editingAppointmentId)}`, {
      method: 'DELETE'
    });

    // Eliminar del estado local
    if (Array.isArray(state.appointments)) {
      state.appointments = state.appointments.filter(a => a.id !== editingAppointmentId);
    }

    showToast('Cita eliminada permanentemente con éxito', 'success');
    closeModal();
    loadMonth();
  } catch (err) {
    showToast(err.message || 'Error al eliminar la cita', 'error');
  }
}
window.deleteApt = deleteAppointment;
window.cancelApt = toggleCancelAppointment;

// Modal de Perfil & Apariencia
export function openProfile() {
  const modal = el('profileModal');
  if (!modal) return;

  let prof = null;
  if (state.user && state.professionals && state.professionals.length > 0) {
    prof = state.professionals.find(p => 
      (p.email && state.user.email && p.email.toLowerCase() === state.user.email.toLowerCase()) ||
      (p.name && state.user.name && p.name.toLowerCase().includes(state.user.name.toLowerCase()))
    );
  }

  if (el('profileEmail')) el('profileEmail').value = state.user?.email || 'contacto@consultorios.pro';
  if (el('profilePhone')) el('profilePhone').value = state.user?.phone || '+593991234567';
  if (el('profileLicenseCode')) el('profileLicenseCode').value = state.user?.license_code || prof?.license_code || '';
  if (el('profilePass')) el('profilePass').value = '';

  modal.classList.remove('hidden');
}

export function closeProfile() {
  el('profileModal')?.classList.add('hidden');
}

export function openProfileEmergencyBlock() {
  closeProfile();
  // Buscar profesional asociado al usuario o usar el seleccionado / primer profesional
  let prof = null;
  if (state.user && state.professionals && state.professionals.length > 0) {
    prof = state.professionals.find(p => 
      (p.email && state.user.email && p.email.toLowerCase() === state.user.email.toLowerCase()) ||
      (p.name && state.user.name && p.name.toLowerCase().includes(state.user.name.toLowerCase()))
    );
  }
  if (!prof && state.selectedProfessional) {
    prof = state.professionals.find(p => p.id === state.selectedProfessional);
  }
  if (!prof && state.professionals && state.professionals.length > 0) {
    prof = state.professionals[0];
  }

  if (prof && window.openDoctorEmergencyBlock) {
    window.openDoctorEmergencyBlock(prof.id);
  } else {
    // Si no hay profesional específico, abrir modal general
    const blockedBtn = el('blockedDaysBtn');
    if (blockedBtn) blockedBtn.click();
  }
}

export async function saveProfile() {
  const email = el('profileEmail')?.value.trim();
  const phone = el('profilePhone')?.value.trim();
  const licenseCode = el('profileLicenseCode')?.value.trim() || '';

  try {
    await apiFetch(api.profile, {
      method: 'PATCH',
      body: JSON.stringify({ email, phone, license_code: licenseCode })
    });

    if (state.user) {
      state.user.email = email;
      state.user.phone = phone;
      state.user.license_code = licenseCode;
    }

    // Also update matching professional in state.professionals
    if (state.professionals) {
      const prof = state.professionals.find(p => 
        (p.email && email && p.email.toLowerCase() === email.toLowerCase()) ||
        (p.name && state.user?.name && p.name.toLowerCase().includes(state.user.name.toLowerCase()))
      );
      if (prof) {
        prof.license_code = licenseCode;
        if (email) prof.email = email;
        if (phone) prof.phone = phone;
      }
    }

    showToast('Perfil actualizado correctamente', 'success');
    closeProfile();
  } catch (err) {
    showToast(err.message || 'Error al actualizar perfil', 'error');
  }
}

export function openAppearanceModal() {
  syncAppearanceUI();
  el('appearanceModal')?.classList.remove('hidden');
}

export function closeAppearanceModal() {
  el('appearanceModal')?.classList.add('hidden');
}

// Estado temporal o activo de apariencia
let currentAppearance = {
  theme: localStorage.getItem('doctor2_theme') || 'light',
  fontSize: localStorage.getItem('doctor2_fontSize') || 'normal',
  density: localStorage.getItem('doctor2_density') || 'normal',
  sidebar: localStorage.getItem('doctor2_sidebar') || 'fixed'
};

export function initAppearance() {
  setTheme(currentAppearance.theme, true);
  setFontSize(currentAppearance.fontSize, true);
  setAgendaDensity(currentAppearance.density, true);
  setSidebarMode(currentAppearance.sidebar, true);
}

function syncAppearanceUI() {
  // 1. Temas
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentAppearance.theme);
  });
  // 2. Fuente
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === currentAppearance.fontSize);
  });
  // 3. Densidad
  document.querySelectorAll('.density-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.density === currentAppearance.density);
  });
  // 4. Sidebar
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sidebar === currentAppearance.sidebar);
  });
}

export function setTheme(themeName, silent = false) {
  currentAppearance.theme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('doctor2_theme', themeName);
  
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === themeName);
  });

  if (!silent) {
    const themeLabels = {
      dark: 'Oscuro',
      light: 'Claro',
      blue: 'Azul Cyber',
      green: 'Verde Esmeralda',
      purple: 'Violeta Velvet',
      rose: 'Rosa Coral',
      amber: 'Ámbar Solar',
      teal: 'Turquesa Mint'
    };
    showToast(`Tema ${themeLabels[themeName] || themeName} aplicado`, 'info');
  }
}

export function setFontSize(size, silent = false) {
  currentAppearance.fontSize = size;
  document.documentElement.setAttribute('data-font-size', size);
  localStorage.setItem('doctor2_fontSize', size);

  document.querySelectorAll('.size-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.size === size);
  });

  if (!silent) {
    showToast(`Tamaño de texto: ${size === 'small' ? 'Pequeño' : size === 'large' ? 'Grande' : 'Normal'}`, 'info');
  }
}

export function setAgendaDensity(density, silent = false) {
  currentAppearance.density = density;
  document.documentElement.setAttribute('data-agenda-density', density);
  localStorage.setItem('doctor2_density', density);

  document.querySelectorAll('.density-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.density === density);
  });

  if (!silent) {
    showToast(`Distribución de agenda: ${density}`, 'info');
  }
}

export function setSidebarMode(mode, silent = false) {
  currentAppearance.sidebar = mode;
  document.documentElement.setAttribute('data-sidebar-mode', mode);
  localStorage.setItem('doctor2_sidebar', mode);

  document.querySelectorAll('.sidebar-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sidebar === mode);
  });

  if (!silent) {
    showToast(`Menú lateral: ${mode === 'auto' ? 'Automático (al pasar el mouse)' : 'Fijo'}`, 'info');
  }
}

export function saveAppearanceSettings() {
  if (state.user) {
    state.user.appearance = { ...currentAppearance };
    apiFetch(api.profile, {
      method: 'PATCH',
      body: JSON.stringify({ appearance: currentAppearance })
    }).catch(() => {});
  }
  showToast('Preferencias de apariencia guardadas con éxito', 'success');
  closeAppearanceModal();
}

export function resetAppearanceSettings() {
  setTheme('light');
  setFontSize('normal');
  setAgendaDensity('normal');
  setSidebarMode('fixed');
  saveAppearanceSettings();
  showToast('Apariencia restablecida a valores por defecto', 'info');
}

// Exponer funciones en window para invocación desde el DOM
window.setTheme = setTheme;
window.setFontSize = setFontSize;
window.setAgendaDensity = setAgendaDensity;
window.setSidebarMode = setSidebarMode;
window.saveAppearanceSettings = saveAppearanceSettings;
window.resetAppearanceSettings = resetAppearanceSettings;

// Placeholders de Ajustes Avanzados
export function resetSystem() { if (confirm('¿Estás seguro de reiniciar los datos?')) showToast('Sistema reiniciado', 'info'); }
export function saveMenuPermissions() { showToast('Permisos guardados', 'success'); }
export function saveCountryCode() { showToast('Código de país guardado', 'success'); }
export function saveSheetsSyncSettings() { showToast('Sincronización configurada', 'success'); }
export function exportBackup() { showToast('Copia de seguridad descargada', 'success'); }
export function triggerImportBackup() { el('backupFileInput')?.click(); }
export function importBackup(file) { showToast(`Copia ${file.name} restaurada`, 'success'); }
