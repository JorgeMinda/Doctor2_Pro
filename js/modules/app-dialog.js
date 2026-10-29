/**
 * app-dialog.js - Diálogo de confirmación custom (estilo AlertDialog oscuro)
 * Reemplaza a window.confirm para flujos críticos con UI diseñada.
 */

/**
 * Muestra un diálogo de confirmación; resuelve con true (confirmar) o false (cancelar).
 * cierra con: botón confirmar, botón cancelar, Escape, X, o clic en el overlay.
 */
export function showConfirmDialog({
  title = '¿Confirmar acción?',
  description = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmClass = ''
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const decide = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey);
      dialog.remove();
      overlay.remove();
      resolve(value);
    };

    const overlay = document.createElement('div');
    overlay.className = 'adl-overlay';
    overlay.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.className = 'adl-card';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = `
      <button type="button" class="adl-close" aria-label="Cerrar" title="Cerrar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="adl-close-icon"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
      </button>
      <div class="adl-header">
        <span class="adl-info-badge" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="adl-info-icon"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        </span>
        <h2 class="adl-title">${title}</h2>
      </div>
      ${description ? `<p class="adl-description">${description}</p>` : ''}
      <div class="adl-footer">
        <button type="button" class="adl-btn adl-btn--cancel">${cancelLabel}</button>
        <button type="button" class="adl-btn adl-btn--confirm ${confirmClass}">${confirmLabel}</button>
      </div>
    `;

    overlay.appendChild(dialog);

    const confirmBtn = dialog.querySelector('.adl-btn--confirm');
    const cancelBtn = dialog.querySelector('.adl-btn--cancel');
    const closeBtn = dialog.querySelector('.adl-close');

    confirmBtn.addEventListener('click', () => decide(true));
    cancelBtn.addEventListener('click', () => decide(false));
    closeBtn.addEventListener('click', () => decide(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) decide(false);
    });

    const onKey = (e) => {
      if (e.key === 'Escape') decide(false);
      if (e.key === 'Enter' && document.activeElement === confirmBtn) return; // click ya lo maneja
    };
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    overlay.classList.add('adl-overlay--in');
    dialog.classList.add('adl-card--in');
    confirmBtn.focus();
  });
}
