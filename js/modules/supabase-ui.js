/**
 * supabase-ui.js - Controlador de la Interfaz de Configuración de Supabase
 */

import { el, showToast } from './app-utils.js';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured } from './supabase-config.js';
import { sbTestConnection } from './supabase-client.js';

export function initSupabaseUI() {
  const modal = el('supabaseModal');
  const navBtn = el('navDatabase');
  const closeBtn = el('closeSupabaseModal');
  const cancelBtn = el('closeSbBtn');
  const saveBtn = el('saveSbBtn');
  const testBtn = el('sbTestBtn');
  const copySqlBtn = el('sbDownloadSqlBtn');
  const enabledChk = el('sbEnabledCheckbox');
  const urlInput = el('sbProjectUrl');
  const keyInput = el('sbAnonKey');
  const statusBadge = el('sbCurrentStatusBadge');

  if (!modal) return;

  const updateStatusDisplay = (isConnected = null) => {
    if (!statusBadge) return;
    const isCfg = isSupabaseConfigured();

    if (isConnected === true) {
      statusBadge.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> <span style="color:#10b981;">Conectado a Supabase PostgreSQL Cloud</span>';
    } else if (isConnected === false) {
      statusBadge.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i> <span style="color:#ef4444;">Error de conexión con Supabase</span>';
    } else if (isCfg) {
      statusBadge.innerHTML = '<i class="fas fa-cloud" style="color:var(--primary);"></i> <span style="color:var(--primary);">Configurado (Supabase Cloud)</span>';
    } else {
      statusBadge.innerHTML = '<i class="fas fa-server" style="color:var(--muted);"></i> <span style="color:var(--muted);">Backend Local (PHP / data_store.json)</span>';
    }
  };

  const openModal = () => {
    const cfg = getSupabaseConfig();
    if (urlInput) urlInput.value = cfg.url || '';
    if (keyInput) keyInput.value = cfg.anonKey || '';
    if (enabledChk) enabledChk.checked = cfg.enabled !== false;
    updateStatusDisplay();
    modal.classList.remove('hidden');
  };

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  navBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Botón Probar Conexión
  testBtn?.addEventListener('click', async () => {
    const url = urlInput?.value.trim();
    const key = keyInput?.value.trim();

    if (!url || !key) {
      showToast('Ingresá la URL del proyecto y la Anon API Key', 'warning');
      return;
    }

    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';

    const result = await sbTestConnection(url, key);
    testBtn.disabled = false;
    testBtn.innerHTML = '<i class="fas fa-vial"></i> Probar Conexión';

    if (result.success) {
      showToast('¡Conexión exitosa con Supabase PostgreSQL!', 'success');
      updateStatusDisplay(true);
    } else {
      showToast(`Error de conexión: ${result.error}`, 'error');
      updateStatusDisplay(false);
    }
  });

  // Botón Guardar y Conectar
  saveBtn?.addEventListener('click', async () => {
    const url = urlInput?.value.trim();
    const key = keyInput?.value.trim();
    const isEnabled = enabledChk?.checked ?? true;

    if (isEnabled && (!url || !key)) {
      showToast('Por favor completá los campos de URL y Anon Key', 'warning');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    if (isEnabled && url && key) {
      const result = await sbTestConnection(url, key);
      if (!result.success) {
        showToast(`Advertencia: No se pudo verificar la tabla 'patients': ${result.error}. Guardando de todos modos...`, 'warning');
      }
    }

    saveSupabaseConfig(url, key, isEnabled);
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Guardar y Conectar';

    showToast(isEnabled ? 'Configuración de Supabase guardada. Sincronización en la nube activada.' : 'Sincronización de Supabase desactivada. Modo PHP local activo.', 'success');
    updateStatusDisplay();
    closeModal();

    // Recargar datos desde el nuevo origen
    setTimeout(() => {
      window.location.reload();
    }, 800);
  });

  // Copiar SQL al Portapapeles
  copySqlBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('supabase_schema.sql');
      const sql = await res.text();
      await navigator.clipboard.writeText(sql);
      showToast('¡Script SQL copiado al portapapeles! Pégalo en el SQL Editor de Supabase', 'success');
    } catch (err) {
      showToast('No se pudo copiar automáticamente. Consulta el archivo supabase_schema.sql', 'info');
    }
  });

  updateStatusDisplay();
}

if (typeof window !== 'undefined') {
  window.initSupabaseUI = initSupabaseUI;
}
