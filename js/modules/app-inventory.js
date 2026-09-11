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
            <button class="ghost" onclick="window.editInventoryItem('${item.id}')" title="Editar"><i class="fas fa-edit"></i></button>
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

export function setupInventoryListeners() {
  el('inventorySearch')?.addEventListener('input', renderInventoryTable);
  el('newInventoryBtn')?.addEventListener('click', () => openInventoryModal());
  el('closeInvModal')?.addEventListener('click', closeInventoryModal);
  el('cancelInvModal')?.addEventListener('click', closeInventoryModal);
  el('saveInvBtn')?.addEventListener('click', saveInventoryItem);

  el('closeMovModal')?.addEventListener('click', closeStockMovementModal);
  el('cancelMovModal')?.addEventListener('click', closeStockMovementModal);
  el('saveMovBtn')?.addEventListener('click', saveStockMovement);
}
