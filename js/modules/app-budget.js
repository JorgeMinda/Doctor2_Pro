/**
 * app-budget.js - Gestor de Presupuestos Odontológicos y Médicos
 * Permite confeccionar presupuestos, calcular descuentos, gestionar formas de pago,
 * imprimir/descargar PDF y compartir por WhatsApp / Email.
 */
import { showToast, apiFetch } from './app-utils.js';
import { state, api } from './app-state.js';

export function createBudgetManager(patient, notes = [], plans = [], professionals = [], onSendEmail, onSaveBudget) {
  const container = document.createElement('div');
  container.className = 'budget-manager-card';

  const prof = professionals.find(p => p.id === patient?.assignedProfessionalId) || professionals[0] || { name: 'Profesional Principal' };

  // Budget history management
  let budgets = patient?.budgets || [];
  let currentBudgetId = null;
  let currentView = 'list'; // 'list', 'new', 'view'

  // Standard common dental/medical procedures for autocomplete or quick pick
  const defaultProcedures = [
    { name: 'Consulta y Diagnóstico', price: 5000 },
    { name: 'Limpieza / Profilaxis y Tartrectomía', price: 12000 },
    { name: 'Restauración / Obturación Composite 1 cara', price: 15000 },
    { name: 'Restauración / Obturación Composite 2+ caras', price: 18000 },
    { name: 'Endodoncia Unirradicular', price: 32000 },
    { name: 'Endodoncia Multirradicular', price: 45000 },
    { name: 'Extracción Simple', price: 14000 },
    { name: 'Extracción Compleja / Tercer Molar', price: 28000 },
    { name: 'Corona Cerámica / Zirconio', price: 85000 },
    { name: 'Perno y Muñón', price: 22000 },
    { name: 'Prótesis Removible Parcial', price: 95000 },
    { name: 'Prótesis Completa', price: 150000 },
    { name: 'Implante Dental de Titanio', price: 180000 },
    { name: 'Blanqueamiento Dental', price: 40000 },
    { name: 'Ortodoncia (Instalación)', price: 120000 },
    { name: 'Control Mensual Ortodoncia', price: 15000 }
  ];

  // Treatments from clinical notes if any
  const treatmentsFromNotes = notes.filter(n => n.procedimiento).map(n => ({
    pieza: n.pieza || '',
    procedimiento: n.procedimiento,
    precio: n.precio || 0,
    fecha: n.date,
    estado: n.diagnosticoTipo || 'Pendiente'
  }));

  // Budget draft items
  let budgetItems = treatmentsFromNotes.length > 0 
    ? treatmentsFromNotes.map(t => ({ pieza: t.pieza, desc: t.procedimiento, cant: 1, precio: t.precio || 0 }))
    : [{ pieza: '', desc: 'Consulta inicial y diagnóstico', cant: 1, precio: 5000 }];

  let discountPercent = 0;
  let paymentMethod = 'Efectivo / Transferencia';
  let validUntilDays = 15;
  let budgetObservations = 'Presupuesto válido por 15 días corridos. No incluye radiografías complejas no detalladas.';

  function calculateTotals(items, discountPct = 0) {
    const subtotal = items.reduce((acc, it) => acc + ((Number(it.precio) || 0) * (Number(it.cant) || 1)), 0);
    const discountAmount = Math.round(subtotal * (discountPct / 100));
    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total };
  }

  function render() {
    if (currentView === 'list') {
      renderList();
    } else if (currentView === 'new' || currentView === 'edit') {
      renderForm();
    } else if (currentView === 'view') {
      renderDetail();
    }
  }

  function renderList() {
    container.innerHTML = `
      <div class="budget-header-actions" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h4><i class="fas fa-file-invoice-dollar"></i> Presupuestos del Paciente</h4>
          <p class="muted" style="font-size:0.85rem;">Historial de presupuestos generados y cotizaciones</p>
        </div>
        <button class="primary" id="btnNewBudget">
          <i class="fas fa-plus"></i> Confeccionar Presupuesto
        </button>
      </div>

      <div class="budget-list-container">
        ${budgets.length === 0 ? `
          <div class="empty-state-box" style="text-align:center; padding:32px 16px; background:var(--bg-page); border-radius:12px; border:1px dashed var(--border);">
            <i class="fas fa-calculator" style="font-size:2.5rem; color:var(--muted); margin-bottom:12px;"></i>
            <p style="font-weight:600; margin-bottom:4px;">No hay presupuestos registrados</p>
            <p class="muted" style="font-size:0.85rem; margin-bottom:16px;">Podés crear un presupuesto personalizado, enviarlo por WhatsApp o imprimirlo para el paciente.</p>
            <button class="ghost" id="btnNewBudgetEmpty"><i class="fas fa-plus"></i> Crear el primero</button>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Profesional</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${budgets.map((b, idx) => `
                  <tr>
                    <td><strong>#${b.number || (idx + 1).toString().padStart(4, '0')}</strong></td>
                    <td>${b.date || new Date().toISOString().slice(0, 10)}</td>
                    <td>${b.professionalName || prof.name}</td>
                    <td>${(b.items || []).length} ítems</td>
                    <td><strong style="color:var(--success);">$${(b.total || 0).toLocaleString('es-AR')}</strong></td>
                    <td>
                      <span class="badge ${b.status === 'Aceptado' ? 'attended' : b.status === 'Rechazado' ? 'cancelled' : 'pending'}">
                        ${b.status || 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <div class="btn-group-sm" style="display:flex; gap:4px;">
                        <button class="ghost btn-view-budget" data-id="${b.id || idx}" title="Ver e Imprimir"><i class="fas fa-eye"></i></button>
                        <button class="ghost btn-wpp-budget" data-id="${b.id || idx}" title="Enviar por WhatsApp"><i class="fab fa-whatsapp" style="color:#25d366;"></i></button>
                        <button class="ghost btn-del-budget" data-id="${b.id || idx}" title="Eliminar" style="color:var(--danger);"><i class="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    container.querySelector('#btnNewBudget')?.addEventListener('click', () => {
      currentView = 'new';
      render();
    });
    container.querySelector('#btnNewBudgetEmpty')?.addEventListener('click', () => {
      currentView = 'new';
      render();
    });

    container.querySelectorAll('.btn-view-budget').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        currentBudgetId = id;
        currentView = 'view';
        render();
      });
    });

    container.querySelectorAll('.btn-wpp-budget').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const b = budgets[id] || budgets.find(x => x.id === id);
        if (b) sendBudgetWhatsApp(b);
      });
    });

    container.querySelectorAll('.btn-del-budget').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('¿Desea eliminar este presupuesto?')) {
          budgets = budgets.filter((_, idx) => idx.toString() !== id && _.id !== id);
          if (patient) patient.budgets = budgets;
          if (onSaveBudget) onSaveBudget(budgets);
          showToast('Presupuesto eliminado', 'info');
          render();
        }
      });
    });
  }

  function renderForm() {
    const { subtotal, discountAmount, total } = calculateTotals(budgetItems, discountPercent);

    container.innerHTML = `
      <div class="budget-form-container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h4><i class="fas fa-edit"></i> Confección de Presupuesto Odontológico / Médico</h4>
            <p class="muted" style="font-size:0.85rem;">Paciente: <strong>${patient?.name || 'Sin Nombre'}</strong> | DNI: ${patient?.dni || '-'}</p>
          </div>
          <button class="ghost" id="btnBackToList"><i class="fas fa-arrow-left"></i> Volver al listado</button>
        </div>

        <div class="budget-meta-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
          <div class="field">
            <span>Profesional Asignado</span>
            <select id="budgetProfSelect">
              ${professionals.map(p => `<option value="${p.id}" ${p.id === prof.id ? 'selected' : ''}>${p.name} (${p.specialty || 'General'})</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <span>Forma de Pago</span>
            <select id="budgetPaymentMethod">
              <option value="Efectivo / Transferencia" ${paymentMethod === 'Efectivo / Transferencia' ? 'selected' : ''}>Efectivo / Transferencia</option>
              <option value="Tarjeta de Débito" ${paymentMethod === 'Tarjeta de Débito' ? 'selected' : ''}>Tarjeta de Débito</option>
              <option value="Tarjeta de Crédito (Hasta 3 cuotas)" ${paymentMethod.includes('Crédito') ? 'selected' : ''}>Tarjeta de Crédito (3 cuotas)</option>
              <option value="Financiación en Consultorio" ${paymentMethod.includes('Financiación') ? 'selected' : ''}>Financiación en Consultorio</option>
              <option value="Reintegro Obra Social" ${paymentMethod.includes('Obra Social') ? 'selected' : ''}>Reintegro Obra Social</option>
            </select>
          </div>
          <div class="field">
            <span>Validez de la oferta (días)</span>
            <input type="number" id="budgetValidez" value="${validUntilDays}" min="1" max="90">
          </div>
          <div class="field">
            <span>Descuento Especial (%)</span>
            <input type="number" id="budgetDiscountInput" value="${discountPercent}" min="0" max="100" step="5">
          </div>
        </div>

        <!-- Tabla de ítems del presupuesto -->
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <strong>Detalle de Tratamientos y Procedimientos</strong>
            <div style="display:flex; gap:8px;">
              <select id="quickPickProcedure" style="max-width:260px; font-size:0.85rem;">
                <option value="">-- Añadir procedimiento común --</option>
                ${defaultProcedures.map((dp, i) => `<option value="${i}">${dp.name} ($${dp.price})</option>`).join('')}
              </select>
              <button class="ghost" id="btnAddEmptyItem" style="font-size:0.85rem;"><i class="fas fa-plus"></i> Fila Vacía</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table" id="budgetItemsTable">
              <thead>
                <tr>
                  <th style="width:80px;">Pieza</th>
                  <th>Descripción del Procedimiento / Material</th>
                  <th style="width:70px;">Cant.</th>
                  <th style="width:130px;">Precio Unit. ($)</th>
                  <th style="width:130px;">Subtotal ($)</th>
                  <th style="width:50px;"></th>
                </tr>
              </thead>
              <tbody>
                ${budgetItems.map((item, idx) => `
                  <tr data-index="${idx}">
                    <td><input type="text" class="item-pieza" value="${item.pieza || ''}" placeholder="Ej: 18" style="padding:6px 8px; width:100%;"></td>
                    <td><input type="text" class="item-desc" value="${item.desc || ''}" placeholder="Descripción del tratamiento" style="padding:6px 8px; width:100%;"></td>
                    <td><input type="number" class="item-cant" value="${item.cant || 1}" min="1" style="padding:6px 8px; width:100%;"></td>
                    <td><input type="number" class="item-precio" value="${item.precio || 0}" min="0" step="100" style="padding:6px 8px; width:100%;"></td>
                    <td><strong>$${((Number(item.precio) || 0) * (Number(item.cant) || 1)).toLocaleString('es-AR')}</strong></td>
                    <td><button class="ghost btn-remove-item" data-index="${idx}" style="color:var(--danger); padding:4px;"><i class="fas fa-times"></i></button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Totales -->
          <div style="display:flex; justify-content:flex-end; margin-top:16px;">
            <div style="width:300px; background:var(--bg-page); padding:12px 16px; border-radius:8px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.9rem;">
                <span class="muted">Subtotal:</span>
                <strong>$${subtotal.toLocaleString('es-AR')}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.9rem; color:var(--danger);">
                <span>Descuento (${discountPercent}%):</span>
                <span>-$${discountAmount.toLocaleString('es-AR')}</span>
              </div>
              <hr style="border:none; border-top:1px dashed var(--border); margin:8px 0;">
              <div style="display:flex; justify-content:space-between; font-size:1.1rem; color:var(--primary);">
                <strong>Total Final:</strong>
                <strong>$${total.toLocaleString('es-AR')}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="field" style="margin-bottom:16px;">
          <span>Observaciones / Condiciones Especiales</span>
          <textarea id="budgetObs" rows="2">${budgetObservations}</textarea>
        </div>

        <!-- Botones finales de guardado y acción -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <button class="ghost" id="btnCancelBudget">Cancelar</button>
          <div style="display:flex; gap:8px;">
            <button class="ghost" id="btnPreviewBudget"><i class="fas fa-print"></i> Vista Previa / Imprimir</button>
            <button class="primary" id="btnSaveBudgetConfirm"><i class="fas fa-save"></i> Guardar Presupuesto</button>
          </div>
        </div>
      </div>
    `;

    // Event handlers for dynamic table and inputs
    container.querySelector('#btnBackToList')?.addEventListener('click', () => { currentView = 'list'; render(); });
    container.querySelector('#btnCancelBudget')?.addEventListener('click', () => { currentView = 'list'; render(); });

    container.querySelector('#quickPickProcedure')?.addEventListener('change', (e) => {
      const idx = e.target.value;
      if (idx !== '') {
        const item = defaultProcedures[idx];
        budgetItems.push({ pieza: '', desc: item.name, cant: 1, precio: item.price });
        renderForm();
      }
    });

    container.querySelector('#btnAddEmptyItem')?.addEventListener('click', () => {
      budgetItems.push({ pieza: '', desc: '', cant: 1, precio: 0 });
      renderForm();
    });

    container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        budgetItems.splice(idx, 1);
        if (budgetItems.length === 0) budgetItems.push({ pieza: '', desc: '', cant: 1, precio: 0 });
        renderForm();
      });
    });

    // Inputs change listeners
    container.querySelectorAll('.item-pieza').forEach((inp, i) => {
      inp.addEventListener('input', () => { budgetItems[i].pieza = inp.value; });
    });
    container.querySelectorAll('.item-desc').forEach((inp, i) => {
      inp.addEventListener('input', () => { budgetItems[i].desc = inp.value; });
    });
    container.querySelectorAll('.item-cant').forEach((inp, i) => {
      inp.addEventListener('change', () => {
        budgetItems[i].cant = Number(inp.value) || 1;
        renderForm();
      });
    });
    container.querySelectorAll('.item-precio').forEach((inp, i) => {
      inp.addEventListener('change', () => {
        budgetItems[i].precio = Number(inp.value) || 0;
        renderForm();
      });
    });

    container.querySelector('#budgetDiscountInput')?.addEventListener('change', (e) => {
      discountPercent = Number(e.target.value) || 0;
      renderForm();
    });

    container.querySelector('#budgetValidez')?.addEventListener('input', (e) => {
      validUntilDays = Number(e.target.value) || 15;
    });

    container.querySelector('#budgetPaymentMethod')?.addEventListener('change', (e) => {
      paymentMethod = e.target.value;
    });

    container.querySelector('#budgetObs')?.addEventListener('input', (e) => {
      budgetObservations = e.target.value;
    });

    container.querySelector('#btnSaveBudgetConfirm')?.addEventListener('click', () => {
      saveCurrentBudget();
    });

    container.querySelector('#btnPreviewBudget')?.addEventListener('click', () => {
      const budgetObj = buildCurrentBudgetObject();
      printBudgetSheet(budgetObj);
    });
  }

  function buildCurrentBudgetObject() {
    const { subtotal, discountAmount, total } = calculateTotals(budgetItems, discountPercent);
    const dateObj = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(dateObj.getDate() + validUntilDays);

    const selProfId = container.querySelector('#budgetProfSelect')?.value;
    const selectedProf = professionals.find(p => p.id === selProfId) || prof;

    return {
      id: 'bdg_' + Date.now(),
      number: (budgets.length + 1).toString().padStart(4, '0'),
      date: dateObj.toISOString().slice(0, 10),
      expiryDate: expiryDate.toISOString().slice(0, 10),
      professionalId: selectedProf.id,
      professionalName: selectedProf.name,
      patientId: patient?.id,
      patientName: patient?.name,
      patientDni: patient?.dni,
      patientPhone: patient?.phone,
      items: budgetItems.filter(it => it.desc.trim() !== ''),
      subtotal,
      discountPercent,
      discountAmount,
      total,
      paymentMethod,
      observations: budgetObservations,
      status: 'Pendiente'
    };
  }

  function saveCurrentBudget() {
    const newBudget = buildCurrentBudgetObject();
    if (newBudget.items.length === 0) {
      showToast('Agregue al menos un ítem con descripción', 'warning');
      return;
    }

    budgets.unshift(newBudget);
    if (patient) patient.budgets = budgets;
    if (onSaveBudget) onSaveBudget(budgets);

    // Save to server
    apiFetch(api.patients, {
      method: 'POST',
      body: JSON.stringify({
        action: 'save_budget',
        patientId: patient?.id,
        budget: newBudget
      })
    }).catch(err => console.warn('Sync budget error:', err));

    showToast('Presupuesto guardado correctamente', 'success');
    currentView = 'list';
    render();
  }

  function renderDetail() {
    const b = budgets[currentBudgetId] || budgets.find(x => x.id === currentBudgetId);
    if (!b) {
      currentView = 'list';
      render();
      return;
    }

    container.innerHTML = `
      <div class="budget-detail-card" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
          <div>
            <h3 style="color:var(--primary);"><i class="fas fa-file-invoice-dollar"></i> Presupuesto #${b.number || '0001'}</h3>
            <p class="muted">Fecha de emisión: ${b.date} | Válido hasta: ${b.expiryDate || '-'}</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="ghost" id="btnBackFromDetail"><i class="fas fa-arrow-left"></i> Volver</button>
            <button class="ghost" id="btnPrintDetail"><i class="fas fa-print"></i> Imprimir / PDF</button>
            <button class="primary" id="btnWppDetail" style="background:#25d366; border-color:#25d366;"><i class="fab fa-whatsapp"></i> Enviar WhatsApp</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; background:var(--bg-page); padding:16px; border-radius:8px; margin-bottom:20px;">
          <div>
            <strong>Paciente:</strong> ${b.patientName || patient?.name}<br>
            <span class="muted">DNI: ${b.patientDni || patient?.dni || '-'} | Cel: ${b.patientPhone || patient?.phone || '-'}</span>
          </div>
          <div>
            <strong>Profesional:</strong> ${b.professionalName}<br>
            <span class="muted">Forma de pago: ${b.paymentMethod || 'Efectivo'}</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" style="margin-bottom:20px;">
            <thead>
              <tr>
                <th>Pieza</th>
                <th>Tratamiento / Procedimiento</th>
                <th>Cant.</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(b.items || []).map(it => `
                <tr>
                  <td>${it.pieza || '-'}</td>
                  <td>${it.desc}</td>
                  <td>${it.cant || 1}</td>
                  <td>$${(it.precio || 0).toLocaleString('es-AR')}</td>
                  <td><strong>$${((it.precio || 0) * (it.cant || 1)).toLocaleString('es-AR')}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="max-width:50%;">
            <strong>Observaciones y Condiciones:</strong>
            <p class="muted" style="margin-top:4px; font-size:0.9rem;">${b.observations || 'Sin observaciones'}</p>
          </div>
          <div style="width:260px; background:var(--bg-page); padding:16px; border-radius:8px; border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span class="muted">Subtotal:</span>
              <span>$${(b.subtotal || b.total || 0).toLocaleString('es-AR')}</span>
            </div>
            ${b.discountAmount ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:var(--danger);">
                <span>Descuento (${b.discountPercent}%):</span>
                <span>-$${b.discountAmount.toLocaleString('es-AR')}</span>
              </div>
            ` : ''}
            <div style="display:flex; justify-content:space-between; font-size:1.2rem; color:var(--primary); border-top:1px solid var(--border); padding-top:8px;">
              <strong>Total:</strong>
              <strong>$${(b.total || 0).toLocaleString('es-AR')}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btnBackFromDetail')?.addEventListener('click', () => { currentView = 'list'; render(); });
    container.querySelector('#btnPrintDetail')?.addEventListener('click', () => { printBudgetSheet(b); });
    container.querySelector('#btnWppDetail')?.addEventListener('click', () => { sendBudgetWhatsApp(b); });
  }

  function sendBudgetWhatsApp(b) {
    const phone = (patient?.phone || b.patientPhone || '').replace(/\D/g, '');
    if (!phone) {
      showToast('El paciente no tiene un número de teléfono / WhatsApp registrado', 'warning');
      return;
    }

    const itemsSummary = (b.items || [])
      .map(it => `• ${it.pieza ? `[Pieza ${it.pieza}] ` : ''}${it.desc} (${it.cant}x $${(it.precio || 0).toLocaleString('es-AR')})`)
      .join('%0A');

    const msg = `🦷 *PRESUPUESTO ODONTOLÓGICO / MÉDICO*%0A` +
      `Estimado/a *${b.patientName || patient?.name}*, le compartimos el presupuesto confeccionado:%0A%0A` +
      `*Profesional:* ${b.professionalName}%0A` +
      `*Fecha:* ${b.date}%0A%0A` +
      `*Tratamientos:*%0A${itemsSummary}%0A%0A` +
      (b.discountAmount ? `*Descuento aplicado:* -$${b.discountAmount.toLocaleString('es-AR')}%0A` : '') +
      `*TOTAL:* $${(b.total || 0).toLocaleString('es-AR')}%0A` +
      `*Forma de pago:* ${b.paymentMethod}%0A` +
      `*Validez:* Hasta el ${b.expiryDate || '15 días'}%0A%0A` +
      `_Quedamos a su disposición para coordinar los turnos._`;

    const url = `https://wa.me/${phone}?text=${msg}`;
    window.open(url, '_blank');
  }

  function printBudgetSheet(b) {
    const printContainer = document.getElementById('printPlanSheet') || document.body;
    printContainer.innerHTML = `
      <div class="print-budget-page" style="padding:40px; font-family:Arial, sans-serif; color:#111; max-width:800px; margin:0 auto; background:#fff;">
        <div style="display:flex; justify-content:space-between; border-bottom:2px solid #6366f1; padding-bottom:16px; margin-bottom:24px;">
          <div>
            <h1 style="color:#6366f1; margin:0; font-size:24px;">CONSULTORIOS.PRO</h1>
            <p style="margin:4px 0 0; color:#555; font-size:12px;">Centro Odontológico & Médico Integral</p>
          </div>
          <div style="text-align:right;">
            <h2 style="margin:0; font-size:18px;">PRESUPUESTO N° ${b.number || '0001'}</h2>
            <p style="margin:4px 0 0; font-size:12px; color:#555;">Fecha: ${b.date} | Validez: ${b.expiryDate || '15 días'}</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; background:#f8fafc; padding:12px 16px; border-radius:6px; margin-bottom:24px; font-size:13px;">
          <div>
            <strong>Paciente:</strong> ${b.patientName || patient?.name}<br>
            <strong>DNI:</strong> ${b.patientDni || patient?.dni || 'Sin registrar'}<br>
            <strong>Teléfono:</strong> ${b.patientPhone || patient?.phone || '-'}
          </div>
          <div>
            <strong>Profesional Tratante:</strong> ${b.professionalName}<br>
            <strong>Forma de Pago Propuesta:</strong> ${b.paymentMethod}
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:24px; font-size:13px;">
          <thead>
            <tr style="background:#eef2ff; border-bottom:1px solid #c7d2fe;">
              <th style="padding:8px; text-align:left;">Pieza</th>
              <th style="padding:8px; text-align:left;">Tratamiento / Procedimiento</th>
              <th style="padding:8px; text-align:center;">Cant.</th>
              <th style="padding:8px; text-align:right;">Precio Unit.</th>
              <th style="padding:8px; text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(b.items || []).map(it => `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;">${it.pieza || '-'}</td>
                <td style="padding:8px;">${it.desc}</td>
                <td style="padding:8px; text-align:center;">${it.cant || 1}</td>
                <td style="padding:8px; text-align:right;">$${(it.precio || 0).toLocaleString('es-AR')}</td>
                <td style="padding:8px; text-align:right;"><strong>$${((it.precio || 0) * (it.cant || 1)).toLocaleString('es-AR')}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px;">
          <div style="font-size:12px; color:#666; max-width:60%;">
            <strong>Términos y Observaciones:</strong>
            <p style="margin-top:4px;">${b.observations || 'Presupuesto sujeto a modificaciones según evolución clínica.'}</p>
          </div>
          <div style="width:240px; font-size:14px;">
            <div style="display:flex; justify-content:space-between; padding:4px 0;">
              <span>Subtotal:</span>
              <span>$${(b.subtotal || b.total || 0).toLocaleString('es-AR')}</span>
            </div>
            ${b.discountAmount ? `
              <div style="display:flex; justify-content:space-between; padding:4px 0; color:#ef4444;">
                <span>Descuento (${b.discountPercent}%):</span>
                <span>-$${b.discountAmount.toLocaleString('es-AR')}</span>
              </div>
            ` : ''}
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-top:2px solid #6366f1; font-weight:bold; font-size:16px; color:#6366f1;">
              <span>TOTAL:</span>
              <span>$${(b.total || 0).toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        <div style="margin-top:60px; display:flex; justify-content:space-around; text-align:center; font-size:12px; color:#666;">
          <div style="border-top:1px solid #999; width:200px; padding-top:6px;">Firma Profesional</div>
          <div style="border-top:1px solid #999; width:200px; padding-top:6px;">Conformidad Paciente</div>
        </div>
      </div>
    `;

    window.print();
  }

  // Initial render
  render();
  return container;
}
