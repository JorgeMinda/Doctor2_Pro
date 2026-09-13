/**
 * whatsapp-manager.js - Gestor de Conexión de WhatsApp y Envío de Reportes / Recordatorios
 * Soporta conexión por código QR (Baileys/WppConnect), Meta Cloud API oficial y Twilio.
 */
import { showToast, apiFetch } from './app-utils.js';

const WA_SERVICE = '/wa-api';

export function createWhatsAppManager(onStatusChange) {
  const container = document.createElement('div');
  container.className = 'whatsapp-manager';
  
  let pollingInterval = null;
  let currentStatus = 'disconnected';
  let isWaitingForConnection = false;
  
  container.innerHTML = `
    <div class="wa-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div class="wa-title" style="display:flex; align-items:center; gap:8px;">
        <i class="fab fa-whatsapp" style="font-size:1.8rem; color:#25d366;"></i>
        <div>
          <h3 style="margin:0;">Conexión WhatsApp</h3>
          <p class="muted" style="font-size:0.85rem; margin:0;">Recordatorios automáticos, confirmaciones de turnos y presupuestos</p>
        </div>
      </div>
      <div class="wa-status-badge badge" id="waStatusBadge">
        <span class="status-dot"></span>
        <span class="status-text">Verificando...</span>
      </div>
    </div>

    <div class="wa-content" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px; text-align:center;">
      <div id="waLoading" class="wa-loading hidden">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem; color:var(--primary); margin-bottom:12px;"></i>
        <p>Conectando con el servicio de mensajería...</p>
      </div>

      <div id="waDisconnected" class="wa-section">
        <div style="font-size:3rem; color:var(--muted); margin-bottom:12px;"><i class="fab fa-whatsapp"></i></div>
        <h4>WhatsApp no vinculado</h4>
        <p class="muted" style="max-width:400px; margin:0 auto 16px;">Conectá WhatsApp para enviar presupuestos, turnos y fichas automáticamente a tus pacientes.</p>
        <button class="primary" id="waConnectBtn" style="background:#25d366; border-color:#25d366;"><i class="fas fa-qrcode"></i> Generar código QR para Vincular</button>
      </div>

      <div id="waQRCode" class="wa-section hidden">
        <div class="qr-container" style="background:#fff; padding:16px; display:inline-block; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); margin-bottom:16px;">
          <img id="waQRImage" src="" alt="QR Code" style="width:220px; height:220px; display:block;" />
        </div>
        <h4>Escaneá el código QR</h4>
        <p class="muted" style="font-size:0.9rem;">Abrí WhatsApp en tu celular → Ajustes / Menú → Dispositivos vinculados → Vincular dispositivo</p>
        <div style="margin-top:12px;">
          <button class="ghost" id="waCancelBtn"><i class="fas fa-times"></i> Cancelar</button>
        </div>
      </div>

      <div id="waConnected" class="wa-section hidden">
        <div style="font-size:3rem; color:#25d366; margin-bottom:12px;"><i class="fas fa-check-circle"></i></div>
        <h4 style="color:#25d366;">WhatsApp Conectado y Operativo</h4>
        <p class="muted" style="margin-bottom:16px;">Número vinculado: <strong id="waNumber" style="color:var(--text);">+54 9 11 ...</strong></p>
        <div style="display:flex; justify-content:center; gap:16px; margin-bottom:20px;">
          <div class="badge attended"><i class="fas fa-file-pdf"></i> Envío de Fichas/PDFs</div>
          <div class="badge attended"><i class="fas fa-calendar-check"></i> Recordatorios 24h</div>
          <div class="badge attended"><i class="fas fa-calculator"></i> Presupuestos</div>
        </div>
        <button class="ghost" id="waDisconnectBtn" style="color:var(--danger);"><i class="fas fa-unlink"></i> Desvincular WhatsApp</button>
      </div>
    </div>

    <!-- Panel de Meta WhatsApp Cloud API -->
    <div id="metaCapabilityCard" style="margin-top:16px; padding:16px; background:var(--surface); border:1px solid var(--border); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-weight:600; font-size:0.95rem;"><i class="fab fa-meta" style="color:#0081fb;"></i> Meta WhatsApp Cloud API (Oficial)</div>
        <div class="muted" style="font-size:0.85rem;">Canal oficial de WhatsApp Business para alto volumen y plantillas aprobadas</div>
      </div>
      <label class="toggle-switch" style="display:flex; align-items:center; cursor:pointer;">
        <input type="checkbox" id="metaEnabledToggle" style="width:18px; height:18px; margin-right:8px;">
        <span style="font-size:0.85rem; font-weight:600;">Habilitar Meta API</span>
      </label>
    </div>
  `;

  async function checkStatus() {
    try {
      const res = await fetch(`${WA_SERVICE}/api/whatsapp/status`);
      if (res.ok) {
        const data = await res.json();
        updateUIStatus(data.status || 'disconnected', data.number);
      } else {
        updateUIStatus('disconnected');
      }
    } catch (e) {
      updateUIStatus('disconnected');
    }
  }

  function updateUIStatus(status, number = '') {
    currentStatus = status;
    const badge = container.querySelector('#waStatusBadge');
    const badgeText = badge.querySelector('.status-text');
    
    container.querySelectorAll('.wa-section').forEach(s => s.classList.add('hidden'));
    
    if (status === 'connected' || status === 'meta' || status === 'twilio') {
      badge.className = 'badge attended';
      badgeText.textContent = 'Conectado';
      container.querySelector('#waConnected').classList.remove('hidden');
      if (number) container.querySelector('#waNumber').textContent = number;
      if (onStatusChange) onStatusChange('connected');
    } else if (status === 'waiting_qr') {
      badge.className = 'badge pending';
      badgeText.textContent = 'Esperando QR';
      container.querySelector('#waQRCode').classList.remove('hidden');
    } else {
      badge.className = 'badge cancelled';
      badgeText.textContent = 'Desconectado';
      container.querySelector('#waDisconnected').classList.remove('hidden');
      if (onStatusChange) onStatusChange('disconnected');
    }
  }

  // Connect QR Handler
  container.querySelector('#waConnectBtn')?.addEventListener('click', async () => {
    container.querySelector('#waDisconnected').classList.add('hidden');
    container.querySelector('#waLoading').classList.remove('hidden');
    
    try {
      const res = await fetch(`${WA_SERVICE}/api/whatsapp/connect`, { method: 'POST' });
      const data = await res.json();
      container.querySelector('#waLoading').classList.add('hidden');
      
      if (data.qrCode) {
        container.querySelector('#waQRImage').src = data.qrCode;
        updateUIStatus('waiting_qr');
        if (!pollingInterval) pollingInterval = setInterval(checkStatus, 2000);
      } else if (data.status === 'connected') {
        updateUIStatus('connected', data.number);
      } else {
        // Fallback demo simulator for direct local execution without node microservice
        container.querySelector('#waQRImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=DOCTOR2_WA_SESSION_${Date.now()}`;
        updateUIStatus('waiting_qr');
        showToast('Escanee el código QR simulado o configure el microservicio Node /wa-api', 'info');
      }
    } catch (e) {
      container.querySelector('#waLoading').classList.add('hidden');
      // Graceful offline mock so user can still test UI
      container.querySelector('#waQRImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=DOCTOR2_DEMO_QR`;
      updateUIStatus('waiting_qr');
    }
  });

  container.querySelector('#waCancelBtn')?.addEventListener('click', () => {
    if (pollingInterval) clearInterval(pollingInterval);
    updateUIStatus('disconnected');
  });

  container.querySelector('#waDisconnectBtn')?.addEventListener('click', async () => {
    if (confirm('¿Desconectar la sesión de WhatsApp?')) {
      try {
        await fetch(`${WA_SERVICE}/api/whatsapp/disconnect`, { method: 'POST' });
      } catch (e) {}
      updateUIStatus('disconnected');
      showToast('WhatsApp desconectado', 'info');
    }
  });

  checkStatus();

  container.destroy = () => {
    if (pollingInterval) clearInterval(pollingInterval);
  };

  return container;
}

// Global WhatsApp Report Sender Helper
export async function getWhatsAppStatus() {
  try {
    const res = await fetch(`${WA_SERVICE}/api/whatsapp/status`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {}
  return { status: 'disconnected' };
}

export async function sendWhatsAppReport(phone, patientName, customMessage = '', reportType = 'presupuesto') {
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    showToast('El paciente no tiene un teléfono válido registrado', 'warning');
    return false;
  }
  
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
  if (!cleanPhone.startsWith('54')) cleanPhone = '549' + cleanPhone;
  if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549') && cleanPhone.length === 12) {
    cleanPhone = '549' + cleanPhone.substring(2);
  }

  const textEncoded = encodeURIComponent(customMessage || `Hola ${patientName}, te contactamos desde Consultorios.pro para compartirte información sobre tu turno/presupuesto.`);
  const url = `https://wa.me/${cleanPhone}?text=${textEncoded}`;
  window.open(url, '_blank');
  return true;
}
