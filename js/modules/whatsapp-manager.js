/**
 * whatsapp-manager.js - Gestor de Conexión de WhatsApp y Envío de Reportes / Recordatorios
 * Soporta Modo Directo Web/App (sin servidor), microservicio QR (Baileys) y Meta Cloud API.
 */
import { showToast, apiFetch } from './app-utils.js';

const WA_SERVICE = '/wa-api';

export function createWhatsAppManager(onStatusChange) {
  const container = document.createElement('div');
  container.className = 'whatsapp-manager';
  
  let pollingInterval = null;
  let currentStatus = 'direct_ready';
  
  container.innerHTML = `
    <div class="wa-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div class="wa-title" style="display:flex; align-items:center; gap:8px;">
        <i class="fab fa-whatsapp" style="font-size:1.8rem; color:#25d366;"></i>
        <div>
          <h3 style="margin:0;">Conexión WhatsApp</h3>
          <p class="muted" style="font-size:0.85rem; margin:0;">Recordatorios automáticos, confirmaciones de turnos y presupuestos</p>
        </div>
      </div>
      <div class="wa-status-badge badge attended" id="waStatusBadge">
        <span class="status-dot"></span>
        <span class="status-text">Modo Directo Activo</span>
      </div>
    </div>

    <!-- Pestañas de Modo -->
    <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:10px;">
      <button id="tabWaDirect" class="primary" style="font-size:0.82rem; padding:6px 12px;"><i class="fas fa-bolt"></i> Modo Directo (Recomendado)</button>
      <button id="tabWaService" class="ghost" style="font-size:0.82rem; padding:6px 12px;"><i class="fas fa-qrcode"></i> Microservicio QR (Baileys / Node)</button>
      <button id="tabWaMeta" class="ghost" style="font-size:0.82rem; padding:6px 12px;"><i class="fab fa-meta"></i> Meta Cloud API</button>
    </div>

    <div class="wa-content" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; text-align:left;">
      
      <!-- 1. MODO DIRECTO (100% OPERATIVO SIN SERVIDORES EXTERNOS) -->
      <div id="waDirectPanel" class="wa-mode-panel">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(37,211,102,0.15); display:flex; align-items:center; justify-content:center; color:#25d366; font-size:1.4rem;">
            <i class="fas fa-check"></i>
          </div>
          <div>
            <h4 style="margin:0; color:var(--text);">Modo Directo WhatsApp Web / App</h4>
            <p class="muted" style="font-size:0.85rem; margin:0;">100% Gratuito · 0 Configuración · Sin APIs de pago ni servidores adicionales</p>
          </div>
        </div>

        <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 16px; margin-bottom:14px; font-size:0.85rem; line-height:1.5;">
          <strong style="color:var(--primary);">¿Cómo funciona?</strong><br>
          Al presionar enviar en turnos, presupuestos o mensajes del chat, el sistema abre directamente <strong>WhatsApp Web</strong> en tu computadora o la aplicación de <strong>WhatsApp en tu celular</strong> con el número y el mensaje redactado listos para enviar.
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
          <div class="badge attended"><i class="fas fa-check"></i> Envío de Presupuestos</div>
          <div class="badge attended"><i class="fas fa-check"></i> Recordatorios de Turnos</div>
          <div class="badge attended"><i class="fas fa-check"></i> Indicaciones Clínicas</div>
        </div>

        <div style="display:flex; gap:10px; align-items:center;">
          <input type="tel" id="waTestPhone" placeholder="Número de prueba (ej: 5491112345678)" style="flex:1; padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:0.85rem;">
          <button class="primary" id="waTestSendBtn" style="background:#25d366; border-color:#25d366; font-size:0.85rem; white-space:nowrap;"><i class="fab fa-whatsapp"></i> Probar Envío</button>
        </div>
      </div>

      <!-- 2. MODO MICROSERVICIO QR (BAILEYS / NODE.JS) -->
      <div id="waServicePanel" class="wa-mode-panel hidden" style="text-align:center;">
        <div id="waLoading" class="wa-loading hidden">
          <i class="fas fa-spinner fa-spin" style="font-size:2rem; color:var(--primary); margin-bottom:12px;"></i>
          <p>Consultando microservicio local en el puerto 3000...</p>
        </div>

        <div id="waServiceOffline" class="wa-service-status">
          <div style="font-size:2.5rem; color:var(--muted); margin-bottom:10px;"><i class="fas fa-server"></i></div>
          <h4>Microservicio Node.js no detectado</h4>
          <p class="muted" style="max-width:440px; margin:0 auto 12px; font-size:0.85rem;">
            WhatsApp requiere una sesión criptográfica en vivo generada por un servidor Node.js (Baileys) para escanear el QR desde tu celular.
          </p>
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:10px; max-width:420px; margin:0 auto 14px; text-align:left; font-size:0.8rem; font-family:monospace;">
            # Para iniciar el bot de WhatsApp en segundo plano:<br>
            <strong>npm run wa-server</strong>
          </div>
          <button class="ghost" id="waRetryConnectBtn"><i class="fas fa-sync-alt"></i> Reintentar Conexión</button>
        </div>

        <div id="waQRCode" class="wa-service-status hidden">
          <div class="qr-container" style="background:#fff; padding:14px; display:inline-block; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); margin-bottom:12px;">
            <img id="waQRImage" src="" alt="WhatsApp QR" style="width:200px; height:200px; display:block;" />
          </div>
          <h4>Escaneá con tu WhatsApp</h4>
          <p class="muted" style="font-size:0.85rem; margin:0;">WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
        </div>
      </div>

      <!-- 3. MODO META CLOUD API -->
      <div id="waMetaPanel" class="wa-mode-panel hidden">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
          <i class="fab fa-meta" style="font-size:1.8rem; color:#0081fb;"></i>
          <div>
            <h4 style="margin:0;">Meta WhatsApp Cloud API (Oficial)</h4>
            <p class="muted" style="font-size:0.85rem; margin:0;">Para cuentas de WhatsApp Business con Token de Desarrollador de Facebook</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">
          <label>Phone Number ID (Meta):
            <input type="text" id="metaPhoneId" placeholder="Ej: 104592837492019" style="width:100%; padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:var(--bg); color:var(--text); margin-top:4px;">
          </label>
          <label>Access Token (Bearer):
            <input type="password" id="metaToken" placeholder="EAABwz..." style="width:100%; padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:var(--bg); color:var(--text); margin-top:4px;">
          </label>
          <button class="primary" style="align-self:flex-start; margin-top:6px;"><i class="fas fa-save"></i> Guardar Credenciales Meta</button>
        </div>
      </div>

    </div>
  `;

  // Cambio de pestañas
  const tabDirect = container.querySelector('#tabWaDirect');
  const tabService = container.querySelector('#tabWaService');
  const tabMeta = container.querySelector('#tabWaMeta');
  const pnlDirect = container.querySelector('#waDirectPanel');
  const pnlService = container.querySelector('#waServicePanel');
  const pnlMeta = container.querySelector('#waMetaPanel');

  function selectTab(activeBtn, activePnl) {
    [tabDirect, tabService, tabMeta].forEach(b => {
      b.className = 'ghost';
      b.style.fontSize = '0.82rem';
    });
    [pnlDirect, pnlService, pnlMeta].forEach(p => p.classList.add('hidden'));

    activeBtn.className = 'primary';
    activeBtn.style.fontSize = '0.82rem';
    activePnl.classList.remove('hidden');
  }

  tabDirect?.addEventListener('click', () => selectTab(tabDirect, pnlDirect));
  tabService?.addEventListener('click', () => {
    selectTab(tabService, pnlService);
    checkMicroservice();
  });
  tabMeta?.addEventListener('click', () => selectTab(tabMeta, pnlMeta));

  // Botón de prueba de envío en Modo Directo
  container.querySelector('#waTestSendBtn')?.addEventListener('click', () => {
    const phoneInput = container.querySelector('#waTestPhone');
    const phone = phoneInput?.value.trim();
    if (!phone) {
      showToast('Ingresá un número de teléfono con código de país', 'warning');
      return;
    }
    sendWhatsAppReport(phone, 'Paciente de Prueba', '¡Hola! Este es un mensaje de prueba desde Doctor2 Pro.');
  });

  // Chequeo de microservicio Node si está corriendo
  async function checkMicroservice() {
    const loading = container.querySelector('#waLoading');
    const offline = container.querySelector('#waServiceOffline');
    const qrSection = container.querySelector('#waQRCode');

    loading?.classList.remove('hidden');
    offline?.classList.add('hidden');
    qrSection?.classList.add('hidden');

    try {
      const res = await fetch(`${WA_SERVICE}/api/whatsapp/connect`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        loading?.classList.add('hidden');
        if (data.qrCode) {
          container.querySelector('#waQRImage').src = data.qrCode;
          qrSection?.classList.remove('hidden');
        } else if (data.status === 'connected') {
          showToast(`WhatsApp conectado: ${data.number}`, 'success');
        }
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      loading?.classList.add('hidden');
      offline?.classList.remove('hidden');
    }
  }

  container.querySelector('#waRetryConnectBtn')?.addEventListener('click', checkMicroservice);

  container.destroy = () => {
    if (pollingInterval) clearInterval(pollingInterval);
  };

  return container;
}

// Global WhatsApp Report Sender Helper
export async function sendWhatsAppReport(phone, patientName, customMessage = '') {
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    showToast('El paciente no tiene un número telefónico válido registrado', 'warning');
    return false;
  }
  
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
  if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
  if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549') && cleanPhone.length === 12) {
    cleanPhone = '549' + cleanPhone.substring(2);
  }

  const textEncoded = encodeURIComponent(customMessage || `Hola ${patientName}, te contactamos desde Consultorios Doctor2 para enviarte información de tu atención clínica.`);
  const url = `https://wa.me/${cleanPhone}?text=${textEncoded}`;
  window.open(url, '_blank');
  showToast('Abriendo WhatsApp...', 'success');
  return true;
}

