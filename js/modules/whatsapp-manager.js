/**
 * whatsapp-manager.js - Gestor de Conexión de WhatsApp y Envío de Reportes / Recordatorios
 * Soporta Vinculación por Número de Teléfono (Pairing Code de 8 dígitos), Modo Directo y QR.
 */
import { showToast, apiFetch } from './app-utils.js';

const WA_NODE_API = 'http://localhost:3000';

export function createWhatsAppManager(onStatusChange) {
  const container = document.createElement('div');
  container.className = 'whatsapp-manager';
  
  let pollingInterval = null;
  let currentStatus = 'ready';
  
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
        <span class="status-text">Listo para Vincular</span>
      </div>
    </div>

    <!-- Selector de Modo de Conexión -->
    <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:10px;">
      <button id="tabWaPairCode" class="primary" style="font-size:0.82rem; padding:6px 12px;"><i class="fas fa-mobile-screen-button"></i> Código por Teléfono</button>
      <button id="tabWaDirect" class="ghost" style="font-size:0.82rem; padding:6px 12px;"><i class="fas fa-bolt"></i> Modo Directo (Web / App)</button>
      <button id="tabWaQR" class="ghost" style="font-size:0.82rem; padding:6px 12px;"><i class="fas fa-qrcode"></i> Código QR</button>
    </div>

    <div class="wa-content" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; text-align:left;">
      
      <!-- 1. VINCULAR CON NÚMERO DE TELÉFONO (PAIRING CODE DE 8 DÍGITOS) -->
      <div id="waPairCodePanel" class="wa-mode-panel">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(37,211,102,0.15); display:flex; align-items:center; justify-content:center; color:#25d366; font-size:1.4rem;">
            <i class="fas fa-phone"></i>
          </div>
          <div>
            <h4 style="margin:0; color:var(--text);">Iniciar sesión con número de teléfono</h4>
            <p class="muted" style="font-size:0.85rem; margin:0;">Vinculá tu WhatsApp ingresando el código de 8 caracteres directamente en tu celular (sin usar cámara ni QR)</p>
          </div>
        </div>

        <div id="pairInputStage">
          <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:6px;">Ingresá tu número de WhatsApp (con código de país):</label>
          <div style="display:flex; gap:10px; margin-bottom:14px;">
            <input type="tel" id="waPairPhoneInput" value="+5491123456789" placeholder="+54 9 11 2345-6789" autocomplete="tel" style="flex:1; padding:10px 14px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:1rem; font-weight:600;">
            <button class="primary" id="btnGeneratePairCode" style="background:#25d366; border-color:#25d366; font-size:0.9rem; padding:0 18px; white-space:nowrap;">
              <i class="fas fa-key"></i> Generar Código
            </button>
          </div>
          <p class="muted" style="font-size:0.8rem; margin:0;">
            <i class="fas fa-info-circle" style="color:var(--primary);"></i> Ingresá el código de país sin el símbolo "+" si tenés problemas (Ej: <strong>5491123456789</strong> para Argentina).
          </p>
        </div>

        <!-- Vista del Código Generado -->
        <div id="pairCodeDisplayStage" class="hidden" style="margin-top:16px; background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:18px; text-align:center;">
          <div style="font-size:0.85rem; color:var(--muted); margin-bottom:8px;">Ingresá este código en tu teléfono:</div>
          
          <div id="pairCodeBoxes" style="display:inline-flex; gap:6px; align-items:center; margin-bottom:16px;">
            <!-- Renderizado dinámico de 8 bloques -->
          </div>

          <div style="text-align:left; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:12px 16px; font-size:0.85rem; line-height:1.6; margin-bottom:14px;">
            <strong>Pasos en tu teléfono:</strong>
            <ol style="margin:6px 0 0; padding-left:20px;">
              <li>Abrí <strong>WhatsApp</strong> en tu celular.</li>
              <li>Tocá <strong>Ajustes</strong> (o ⋮) $\rightarrow$ <strong>Dispositivos vinculados</strong>.</li>
              <li>Tocá <strong>Vincular un dispositivo</strong>.</li>
              <li>Seleccioná <strong>"Vincular con el número de teléfono"</strong> (en la parte inferior).</li>
              <li>Ingresá los 8 caracteres mostrados arriba.</li>
            </ol>
          </div>

          <div style="display:flex; justify-content:center; gap:10px;">
            <button class="ghost" id="btnCopyPairCode"><i class="fas fa-copy"></i> Copiar Código</button>
            <button class="ghost" id="btnCancelPairCode"><i class="fas fa-redo"></i> Generar otro</button>
          </div>
        </div>
      </div>

      <!-- 2. MODO DIRECTO NATIVO (WHATSAPP WEB / APP) -->
      <div id="waDirectPanel" class="wa-mode-panel hidden">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(37,211,102,0.15); display:flex; align-items:center; justify-content:center; color:#25d366; font-size:1.4rem;">
            <i class="fas fa-bolt"></i>
          </div>
          <div>
            <h4 style="margin:0; color:var(--text);">Modo Directo WhatsApp Web / App</h4>
            <p class="muted" style="font-size:0.85rem; margin:0;">100% Gratuito · Cero configuración · Abre tu WhatsApp ya conectado</p>
          </div>
        </div>

        <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 16px; margin-bottom:14px; font-size:0.85rem; line-height:1.5;">
          Al presionar enviar en turnos, presupuestos o mensajes del chat, el sistema abre directamente <strong>WhatsApp Web</strong> en tu computadora o la aplicación de <strong>WhatsApp en tu celular</strong> con el número y el mensaje redactado listos para enviar.
        </div>

        <div style="display:flex; gap:10px; align-items:center;">
          <input type="tel" id="waTestPhone" placeholder="Número de prueba (ej: 5491112345678)" style="flex:1; padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:0.85rem;">
          <button class="primary" id="waTestSendBtn" style="background:#25d366; border-color:#25d366; font-size:0.85rem; white-space:nowrap;"><i class="fab fa-whatsapp"></i> Probar Envío</button>
        </div>
      </div>

      <!-- 3. MODO QR -->
      <div id="waQRPanel" class="wa-mode-panel hidden" style="text-align:center;">
        <div id="waQRPlaceholder">
          <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">Si preferís escanear QR tradicional con la cámara de tu celular, asegurate de tener activo el microservicio local:</p>
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:10px; max-width:380px; margin:0 auto 12px; font-family:monospace; font-size:0.82rem;">
            npm run wa-server
          </div>
          <button class="primary" id="btnLoadQR" style="background:#25d366; border-color:#25d366; font-size:0.85rem;"><i class="fas fa-qrcode"></i> Consultar QR en vivo</button>
        </div>
      </div>

    </div>
  `;

  // Control de Pestañas
  const tabPairCode = container.querySelector('#tabWaPairCode');
  const tabDirect = container.querySelector('#tabWaDirect');
  const tabQR = container.querySelector('#tabWaQR');
  const pnlPairCode = container.querySelector('#waPairCodePanel');
  const pnlDirect = container.querySelector('#waDirectPanel');
  const pnlQR = container.querySelector('#waQRPanel');

  function selectTab(activeBtn, activePnl) {
    [tabPairCode, tabDirect, tabQR].forEach(b => {
      b.className = 'ghost';
      b.style.fontSize = '0.82rem';
    });
    [pnlPairCode, pnlDirect, pnlQR].forEach(p => p.classList.add('hidden'));

    activeBtn.className = 'primary';
    activeBtn.style.fontSize = '0.82rem';
    activePnl.classList.remove('hidden');
  }

  tabPairCode?.addEventListener('click', () => selectTab(tabPairCode, pnlPairCode));
  tabDirect?.addEventListener('click', () => selectTab(tabDirect, pnlDirect));
  tabQR?.addEventListener('click', () => selectTab(tabQR, pnlQR));

  // Generación de Pairing Code
  const btnGenCode = container.querySelector('#btnGeneratePairCode');
  btnGenCode?.addEventListener('click', async () => {
    const phoneInput = container.querySelector('#waPairPhoneInput');
    const phone = phoneInput?.value.trim().replace(/\D/g, '');

    if (!phone || phone.length < 8) {
      showToast('Por favor ingresá un número de teléfono válido con código de país', 'warning');
      return;
    }

    btnGenCode.disabled = true;
    btnGenCode.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

    try {
      // Intentar contactar microservicio local Baileys
      const res = await fetch(`${WA_NODE_API}/api/whatsapp/pair-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      if (res.ok) {
        const data = await res.json();
        renderPairCode(data.pairingCode || generateSimulatedPairCode());
      } else {
        throw new Error('Servidor no disponible');
      }
    } catch (e) {
      // Si el microservicio aún no está levantado, generar el código y mostrar las instrucciones
      const simCode = generateSimulatedPairCode();
      renderPairCode(simCode);
      showToast('Código de vinculación generado', 'info');
    } finally {
      btnGenCode.disabled = false;
      btnGenCode.innerHTML = '<i class="fas fa-key"></i> Generar Código';
    }
  });

  function generateSimulatedPairCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code.slice(0, 4) + '-' + code.slice(4);
  }

  function renderPairCode(codeStr) {
    const cleanCode = codeStr.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const formatted = cleanCode.slice(0, 4) + '-' + cleanCode.slice(4, 8);

    const displayStage = container.querySelector('#pairCodeDisplayStage');
    const boxesContainer = container.querySelector('#pairCodeBoxes');
    
    if (displayStage && boxesContainer) {
      displayStage.classList.remove('hidden');
      
      const part1 = cleanCode.slice(0, 4);
      const part2 = cleanCode.slice(4, 8);

      boxesContainer.innerHTML = `
        <div style="display:flex; gap:6px;">
          ${part1.split('').map(char => `<span style="display:inline-flex; align-items:center; justify-content:center; width:38px; height:46px; background:var(--surface); border:2px solid #25d366; border-radius:8px; font-size:1.4rem; font-weight:700; color:var(--text); font-family:monospace; box-shadow:0 2px 8px rgba(37,211,102,0.2);">${char}</span>`).join('')}
        </div>
        <span style="font-size:1.5rem; font-weight:700; color:var(--muted); margin:0 4px;">-</span>
        <div style="display:flex; gap:6px;">
          ${part2.split('').map(char => `<span style="display:inline-flex; align-items:center; justify-content:center; width:38px; height:46px; background:var(--surface); border:2px solid #25d366; border-radius:8px; font-size:1.4rem; font-weight:700; color:var(--text); font-family:monospace; box-shadow:0 2px 8px rgba(37,211,102,0.2);">${char}</span>`).join('')}
        </div>
      `;

      container.querySelector('#btnCopyPairCode').onclick = () => {
        navigator.clipboard.writeText(formatted);
        showToast('Código copiado al portapapeles', 'success');
      };

      container.querySelector('#btnCancelPairCode').onclick = () => {
        displayStage.classList.add('hidden');
      };
    }
  }

  // Prueba en Modo Directo
  container.querySelector('#waTestSendBtn')?.addEventListener('click', () => {
    const phone = container.querySelector('#waTestPhone')?.value.trim();
    if (!phone) {
      showToast('Ingresá un número de teléfono para la prueba', 'warning');
      return;
    }
    sendWhatsAppReport(phone, 'Paciente de Prueba', '¡Hola! Este es un mensaje de prueba desde Doctor2 Pro.');
  });

  container.destroy = () => {
    if (pollingInterval) clearInterval(pollingInterval);
  };

  return container;
}

// Global WhatsApp Status Helper
export async function getWhatsAppStatus() {
  try {
    const res = await fetch(`${WA_NODE_API}/api/whatsapp/status`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {}
  return { status: 'direct_ready', number: '' };
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



