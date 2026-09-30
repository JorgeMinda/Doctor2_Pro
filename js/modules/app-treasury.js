/**
 * app-treasury.js - Módulo de Tesorería Enterprise, Cajas, Bancos, Ingresos, Egresos, Comprobantes de Pago y Arqueos
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';
import { NANI_DENT_LOGO_BASE64, CLINIC_BRANDING } from './branding-assets.js';

let treasuryData = {
  accounts: [],
  movements: [],
  closures: [],
  auditLogs: []
};

let activeTab = 'cuentas'; // 'cuentas' | 'cierres' | 'auditoria'
let filterType = 'ALL'; // 'ALL' | 'INCOME' | 'EXPENSE'
let filterAccount = 'ALL';
let filterSearch = '';

export async function loadTreasuryData() {
  try {
    const res = await apiFetch(api.treasury);
    if (res && res.success) {
      treasuryData.accounts = res.accounts || [];
      treasuryData.movements = res.movements || [];
      treasuryData.closures = res.closures || [];
      renderTreasuryView();
    }
  } catch (err) {
    console.error('Error cargando tesorería:', err);
  }
}

export async function loadAuditLogs() {
  try {
    const res = await apiFetch(`${api.treasury}?action=audit&limit=100`);
    if (res && res.success) {
      treasuryData.auditLogs = res.audit_logs || [];
      renderAuditTab();
    }
  } catch (err) {
    console.error('Error cargando auditoría:', err);
  }
}

export function initTreasuryModule() {
  const container = el('treasuryView');
  if (!container) return;

  window.addEventListener('nav:changed', (e) => {
    if (e.detail?.view === 'treasury') {
      loadTreasuryData();
    }
  });

  renderTreasuryView();
}

export function renderTreasuryView() {
  const container = el('treasuryView');
  if (!container) return;

  const totalBalance = treasuryData.accounts.reduce((acc, a) => acc + (parseFloat(a.balance) || 0), 0);
  const totalIncome = treasuryData.movements
    .filter(m => m.type === 'INCOME')
    .reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);
  const totalExpense = treasuryData.movements
    .filter(m => m.type === 'EXPENSE')
    .reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);

  container.innerHTML = `
    <div class="card" style="padding:24px;">
      <!-- Encabezado de Tesorería -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px;">
        <div>
          <p class="muted" style="margin:0; font-size:0.85rem;"><i class="fas fa-landmark"></i> Gestión Contable & Tesorería Enterprise</p>
          <h2 style="margin:4px 0 0; color:var(--primary); font-size:1.4rem;">
            <i class="fas fa-cash-register"></i> Cajas, Bancos & Movimientos de Tesorería
          </h2>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button class="ghost" id="refreshTreasuryBtn" title="Actualizar datos"><i class="fas fa-rotate"></i> Actualizar</button>
          <button class="primary btn-income-action" id="openIncomeModalBtn">
            <i class="fas fa-circle-plus"></i> Registrar Ingreso
          </button>
          <button class="primary btn-expense-action" id="openExpenseModalBtn">
            <i class="fas fa-circle-minus"></i> Registrar Egreso
          </button>
          <button class="primary" id="openCashClosureModalBtn" style="background:var(--primary); box-shadow:0 4px 14px rgba(37,99,235,0.25);">
            <i class="fas fa-lock"></i> Arqueo / Cierre de Caja
          </button>
        </div>
      </div>

      <!-- Métricas de Cuentas y Saldos en Vivo -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:24px;">
        <!-- Saldo Consolidado -->
        <div style="background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.03)); border:1px solid rgba(99,102,241,0.3); border-radius:12px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="muted" style="font-size:0.85rem; font-weight:600;">Saldo Consolidado</span>
            <i class="fas fa-wallet" style="color:var(--primary); font-size:1.2rem;"></i>
          </div>
          <h3 style="margin:0; font-size:1.5rem; color:var(--primary);">$${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          <small class="muted">Disponible en todas las cuentas</small>
        </div>

        <!-- Total Ingresos -->
        <div style="background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03)); border:1px solid rgba(16,185,129,0.3); border-radius:12px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="muted" style="font-size:0.85rem; font-weight:600; color:#10b981;">Total Ingresos Cobrados</span>
            <i class="fas fa-arrow-trend-up" style="color:#10b981; font-size:1.2rem;"></i>
          </div>
          <h3 style="margin:0; font-size:1.5rem; color:#10b981;">+$${totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          <small class="muted">Cobros, turnos y abonos</small>
        </div>

        <!-- Total Egresos -->
        <div style="background:linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.03)); border:1px solid rgba(239,68,68,0.3); border-radius:12px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="muted" style="font-size:0.85rem; font-weight:600; color:#ef4444;">Total Egresos / Gastos</span>
            <i class="fas fa-arrow-trend-down" style="color:#ef4444; font-size:1.2rem;"></i>
          </div>
          <h3 style="margin:0; font-size:1.5rem; color:#ef4444;">-$${totalExpense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          <small class="muted">Insumos, compras y servicios</small>
        </div>

        <!-- Cuentas Individuales -->
        ${treasuryData.accounts.map(acc => {
          let icon = 'fa-money-bill-wave';
          let color = '#10b981';
          if (acc.id.includes('bank')) { icon = 'fa-building-columns'; color = '#3b82f6'; }
          if (acc.id.includes('mp')) { icon = 'fa-qrcode'; color = '#06b6d4'; }
          if (acc.id.includes('pos')) { icon = 'fa-credit-card'; color = '#8b5cf6'; }
          const bal = parseFloat(acc.balance) || 0;

          return `
            <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:12px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span class="muted" style="font-size:0.85rem; font-weight:600;">${acc.name}</span>
                <i class="fas ${icon}" style="color:${color}; font-size:1.1rem;"></i>
              </div>
              <h3 style="margin:0; font-size:1.3rem; color:var(--text);">$${bal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <small class="muted">${acc.currency || 'ARS'} · Saldo en Tiempo Real</small>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Selector de Pestañas Internas -->
      <div style="display:flex; gap:8px; border-bottom:1px solid var(--border); margin-bottom:20px;">
        <button class="ghost tab-tr-btn ${activeTab === 'cuentas' ? 'active' : ''}" data-tab="cuentas" style="border-radius:8px 8px 0 0; padding:10px 16px; font-weight:600;">
          <i class="fas fa-list-check"></i> Libro Mayor de Movimientos & Comprobantes
        </button>
        <button class="ghost tab-tr-btn ${activeTab === 'cierres' ? 'active' : ''}" data-tab="cierres" style="border-radius:8px 8px 0 0; padding:10px 16px; font-weight:600;">
          <i class="fas fa-file-invoice-dollar"></i> Historial de Cierres / Arqueos
        </button>
        <button class="ghost tab-tr-btn ${activeTab === 'auditoria' ? 'active' : ''}" data-tab="auditoria" style="border-radius:8px 8px 0 0; padding:10px 16px; font-weight:600;">
          <i class="fas fa-shield-halved"></i> Pista de Auditoría (Audit Trail)
        </button>
      </div>

      <!-- Contenido de Pestaña -->
      <div id="treasuryTabContent">
        ${renderTabBody()}
      </div>
    </div>
  `;

  setupTreasuryEvents();
}

function renderTabBody() {
  if (activeTab === 'cuentas') {
    return renderMovementsTab();
  } else if (activeTab === 'cierres') {
    return renderClosuresTab();
  } else if (activeTab === 'auditoria') {
    return `<div id="auditTabPlaceholder"><div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando registros inmutables de auditoría...</p></div></div>`;
  }
}

function renderMovementsTab() {
  let movs = treasuryData.movements || [];

  // Filtrado
  if (filterType !== 'ALL') {
    movs = movs.filter(m => m.type === filterType);
  }
  if (filterAccount !== 'ALL') {
    movs = movs.filter(m => m.accountId === filterAccount);
  }
  if (filterSearch.trim()) {
    const q = filterSearch.trim().toLowerCase();
    movs = movs.filter(m => {
      const matchConcept = (m.concept || '').toLowerCase().includes(q);
      const matchPerson = (m.personName || m.meta?.personName || '').toLowerCase().includes(q);
      const matchReceipt = (m.receiptNumber || m.meta?.receiptNumber || '').toLowerCase().includes(q);
      const matchAccount = (m.accountName || '').toLowerCase().includes(q);
      const matchCategory = (m.category || m.meta?.category || '').toLowerCase().includes(q);
      return matchConcept || matchPerson || matchReceipt || matchAccount || matchCategory;
    });
  }

  const accountsOptions = treasuryData.accounts.map(a => 
    `<option value="${a.id}" ${filterAccount === a.id ? 'selected' : ''}>${a.name}</option>`
  ).join('');

  return `
    <!-- Barra de Filtros y Búsqueda -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; background:var(--bg-page); padding:12px 16px; border-radius:10px; border:1px solid var(--border);">
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; flex:1;">
        <div class="search" style="min-width:240px; flex:1;">
          <i class="fas fa-search"></i>
          <input type="search" id="trSearchInput" placeholder="Buscar por concepto, paciente, proveedor, N° recibo..." value="${filterSearch}">
        </div>
        <select id="trAccountFilter" style="max-width:220px; font-size:0.85rem; padding:7px 10px; border-radius:8px; background:var(--surface); font-weight:600;">
          <option value="ALL">Todas las Cuentas</option>
          ${accountsOptions}
        </select>
      </div>

      <div class="filter-pills" style="margin:0;">
        <button class="filter-pill ${filterType === 'ALL' ? 'active' : ''}" data-type="ALL">Todos (${treasuryData.movements.length})</button>
        <button class="filter-pill ${filterType === 'INCOME' ? 'active' : ''}" data-type="INCOME" style="${filterType === 'INCOME' ? 'background:#10b981; color:#fff; border-color:#10b981;' : ''}">
          <i class="fas fa-arrow-down"></i> Ingresos
        </button>
        <button class="filter-pill ${filterType === 'EXPENSE' ? 'active' : ''}" data-type="EXPENSE" style="${filterType === 'EXPENSE' ? 'background:#ef4444; color:#fff; border-color:#ef4444;' : ''}">
          <i class="fas fa-arrow-up"></i> Egresos
        </button>
      </div>
    </div>

    ${movs.length === 0 ? `
      <div style="text-align:center; padding:40px; background:var(--bg-page); border-radius:12px; border:1px dashed var(--border);">
        <i class="fas fa-receipt" style="font-size:2.5rem; color:var(--muted); margin-bottom:12px;"></i>
        <h4 style="margin:0 0 6px;">Sin movimientos para el filtro seleccionado</h4>
        <p class="muted" style="margin:0; font-size:0.9rem;">Podés registrar un nuevo ingreso o egreso con los botones superiores.</p>
      </div>
    ` : `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>N° Comprobante & Fecha</th>
              <th>Cuenta / Medio</th>
              <th>Concepto & Beneficiario / Paciente</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>Monto ($)</th>
              <th>Saldo Posterior</th>
              <th style="text-align:center;">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            ${movs.map(m => {
              const isIncome = m.type === 'INCOME';
              const receiptCode = m.receiptNumber || m.meta?.receiptNumber || ('MOV-' + m.id.substring(4, 10).toUpperCase());
              const person = m.personName || m.meta?.personName || (isIncome ? 'Paciente / Cliente' : 'Proveedor / Tercero');
              const category = m.category || m.meta?.category || (isIncome ? 'Ingreso General' : 'Gasto Operativo');
              const method = m.paymentMethod || m.meta?.paymentMethod || 'Efectivo';
              const dateStr = new Date(m.timestamp).toLocaleString('es-AR', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
              });

              return `
                <tr>
                  <td>
                    <strong>${receiptCode}</strong><br>
                    <small class="muted"><i class="fas fa-clock"></i> ${dateStr}</small>
                  </td>
                  <td>
                    <strong>${m.accountName || m.accountId}</strong><br>
                    <small class="muted"><i class="fas fa-credit-card"></i> ${method}</small>
                  </td>
                  <td>
                    <strong>${m.concept || 'Movimiento de Tesorería'}</strong><br>
                    <small class="muted"><i class="fas fa-user"></i> ${person}</small>
                  </td>
                  <td>
                    <span class="tr-category-badge">${category}</span>
                  </td>
                  <td>
                    <span class="badge ${isIncome ? 'attended' : 'cancelled'}" style="font-weight:700;">
                      <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i> ${isIncome ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td>
                    <strong style="color:${isIncome ? '#10b981' : '#ef4444'}; font-size:1.05rem;">
                      ${isIncome ? '+' : '-'}$${parseFloat(m.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td><span class="muted" style="font-weight:600;">$${parseFloat(m.balanceAfter || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></td>
                  <td style="text-align:center;">
                    <button class="ghost btn-view-receipt" data-mov-id="${m.id}" title="Ver e Imprimir Comprobante Oficial" style="color:var(--primary); font-weight:700; font-size:0.82rem; padding:5px 10px; border-radius:6px; border:1px solid var(--border);">
                      <i class="fas fa-receipt"></i> Comprobante
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

function renderClosuresTab() {
  const cls = treasuryData.closures || [];
  if (cls.length === 0) {
    return `
      <div style="text-align:center; padding:40px; background:var(--bg-page); border-radius:12px; border:1px dashed var(--border);">
        <i class="fas fa-vault" style="font-size:2.5rem; color:var(--muted); margin-bottom:12px;"></i>
        <h4 style="margin:0 0 6px;">Sin arqueos o cierres de caja</h4>
        <p class="muted" style="margin:0; font-size:0.9rem;">Podés realizar el primer cierre diario haciendo clic en <strong>Arqueo / Cierre de Caja</strong>.</p>
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha / Hora</th>
            <th>Cuenta</th>
            <th>Saldo Sistema</th>
            <th>Efectivo Físico</th>
            <th>Diferencia</th>
            <th>Estado</th>
            <th>Responsable / Notas</th>
          </tr>
        </thead>
        <tbody>
          ${cls.map(c => {
            let diffColor = 'var(--success)';
            if (c.difference < 0) diffColor = 'var(--danger)';
            if (c.difference > 0) diffColor = 'var(--warning)';

            return `
              <tr>
                <td><strong>${c.date}</strong> <small class="muted">${c.time}</small></td>
                <td>${c.accountName}</td>
                <td>$${parseFloat(c.expectedBalance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td><strong>$${parseFloat(c.countedAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                <td><strong style="color:${diffColor};">${c.difference > 0 ? '+' : ''}$${parseFloat(c.difference).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                <td>
                  <span class="badge ${c.status === 'CUADRADO' ? 'attended' : c.status === 'SOBRANTE' ? 'pending' : 'cancelled'}">
                    ${c.status}
                  </span>
                </td>
                <td><small>${c.closedBy || 'Admin'}${c.notes ? ` · <em>${c.notes}</em>` : ''}</small></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAuditTab() {
  const container = el('treasuryTabContent');
  if (!container || activeTab !== 'auditoria') return;

  const logs = treasuryData.auditLogs || [];
  if (logs.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px;"><p class="muted">Sin eventos registrados en auditoría.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table" style="font-size:0.85rem;">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Usuario</th>
            <th>IP</th>
            <th>Entidad</th>
            <th>Acción</th>
            <th>Detalle / Diff</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td><small>${new Date(l.timestamp).toLocaleString('es-AR')}</small></td>
              <td><strong>${l.userName || l.userId}</strong></td>
              <td><code>${l.ip || '127.0.0.1'}</code></td>
              <td><span class="badge">${l.entity}</span></td>
              <td><strong>${l.action}</strong></td>
              <td>
                <pre style="margin:0; font-size:11px; max-width:320px; overflow-x:auto; background:var(--bg-page); padding:4px 8px; border-radius:4px;">${JSON.stringify(l.diff || l.meta || {}, null, 2)}</pre>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setupTreasuryEvents() {
  const container = el('treasuryView');
  if (!container) return;

  container.querySelector('#refreshTreasuryBtn')?.addEventListener('click', () => {
    loadTreasuryData();
    if (activeTab === 'auditoria') loadAuditLogs();
    showToast('Tesorería actualizada', 'info');
  });

  container.querySelectorAll('.tab-tr-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeTab = e.currentTarget.dataset.tab;
      renderTreasuryView();
      if (activeTab === 'auditoria') {
        loadAuditLogs();
      }
    });
  });

  // Filtros del Libro Mayor
  container.querySelector('#trSearchInput')?.addEventListener('input', (e) => {
    filterSearch = e.target.value;
    const tabContent = el('treasuryTabContent');
    if (tabContent && activeTab === 'cuentas') {
      tabContent.innerHTML = renderMovementsTab();
      setupMovementTableEvents();
    }
  });

  container.querySelector('#trAccountFilter')?.addEventListener('change', (e) => {
    filterAccount = e.target.value;
    const tabContent = el('treasuryTabContent');
    if (tabContent && activeTab === 'cuentas') {
      tabContent.innerHTML = renderMovementsTab();
      setupMovementTableEvents();
    }
  });

  container.querySelectorAll('.filter-pills .filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterType = e.currentTarget.dataset.type;
      const tabContent = el('treasuryTabContent');
      if (tabContent && activeTab === 'cuentas') {
        tabContent.innerHTML = renderMovementsTab();
        setupMovementTableEvents();
      }
    });
  });

  container.querySelector('#openIncomeModalBtn')?.addEventListener('click', openIncomeModal);
  container.querySelector('#openExpenseModalBtn')?.addEventListener('click', openExpenseModal);
  container.querySelector('#openCashClosureModalBtn')?.addEventListener('click', openCashClosureModal);

  setupMovementTableEvents();
}

function setupMovementTableEvents() {
  const container = el('treasuryTabContent');
  if (!container) return;

  container.querySelectorAll('.btn-view-receipt').forEach(btn => {
    btn.addEventListener('click', () => {
      const movId = btn.dataset.movId;
      const mov = treasuryData.movements.find(m => m.id === movId);
      if (mov) {
        openReceiptPreview(mov);
      }
    });
  });
}

/**
 * ========================================================
 * MODAL DE REGISTRO DE INGRESOS (COBROS & ABONOS)
 * ========================================================
 */
function openIncomeModal() {
  let modal = el('incomeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'incomeModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }

  const defaultReceipt = 'REC-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000);
  const patientsList = state.patients || [];

  modal.innerHTML = `
    <div class="modal-body" style="max-width:560px;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <p class="muted" style="margin:0; font-size:0.85rem;"><i class="fas fa-arrow-down" style="color:#10b981;"></i> Entrada de Dinero</p>
          <h3 style="margin:2px 0 0; color:#10b981;"><i class="fas fa-receipt"></i> Registrar Ingreso / Cobro</h3>
        </div>
        <button id="closeIncomeModal" class="ghost"><i class="fas fa-times"></i></button>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>Cuenta / Caja Destino *</span>
          <select id="incAccount">
            ${treasuryData.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <span>Monto a Cobrar ($) *</span>
          <input type="number" id="incAmount" placeholder="Ej: 15000" min="1" step="10" required style="font-size:1.1rem; font-weight:700; color:#10b981;">
        </div>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>Medio de Pago *</span>
          <select id="incPaymentMethod">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia Bancaria">Transferencia Bancaria</option>
            <option value="Tarjeta de Débito">Tarjeta de Débito</option>
            <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
            <option value="Mercado Pago / QR">Mercado Pago / QR</option>
          </select>
        </div>
        <div class="field">
          <span>Categoría de Ingreso</span>
          <select id="incCategory">
            <option value="Cobro de Consulta / Turno">Cobro de Consulta / Turno</option>
            <option value="Tratamiento Odontológico">Tratamiento Odontológico</option>
            <option value="Abono / Anticipo">Abono / Anticipo</option>
            <option value="Venta de Insumo / Producto">Venta de Insumo / Producto</option>
            <option value="Cobro Particular">Cobro Particular</option>
            <option value="Otros Ingresos">Otros Ingresos</option>
          </select>
        </div>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>Paciente / Pagador</span>
          <input type="text" id="incPerson" list="incPatientsDatalist" placeholder="Nombre completo del paciente o pagador">
          <datalist id="incPatientsDatalist">
            ${patientsList.map(p => `<option value="${p.name}" data-dni="${p.dni || ''}">${p.name} - DNI: ${p.dni || 'S/N'}</option>`).join('')}
          </datalist>
        </div>
        <div class="field">
          <span>DNI / CUIT / Identificación</span>
          <input type="text" id="incId" placeholder="Ej: 34567890">
        </div>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>N° de Comprobante / Recibo</span>
          <input type="text" id="incReceiptCode" value="${defaultReceipt}" style="font-weight:700;">
        </div>
        <div class="field">
          <span>Concepto / Procedimiento *</span>
          <input type="text" id="incConcept" placeholder="Ej: Cobro por obturación con composite en pieza 36" required>
        </div>
      </div>

      <div class="field" style="margin-bottom:20px;">
        <span>Observaciones o Notas Clínicas</span>
        <input type="text" id="incNotes" placeholder="Detalle adicional para el comprobante o control de caja">
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="cancelIncomeBtn" class="ghost">Cancelar</button>
        <button id="saveIncomeBtn" class="primary btn-income-action">
          <i class="fas fa-check"></i> Guardar y Generar Comprobante
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  // Autocompletar DNI al seleccionar paciente
  const incPerson = modal.querySelector('#incPerson');
  const incId = modal.querySelector('#incId');
  incPerson.addEventListener('input', () => {
    const val = incPerson.value.trim();
    const found = patientsList.find(p => p.name.toLowerCase() === val.toLowerCase());
    if (found && found.dni && !incId.value) {
      incId.value = found.dni;
    }
  });

  modal.querySelector('#closeIncomeModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#cancelIncomeBtn')?.addEventListener('click', () => modal.classList.add('hidden'));

  modal.querySelector('#saveIncomeBtn')?.addEventListener('click', async () => {
    const amount = parseFloat(modal.querySelector('#incAmount')?.value);
    const concept = modal.querySelector('#incConcept')?.value.trim();
    const accountId = modal.querySelector('#incAccount')?.value;
    const paymentMethod = modal.querySelector('#incPaymentMethod')?.value;
    const category = modal.querySelector('#incCategory')?.value;
    const personName = modal.querySelector('#incPerson')?.value.trim() || 'Paciente / Consumidor Final';
    const identification = modal.querySelector('#incId')?.value.trim();
    const receiptNumber = modal.querySelector('#incReceiptCode')?.value.trim() || defaultReceipt;
    const notes = modal.querySelector('#incNotes')?.value.trim();

    if (!amount || amount <= 0 || !concept) {
      showToast('Completá el monto y concepto del ingreso', 'warning');
      return;
    }

    try {
      const res = await apiFetch(api.treasury, {
        method: 'POST',
        body: JSON.stringify({
          action: 'movement',
          accountId,
          amount,
          type: 'INCOME',
          concept,
          category,
          personName,
          identification,
          paymentMethod,
          receiptNumber,
          notes,
          registeredBy: state.user?.name || 'Dr. Jorge Valenzuela'
        })
      });

      if (res && res.success) {
        showToast('Ingreso registrado con éxito', 'success');
        modal.classList.add('hidden');
        await loadTreasuryData();
        if (res.movement) {
          openReceiptPreview(res.movement);
        }
      }
    } catch (err) {
      showToast('Error al registrar ingreso', 'error');
    }
  });
}

/**
 * ========================================================
 * MODAL DE REGISTRO DE EGRESOS (GASTOS & VALES)
 * ========================================================
 */
function openExpenseModal() {
  let modal = el('expenseModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'expenseModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }

  const defaultReceipt = 'EGR-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000);

  modal.innerHTML = `
    <div class="modal-body" style="max-width:560px;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <p class="muted" style="margin:0; font-size:0.85rem;"><i class="fas fa-arrow-up" style="color:#ef4444;"></i> Salida de Dinero</p>
          <h3 style="margin:2px 0 0; color:#ef4444;"><i class="fas fa-file-invoice-dollar"></i> Registrar Egreso / Gasto</h3>
        </div>
        <button id="closeExpenseModal" class="ghost"><i class="fas fa-times"></i></button>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>Cuenta / Caja Origen *</span>
          <select id="expAccount">
            ${treasuryData.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <span>Monto a Pagar ($) *</span>
          <input type="number" id="expAmount" placeholder="Ej: 8500" min="1" step="10" required style="font-size:1.1rem; font-weight:700; color:#ef4444;">
        </div>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>Medio de Pago *</span>
          <select id="expPaymentMethod">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia Bancaria">Transferencia Bancaria</option>
            <option value="Tarjeta de Débito">Tarjeta de Débito</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div class="field">
          <span>Categoría de Gasto</span>
          <select id="expCategory">
            <option value="Compra de Insumos / Farmacia">Compra de Insumos / Farmacia</option>
            <option value="Servicios Básicos (Luz/Agua/Internet)">Servicios Básicos (Luz/Agua/Internet)</option>
            <option value="Honorarios Profesionales">Honorarios Profesionales</option>
            <option value="Alquiler de Consultorio">Alquiler de Consultorio</option>
            <option value="Laboratorio Dental">Laboratorio Dental</option>
            <option value="Mantenimiento y Limpieza">Mantenimiento y Limpieza</option>
            <option value="Impuestos / Tasas">Impuestos / Tasas</option>
            <option value="Viáticos / Movilidad">Viáticos / Movilidad</option>
            <option value="Otros Gastos Operativos">Otros Gastos Operativos</option>
          </select>
        </div>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>Proveedor / Beneficiario *</span>
          <input type="text" id="expPerson" placeholder="Ej: Distribuidora Dental Sur SRL / Personal de Limpieza">
        </div>
        <div class="field">
          <span>N° Factura / Ticket de Respaldo</span>
          <input type="text" id="expId" placeholder="Ej: Factura A-0001-00004523">
        </div>
      </div>

      <div class="grid-2" style="gap:12px; margin-bottom:12px;">
        <div class="field">
          <span>N° de Vale / Comprobante de Egreso</span>
          <input type="text" id="expReceiptCode" value="${defaultReceipt}" style="font-weight:700;">
        </div>
        <div class="field">
          <span>Concepto / Motivo del Egreso *</span>
          <input type="text" id="expConcept" placeholder="Ej: Reposición de anestesia dental y guantes de látex" required>
        </div>
      </div>

      <div class="field" style="margin-bottom:20px;">
        <span>Observaciones o Justificación</span>
        <input type="text" id="expNotes" placeholder="Detalle adicional del egreso para control contable">
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="cancelExpenseBtn" class="ghost">Cancelar</button>
        <button id="saveExpenseBtn" class="primary btn-expense-action">
          <i class="fas fa-check"></i> Guardar y Generar Vale de Egreso
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  modal.querySelector('#closeExpenseModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#cancelExpenseBtn')?.addEventListener('click', () => modal.classList.add('hidden'));

  modal.querySelector('#saveExpenseBtn')?.addEventListener('click', async () => {
    const amount = parseFloat(modal.querySelector('#expAmount')?.value);
    const concept = modal.querySelector('#expConcept')?.value.trim();
    const accountId = modal.querySelector('#expAccount')?.value;
    const paymentMethod = modal.querySelector('#expPaymentMethod')?.value;
    const category = modal.querySelector('#expCategory')?.value;
    const personName = modal.querySelector('#expPerson')?.value.trim() || 'Proveedor / Tercero';
    const identification = modal.querySelector('#expId')?.value.trim();
    const receiptNumber = modal.querySelector('#expReceiptCode')?.value.trim() || defaultReceipt;
    const notes = modal.querySelector('#expNotes')?.value.trim();

    if (!amount || amount <= 0 || !concept) {
      showToast('Completá el monto y concepto del egreso', 'warning');
      return;
    }

    try {
      const res = await apiFetch(api.treasury, {
        method: 'POST',
        body: JSON.stringify({
          action: 'movement',
          accountId,
          amount,
          type: 'EXPENSE',
          concept,
          category,
          personName,
          identification,
          paymentMethod,
          receiptNumber,
          notes,
          registeredBy: state.user?.name || 'Dr. Jorge Valenzuela'
        })
      });

      if (res && res.success) {
        showToast('Egreso y vale registrados con éxito', 'success');
        modal.classList.add('hidden');
        await loadTreasuryData();
        if (res.movement) {
          openReceiptPreview(res.movement);
        }
      }
    } catch (err) {
      showToast('Error al registrar egreso', 'error');
    }
  });
}

/**
 * ========================================================
 * VISTA PREVIA E IMPRESIÓN DE COMPROBANTES / RECIBOS / VALES
 * ========================================================
 */
export function openReceiptPreview(m) {
  let modal = el('receiptPreviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'receiptPreviewModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }

  const isIncome = m.type === 'INCOME';
  const receiptCode = m.receiptNumber || m.meta?.receiptNumber || ('MOV-' + m.id.substring(4, 10).toUpperCase());
  const person = m.personName || m.meta?.personName || (isIncome ? 'Paciente / Consumidor Final' : 'Proveedor / Beneficiario');
  const idDoc = m.identification || m.meta?.identification || 'S/N';
  const category = m.category || m.meta?.category || (isIncome ? 'Ingreso General' : 'Gasto Operativo');
  const method = m.paymentMethod || m.meta?.paymentMethod || 'Efectivo';
  const notes = m.notes || m.meta?.notes || '';
  const registeredBy = m.registeredBy || m.meta?.registeredBy || 'Dr. Jorge Valenzuela';
  const dateFormatted = new Date(m.timestamp).toLocaleString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  modal.innerHTML = `
    <div class="modal-body" style="max-width:620px;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <h3 style="margin:0;"><i class="fas fa-print" style="color:var(--primary);"></i> Vista Previa de Comprobante</h3>
        <button id="closeReceiptModal" class="ghost"><i class="fas fa-times"></i></button>
      </div>

      <!-- Papel de Comprobante Imprimible -->
      <div class="receipt-preview-paper" id="receiptPaper">
        <!-- Encabezado Oficial -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #2563eb; padding-bottom:12px; margin-bottom:14px;">
          <div>
            <h2 style="margin:0; font-size:1.3rem; color:#1e3a8a; font-weight:800; display:flex; align-items:center; gap:8px;">
              <i class="fas fa-hospital-user" style="color:#2563eb;"></i> DOCTOR PRO
            </h2>
            <p style="margin:2px 0 0; font-size:0.82rem; color:#64748b;">Consultorios Médicos & Odontología Integral</p>
            <p style="margin:1px 0 0; font-size:0.78rem; color:#94a3b8;">Av. Central 1234 · Tel: +54 9 11 2345-6789</p>
          </div>
          <div style="text-align:right;">
            <div style="display:inline-block; padding:4px 10px; border-radius:6px; background:${isIncome ? '#ecfdf5' : '#fef2f2'}; border:1px solid ${isIncome ? '#10b981' : '#ef4444'}; color:${isIncome ? '#059669' : '#dc2626'}; font-weight:800; font-size:0.82rem; margin-bottom:4px;">
              ${isIncome ? 'RECIBO OFICIAL DE INGRESO' : 'COMPROBANTE DE EGRESO (VALE)'}
            </div>
            <div style="font-size:1rem; font-weight:800; color:#1e293b;">N° ${receiptCode}</div>
            <div style="font-size:0.78rem; color:#64748b;">${dateFormatted}</div>
          </div>
        </div>

        <!-- Datos del Receptor / Emisor -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.86rem; background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:14px; border:1px solid #e2e8f0;">
          <div>
            <span style="color:#64748b; font-size:0.78rem; display:block;">${isIncome ? 'Recibido de (Paciente / Pagador):' : 'Pagado a (Beneficiario / Proveedor):'}</span>
            <strong style="color:#0f172a; font-size:0.95rem;">${person}</strong>
          </div>
          <div>
            <span style="color:#64748b; font-size:0.78rem; display:block;">DNI / CUIT / Identificación:</span>
            <strong style="color:#0f172a;">${idDoc}</strong>
          </div>
          <div>
            <span style="color:#64748b; font-size:0.78rem; display:block;">Cuenta / Caja:</span>
            <span style="color:#0f172a; font-weight:600;">${m.accountName || m.accountId}</span>
          </div>
          <div>
            <span style="color:#64748b; font-size:0.78rem; display:block;">Forma de Pago:</span>
            <span style="color:#0f172a; font-weight:600;">${method}</span>
          </div>
        </div>

        <!-- Detalle de la Operación -->
        <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin-bottom:14px;">
          <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
            <thead>
              <tr style="background:#f1f5f9; text-align:left; color:#475569; font-size:0.8rem;">
                <th style="padding:8px 12px;">Categoría</th>
                <th style="padding:8px 12px;">Concepto / Detalle</th>
                <th style="padding:8px 12px; text-align:right;">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:12px; border-top:1px solid #e2e8f0;"><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">${category}</span></td>
                <td style="padding:12px; border-top:1px solid #e2e8f0;">
                  <strong>${m.concept}</strong>
                  ${notes ? `<div style="font-size:0.8rem; color:#64748b; margin-top:3px;"><em>Obs: ${notes}</em></div>` : ''}
                </td>
                <td style="padding:12px; border-top:1px solid #e2e8f0; text-align:right; font-weight:800; font-size:1.05rem; color:${isIncome ? '#059669' : '#dc2626'};">
                  ${isIncome ? '+' : '-'}$${parseFloat(m.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc; border-top:2px solid #cbd5e1; font-weight:800;">
                <td colspan="2" style="padding:10px 12px; text-align:right; color:#1e293b; font-size:0.95rem;">TOTAL ${isIncome ? 'INGRESADO' : 'EGRESADO'}:</td>
                <td style="padding:10px 12px; text-align:right; font-size:1.2rem; color:${isIncome ? '#059669' : '#dc2626'};">
                  $${parseFloat(m.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Firmas y Responsables -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:30px; text-align:center;">
          <div>
            <div style="border-top:1px solid #94a3b8; padding-top:6px; margin:0 20px;">
              <span style="font-size:0.82rem; font-weight:700; color:#1e293b; display:block;">${registeredBy}</span>
              <span style="font-size:0.75rem; color:#64748b;">Firma / Emisor Autorizado</span>
            </div>
          </div>
          <div>
            <div style="border-top:1px solid #94a3b8; padding-top:6px; margin:0 20px;">
              <span style="font-size:0.82rem; font-weight:700; color:#1e293b; display:block;">${person}</span>
              <span style="font-size:0.75rem; color:#64748b;">Firma de Conformidad</span>
            </div>
          </div>
        </div>

        <div style="text-align:center; margin-top:20px; font-size:0.75rem; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:8px;">
          Documento interno de tesorería y comprobante contable · Sistema Doctor Pro Enterprise
        </div>
      </div>

      <!-- Acciones del Modal -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
        <button id="closeReceiptBtn" class="ghost">Cerrar</button>
        <button id="printReceiptBtn" class="primary" style="background:#2563eb; border-color:#2563eb;">
          <i class="fas fa-print"></i> Imprimir Comprobante Oficial
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  modal.querySelector('#closeReceiptModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#closeReceiptBtn')?.addEventListener('click', () => modal.classList.add('hidden'));

  modal.querySelector('#printReceiptBtn')?.addEventListener('click', () => {
    printTreasuryReceipt(m);
  });
}

/**
 * Función que abre la ventana de impresión directa con el comprobante formateado
 */
export function printTreasuryReceipt(m) {
  const isIncome = m.type === 'INCOME';
  const receiptCode = m.receiptNumber || m.meta?.receiptNumber || ('MOV-' + m.id.substring(4, 10).toUpperCase());
  const person = m.personName || m.meta?.personName || (isIncome ? 'Paciente / Consumidor Final' : 'Proveedor / Beneficiario');
  const idDoc = m.identification || m.meta?.identification || 'S/N';
  const category = m.category || m.meta?.category || (isIncome ? 'Ingreso General' : 'Gasto Operativo');
  const method = m.paymentMethod || m.meta?.paymentMethod || 'Efectivo';
  const notes = m.notes || m.meta?.notes || '';
  const registeredBy = m.registeredBy || m.meta?.registeredBy || 'Dr. Jorge Valenzuela';
  const dateFormatted = new Date(m.timestamp).toLocaleString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const printWindow = window.open('', '_blank', 'width=800,height=700');
  if (!printWindow) {
    showToast('Por favor permití las ventanas emergentes para imprimir el comprobante', 'warning');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Comprobante ${receiptCode} - Doctor Pro</title>
      <style>
        @page { size: A5 landscape; margin: 10mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.4; margin: 0; padding: 12px; }
        .receipt-box { border: 2px solid #cbd5e1; border-radius: 10px; padding: 18px; max-width: 720px; margin: 0 auto; }
        .head { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
        .clinic-name { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; }
        .badge-inc { background: #ecfdf5; border: 1px solid #10b981; color: #059669; }
        .badge-exp { background: #fef2f2; border: 1px solid #ef4444; color: #dc2626; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px; }
        th, td { padding: 8px 10px; border-top: 1px solid #e2e8f0; text-align: left; }
        th { background: #f1f5f9; color: #475569; font-size: 11px; }
        .total-row { background: #f8fafc; font-weight: 800; font-size: 15px; border-top: 2px solid #cbd5e1; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 35px; text-align: center; }
        .sig-line { border-top: 1px solid #64748b; padding-top: 5px; font-size: 12px; margin: 0 15px; }
      </style>
    </head>
    <body>
      <div class="receipt-box">
        <div class="head">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${NANI_DENT_LOGO_BASE64}" alt="Nani Dent" style="max-height:50px; object-fit:contain;">
            <div>
              <h1 class="clinic-name" style="color:#008779; font-size:18px; margin:0;">NANI DENT</h1>
              <p style="margin:2px 0 0; font-size:11px; font-weight:600; color:#0e7490;">${CLINIC_BRANDING.slogan}</p>
              <p style="margin:1px 0 0; font-size:10px; color:#64748b;">${CLINIC_BRANDING.subtitle}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="badge ${isIncome ? 'badge-inc' : 'badge-exp'}">
              ${isIncome ? 'RECIBO OFICIAL DE INGRESO' : 'COMPROBANTE DE EGRESO (VALE)'}
            </div>
            <div style="font-size:15px; font-weight:800; color:#0f172a; margin-top:4px;">N° ${receiptCode}</div>
            <div style="font-size:11px; color:#64748b;">${dateFormatted}</div>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <span style="color:#64748b; font-size:11px; display:block;">${isIncome ? 'Recibido de:' : 'Pagado a:'}</span>
            <strong style="font-size:14px;">${person}</strong>
          </div>
          <div>
            <span style="color:#64748b; font-size:11px; display:block;">DNI / CUIT:</span>
            <strong>${idDoc}</strong>
          </div>
          <div>
            <span style="color:#64748b; font-size:11px; display:block;">Cuenta / Caja:</span>
            <strong>${m.accountName || m.accountId}</strong>
          </div>
          <div>
            <span style="color:#64748b; font-size:11px; display:block;">Forma de Pago:</span>
            <strong>${method}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>CATEGORÍA</th>
              <th>CONCEPTO / DETALLE</th>
              <th style="text-align:right;">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${category}</strong></td>
              <td>
                ${m.concept}
                ${notes ? `<div style="font-size:11px; color:#64748b; margin-top:2px;"><em>Obs: ${notes}</em></div>` : ''}
              </td>
              <td style="text-align:right; font-weight:800; color:${isIncome ? '#059669' : '#dc2626'};">
                ${isIncome ? '+' : '-'}$${parseFloat(m.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2" style="text-align:right;">TOTAL ${isIncome ? 'INGRESADO' : 'EGRESADO'}:</td>
              <td style="text-align:right; color:${isIncome ? '#059669' : '#dc2626'};">
                $${parseFloat(m.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-line">
              <strong>${registeredBy}</strong><br>
              <span style="color:#64748b; font-size:10px;">Firma / Emisor Responsable</span>
            </div>
          </div>
          <div>
            <div class="sig-line">
              <strong>${person}</strong><br>
              <span style="color:#64748b; font-size:10px;">Firma de Conformidad</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * ========================================================
 * MODAL DE ARQUEO Y CIERRE DE CAJA DIARIO
 * ========================================================
 */
function openCashClosureModal() {
  let modal = el('cashClosureModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cashClosureModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }

  const cashAcc = treasuryData.accounts.find(a => a.id === 'acc_cash_1') || treasuryData.accounts[0] || { balance: 0, name: 'Caja General' };
  const expected = parseFloat(cashAcc.balance) || 0;

  modal.innerHTML = `
    <div class="modal-body" style="max-width:520px;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <p class="muted" style="margin:0; font-size:0.85rem;">Control & Arqueo Contable</p>
          <h3 style="margin:2px 0 0;"><i class="fas fa-lock" style="color:var(--primary);"></i> Arqueo & Cierre de Caja Diario</h3>
        </div>
        <button id="closeCashClosureModal" class="ghost"><i class="fas fa-times"></i></button>
      </div>

      <div style="background:var(--bg-page); padding:16px; border-radius:10px; margin-bottom:16px; border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span class="muted">Cuenta a Arquear:</span>
          <strong>${cashAcc.name}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.1rem;">
          <span class="muted">Saldo Teórico en Sistema:</span>
          <strong style="color:var(--primary);">$${expected.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <div class="field" style="margin-bottom:14px;">
        <span>Efectivo Físico Recontado ($) *</span>
        <input type="number" id="cashClosureCounted" placeholder="Ingresá el dinero real en caja" step="10" min="0" required>
      </div>

      <div id="cashClosureDiffBox" style="display:none; padding:12px; border-radius:8px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; font-weight:700;">
          <span>Resultado del Arqueo:</span>
          <span id="cashClosureDiffText"></span>
        </div>
      </div>

      <div class="field" style="margin-bottom:20px;">
        <span>Observaciones o Justificación de Diferencia</span>
        <textarea id="cashClosureNotes" rows="2" placeholder="Ej: Arqueo conforme de cierre de jornada"></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="cancelCashClosureBtn" class="ghost">Cancelar</button>
        <button id="confirmCashClosureBtn" class="primary" style="background:var(--primary);">
          <i class="fas fa-check"></i> Confirmar y Guardar Cierre
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  const countedInp = modal.querySelector('#cashClosureCounted');
  const diffBox = modal.querySelector('#cashClosureDiffBox');
  const diffText = modal.querySelector('#cashClosureDiffText');

  countedInp.addEventListener('input', () => {
    const val = parseFloat(countedInp.value);
    if (isNaN(val)) {
      diffBox.style.display = 'none';
      return;
    }
    const diff = val - expected;
    diffBox.style.display = 'block';
    if (diff === 0) {
      diffBox.style.background = 'rgba(16,185,129,0.15)';
      diffBox.style.color = '#10b981';
      diffText.innerText = 'Caja Cuadrada ($0.00)';
    } else if (diff > 0) {
      diffBox.style.background = 'rgba(245,158,11,0.15)';
      diffBox.style.color = '#f59e0b';
      diffText.innerText = `Sobrante: +$${diff.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    } else {
      diffBox.style.background = 'rgba(239,68,68,0.15)';
      diffBox.style.color = '#ef4444';
      diffText.innerText = `Faltante: -$${Math.abs(diff).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }
  });

  modal.querySelector('#closeCashClosureModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#cancelCashClosureBtn')?.addEventListener('click', () => modal.classList.add('hidden'));

  modal.querySelector('#confirmCashClosureBtn')?.addEventListener('click', async () => {
    const counted = parseFloat(countedInp.value);
    if (isNaN(counted) || counted < 0) {
      showToast('Ingresá un monto contado válido', 'warning');
      return;
    }

    try {
      const res = await apiFetch(api.treasury, {
        method: 'POST',
        body: JSON.stringify({
          action: 'closure',
          accountId: cashAcc.id,
          countedAmount: counted,
          notes: modal.querySelector('#cashClosureNotes')?.value || '',
          closedBy: state.user?.name || 'Dr. Jorge Valenzuela'
        })
      });

      if (res && res.success) {
        showToast('Arqueo y cierre de caja guardado con éxito', 'success');
        modal.classList.add('hidden');
        loadTreasuryData();
      }
    } catch (err) {
      showToast('Error al registrar el cierre de caja', 'error');
    }
  });
}
