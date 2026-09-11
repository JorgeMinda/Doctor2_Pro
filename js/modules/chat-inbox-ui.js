/**
 * chat-inbox-ui.js - Renderizado de UI de Bandeja de Entrada de WhatsApp
 */

export function createChatInboxHTML() {
  return `
    <div class="chat-layout" style="height: calc(100vh - 120px); display:flex; background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
      <!-- Sidebar de Conversaciones -->
      <div class="chat-sidebar" style="width:320px; min-width:300px; border-right:1px solid var(--border); display:flex; flex-direction:column; background:var(--surface);">
        <div class="chat-sidebar-header" style="padding:16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fab fa-whatsapp" style="font-size:1.6rem; color:#25d366;"></i>
            <h3 style="margin:0; font-size:1.1rem;">WhatsApp</h3>
          </div>
          <button class="ghost" id="newChatBtn" title="Nueva conversación" style="padding:6px 10px;">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        
        <div class="chat-search" style="padding:10px 16px; border-bottom:1px solid var(--border);">
          <div class="search" style="width:100%;">
            <i class="fas fa-search"></i>
            <input type="text" id="chatSearch" placeholder="Buscar paciente o chat..." style="width:100%;">
          </div>
        </div>
        
        <div class="chat-tabs" style="display:flex; border-bottom:1px solid var(--border); background:var(--bg-page);">
          <button class="chat-tab active" data-tab="chats" style="flex:1; padding:8px; border:none; background:none; cursor:pointer; font-weight:600; font-size:0.85rem; border-bottom:2px solid var(--primary);">Chats</button>
          <button class="chat-tab" data-tab="patients" style="flex:1; padding:8px; border:none; background:none; cursor:pointer; font-size:0.85rem; color:var(--muted);">Pacientes</button>
          <button class="chat-tab" data-tab="quick" style="flex:1; padding:8px; border:none; background:none; cursor:pointer; font-size:0.85rem; color:var(--muted);">Accesos</button>
        </div>
        
        <div class="chat-tab-content active" id="tabChats" style="flex:1; overflow-y:auto; padding:8px;">
          <div id="conversationsList" class="conversations-list"></div>
        </div>
        
        <div class="chat-tab-content hidden" id="tabPatients" style="flex:1; overflow-y:auto; padding:8px;">
          <div id="patientsList" class="patients-quick-list"></div>
        </div>
        
        <div class="chat-tab-content hidden" id="tabQuick" style="flex:1; overflow-y:auto; padding:12px;">
          <div style="display:grid; gap:8px;">
            <button class="ghost quick-action-btn" data-action="remind-tomorrow" style="text-align:left; padding:10px; display:flex; align-items:center; gap:8px;">
              <i class="fas fa-calendar-day" style="color:var(--primary);"></i>
              <div><strong>Recordar turnos de mañana</strong><br><small class="muted">Envíos masivos 24h antes</small></div>
            </button>
            <button class="ghost quick-action-btn" data-action="confirm-today" style="text-align:left; padding:10px; display:flex; align-items:center; gap:8px;">
              <i class="fas fa-check-circle" style="color:var(--success);"></i>
              <div><strong>Confirmar turnos de hoy</strong><br><small class="muted">Solicitud de asistencia</small></div>
            </button>
            <button class="ghost quick-action-btn" data-action="followup" style="text-align:left; padding:10px; display:flex; align-items:center; gap:8px;">
              <i class="fas fa-user-clock" style="color:var(--warning);"></i>
              <div><strong>Seguimiento de controles</strong><br><small class="muted">Contactar pacientes pendientes</small></div>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Panel Principal de Conversación -->
      <div class="chat-main" style="flex:1; display:flex; flex-direction:column; background:var(--bg-page);">
        <div id="chatWelcome" class="chat-welcome" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px;">
          <div style="font-size:3.5rem; color:#25d366; margin-bottom:12px;"><i class="fab fa-whatsapp"></i></div>
          <h3 style="margin-bottom:6px;">WhatsApp Business & Atención al Paciente</h3>
          <p class="muted" style="max-width:450px; margin-bottom:20px; font-size:0.9rem;">Seleccioná una conversación del panel izquierdo o utilizá los accesos rápidos para gestionar turnos y recordatorios.</p>
        </div>
        
        <div id="chatActive" class="chat-active hidden" style="flex:1; display:flex; flex-direction:column; height:100%;">
          <div class="chat-header" style="padding:12px 16px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="avatar" style="width:40px; height:40px;"><i class="fas fa-user"></i></div>
              <div>
                <strong id="chatContactName" style="font-size:1rem;">Paciente</strong><br>
                <small id="chatContactPhone" class="muted">+54 9 11 ...</small>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="ghost" id="scheduleFromChat" title="Agendar turno"><i class="fas fa-calendar-plus"></i></button>
              <button class="ghost" id="sendReportBtn" title="Compartir Ficha/Presupuesto"><i class="fas fa-file-medical"></i></button>
              <button class="ghost" id="aiToggleBtn" title="Asistente IA"><i class="fas fa-robot"></i></button>
            </div>
          </div>
          
          <div class="chat-messages" id="chatMessages" style="flex:1; overflow-y:auto; padding:16px;">
            <div class="messages-container" style="display:flex; flex-direction:column; gap:8px;"></div>
          </div>
          
          <div class="chat-input-container" style="padding:12px; background:var(--surface); border-top:1px solid var(--border);">
            <div style="display:flex; gap:8px; margin-bottom:8px; overflow-x:auto;">
              <button class="ghost template-chip" data-template="greeting" style="font-size:0.75rem; padding:4px 8px; white-space:nowrap;">👋 Saludo</button>
              <button class="ghost template-chip" data-template="reminder" style="font-size:0.75rem; padding:4px 8px; white-space:nowrap;">📅 Recordatorio</button>
              <button class="ghost template-chip" data-template="confirm" style="font-size:0.75rem; padding:4px 8px; white-space:nowrap;">✓ Confirmar</button>
              <button class="ghost template-chip" data-template="location" style="font-size:0.75rem; padding:4px 8px; white-space:nowrap;">📍 Ubicación</button>
            </div>
            <div style="display:flex; gap:8px;">
              <textarea id="chatInput" placeholder="Escribí un mensaje..." rows="1" style="flex:1; resize:none; padding:8px 12px; border-radius:8px; border:1px solid var(--border); font-family:inherit;"></textarea>
              <button class="primary" id="chatSendBtn" style="padding:8px 16px;"><i class="fas fa-paper-plane"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

export function updateMenuBadge(conversations = []) {
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const chatBadge = document.querySelector('#chatBadge');
  if (chatBadge) {
    if (totalUnread > 0) {
      chatBadge.textContent = totalUnread > 99 ? '99+' : totalUnread.toString();
      chatBadge.classList.remove('hidden');
    } else {
      chatBadge.classList.add('hidden');
    }
  }
}

export function showToast(message, type = 'info') {
  const toast = document.getElementById('toast') || document.body;
  const div = document.createElement('div');
  div.className = `toast-popup ${type}`;
  div.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#1e293b; color:#fff; padding:12px 18px; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.2); z-index:10000; font-size:0.9rem;';
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}
