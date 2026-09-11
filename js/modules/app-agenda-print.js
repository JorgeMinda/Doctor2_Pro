/**
 * app-agenda-print.js - Módulo de Impresión de Planilla de Turnos (Día, Semana, Mes)
 */
import { state, api } from './app-state.js';
import { el, formatDate, apiFetch } from './app-utils.js';

function toDisplayDate(isoDate) {
  if (!isoDate) return '';
  const parts = String(isoDate).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getPrintRange(type) {
  let from = null;
  let to = null;

  if (type === 'day') {
    const selected = formatDate(state.selectedDate || new Date());
    from = selected;
    to = selected;
  } else if (type === 'week') {
    const base = new Date(state.selectedDate || state.monthDate);
    const dayOfWeek = base.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() + diff);
    from = formatDate(weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Lunes a Viernes
    to = formatDate(weekEnd);
  } else {
    const y = state.monthDate.getFullYear();
    const m = state.monthDate.getMonth();
    from = formatDate(new Date(y, m, 1));
    to = formatDate(new Date(y, m + 1, 0));
  }

  return { from, to };
}

async function loadAppointmentsForPrint(from, to) {
  try {
    const data = await apiFetch(`${api.appointments}?month=${from.substring(0, 7)}`);
    return Array.isArray(data.appointments) ? data.appointments : [];
  } catch (e) {
    return state.appointments || [];
  }
}

async function buildPrintTable(type) {
  const { from, to } = getPrintRange(type);
  const appointments = await loadAppointmentsForPrint(from, to);
  const professionalsById = new Map((state.professionals || []).map(p => [p.id, p]));
  const patientsById = new Map((state.patients || []).map(p => [p.id, p]));

  const rows = appointments
    .filter(a => !state.selectedProfessional || a.professional_id === state.selectedProfessional || a.professionalId === state.selectedProfessional)
    .filter(a => a.date >= from && a.date <= to)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const title = type === 'day'
    ? 'Planilla Diaria de Turnos'
    : (type === 'week' ? 'Planilla Semanal de Turnos' : 'Planilla Mensual de Turnos');
  const range = `${toDisplayDate(from)} - ${toDisplayDate(to)}`;

  const htmlRows = rows.map(a => {
    const prof = professionalsById.get(a.professional_id || a.professionalId);
    const pat = patientsById.get(a.patient_id || a.patientId);
    const patientName = a.patient_name || a.patientName || pat?.name || 'Paciente';
    const profName = a.professional_name || a.professionalName || prof?.name || '—';
    return `
      <tr>
        <td>${escapeHtml(toDisplayDate(a.date))}</td>
        <td><strong>${escapeHtml(a.time)} hs</strong></td>
        <td>${escapeHtml(profName)}</td>
        <td>${escapeHtml(patientName)}</td>
        <td>${escapeHtml(a.reason || 'Consulta')}</td>
        <td>${escapeHtml(a.status || 'Reservado')}</td>
      </tr>`;
  }).join('');

  const printPlanSheet = el('printPlanSheet');
  if (printPlanSheet) {
    printPlanSheet.innerHTML = `
      <div class="print-sheet-header">
        <h2>${title}</h2>
        <p>Período: ${range}</p>
      </div>
      <table class="print-sheet-table">
        <thead>
          <tr>
            <th>Día</th>
            <th>Hora</th>
            <th>Profesional</th>
            <th>Paciente</th>
            <th>Motivo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows || '<tr><td colspan="6" style="text-align:center; padding:20px;">Sin turnos en el período seleccionado</td></tr>'}
        </tbody>
      </table>`;
  }
}

export function initAgendaPrint() {
  const printPlanBtn = el('printPlanBtn');
  const printPlanModal = el('printPlanModal');
  const closePrintPlan = el('closePrintPlan');
  const cancelPrintPlan = el('cancelPrintPlan');
  const confirmPrintPlan = el('confirmPrintPlan');
  const printPlanType = el('printPlanType');

  if (!printPlanBtn || !printPlanModal || !confirmPrintPlan) return;

  function closePrintModal() {
    printPlanModal.classList.add('hidden');
  }

  printPlanBtn.addEventListener('click', () => {
    if (printPlanType) printPlanType.value = state.calendarView === 'week' ? 'week' : 'day';
    printPlanModal.classList.remove('hidden');
  });

  closePrintPlan?.addEventListener('click', closePrintModal);
  cancelPrintPlan?.addEventListener('click', closePrintModal);

  printPlanModal.addEventListener('click', (e) => {
    if (e.target === printPlanModal) closePrintModal();
  });

  confirmPrintPlan.addEventListener('click', async () => {
    const type = printPlanType?.value || 'week';
    const originalLabel = confirmPrintPlan.innerHTML;
    confirmPrintPlan.disabled = true;
    confirmPrintPlan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando...';

    try {
      await buildPrintTable(type);
      document.body.classList.add('print-sheet-mode');
      closePrintModal();
      await new Promise(resolve => setTimeout(resolve, 80));
      window.print();
    } catch (error) {
      console.error('No se pudo preparar la planilla completa', error);
      alert('No se pudo cargar la planilla. Intentá nuevamente.');
    } finally {
      document.body.classList.remove('print-sheet-mode');
      confirmPrintPlan.disabled = false;
      confirmPrintPlan.innerHTML = originalLabel;
    }
  });
}
