/**
 * app-payments.js - Módulo de Gestión de Pagos, Cobros de Turnos y Cuenta Corriente del Paciente
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';

let currentAppointment = null;

export function openAppointmentDetail(apt) {
  currentAppointment = apt;
  let modal = el('appointmentDetailModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'appointmentDetailModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-body" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <p class="muted" style="margin:0; font-size:0.85rem;">Gestión Clínica y Financiera</p>
            <h3 style="margin:2px 0 0;"><i class="fas fa-file-invoice-dollar" style="color:var(--primary);"></i> Detalle del Turno & Pagos</h3>
          </div>
          <button id="closeAppointmentDetail" class="ghost"><i class="fas fa-times"></i></button>
        </div>

        <div id="aptDetailInfo"></div>

        <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:16px;">
          <h4 style="margin-bottom:12px;"><i class="fas fa-cash-register" style="color:var(--success);"></i> Estado de Cuenta y Pagos</h4>
          <div id="paymentsSummary"></div>
          
          <div style="margin-top:16px;">
            <h5 style="margin-bottom:8px;">Historial de Pagos Registrados</h5>
            <div id="paymentsList"></div>
          </div>

          <div style="margin-top:16px; background:var(--bg-page); padding:16px; border-radius:10px; border:1px solid var(--border);">
            <h5 style="margin-bottom:10px;"><i class="fas fa-plus-circle" style="color:var(--primary);"></i> Registrar Nuevo Pago / Cobro</h5>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
              <label class="field">
                <span>Monto ($)</span>
                <input type="number" id="newPaymentAmount" placeholder="Ej: 15000" min="0" step="100">
              </label>
              <label class="field">
                <span>Forma de Pago</span>
                <select id="newPaymentMethod">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta de Débito">Débito</option>
                  <option value="Tarjeta de Crédito">Crédito</option>
                  <option value="Mercado Pago / QR">Mercado Pago / QR</option>
                </select>
              </label>
              <label class="field" style="grid-column:1/-1;">
                <span>Nota o Comprobante (opcional)</span>
                <input type="text" id="newPaymentNote" placeholder="Ej: Pago de consulta o seña">
              </label>
            </div>
            <button class="primary" id="addPaymentBtn" style="margin-top:12px; width:100%;">
              <i class="fas fa-check"></i> Registrar Pago
            </button>
          </div>
        </div>

        <div class="modal-actions" style="margin-top:24px; display:flex; justify-content:flex-end;">
          <button id="closeAppointmentDetailBtn" class="ghost">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.remove('hidden');
  renderAppointmentInfo(apt);
  renderPayments(apt);
  setupModalEventListeners();
}

function setupModalEventListeners() {
  const closeBtn = el('closeAppointmentDetail');
  const closeBtnFooter = el('closeAppointmentDetailBtn');
  const addPaymentBtn = el('addPaymentBtn');
  const modal = el('appointmentDetailModal');
  
  if (closeBtn) closeBtn.onclick = closeAppointmentDetail;
  if (closeBtnFooter) closeBtnFooter.onclick = closeAppointmentDetail;
  if (addPaymentBtn) addPaymentBtn.onclick = addPayment;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeAppointmentDetail();
    };
  }
}

export function closeAppointmentDetail() {
  const modal = el('appointmentDetailModal');
  if (modal) modal.classList.add('hidden');
  currentAppointment = null;
}

function renderAppointmentInfo(apt) {
  const container = el('aptDetailInfo');
  if (!container) return;
  
  const patientName = apt.patient_name || apt.patientName || state.patients.find(p => p.id === (apt.patient_id || apt.patientId))?.name || 'N/A';
  const professional = state.professionals.find(p => p.id === (apt.professional_id || apt.professionalId));
  
  const statusColors = {
    'Confirmado': '#22c55e',
    'Reservado': '#f59e0b',
    'Reprogramado': '#f59e0b',
    'Atendido': '#3b82f6',
    'Cancelado': '#ef4444',
    'Ausente': '#6b7280'
  };
  
  const profOptions = state.professionals.map(p => 
    `<option value="${p.id}" ${p.id === (apt.professional_id || apt.professionalId) ? 'selected' : ''}>${p.name} (${p.specialty || 'General'})</option>`
  ).join('');
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom:16px;">
      <div style="background: var(--bg-page); padding: 12px; border-radius: 8px;">
        <h5 style="color: var(--primary); margin: 0 0 6px 0;"><i class="fas fa-user"></i> Paciente</h5>
        <p style="margin: 0; font-weight: 700; font-size: 15px;">${patientName}</p>
        <p style="margin: 2px 0 0 0; color: var(--muted); font-size: 12px;">
          ${apt.patient_phone || apt.patientPhone || 'Sin teléfono'}
        </p>
      </div>
      <div style="background: var(--bg-page); padding: 12px; border-radius: 8px;">
        <h5 style="color: var(--primary); margin: 0 0 6px 0;"><i class="fas fa-calendar"></i> Turno</h5>
        <p style="margin: 0;"><strong>${apt.date}</strong> a las <strong>${apt.time} hs</strong></p>
        <span class="badge ${apt.status}" style="margin-top:4px; display:inline-block;">${apt.status}</span>
      </div>
      <div style="background: var(--bg-page); padding: 12px; border-radius: 8px;">
        <h5 style="color: var(--primary); margin: 0 0 6px 0;"><i class="fas fa-user-md"></i> Profesional</h5>
        <p style="margin: 0;"><strong>${professional?.name || 'Dr. Asignado'}</strong></p>
        <p style="margin: 2px 0 0 0; color: var(--muted); font-size: 12px;">${professional?.specialty || 'Odontología'}</p>
      </div>
      <div style="background: var(--bg-page); padding: 12px; border-radius: 8px;">
        <h5 style="color: var(--primary); margin: 0 0 6px 0;"><i class="fas fa-clipboard"></i> Motivo</h5>
        <p style="margin: 0;">${apt.reason || 'Consulta General'}</p>
      </div>
    </div>
  `;
}

function renderPayments(apt) {
  const summaryContainer = el('paymentsSummary');
  const listContainer = el('paymentsList');
  if (!summaryContainer || !listContainer) return;
  
  const patientId = apt.patient_id || apt.patientId;
  const patientAppointments = state.appointments.filter(a => (a.patient_id || a.patientId) === patientId || a.patient_name === apt.patient_name);
  
  let patientTotalCost = 0;
  let patientTotalPaid = 0;
  let allPayments = [];
  
  patientAppointments.forEach(pApt => {
    patientTotalCost += parseFloat(pApt.cost) || 0;
    const payments = pApt.payments || [];
    payments.forEach(p => {
      patientTotalPaid += parseFloat(p.amount) || 0;
      allPayments.push({
        ...p,
        appointmentId: pApt.id,
        appointmentDate: pApt.date,
        appointmentTime: pApt.time,
        isCurrentApt: pApt.id === apt.id
      });
    });
  });
  
  const patientBalance = patientTotalCost - patientTotalPaid;
  const currentAptCost = parseFloat(apt.cost) || 0;
  
  let paymentStatus = patientBalance <= 0 ? 'Al día' : (patientTotalPaid > 0 ? 'Saldo parcial' : 'Pendiente');
  let statusColor = patientBalance <= 0 ? 'var(--success)' : (patientTotalPaid > 0 ? 'var(--warning)' : 'var(--danger)');
  
  summaryContainer.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: var(--bg-page); padding: 14px; border-radius: 8px; margin-bottom: 16px;">
      <div style="text-align: center;">
        <span style="color: var(--muted); font-size: 11px; display: block;">Total Tratamientos</span>
        <strong style="font-size: 16px;">$${patientTotalCost.toLocaleString('es-AR')}</strong>
      </div>
      <div style="text-align: center;">
        <span style="color: var(--muted); font-size: 11px; display: block;">Total Pagado</span>
        <strong style="font-size: 16px; color: var(--success);">$${patientTotalPaid.toLocaleString('es-AR')}</strong>
      </div>
      <div style="text-align: center;">
        <span style="color: var(--muted); font-size: 11px; display: block;">Saldo Pendiente</span>
        <strong style="font-size: 16px; color: ${statusColor};">$${patientBalance.toLocaleString('es-AR')}</strong>
      </div>
    </div>
  `;
  
  if (allPayments.length === 0) {
    listContainer.innerHTML = '<p class="muted" style="text-align: center; padding: 12px; font-size: 13px;">Sin pagos registrados en la cuenta corriente.</p>';
  } else {
    listContainer.innerHTML = allPayments.map((p, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-page); border-radius: 8px; margin-bottom: 6px;">
        <div>
          <strong style="color: var(--success);">+$${parseFloat(p.amount).toLocaleString('es-AR')}</strong>
          <span class="muted" style="font-size: 12px; margin-left: 8px;">${p.method || 'Efectivo'}</span>
          ${p.note ? `<br><small class="muted">${p.note}</small>` : ''}
        </div>
        <div style="text-align: right;">
          <small class="muted">${p.date || ''}</small>
          ${p.isCurrentApt ? `<button class="ghost delete-payment-btn" data-idx="${idx}" style="color:var(--danger); padding:2px 6px; margin-left:8px;" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>
    `).join('');
  }
}

async function addPayment() {
  if (!currentAppointment) return;
  const amountInput = el('newPaymentAmount');
  const methodSelect = el('newPaymentMethod');
  const noteInput = el('newPaymentNote');
  
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) {
    showToast('Ingresá un monto válido', 'warning');
    return;
  }
  
  const newPayment = {
    amount: amount,
    method: methodSelect.value,
    note: noteInput.value.trim(),
    date: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  };
  
  const payments = currentAppointment.payments || [];
  payments.push(newPayment);
  currentAppointment.payments = payments;
  
  try {
    await apiFetch(api.agenda, {
      method: 'PATCH',
      body: JSON.stringify({
        id: currentAppointment.id,
        payments: payments
      })
    });
    showToast('Pago registrado correctamente', 'success');
    renderPayments(currentAppointment);
    amountInput.value = '';
    noteInput.value = '';
  } catch (err) {
    showToast('Error al registrar pago', 'error');
  }
}

export function initPaymentsModule() {}
