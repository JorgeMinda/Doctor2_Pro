/**
 * app-subscription.js - Sistema de Suscripciones y Pagos Galicia Nave QR
 */
import { el, apiFetch } from './app-utils.js';

export const SuscripcionManager = {
  config: {
    apiUrl: 'api/suscripcion.php',
    checkInterval: 5 * 60 * 1000
  },

  estado: null,

  init() {
    this.verificarEstado();
  },

  async verificarEstado() {
    try {
      const data = await apiFetch(this.config.apiUrl);
      if (data.success) {
        this.estado = data;
        if (data.bloqueado) {
          this.mostrarModalPago();
        }
      }
    } catch (e) {
      console.warn('Verificación de suscripción en modo local');
    }
  },

  async mostrarModalPago() {
    const modal = el('suscripcionModal');
    if (!modal) return;
    modal.classList.remove('hidden');
  },

  cerrarModalPago() {
    el('suscripcionModal')?.classList.add('hidden');
  }
};

window.SuscripcionManager = SuscripcionManager;
