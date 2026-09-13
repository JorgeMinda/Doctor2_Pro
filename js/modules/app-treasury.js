/**
 * app-treasury.js - Módulo de Tesorería, Cajas, Arqueos Diarios, Cierre de Caja y Pista de Auditoría
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';

let treasuryData = {
  accounts: [],
  movements: [],
  closures: [],
  auditLogs: []
};

let activeTab = 'cuentas'; // 'cuentas' | 'movimientos' | 'cierres' | 'auditoria'

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

  container.innerHTML = `
    <div class="card" style="padding:24px;">
      <!-- Encabezado de Tesorería -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px;">
        <div>
          <p class="muted" style="margin:0; font-size:0.85rem;"><i class="fas fa-landmark"></i> Gestión Contable & Tesorería Enterprise</p>
          <h2 style="margin:4px 0 0; color:var(--primary); font-size:1.4rem;">
            <i class="fas fa-cash-register"></i> Cajas, Bancos & Arqueos Diarios
          </h2>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="ghost" id="refreshTreasuryBtn" title="Actualizar datos"><i class="fas fa-rotate"></i> Actualizar</button>
          <button class="ghost" id="newManualMovementBtn"><i class="fas fa-plus-circle"></i> Nuevo Movimiento</button>
          <button class="primary" id="openCashClosureModalBtn" style="background:var(--success); border-color:var(--success); box-shadow:0 4px 14px rgba(16,185,129,0.35);">
            <i class="fas fa-lock"></i> Realizar Arqueo / Cierre de Caja
          </button>
        </div>
      </div>

      <!-- Métricas de Cuentas y Saldos en Vivo -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:24px;">
        <div style="background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.03)); border:1px solid rgba(99,102,241,0.3); border-radius:12px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="muted" style="font-size:0.85rem; font-weight:600;">Saldo Total Consolidado</span>
            <i class="fas fa-wallet" style="color:var(--primary); font-size:1.2rem;"></i>
          </div>
          <h3 style="margin:0; font-size:1.5rem; color:var(--primary);">$${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          <small class="muted">Activos en todas las cuentas</small>
        </div>

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
          <i class="fas fa-list-check"></i> Libro Mayor de Movimientos
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
  const movs = treasuryData.movements || [];
  if (movs.length === 0) {
    return `
      <div style="text-align:center; padding:40px; background:var(--bg-page); border-radius:12px; border:1px dashed var(--border);">
        <i class="fas fa-receipt" style="font-size:2.5rem; color:var(--muted); margin-bottom:12px;"></i>
        <h4 style="margin:0 0 6px;">Sin movimientos registrados</h4>
        <p class="muted" style="margin:0; font-size:0.9rem;">Los cobros de turnos y movimientos de caja se reflejarán automáticamente aquí.</p>
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha / Hora</th>
            <th>Cuenta Destino</th>
            <th>Concepto / Detalle</th>
            <th>Tipo</th>
            <th>Monto ($)</th>
            <th>Saldo Posterior</th>
          </tr>
        </thead>
        <tbody>
          ${movs.map(m => {
            const isIncome = m.type === 'INCOME';
            return `
              <tr>
                <td><small>${new Date(m.timestamp).toLocaleString('es-AR')}</small></td>
                <td><strong>${m.accountName || m.accountId}</strong></td>
                <td>${m.concept || 'Movimiento'}</td>
                <td>
                  <span class="badge ${isIncome ? 'attended' : 'cancelled'}">
                    ${isIncome ? 'Ingreso' : 'Egreso'}
                  </span>
                </td>
                <td>
                  <strong style="color:${isIncome ? 'var(--success)' : 'var(--danger)'};">
                    ${isIncome ? '+' : '-'}$${parseFloat(m.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </strong>
                </td>
                <td><span class="muted">$${parseFloat(m.balanceAfter || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderClosuresTab() {
  const cls = treasuryData.closures || [];
  if (cls.length === 0) {
    return `
      <div style="text-align:center; padding:40px; background:var(--bg-page); border-radius:12px; border:1px dashed var(--border);">
        <i class="fas fa-vault" style="font-size:2.5rem; color:var(--muted); margin-bottom:12px;"></i>
        <h4 style="margin:0 0 6px;">Sin arqueos o cierres de caja</h4>
        <p class="muted" style="margin:0; font-size:0.9rem;">Podés realizar el primer cierre diario haciendo clic en <strong>Realizar Arqueo / Cierre de Caja</strong>.</p>
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

  container.querySelector('#openCashClosureModalBtn')?.addEventListener('click', openCashClosureModal);
  container.querySelector('#newManualMovementBtn')?.addEventListener('click', openManualMovementModal);
}

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
          <h3 style="margin:2px 0 0;"><i class="fas fa-lock" style="color:var(--success);"></i> Cierre de Caja Diario</h3>
        </div>
        <button id="closeCashClosureModal" class="ghost"><i class="fas fa-times"></i></button>
      </div>

      <div style="background:var(--bg-page); padding:16px; border-radius:10px; margin-bottom:16px; border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span class="muted">Cuenta a Arquear:</span>
          <strong>${cashAcc.name}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.1rem;">
          <span class="muted">Saldo Teórico del Sistema:</span>
          <strong style="color:var(--primary);">$${expected.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <div class="field" style="margin-bottom:14px;">
        <span>Efectivo Físico Recontado ($)</span>
        <input type="number" id="cashClosureCounted" placeholder="Ingresá el dinero real en caja" step="10" min="0">
      </div>

      <div id="cashClosureDiffBox" style="display:none; padding:12px; border-radius:8px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; font-weight:700;">
          <span>Resultado del Arqueo:</span>
          <span id="cashClosureDiffText"></span>
        </div>
      </div>

      <div class="field" style="margin-bottom:20px;">
        <span>Observaciones o Justificación de Diferencia</span>
        <textarea id="cashClosureNotes" rows="2" placeholder="Ej: Arqueo conforme del turno tarde"></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="cancelCashClosureBtn" class="ghost">Cancelar</button>
        <button id="confirmCashClosureBtn" class="primary" style="background:var(--success); border-color:var(--success);">
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

function openManualMovementModal() {
  let modal = el('manualMovementModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'manualMovementModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-body" style="max-width:480px;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0;"><i class="fas fa-money-bill-transfer" style="color:var(--primary);"></i> Registrar Movimiento Manual</h3>
        <button id="closeManualMovModal" class="ghost"><i class="fas fa-times"></i></button>
      </div>

      <div class="field" style="margin-bottom:12px;">
        <span>Cuenta</span>
        <select id="manualMovAccount">
          ${treasuryData.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
        </select>
      </div>

      <div class="field" style="margin-bottom:12px;">
        <span>Tipo de Movimiento</span>
        <select id="manualMovType">
          <option value="INCOME">Ingreso (+)</option>
          <option value="EXPENSE">Egreso / Gasto (-)</option>
        </select>
      </div>

      <div class="field" style="margin-bottom:12px;">
        <span>Monto ($)</span>
        <input type="number" id="manualMovAmount" placeholder="Ej: 5000" min="1" step="10">
      </div>

      <div class="field" style="margin-bottom:16px;">
        <span>Concepto / Motivo</span>
        <input type="text" id="manualMovConcept" placeholder="Ej: Compra de insumos de librería menor">
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="cancelManualMovBtn" class="ghost">Cancelar</button>
        <button id="confirmManualMovBtn" class="primary"><i class="fas fa-check"></i> Guardar Movimiento</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.querySelector('#closeManualMovModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#cancelManualMovBtn')?.addEventListener('click', () => modal.classList.add('hidden'));

  modal.querySelector('#confirmManualMovBtn')?.addEventListener('click', async () => {
    const amount = parseFloat(modal.querySelector('#manualMovAmount')?.value);
    const concept = modal.querySelector('#manualMovConcept')?.value.trim();
    const accountId = modal.querySelector('#manualMovAccount')?.value;
    const type = modal.querySelector('#manualMovType')?.value;

    if (!amount || amount <= 0 || !concept) {
      showToast('Completá el monto y concepto del movimiento', 'warning');
      return;
    }

    try {
      const res = await apiFetch(api.treasury, {
        method: 'POST',
        body: JSON.stringify({
          action: 'movement',
          accountId,
          amount,
          type,
          concept
        })
      });

      if (res && res.success) {
        showToast('Movimiento registrado correctamente', 'success');
        modal.classList.add('hidden');
        loadTreasuryData();
      }
    } catch (err) {
      showToast('Error al registrar movimiento', 'error');
    }
  });
}
