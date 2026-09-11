/**
 * meta-onboarding.js - Onboarding oficial de Meta WhatsApp Cloud API
 */
const TENANT_ID = window.location.hostname.split('.')[0] || 'default';
const STORE = `metaOnboard.${TENANT_ID}.`;

export function mountMetaOnboarding(container, waService = '/wa-api', refreshStatusSoon) {
  const mount = container.querySelector('#metaOnboardingMount');
  if (!mount || mount.dataset.mounted === '1') return;
  mount.dataset.mounted = '1';

  const state = {
    step: Number(localStorage.getItem(STORE + 'step') || '1'),
    wabaId: '',
    phoneNumberId: localStorage.getItem(STORE + 'phoneNumberId') || '',
    phone: localStorage.getItem(STORE + 'phone') || '',
    cc: localStorage.getItem(STORE + 'cc') || '54',
    displayName: localStorage.getItem(STORE + 'displayName') || '',
    templates: [],
    phoneDetails: null,
    businessProfile: null,
    detailsOpen: localStorage.getItem(STORE + 'detailsOpen') === '1'
  };

  mount.innerHTML = `
    <div style="margin:12px 0 0;padding:14px 16px;background:#fff;border:1px solid #dbeafe;border-radius:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-weight:700;font-size:14px;color:#1e3a8a;"><i class="fab fa-meta" style="color:#0081fb;"></i> Conectar Meta Oficial</div>
          <div id="metaOnboardSummary" style="font-size:12px;color:#64748b;margin-top:2px;">Cargando estado...</div>
        </div>
        <button type="button" class="ghost" id="metaOnboardRefreshBtn" style="padding:6px 10px;"><i class="fas fa-sync"></i></button>
      </div>

      <div id="metaOnboardProgress" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 12px;font-size:11px;"></div>

      <div id="metaOnboardCollapsed" style="display:none;background:#f8fafc;border:1px solid #dbeafe;border-radius:8px;padding:10px;margin:10px 0 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div id="metaOnboardCollapsedText" style="font-size:12px;color:#334155;line-height:1.45;">Meta configurado.</div>
          <button type="button" class="ghost" id="metaOnboardEditBtn" style="padding:7px 10px;"><i class="fas fa-chevron-down"></i> Ver más / editar</button>
        </div>
      </div>

      <section class="meta-onboard-step" data-step="1" style="display:none;">
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">Número y Nombre de Empresa</div>
        <div style="font-size:12px;color:#475569;margin-bottom:8px;">Ingresá el nombre oficial del consultorio o clínica para Meta Business.</div>
        <div style="display:grid;grid-template-columns:76px 1fr;gap:8px;margin-bottom:8px;">
          <input id="metaOnboardCc" value="${escapeHtml(state.cc)}" placeholder="País" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;">
          <input id="metaOnboardPhone" value="${escapeHtml(state.phone)}" placeholder="Número WhatsApp (ej: 1155551234)" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;">
        </div>
        <input id="metaOnboardDisplayName" value="${escapeHtml(state.displayName)}" placeholder="Nombre visible de la clínica" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
        <button type="button" class="primary" id="metaOnboardAddBtn" style="padding:8px 12px;"><i class="fas fa-plus"></i> Chequear y Registrar</button>
      </section>

      <section class="meta-onboard-step" data-step="2" style="display:none;">
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">Código de Verificación</div>
        <div style="font-size:12px;color:#475569;margin-bottom:8px;">Pedí el código de 6 dígitos que Meta enviará al número telefónico.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <button type="button" class="ghost" id="metaOnboardSmsBtn" style="padding:7px 10px;"><i class="fas fa-sms"></i> Enviar código por SMS</button>
          <button type="button" class="ghost" id="metaOnboardCallBtn" style="padding:7px 10px;"><i class="fas fa-phone"></i> Llamada de voz</button>
        </div>
        <input id="metaOnboardCode" placeholder="Código de 6 dígitos" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
        <button type="button" class="primary" id="metaOnboardVerifyBtn" style="padding:8px 12px;"><i class="fas fa-check"></i> Verificar Código</button>
      </section>

      <section class="meta-onboard-step" data-step="3" style="display:none;">
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">Activar Canal Oficial</div>
        <div style="font-size:12px;color:#475569;margin-bottom:8px;">El sistema enlazará el número para emitir recordatorios y presupuestos automáticamente.</div>
        <button type="button" class="primary" id="metaOnboardRegisterBtn" style="padding:8px 12px;"><i class="fas fa-plug"></i> Activar Meta Cloud API</button>
        <button type="button" class="ghost" id="metaOnboardBackBtn" style="padding:8px 12px;margin-left:6px;">Volver</button>
      </section>

      <section class="meta-onboard-step" data-step="4" style="display:none;">
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">Meta Activo y Operativo</div>
        <div id="metaOnboardMetaStatus" style="font-size:12px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-bottom:10px;"></div>
        <button type="button" class="primary" id="metaOnboardFinishBtn" style="padding:7px 12px;"><i class="fas fa-check"></i> Finalizar</button>
      </section>

      <div id="metaOnboardMessage" style="font-size:12px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-top:12px;">Listo para configurar.</div>
    </div>
  `;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderStep() {
    mount.querySelectorAll('.meta-onboard-step').forEach(section => {
      section.style.display = Number(section.dataset.step) === state.step ? 'block' : 'none';
    });
    mount.querySelector('#metaOnboardProgress').innerHTML = ['Número', 'Código', 'Activar', 'Listo'].map((label, idx) => {
      const s = idx + 1;
      const active = s === state.step;
      const done = s < state.step;
      return `<div style="padding:4px;border-radius:6px;text-align:center;background:${active ? 'var(--primary)' : done ? '#dcfce7' : '#f1f5f9'};color:${active ? '#fff' : '#334155'};">${label}</div>`;
    }).join('');
  }

  mount.querySelector('#metaOnboardAddBtn')?.addEventListener('click', () => {
    state.step = 2;
    renderStep();
  });
  mount.querySelector('#metaOnboardVerifyBtn')?.addEventListener('click', () => {
    state.step = 3;
    renderStep();
  });
  mount.querySelector('#metaOnboardRegisterBtn')?.addEventListener('click', () => {
    state.step = 4;
    renderStep();
  });
  mount.querySelector('#metaOnboardBackBtn')?.addEventListener('click', () => {
    state.step = 1;
    renderStep();
  });
  mount.querySelector('#metaOnboardFinishBtn')?.addEventListener('click', () => {
    state.detailsOpen = false;
    renderStep();
  });

  renderStep();
}
