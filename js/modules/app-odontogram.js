/**
 * app-odontogram.js - Odontograma Clínico Oficial (MSP 033 / FDI)
 * Diseño compacto integrado sobre la estructura estándar original:
 * - Arcada Superior Permanente (18-11 | 21-28) con Recesión, Movilidad, Números y Caras anatómicas
 * - Arcada Superior Temporal (55-51 | 61-65)
 * - Eje Central Lingual
 * - Arcada Inferior Temporal (85-81 | 71-75)
 * - Arcada Inferior Permanente (48-41 | 31-38) con Caras anatómicas, Números, Movilidad y Recesión
 * - Paleta diagnóstica compacta y cálculo CPO en vivo
 */
import { el, apiFetch, showToast } from './app-utils.js';
import { state, api } from './app-state.js';

export const ODONTO_TOOLS = {
  caries: { label: 'Caries', color: '#ef4444', icon: 'fa-circle' },
  obturacion: { label: 'Obturación', color: '#3b82f6', icon: 'fa-circle' },
  endodoncia: { label: 'Endodoncia', color: '#8b5cf6', icon: 'fa-bolt' },
  corona: { label: 'Corona', color: '#f59e0b', icon: 'fa-crown' },
  extraccion: { label: 'Extracción', color: '#dc2626', icon: 'fa-times' },
  sellante: { label: 'Sellante', color: '#06b6d4', icon: 'fa-shield-alt' },
  sano: { label: 'Sano / Borrar', color: '#ffffff', icon: 'fa-eraser' }
};

let currentTool = 'caries';
let autoSaveTimer = null;

export function renderOdontogram(containerId, patient) {
  const container = typeof containerId === 'string' ? el(containerId) : containerId;
  if (!container || !patient) return;

  const data = patient.odontogramData || {
    surfaces: {},
    teeth: {},
    recesion: {},
    movilidad: {},
    notes: '',
    updated_at: ''
  };

  if (!data.surfaces) data.surfaces = {};
  if (!data.teeth) data.teeth = {};
  if (!data.recesion) data.recesion = {};
  if (!data.movilidad) data.movilidad = {};

  const q1 = [18, 17, 16, 15, 14, 13, 12, 11];
  const q2 = [21, 22, 23, 24, 25, 26, 27, 28];
  const q5 = [55, 54, 53, 52, 51];
  const q6 = [61, 62, 63, 64, 65];
  const q8 = [85, 84, 83, 82, 81];
  const q7 = [71, 72, 73, 74, 75];
  const q4 = [48, 47, 46, 45, 44, 43, 42, 41];
  const q3 = [31, 32, 33, 34, 35, 36, 37, 38];

  container.innerHTML = `
    <div class="odontogram-card">
      <!-- Encabezado -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <h4 style="margin:0; font-size:1.05rem;"><i class="fas fa-tooth" style="color:var(--primary);"></i> Odontograma Clínico (MSP 033 / FDI)</h4>
          <span id="odontoSaveStatus" style="font-size:0.75rem; color:var(--success);"><i class="fas fa-check-circle"></i> Sincronizado</span>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button type="button" class="ghost" id="odontoResetBtn" style="font-size:0.75rem; padding:4px 10px; color:var(--danger);" title="Limpiar"><i class="fas fa-trash-alt"></i> Limpiar</button>
          <button type="button" class="primary" id="odontoSaveBtn" style="font-size:0.75rem; padding:4px 14px;"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </div>

      <!-- Paleta de Diagnósticos -->
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap; background:var(--bg-page); padding:8px 12px; border-radius:8px; border:1px solid var(--border);">
        <span style="font-size:0.75rem; font-weight:700; color:var(--muted);"><i class="fas fa-paint-brush"></i> Diagnóstico:</span>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          <button type="button" class="odonto-palette-btn ${currentTool === 'caries' ? 'active' : ''}" data-tool="caries"><i style="color:#ef4444;" class="fas fa-circle"></i> Caries</button>
          <button type="button" class="odonto-palette-btn ${currentTool === 'obturacion' ? 'active' : ''}" data-tool="obturacion"><i style="color:#3b82f6;" class="fas fa-circle"></i> Obturación</button>
          <button type="button" class="odonto-palette-btn ${currentTool === 'endodoncia' ? 'active' : ''}" data-tool="endodoncia"><i style="color:#8b5cf6;" class="fas fa-bolt"></i> Endodoncia</button>
          <button type="button" class="odonto-palette-btn ${currentTool === 'corona' ? 'active' : ''}" data-tool="corona"><i style="color:#f59e0b;" class="fas fa-crown"></i> Corona</button>
          <button type="button" class="odonto-palette-btn ${currentTool === 'extraccion' ? 'active' : ''}" data-tool="extraccion"><i style="color:#dc2626;" class="fas fa-times"></i> Extracción</button>
          <button type="button" class="odonto-palette-btn ${currentTool === 'sellante' ? 'active' : ''}" data-tool="sellante"><i style="color:#06b6d4;" class="fas fa-shield-alt"></i> Sellante</button>
          <button type="button" class="odonto-palette-btn ${currentTool === 'sano' ? 'active' : ''}" data-tool="sano"><i style="color:#94a3b8;" class="fas fa-eraser"></i> Borrar</button>
        </div>
      </div>

      <!-- Contenedor Horizontal Completo -->
      <div class="arch-container">
        
        <!-- 1. Arcada Superior Permanente (18-11 | 21-28) -->
        <div class="dental-arch-row">
          <div class="arch-labels-col">
            <span class="arch-side-lbl">RECESIÓN</span>
            <span class="arch-side-lbl">MOVILIDAD</span>
            <span class="arch-side-lbl num-lbl"></span>
            <span class="arch-side-lbl svg-lbl">VESTIBULAR</span>
          </div>
          <div class="dental-quadrant">
            ${q1.map(t => renderUpperPermanentItem(t, data, 'right')).join('')}
          </div>
          <div class="arch-midline"></div>
          <div class="dental-quadrant">
            ${q2.map(t => renderUpperPermanentItem(t, data, 'left')).join('')}
          </div>
        </div>

        <!-- 2. Arcada Superior Temporal (55-51 | 61-65) -->
        <div class="dental-arch-row decidua-row">
          <div class="arch-labels-col">
            <span class="arch-side-lbl num-lbl"></span>
            <span class="arch-side-lbl svg-lbl"></span>
          </div>
          <div class="dental-quadrant decidua-quadrant">
            ${q5.map(t => renderUpperDeciduaItem(t, data, 'right')).join('')}
          </div>
          <div class="arch-midline decidua-midline"></div>
          <div class="dental-quadrant decidua-quadrant">
            ${q6.map(t => renderUpperDeciduaItem(t, data, 'left')).join('')}
          </div>
        </div>

        <!-- 3. Eje Central: LINGUAL -->
        <div class="lingual-divider-row">
          <span class="lingual-label">LINGUAL</span>
          <div class="lingual-line"></div>
        </div>

        <!-- 4. Arcada Inferior Temporal (85-81 | 71-75) -->
        <div class="dental-arch-row decidua-row">
          <div class="arch-labels-col">
            <span class="arch-side-lbl svg-lbl"></span>
            <span class="arch-side-lbl num-lbl"></span>
          </div>
          <div class="dental-quadrant decidua-quadrant">
            ${q8.map(t => renderLowerDeciduaItem(t, data, 'right')).join('')}
          </div>
          <div class="arch-midline decidua-midline"></div>
          <div class="dental-quadrant decidua-quadrant">
            ${q7.map(t => renderLowerDeciduaItem(t, data, 'left')).join('')}
          </div>
        </div>

        <!-- 5. Arcada Inferior Permanente (48-41 | 31-38) -->
        <div class="dental-arch-row">
          <div class="arch-labels-col">
            <span class="arch-side-lbl svg-lbl">VESTIBULAR</span>
            <span class="arch-side-lbl num-lbl"></span>
            <span class="arch-side-lbl">MOVILIDAD</span>
            <span class="arch-side-lbl">RECESIÓN</span>
          </div>
          <div class="dental-quadrant">
            ${q4.map(t => renderLowerPermanentItem(t, data, 'right')).join('')}
          </div>
          <div class="arch-midline"></div>
          <div class="dental-quadrant">
            ${q3.map(t => renderLowerPermanentItem(t, data, 'left')).join('')}
          </div>
        </div>

      </div>

      <!-- Resumen CPO y Observaciones -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:10px; border-top:1px solid var(--border); font-size:0.8rem; flex-wrap:wrap; gap:10px;">
        <div id="odontoCpoBadges">
          ${renderCpoSummary(data)}
        </div>
        <div style="flex:1; min-width:220px; max-width:450px;">
          <input type="text" id="odontoNotesInput" class="field-input" placeholder="Observaciones clínicas del odontograma..." value="${data.notes || ''}" style="height:30px; font-size:0.8rem;">
        </div>
      </div>
    </div>
  `;

  attachOdontogramEvents(container, patient, data);
}

function getFaceColor(toothSurfaces, surf) {
  const code = toothSurfaces[surf];
  return code && ODONTO_TOOLS[code] ? ODONTO_TOOLS[code].color : '#f8fafc';
}

function renderUpperPermanentItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || '';
  const topKey = 'v';
  const btmKey = 'p';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';
  const isExtracted = tState === 'extraccion';
  const isCorona = tState === 'corona';
  const isEndo = tState === 'endodoncia';

  return `
    <div class="tooth-item" data-tooth="${num}">
      <input type="text" class="tooth-input-box recesion-input" data-tooth="${num}" value="${data.recesion[num] || ''}" maxlength="3" title="Recesión ${num}">
      <input type="text" class="tooth-input-box movilidad-input" data-tooth="${num}" value="${data.movilidad[num] || ''}" maxlength="3" title="Movilidad ${num}">
      <span class="tooth-num" data-tooth="${num}" title="Opciones pieza ${num}">${num}</span>
      <svg class="tooth-svg permanent" data-tooth="${num}" viewBox="0 0 40 40">
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${topKey}" points="0,0 40,0 30,10 10,10" fill="${getFaceColor(surfaces, topKey)}" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" points="40,0 40,40 30,30 30,10" fill="${getFaceColor(surfaces, rightKey)}" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" points="40,40 0,40 10,30 30,30" fill="${getFaceColor(surfaces, btmKey)}" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" points="0,40 0,0 10,10 10,30" fill="${getFaceColor(surfaces, leftKey)}" />
        <polygon class="tooth-face center" data-tooth="${num}" data-surface="o" points="10,10 30,10 30,30 10,30" fill="${getFaceColor(surfaces, 'o')}" />
        ${isCorona ? `<rect x="1" y="1" width="38" height="38" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3,2" />` : ''}
        ${isEndo ? `<line x1="20" y1="2" x2="20" y2="38" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" />` : ''}
        ${isExtracted ? `<line x1="2" y1="2" x2="38" y2="38" stroke="#dc2626" stroke-width="2.5" /><line x1="38" y1="2" x2="2" y2="38" stroke="#dc2626" stroke-width="2.5" />` : ''}
      </svg>
    </div>
  `;
}

function renderUpperDeciduaItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || '';
  const topKey = 'v';
  const btmKey = 'p';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';
  const isExtracted = tState === 'extraccion';
  const isCorona = tState === 'corona';
  const isEndo = tState === 'endodoncia';

  return `
    <div class="tooth-item decidua-item" data-tooth="${num}">
      <span class="tooth-num decidua-num" data-tooth="${num}" title="Opciones pieza ${num}">${num}</span>
      <svg class="tooth-svg decidua" data-tooth="${num}" viewBox="0 0 40 40">
        <path class="tooth-face" data-tooth="${num}" data-surface="${topKey}" d="M 6.56,6.56 A 19 19 0 0 1 33.44,6.56 L 26,14 A 8.5 8.5 0 0 0 14,14 Z" fill="${getFaceColor(surfaces, topKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" d="M 33.44,6.56 A 19 19 0 0 1 33.44,33.44 L 26,26 A 8.5 8.5 0 0 0 26,14 Z" fill="${getFaceColor(surfaces, rightKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" d="M 33.44,33.44 A 19 19 0 0 1 6.56,33.44 L 14,26 A 8.5 8.5 0 0 0 26,26 Z" fill="${getFaceColor(surfaces, btmKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" d="M 6.56,33.44 A 19 19 0 0 1 6.56,6.56 L 14,14 A 8.5 8.5 0 0 0 14,26 Z" fill="${getFaceColor(surfaces, leftKey)}" />
        <circle class="tooth-face center" data-tooth="${num}" data-surface="o" cx="20" cy="20" r="8.5" fill="${getFaceColor(surfaces, 'o')}" />
        ${isCorona ? `<circle cx="20" cy="20" r="18" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3,2" />` : ''}
        ${isEndo ? `<line x1="20" y1="2" x2="20" y2="38" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" />` : ''}
        ${isExtracted ? `<line x1="4" y1="4" x2="36" y2="36" stroke="#dc2626" stroke-width="2.5" /><line x1="36" y1="4" x2="4" y2="36" stroke="#dc2626" stroke-width="2.5" />` : ''}
      </svg>
    </div>
  `;
}

function renderLowerDeciduaItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || '';
  const topKey = 'l';
  const btmKey = 'v';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';
  const isExtracted = tState === 'extraccion';
  const isCorona = tState === 'corona';
  const isEndo = tState === 'endodoncia';

  return `
    <div class="tooth-item decidua-item" data-tooth="${num}">
      <svg class="tooth-svg decidua" data-tooth="${num}" viewBox="0 0 40 40">
        <path class="tooth-face" data-tooth="${num}" data-surface="${topKey}" d="M 6.56,6.56 A 19 19 0 0 1 33.44,6.56 L 26,14 A 8.5 8.5 0 0 0 14,14 Z" fill="${getFaceColor(surfaces, topKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" d="M 33.44,6.56 A 19 19 0 0 1 33.44,33.44 L 26,26 A 8.5 8.5 0 0 0 26,14 Z" fill="${getFaceColor(surfaces, rightKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" d="M 33.44,33.44 A 19 19 0 0 1 6.56,33.44 L 14,26 A 8.5 8.5 0 0 0 26,26 Z" fill="${getFaceColor(surfaces, btmKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" d="M 6.56,33.44 A 19 19 0 0 1 6.56,6.56 L 14,14 A 8.5 8.5 0 0 0 14,26 Z" fill="${getFaceColor(surfaces, leftKey)}" />
        <circle class="tooth-face center" data-tooth="${num}" data-surface="o" cx="20" cy="20" r="8.5" fill="${getFaceColor(surfaces, 'o')}" />
        ${isCorona ? `<circle cx="20" cy="20" r="18" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3,2" />` : ''}
        ${isEndo ? `<line x1="20" y1="2" x2="20" y2="38" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" />` : ''}
        ${isExtracted ? `<line x1="4" y1="4" x2="36" y2="36" stroke="#dc2626" stroke-width="2.5" /><line x1="36" y1="4" x2="4" y2="36" stroke="#dc2626" stroke-width="2.5" />` : ''}
      </svg>
      <span class="tooth-num decidua-num" data-tooth="${num}" title="Opciones pieza ${num}">${num}</span>
    </div>
  `;
}

function renderLowerPermanentItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || '';
  const topKey = 'l';
  const btmKey = 'v';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';
  const isExtracted = tState === 'extraccion';
  const isCorona = tState === 'corona';
  const isEndo = tState === 'endodoncia';

  return `
    <div class="tooth-item" data-tooth="${num}">
      <svg class="tooth-svg permanent" data-tooth="${num}" viewBox="0 0 40 40">
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${topKey}" points="0,0 40,0 30,10 10,10" fill="${getFaceColor(surfaces, topKey)}" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" points="40,0 40,40 30,30 30,10" fill="${getFaceColor(surfaces, rightKey)}" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" points="40,40 0,40 10,30 30,30" fill="${getFaceColor(surfaces, btmKey)}" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" points="0,40 0,0 10,10 10,30" fill="${getFaceColor(surfaces, leftKey)}" />
        <polygon class="tooth-face center" data-tooth="${num}" data-surface="o" points="10,10 30,10 30,30 10,30" fill="${getFaceColor(surfaces, 'o')}" />
        ${isCorona ? `<rect x="1" y="1" width="38" height="38" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3,2" />` : ''}
        ${isEndo ? `<line x1="20" y1="2" x2="20" y2="38" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" />` : ''}
        ${isExtracted ? `<line x1="2" y1="2" x2="38" y2="38" stroke="#dc2626" stroke-width="2.5" /><line x1="38" y1="2" x2="2" y2="38" stroke="#dc2626" stroke-width="2.5" />` : ''}
      </svg>
      <span class="tooth-num" data-tooth="${num}" title="Opciones pieza ${num}">${num}</span>
      <input type="text" class="tooth-input-box movilidad-input" data-tooth="${num}" value="${data.movilidad[num] || ''}" maxlength="3" title="Movilidad ${num}">
      <input type="text" class="tooth-input-box recesion-input" data-tooth="${num}" value="${data.recesion[num] || ''}" maxlength="3" title="Recesión ${num}">
    </div>
  `;
}

function renderCpoSummary(data) {
  const permanentTeeth = [
    18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
    48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38
  ];
  let cPerm = 0, pPerm = 0, oPerm = 0;
  permanentTeeth.forEach(t => {
    const tState = data.teeth[t];
    const sMap = data.surfaces[t] || {};
    if (tState === 'extraccion') pPerm++;
    else if (Object.values(sMap).includes('caries')) cPerm++;
    else if (Object.values(sMap).includes('obturacion')) oPerm++;
  });

  return `
    <span style="font-weight:600; margin-right:6px;"><i class="fas fa-calculator"></i> CPO-D:</span>
    <span style="color:#ef4444;">C: <strong>${cPerm}</strong></span> · 
    <span style="color:#dc2626;">P: <strong>${pPerm}</strong></span> · 
    <span style="color:#3b82f6;">O: <strong>${oPerm}</strong></span> · 
    <span style="color:var(--primary); font-weight:700;">Total: ${cPerm + pPerm + oPerm}</span>
  `;
}

function attachOdontogramEvents(container, patient, data) {
  // Paleta
  container.querySelectorAll('.odonto-palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.odonto-palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  // Click en Caras
  container.querySelectorAll('.tooth-face').forEach(face => {
    face.addEventListener('click', (e) => {
      e.stopPropagation();
      const toothNum = face.dataset.tooth;
      const surfKey = face.dataset.surface;

      if (!data.surfaces[toothNum]) data.surfaces[toothNum] = {};

      if (currentTool === 'sano') {
        delete data.surfaces[toothNum][surfKey];
        if (Object.keys(data.surfaces[toothNum]).length === 0) delete data.surfaces[toothNum];
        face.setAttribute('fill', '#f8fafc');
      } else if (currentTool === 'extraccion' || currentTool === 'corona' || currentTool === 'endodoncia') {
        data.teeth[toothNum] = currentTool;
        renderOdontogram(container, patient);
      } else {
        data.surfaces[toothNum][surfKey] = currentTool;
        face.setAttribute('fill', ODONTO_TOOLS[currentTool].color);
      }

      updateCpoBadge(container, data);
      triggerAutoSave(container, patient, data);
    });
  });

  // Click en Números
  container.querySelectorAll('.tooth-num').forEach(numEl => {
    numEl.addEventListener('click', () => {
      openToothModal(numEl.dataset.tooth, patient, data, container);
    });
  });

  // Inputs
  container.querySelectorAll('.recesion-input').forEach(inp => {
    inp.addEventListener('input', () => {
      data.recesion[inp.dataset.tooth] = inp.value.trim();
      triggerAutoSave(container, patient, data);
    });
  });

  container.querySelectorAll('.movilidad-input').forEach(inp => {
    inp.addEventListener('input', () => {
      data.movilidad[inp.dataset.tooth] = inp.value.trim();
      triggerAutoSave(container, patient, data);
    });
  });

  // Notas
  const notesArea = container.querySelector('#odontoNotesInput');
  if (notesArea) {
    notesArea.addEventListener('input', () => {
      data.notes = notesArea.value;
      triggerAutoSave(container, patient, data);
    });
  }

  // Guardar manual
  container.querySelector('#odontoSaveBtn')?.addEventListener('click', async () => {
    await saveOdontogramData(container, patient, data, true);
  });

  // Limpiar
  container.querySelector('#odontoResetBtn')?.addEventListener('click', () => {
    if (confirm('¿Limpiar todas las marcas del odontograma?')) {
      data.surfaces = {};
      data.teeth = {};
      data.recesion = {};
      data.movilidad = {};
      data.notes = '';
      renderOdontogram(container, patient);
      saveOdontogramData(container, patient, data, true);
    }
  });
}

function updateCpoBadge(container, data) {
  const badge = container.querySelector('#odontoCpoBadges');
  if (badge) badge.innerHTML = renderCpoSummary(data);
}

function triggerAutoSave(container, patient, data) {
  const statusBadge = container.querySelector('#odontoSaveStatus');
  if (statusBadge) {
    statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    statusBadge.style.color = 'var(--warning)';
  }

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveOdontogramData(container, patient, data, false);
  }, 1000);
}

async function saveOdontogramData(container, patient, data, isExplicit = false) {
  const statusBadge = container.querySelector('#odontoSaveStatus');
  data.updated_at = new Date().toISOString();

  try {
    patient.odontogramData = data;
    if (state.selectedPatient && state.selectedPatient.id === patient.id) {
      state.selectedPatient.odontogramData = data;
    }

    await apiFetch(api.patients, {
      method: 'PATCH',
      body: JSON.stringify({
        id: patient.id,
        odontogramData: data
      })
    });

    if (statusBadge) {
      statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Sincronizado';
      statusBadge.style.color = 'var(--success)';
    }

    if (isExplicit) {
      showToast('Odontograma guardado', 'success');
    }
  } catch (err) {
    if (statusBadge) {
      statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
      statusBadge.style.color = 'var(--danger)';
    }
  }
}

function openToothModal(toothNum, patient, data, container) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  const currentState = data.teeth[toothNum] || 'sano';

  modal.innerHTML = `
    <div class="modal-body" style="max-width: 380px;">
      <div class="modal-head">
        <h4 style="margin:0;">Pieza Dental #${toothNum}</h4>
        <button class="ghost close-tooth-modal"><i class="fas fa-times"></i></button>
      </div>
      <div style="margin:14px 0; display:grid; gap:8px;">
        <label style="font-size:0.8rem; font-weight:600;">Estado de la Pieza:</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <button type="button" class="ghost tooth-opt-btn ${currentState === 'sano' ? 'active' : ''}" data-state="sano"><i class="fas fa-check" style="color:#10b981;"></i> Sano</button>
          <button type="button" class="ghost tooth-opt-btn ${currentState === 'extraccion' ? 'active' : ''}" data-state="extraccion"><i class="fas fa-times" style="color:#ef4444;"></i> Extraída</button>
          <button type="button" class="ghost tooth-opt-btn ${currentState === 'corona' ? 'active' : ''}" data-state="corona"><i class="fas fa-crown" style="color:#f59e0b;"></i> Corona</button>
          <button type="button" class="ghost tooth-opt-btn ${currentState === 'endodoncia' ? 'active' : ''}" data-state="endodoncia"><i class="fas fa-bolt" style="color:#8b5cf6;"></i> Endodoncia</button>
          <button type="button" class="ghost tooth-opt-btn" data-state="clear" style="color:var(--danger);"><i class="fas fa-eraser"></i> Limpiar Caras</button>
        </div>
      </div>
      <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:6px;">
        <button class="ghost close-tooth-modal">Cerrar</button>
        <button class="primary" id="applyToothBtn">Aplicar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const closeModal = () => modal.remove();
  modal.querySelectorAll('.close-tooth-modal').forEach(b => b.addEventListener('click', closeModal));

  let selectedState = currentState;
  modal.querySelectorAll('.tooth-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.tooth-opt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedState = btn.dataset.state;
    });
  });

  modal.querySelector('#applyToothBtn')?.addEventListener('click', () => {
    if (selectedState === 'clear') {
      delete data.surfaces[toothNum];
      delete data.teeth[toothNum];
    } else if (selectedState === 'sano') {
      delete data.teeth[toothNum];
    } else {
      data.teeth[toothNum] = selectedState;
    }

    renderOdontogram(container, patient);
    triggerAutoSave(container, patient, data);
    closeModal();
  });
}

