/**
 * app-inventory.js - Módulo de Inventario y Control de Stock de Insumos Médicos
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast, formatCurrency } from './app-utils.js';

let activeCategoryFilter = '';
let activeStatusFilter = '';

export async function loadInventory() {
  try {
    let url = api.inventory;
    const params = [];
    if (activeCategoryFilter) params.push(`category=${encodeURIComponent(activeCategoryFilter)}`);
    if (activeStatusFilter) params.push(`filter=${encodeURIComponent(activeStatusFilter)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const data = await apiFetch(url);
    state.inventory = data.items || [];
    state.inventoryCategories = data.categories || [];

    renderInventoryKpis();
    renderInventoryCategoryPills();
    renderInventoryTable();
  } catch (err) {
    console.warn('Error al cargar inventario:', err);
  }
}

export function renderInventoryKpis() {
  const items = state.inventory || [];
  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.stock <= i.min_stock).length;
  const totalValuation = items.reduce((acc, i) => acc + (i.stock * (i.cost_price || 0)), 0);

  const totalEl = el('invTotalItems');
  const lowEl = el('invLowStockCount');
  const valEl = el('invTotalValuation');

  if (totalEl) totalEl.textContent = totalItems;
  if (lowEl) lowEl.textContent = lowStockCount;
  if (valEl) valEl.textContent = formatCurrency(totalValuation);
}

export function renderInventoryCategoryPills() {
  const container = el('inventoryCategoryPills');
  if (!container) return;

  const cats = ['Todas', ...state.inventoryCategories];
  container.innerHTML = cats.map(cat => {
    const isAll = cat === 'Todas';
    const isActive = (isAll && !activeCategoryFilter) || (activeCategoryFilter === cat);
    return `
      <button class="filter-pill ${isActive ? 'active' : ''}" onclick="window.filterInventoryCategory('${isAll ? '' : cat}')">
        ${cat}
      </button>
    `;
  }).join('');
}

window.filterInventoryCategory = (cat) => {
  activeCategoryFilter = cat;
  loadInventory();
};

export function renderInventoryTable() {
  const tbody = el('inventoryTableBody');
  const searchInput = el('inventorySearch');
  if (!tbody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filtered = state.inventory.filter(i =>
    i.name.toLowerCase().includes(query) ||
    (i.code && i.code.toLowerCase().includes(query)) ||
    (i.location && i.location.toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No se encontraron insumos</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isLow = item.stock <= item.min_stock;
    return `
      <tr>
        <td><strong>${item.code || '-'}</strong></td>
        <td>
          <div style="font-weight:600;">${item.name}</div>
          <small class="muted">${item.location || 'Sin ubicación específica'}</small>
        </td>
        <td><span class="badge" style="background:#f1f5f9; color:#475569;">${item.category}</span></td>
        <td>
          <span class="stock-badge ${isLow ? 'low' : 'optimal'}">
            ${isLow ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-check"></i>'}
            ${item.stock} ${item.unit}
          </span>
          <small class="muted" style="display:block; font-size:0.75rem;">Mín: ${item.min_stock}</small>
        </td>
        <td>${formatCurrency(item.cost_price)}</td>
        <td>${item.expiry_date || '-'}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="ghost" onclick="window.openStockMovementModal('${item.id}', 'entrada')" title="Registrar Entrada / Compra"><i class="fas fa-plus" style="color:var(--success);"></i></button>
            <button class="ghost" onclick="window.openStockMovementModal('${item.id}', 'salida')" title="Registrar Salida / Uso"><i class="fas fa-minus" style="color:var(--danger);"></i></button>
            <button class="ghost" onclick="window.openInventoryItemAudit('${item.id}')" title="Auditoría / Historial de este Insumo"><i class="fas fa-history" style="color:var(--primary);"></i></button>
            <button class="ghost" onclick="window.editInventoryItem('${item.id}')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="ghost" onclick="window.deleteInventoryItem('${item.id}')" title="Eliminar Insumo" style="color:var(--danger);"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.editInventoryItem = (id) => {
  const item = state.inventory.find(i => i.id === id);
  if (item) openInventoryModal(item);
};

window.openInventoryItemAudit = (itemId) => {
  openInventoryAuditModal(itemId);
};

window.deleteInventoryItem = async (id) => {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;

  const currentStock = parseInt(item.stock) || 0;
  if (currentStock > 0) {
    showToast(`No se puede eliminar "${item.name}" porque tiene stock disponible (${currentStock} ${item.unit}). El stock debe estar en 0 para poder eliminarlo.`, 'warning');
    return;
  }

  if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el insumo "${item.name}" (${item.code || 'Sin código'})?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await apiFetch(`${api.inventory}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    showToast(`Insumo "${item.name}" eliminado correctamente`, 'success');
    if (el('inventoryItemModal') && !el('inventoryItemModal').classList.contains('hidden')) {
      closeInventoryModal();
    }
    loadInventory();
  } catch (err) {
    showToast(err.message || 'Error al eliminar el insumo', 'error');
  }
};

export function openInventoryModal(item = null) {
  const modal = el('inventoryItemModal');
  if (!modal) return;

  el('invModalTitle').textContent = item ? 'Editar Insumo' : 'Nuevo Insumo / Producto';
  el('invItemId').value = item ? item.id : '';
  el('invCode').value = item ? item.code : '';
  el('invName').value = item ? item.name : '';
  el('invCategory').value = item ? item.category : '';
  el('invStock').value = item ? item.stock : '10';
  el('invMinStock').value = item ? item.min_stock : '5';
  el('invUnit').value = item ? item.unit : 'unidades';
  el('invCost').value = item ? item.cost_price : '0';
  el('invExpiry').value = item ? item.expiry_date : '';
  el('invLocation').value = item ? item.location : '';

  const deleteBtn = el('deleteInvBtn');
  if (deleteBtn) {
    if (item) {
      deleteBtn.style.display = 'inline-flex';
      deleteBtn.onclick = () => window.deleteInventoryItem(item.id);
    } else {
      deleteBtn.style.display = 'none';
      deleteBtn.onclick = null;
    }
  }

  modal.classList.remove('hidden');
}

export function closeInventoryModal() {
  el('inventoryItemModal')?.classList.add('hidden');
}

export async function saveInventoryItem() {
  const id = el('invItemId')?.value;
  const code = el('invCode')?.value.trim();
  const name = el('invName')?.value.trim();
  const category = el('invCategory')?.value.trim();
  const stock = parseInt(el('invStock')?.value) || 0;
  const min_stock = parseInt(el('invMinStock')?.value) || 5;
  const unit = el('invUnit')?.value.trim() || 'unidades';
  const cost_price = parseFloat(el('invCost')?.value) || 0;
  const expiry_date = el('invExpiry')?.value;
  const location = el('invLocation')?.value.trim();

  if (!name || !category) {
    showToast('Nombre y categoría son obligatorios', 'warning');
    return;
  }

  try {
    const method = id ? 'PATCH' : 'POST';
    const payload = { id, code, name, category, stock, min_stock, unit, cost_price, expiry_date, location };

    await apiFetch(api.inventory, {
      method,
      body: JSON.stringify(payload)
    });

    showToast('Insumo guardado con éxito', 'success');
    closeInventoryModal();
    loadInventory();
  } catch (err) {
    showToast(err.message || 'Error al guardar insumo', 'error');
  }
}

// Modal de Movimientos de Stock
window.openStockMovementModal = (itemId, type = 'entrada') => {
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  const modal = el('stockMovementModal');
  if (!modal) return;

  el('movItemId').value = item.id;
  el('movItemName').textContent = `${item.name} (Stock actual: ${item.stock} ${item.unit})`;
  el('movType').value = type;
  el('movQuantity').value = '1';
  el('movReason').value = type === 'entrada' ? 'Compra de insumos' : 'Uso en atención clínica';

  modal.classList.remove('hidden');
};

export function closeStockMovementModal() {
  el('stockMovementModal')?.classList.add('hidden');
}

export async function saveStockMovement() {
  const itemId = el('movItemId')?.value;
  const type = el('movType')?.value;
  const quantity = parseInt(el('movQuantity')?.value) || 0;
  const reason = el('movReason')?.value.trim();

  if (!itemId || quantity <= 0) {
    showToast('Ingresá una cantidad válida', 'warning');
    return;
  }

  try {
    await apiFetch(`${api.inventory}?action=movement`, {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, type, quantity, reason })
    });

    showToast(`Stock actualizado correctamente (${type === 'entrada' ? '+' : '-'}${quantity})`, 'success');
    closeStockMovementModal();
    loadInventory();
  } catch (err) {
    showToast(err.message || 'Error al registrar movimiento', 'error');
  }
}

// Modal y Funciones de Auditoría por Fechas
export async function loadInventoryAudit() {
  const tbody = el('invAuditTableBody');
  const summaryEl = el('invAuditSummaryText');
  if (!tbody) return;

  const dateFrom = el('invAuditDateFrom')?.value || '';
  const dateTo = el('invAuditDateTo')?.value || '';
  const type = el('invAuditType')?.value || 'all';
  const itemId = el('invAuditItemSelect')?.value || '';

  tbody.innerHTML = '<tr><td colspan="6" class="empty"><i class="fas fa-spinner fa-spin"></i> Cargando movimientos de auditoría...</td></tr>';

  try {
    const params = [];
    if (dateFrom) params.push(`date_from=${encodeURIComponent(dateFrom)}`);
    if (dateTo) params.push(`date_to=${encodeURIComponent(dateTo)}`);
    if (type && type !== 'all') params.push(`type=${encodeURIComponent(type)}`);
    if (itemId) params.push(`item_id=${encodeURIComponent(itemId)}`);

    const url = `${api.inventory}?action=audit${params.length > 0 ? '&' + params.join('&') : ''}`;
    const data = await apiFetch(url);
    const movements = data.movements || [];

    if (summaryEl) {
      const count = movements.length;
      summaryEl.innerHTML = `<strong>${count}</strong> ${count === 1 ? 'registro encontrado' : 'registros encontrados'}`;
    }

    if (movements.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No se encontraron movimientos para los filtros seleccionados.</td></tr>';
      return;
    }

    tbody.innerHTML = movements.map(m => {
      let typeBadge = '';
      let qtyDisplay = `${m.quantity || 0} ${m.unit || 'unidades'}`;
      let stockTransition = (m.stock_before !== undefined && m.stock_after !== undefined)
        ? `${m.stock_before} &rarr; <strong>${m.stock_after}</strong>`
        : (m.stock_after !== undefined ? `<strong>${m.stock_after}</strong>` : '-');

      switch (m.type) {
        case 'entrada':
          typeBadge = '<span class="badge" style="background:rgba(16,185,129,0.12); color:#059669; font-weight:700;"><i class="fas fa-arrow-down"></i> Entrada / Compra</span>';
          qtyDisplay = `<strong style="color:var(--success);">+${m.quantity} ${m.unit || 'unidades'}</strong>`;
          break;
        case 'salida':
          typeBadge = '<span class="badge" style="background:rgba(239,68,68,0.12); color:#dc2626; font-weight:700;"><i class="fas fa-arrow-up"></i> Salida / Uso</span>';
          qtyDisplay = `<strong style="color:var(--danger);">-${m.quantity} ${m.unit || 'unidades'}</strong>`;
          break;
        case 'ajuste':
          typeBadge = '<span class="badge" style="background:rgba(245,158,11,0.12); color:#d97706; font-weight:700;"><i class="fas fa-sliders-h"></i> Ajuste Stock</span>';
          break;
        case 'creacion':
          typeBadge = '<span class="badge" style="background:rgba(59,130,246,0.12); color:#2563eb; font-weight:700;"><i class="fas fa-plus-circle"></i> Alta Insumo</span>';
          break;
        case 'eliminacion':
          typeBadge = '<span class="badge" style="background:rgba(100,116,139,0.12); color:#475569; font-weight:700;"><i class="fas fa-trash-alt"></i> Baja Insumo</span>';
          qtyDisplay = '<span class="muted">-</span>';
          break;
        default:
          typeBadge = `<span class="badge">${m.type || 'Movimiento'}</span>`;
      }

      const formattedDate = m.created_at || '-';

      return `
        <tr>
          <td><span style="font-weight:600; font-size:0.8rem;">${formattedDate}</span></td>
          <td>
            <strong>${m.item_name || 'Insumo'}</strong>
            ${m.item_code ? `<small class="muted" style="display:block; font-size:0.75rem;">${m.item_code}</small>` : ''}
          </td>
          <td>${typeBadge}</td>
          <td>${qtyDisplay}</td>
          <td>${stockTransition}</td>
          <td><span style="font-size:0.8rem; color:var(--text);">${m.reason || '-'}</span></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty" style="color:var(--danger);">Error al cargar auditoría de inventario</td></tr>';
  }
}

export function openInventoryAuditModal(filterItemId = '') {
  const modal = el('inventoryAuditModal');
  if (!modal) return;

  // Poblar select de insumos
  const itemSelect = el('invAuditItemSelect');
  if (itemSelect) {
    itemSelect.innerHTML = '<option value="">Todos los Insumos</option>' +
      (state.inventory || []).map(i => `<option value="${i.id}">${i.name} (${i.code || 'Sin cód.'})</option>`).join('');
    itemSelect.value = filterItemId || '';
  }

  // Fechas por defecto: mes actual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  if (el('invAuditDateFrom') && !el('invAuditDateFrom').value) el('invAuditDateFrom').value = firstDay;
  if (el('invAuditDateTo') && !el('invAuditDateTo').value) el('invAuditDateTo').value = today;
  if (el('invAuditType')) el('invAuditType').value = 'all';

  modal.classList.remove('hidden');
  loadInventoryAudit();
}

export function closeInventoryAuditModal() {
  el('inventoryAuditModal')?.classList.add('hidden');
}

export function setupInventoryListeners() {
  el('inventorySearch')?.addEventListener('input', renderInventoryTable);
  el('newInventoryBtn')?.addEventListener('click', () => openInventoryModal());
  el('closeInvModal')?.addEventListener('click', closeInventoryModal);
  el('cancelInvModal')?.addEventListener('click', closeInventoryModal);
  el('saveInvBtn')?.addEventListener('click', saveInventoryItem);

  el('closeMovModal')?.addEventListener('click', closeStockMovementModal);
  el('cancelMovModal')?.addEventListener('click', closeStockMovementModal);
  el('saveMovBtn')?.addEventListener('click', saveStockMovement);

  // Listeners para Auditoría de Inventario
  el('invAuditBtn')?.addEventListener('click', () => openInventoryAuditModal());
  el('closeInvAuditModal')?.addEventListener('click', closeInventoryAuditModal);
  el('closeInvAuditBtn')?.addEventListener('click', closeInventoryAuditModal);
  el('invAuditFilterBtn')?.addEventListener('click', loadInventoryAudit);
  el('invAuditResetBtn')?.addEventListener('click', () => {
    if (el('invAuditDateFrom')) el('invAuditDateFrom').value = '';
    if (el('invAuditDateTo')) el('invAuditDateTo').value = '';
    if (el('invAuditType')) el('invAuditType').value = 'all';
    if (el('invAuditItemSelect')) el('invAuditItemSelect').value = '';
    loadInventoryAudit();
  });
}
