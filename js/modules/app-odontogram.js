/**
 * app-odontogram.js - Odontograma Clínico Oficial MSP 033 / FDI con Paleta de 9 Símbolos y Selector Bicolor
 */
import { el, apiFetch, showToast } from './app-utils.js';
import { state, api } from './app-state.js';

let currentTool = 'caries';
let currentColor = '#E24B4A'; // Rojo por defecto (#E24B4A / #378ADD)
let autoSaveTimer = null;

export const IMPLANTE_SVG_ICON = `<svg width="15" height="15" viewBox="0 0 24 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 4 4 4 8c0 3 1.5 4.5 2 6.5h12c.5-2 2-3.5 2-6.5 0-4-4-6-8-6z"/><line x1="6" y1="15" x2="18" y2="15"/><line x1="6.7" y1="19" x2="17.3" y2="19"/><line x1="7.4" y1="23" x2="16.6" y2="23"/><path d="M9 15 L12 28 L15 15"/></svg>`;

export const CORONA_SVG_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1.5" /><rect x="8" y="8" width="8" height="8" rx="1" /></svg>`;

export const ODONTO_TOOLS_LIST = [
  { id: 'caries', glyph: '●', label: 'Caries', scope: 'surface' },
  { id: 'obturacion', glyph: '●', label: 'Obturación', scope: 'surface' },
  { id: 'sellante', glyph: '✱', label: 'Sellante', scope: 'surface' },
  { id: 'extraccion', glyph: '✕', label: 'Extracción/Pérdida', scope: 'tooth' },
  { id: 'perdida-otra', glyph: '⊗', label: 'Pérdida (otra causa)', scope: 'tooth' },
  { id: 'endodoncia', glyph: '△', label: 'Endodoncia', scope: 'tooth' },
  { id: 'corona', glyph: CORONA_SVG_ICON, label: 'Corona', isSvg: true, scope: 'tooth' },
  { id: 'implante', glyph: IMPLANTE_SVG_ICON, label: 'Implante', isSvg: true, scope: 'tooth' },
  { id: 'protesis-fija', glyph: '┄', label: 'Prótesis fija', scope: 'tooth' },
  { id: 'protesis-removible', glyph: '(┄)', label: 'Prótesis removible', scope: 'tooth' },
  { id: 'protesis-total', glyph: '═', label: 'Prótesis total', scope: 'tooth' }
];

export const ROW_ORDERS = [
  [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
  [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
];

let prosthesisRangeStart = null;

function getToothRowNeighbors(num, tool, data) {
  const n = parseInt(num, 10);
  for (const row of ROW_ORDERS) {
    const idx = row.indexOf(n);
    if (idx !== -1) {
      const leftNum = idx > 0 ? row[idx - 1] : null;
      const rightNum = idx < row.length - 1 ? row[idx + 1] : null;
      const hasLeft = leftNum !== null && data?.teeth && (typeof data.teeth[leftNum] === 'object' ? data.teeth[leftNum]?.tool : data.teeth[leftNum]) === tool;
      const hasRight = rightNum !== null && data?.teeth && (typeof data.teeth[rightNum] === 'object' ? data.teeth[rightNum]?.tool : data.teeth[rightNum]) === tool;
      return { hasLeft, hasRight };
    }
  }
  return { hasLeft: false, hasRight: false };
}

export function renderOdontogram(containerId, patient) {
  const container = typeof containerId === 'string' ? el(containerId) : containerId;
  if (!container || !patient) return;

  if (!patient.odontogramData) {
    patient.odontogramData = { surfaces: {}, teeth: {}, recesion: {}, movilidad: {}, notes: '' };
  }
  const data = patient.odontogramData;
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

  const activeToolObj = ODONTO_TOOLS_LIST.find(t => t.id === currentTool) || ODONTO_TOOLS_LIST[1];
  const colorName = currentColor === '#E24B4A' ? 'Rojo (Patológico / Por hacer)' : 'Azul (Restaurado / Existente)';

  container.innerHTML = `
    <div class="odontogram-card">
      <!-- Encabezado -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <h4 style="margin:0; font-size:1rem;"><i class="fas fa-tooth" style="color:var(--primary);"></i> Odontograma Clínico (MSP 033 / FDI)</h4>
          <span id="odontoSaveStatus" style="font-size:0.75rem; color:var(--success);"><i class="fas fa-check-circle"></i> Sincronizado</span>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button type="button" class="ghost" id="odontoResetBtn" style="font-size:0.75rem; padding:4px 10px; color:var(--danger);" title="Limpiar"><i class="fas fa-trash-alt"></i> Limpiar</button>
          <button type="button" class="primary" id="odontoSaveBtn" style="font-size:0.75rem; padding:4px 14px;"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </div>

      <!-- Paleta de 9 Símbolos + Borrador / Sano -->
      <div style="display:flex; flex-direction:column; gap:8px; padding:10px; background:var(--bg-page); border-radius:10px; border:1px solid var(--border); margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:0.78rem; font-weight:700; color:var(--muted); margin-right:2px;">Herramienta:</span>
          <div id="odontoToolsBar" style="display:flex; gap:5px; flex-wrap:wrap;">
            ${ODONTO_TOOLS_LIST.map(t => {
              const isActive = currentTool === t.id;
              const iconHtml = t.isSvg
                ? `<span aria-hidden="true" style="display:inline-flex; align-items:center;">${t.glyph}</span>`
                : `<span aria-hidden="true" style="font-weight:bold; font-size:0.95rem;">${t.glyph}</span>`;
              return `
                <button type="button" class="odonto-palette-btn ${isActive ? 'active' : ''}" data-tool="${t.id}" title="${t.label}">
                  ${iconHtml} ${t.label}
                </button>
              `;
            }).join('')}
            <button type="button" class="odonto-palette-btn ${currentTool === 'sano' ? 'active' : ''}" id="sanoBtn" data-tool="sano" style="color:var(--text); border-color:var(--border);">
              <i class="fas fa-eraser" style="color:var(--muted);"></i> Borrar / Sano
            </button>
          </div>
        </div>

        <!-- Barra de Selector de Color y Estado Armado -->
        <div id="colorpop" style="display:${currentTool === 'sano' ? 'none' : 'flex'}; align-items:center; gap:10px; padding:6px 12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; font-size:0.8rem; flex-wrap:wrap;">
          <span style="font-weight:600; color:var(--text);">Color:</span>
          <button type="button" class="odonto-color-swatch ${currentColor === '#E24B4A' ? 'active' : ''}" data-color="#E24B4A" style="background:#E24B4A; display:${currentTool === 'obturacion' ? 'none' : 'inline-block'};" title="Rojo: Patología / Por tratar"></button>
          <button type="button" class="odonto-color-swatch ${currentColor === '#378ADD' ? 'active' : ''}" data-color="#378ADD" style="background:#378ADD; display:${currentTool === 'caries' ? 'none' : 'inline-block'};" title="Azul: Restaurado / Realizado"></button>
          <span id="armed-label" class="odonto-armed-badge" draggable="true" style="color:${currentColor};">
            <i class="fas fa-hand-pointer"></i> <strong>${activeToolObj.label}</strong>
          </span>
        </div>
      </div>

      <!-- Tablero Odontograma Oficial MSP -->
      <div class="odonto-board-wrapper">
        <div class="arch-container">
          
          <!-- FILA 1: ARCADA SUPERIOR PERMANENTE -->
          <div class="dental-arch-row">
            <div class="arch-labels-col">
              <span class="arch-side-lbl input-lbl">RECESIÓN</span>
              <span class="arch-side-lbl input-lbl">MOVILIDAD</span>
              <span class="arch-side-lbl svg-lbl">VESTIBULAR</span>
              <span class="arch-side-lbl num-lbl">PIEZA</span>
            </div>
            <div class="dental-quadrant right-side">
              ${q1.map(t => renderUpperPermanentItem(t, data, 'right')).join('')}
            </div>
            <div class="arch-midline"></div>
            <div class="dental-quadrant left-side">
              ${q2.map(t => renderUpperPermanentItem(t, data, 'left')).join('')}
            </div>
          </div>

          <!-- FILA 2: ARCADA SUPERIOR TEMPORAL / DECIDUA -->
          <div class="dental-arch-row decidua-row" style="margin:4px 0;">
            <div class="arch-labels-col">
              <span class="arch-side-lbl svg-lbl" style="font-size:0.60rem; color:#0284c7;">TEMPORAL</span>
              <span class="arch-side-lbl num-lbl">PIEZA</span>
            </div>
            <div class="dental-quadrant decidua-quadrant right-side">
              ${q5.map(t => renderUpperDeciduaItem(t, data, 'right')).join('')}
            </div>
            <div class="arch-midline decidua-midline"></div>
            <div class="dental-quadrant decidua-quadrant left-side">
              ${q6.map(t => renderUpperDeciduaItem(t, data, 'left')).join('')}
            </div>
          </div>

          <!-- DIVISOR LINGUAL CENTRAL -->
          <div class="lingual-divider-row">
            <div class="lingual-label">PALATINO / LINGUAL</div>
            <div class="lingual-line"></div>
          </div>

          <!-- FILA 3: ARCADA INFERIOR TEMPORAL / DECIDUA -->
          <div class="dental-arch-row decidua-row" style="margin:4px 0;">
            <div class="arch-labels-col">
              <span class="arch-side-lbl num-lbl">PIEZA</span>
              <span class="arch-side-lbl svg-lbl" style="font-size:0.60rem; color:#0284c7;">TEMPORAL</span>
            </div>
            <div class="dental-quadrant decidua-quadrant right-side">
              ${q8.map(t => renderLowerDeciduaItem(t, data, 'right')).join('')}
            </div>
            <div class="arch-midline decidua-midline"></div>
            <div class="dental-quadrant decidua-quadrant left-side">
              ${q7.map(t => renderLowerDeciduaItem(t, data, 'left')).join('')}
            </div>
          </div>

          <!-- FILA 4: ARCADA INFERIOR PERMANENTE -->
          <div class="dental-arch-row">
            <div class="arch-labels-col">
              <span class="arch-side-lbl num-lbl">PIEZA</span>
              <span class="arch-side-lbl svg-lbl">VESTIBULAR</span>
              <span class="arch-side-lbl input-lbl">MOVILIDAD</span>
              <span class="arch-side-lbl input-lbl">RECESIÓN</span>
            </div>
            <div class="dental-quadrant right-side">
              ${q4.map(t => renderLowerPermanentItem(t, data, 'right')).join('')}
            </div>
            <div class="arch-midline"></div>
            <div class="dental-quadrant left-side">
              ${q3.map(t => renderLowerPermanentItem(t, data, 'left')).join('')}
            </div>
          </div>

        </div>
      </div>

      <!-- Resumen CPO-D & Observaciones -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; flex-wrap:wrap; gap:10px;">
        <div id="odontoCpoBadges" style="display:flex; gap:8px; font-size:0.8rem; align-items:center;">
          ${renderCpoSummary(data)}
        </div>
      </div>

      <div style="margin-top:10px;">
        <label style="font-size:0.75rem; font-weight:700; color:var(--muted); display:block; margin-bottom:4px;">Observaciones del Odontograma:</label>
        <textarea id="odontoNotesInput" rows="2" class="field-input" style="width:100%; box-sizing:border-box; font-size:0.8rem;" placeholder="Notas clínicas sobre piezas específicas, prótesis, anomalías...">${data.notes || ''}</textarea>
      </div>
    </div>
  `;

  attachOdontogramEvents(container, patient, data);
}

function getFaceColor(surfaces, key) {
  const st = surfaces[key];
  if (!st) return '#f8fafc';
  const tool = typeof st === 'object' ? st.tool : st;
  const col = typeof st === 'object' ? st.color : (
    tool === 'caries' ? '#E24B4A' : tool === 'obturacion' ? '#378ADD' : tool === 'sellante' ? '#378ADD' : '#E24B4A'
  );

  if (tool === 'caries' || tool === 'obturacion') {
    return col;
  }
  if (tool === 'sellante') {
    return col === '#E24B4A' || col === '#ef4444' ? 'rgba(239, 68, 68, 0.28)' : 'rgba(59, 130, 246, 0.28)';
  }
  return col || '#f8fafc';
}

function renderSurfaceOverlays(surfaces, topKey, rightKey, btmKey, leftKey) {
  if (!surfaces || Object.keys(surfaces).length === 0) return '';
  const entries = [
    { key: topKey, cx: 20, cy: 5 },
    { key: rightKey, cx: 35, cy: 20 },
    { key: btmKey, cx: 20, cy: 35 },
    { key: leftKey, cx: 5, cy: 20 },
    { key: 'o', cx: 20, cy: 20 }
  ];

  return entries.map(({ key, cx, cy }) => {
    const st = surfaces[key];
    if (!st) return '';
    const tool = typeof st === 'object' ? st.tool : st;
    const color = typeof st === 'object' ? (st.color || (tool === 'caries' ? '#E24B4A' : '#378ADD')) : (
      tool === 'caries' ? '#E24B4A' : tool === 'obturacion' ? '#378ADD' : tool === 'sellante' ? '#378ADD' : '#E24B4A'
    );
    const isCenter = (key === 'o');

    if (tool === 'caries' || tool === 'obturacion') {
      return '';
    } else if (tool === 'sellante') {
      const fs = isCenter ? '25px' : '15px';
      const yOff = isCenter ? 8.5 : 5;
      return `
        <g transform="translate(${cx}, ${cy})" pointer-events="none">
          <circle cx="0" cy="0" r="${isCenter ? 9.8 : 6.5}" fill="rgba(255,255,255,0.92)" stroke="#ffffff" stroke-width="1" style="filter:drop-shadow(0px 0.5px 2px rgba(0,0,0,0.3));" />
          <text x="0" y="${yOff}" text-anchor="middle" font-size="${fs}" font-weight="900" fill="${color}" style="user-select:none; font-family:sans-serif; line-height:1;">✱</text>
        </g>
      `;
    }
    return '';
  }).join('');
}

function renderToothOverlay(tState, num, data) {
  if (!tState) return '';
  const tool = typeof tState === 'object' ? tState.tool : tState;
  const color = typeof tState === 'object' ? (tState.color || '#E24B4A') : (
    tool === 'extraccion' ? '#E24B4A' : (tool === 'corona' || tool === 'implante') ? '#f59e0b' : tool === 'endodoncia' ? '#E24B4A' : '#E24B4A'
  );

  switch (tool) {
    case 'caries':
      return `
        <g transform="translate(20, 20)" pointer-events="none">
          <circle cx="0" cy="0" r="8" fill="rgba(255,255,255,0.95)" stroke="#ffffff" stroke-width="2" style="filter:drop-shadow(0px 1px 3px rgba(0,0,0,0.35));" />
          <circle cx="0" cy="0" r="6" fill="${color}" stroke="#ffffff" stroke-width="1.2" />
        </g>
      `;
    case 'obturacion':
      return `
        <g transform="translate(20, 20)" pointer-events="none">
          <circle cx="0" cy="0" r="8" fill="rgba(255,255,255,0.95)" stroke="#ffffff" stroke-width="2" style="filter:drop-shadow(0px 1px 3px rgba(0,0,0,0.35));" />
          <circle cx="0" cy="0" r="6" fill="${color}" stroke="#ffffff" stroke-width="1.2" />
        </g>
      `;
    case 'sellante':
      return `
        <g transform="translate(20, 20)" pointer-events="none">
          <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.95)" stroke="#ffffff" stroke-width="2" style="filter:drop-shadow(0px 1px 3px rgba(0,0,0,0.35));" />
          <text x="0" y="9.5" text-anchor="middle" font-size="28px" font-weight="900" fill="${color}" style="user-select:none; font-family:sans-serif; line-height:1;">✱</text>
        </g>
      `;
    case 'extraccion':
      return `
        <line x1="2" y1="2" x2="38" y2="38" stroke="${color}" stroke-width="4.2" stroke-linecap="round" />
        <line x1="38" y1="2" x2="2" y2="38" stroke="${color}" stroke-width="4.2" stroke-linecap="round" />
      `;
    case 'perdida-otra':
      return `
        <circle cx="20" cy="20" r="16" fill="none" stroke="${color}" stroke-width="3.5" />
        <line x1="8" y1="8" x2="32" y2="32" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />
        <line x1="32" y1="8" x2="8" y2="32" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />
      `;
    case 'endodoncia':
      return `
        <polygon class="odonto-endo-triangle" points="20,2 38,37 2,37" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="3.2" stroke-linejoin="round" style="fill:${color} !important; fill-opacity:0.5 !important; stroke:${color} !important; stroke-width:3.2px !important; pointer-events:none;" />
      `;
    case 'corona':
      return `
        <rect x="3" y="3" width="34" height="34" rx="2" fill="none" stroke="${color}" stroke-width="3" />
        <rect x="9" y="9" width="22" height="22" rx="1.5" fill="none" stroke="${color}" stroke-width="2.6" />
      `;
    case 'implante':
      return `
        <g transform="translate(8, 5) scale(1)" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C8 2 4 4 4 8c0 3 1.5 4.5 2 6.5h12c.5-2 2-3.5 2-6.5 0-4-4-6-8-6z" />
          <line x1="6" y1="15" x2="18" y2="15" />
          <line x1="6.7" y1="19" x2="17.3" y2="19" />
          <line x1="7.4" y1="23" x2="16.6" y2="23" />
          <path d="M9 15 L12 28 L15 15" />
        </g>
      `;
    case 'protesis-fija': {
      const { hasLeft, hasRight } = getToothRowNeighbors(num, 'protesis-fija', data);
      const leftCap = !hasLeft ? `<line x1="3" y1="12" x2="3" y2="28" stroke="${color}" stroke-width="3" stroke-linecap="round" />` : '';
      const rightCap = !hasRight ? `<line x1="37" y1="12" x2="37" y2="28" stroke="${color}" stroke-width="3" stroke-linecap="round" />` : '';
      const xStart = hasLeft ? -4 : 3;
      const xEnd = hasRight ? 44 : 37;
      return `
        ${leftCap}
        <line x1="${xStart}" y1="14" x2="${xEnd}" y2="14" stroke="${color}" stroke-width="2.8" stroke-dasharray="4,3" />
        <line x1="${xStart}" y1="26" x2="${xEnd}" y2="26" stroke="${color}" stroke-width="2.8" stroke-dasharray="4,3" />
        ${rightCap}
      `;
    }
    case 'protesis-removible': {
      const { hasLeft, hasRight } = getToothRowNeighbors(num, 'protesis-removible', data);
      const leftBracket = !hasLeft ? `<path d="M5 8 C1 14 1 26 5 32" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" />` : '';
      const rightBracket = !hasRight ? `<path d="M35 8 C39 14 39 26 35 32" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" />` : '';
      const xStart = hasLeft ? -4 : 6;
      const xEnd = hasRight ? 44 : 34;
      return `
        ${leftBracket}
        <line x1="${xStart}" y1="20" x2="${xEnd}" y2="20" stroke="${color}" stroke-width="3" stroke-dasharray="4,3" />
        ${rightBracket}
      `;
    }
    case 'protesis-total': {
      const { hasLeft, hasRight } = getToothRowNeighbors(num, 'protesis-total', data);
      const leftCap = !hasLeft ? `<line x1="2" y1="13" x2="2" y2="27" stroke="${color}" stroke-width="3.2" stroke-linecap="round" />` : '';
      const rightCap = !hasRight ? `<line x1="38" y1="13" x2="38" y2="27" stroke="${color}" stroke-width="3.2" stroke-linecap="round" />` : '';
      const xStart = hasLeft ? -4 : 2;
      const xEnd = hasRight ? 44 : 38;
      return `
        ${leftCap}
        <line x1="${xStart}" y1="15" x2="${xEnd}" y2="15" stroke="${color}" stroke-width="3" />
        <line x1="${xStart}" y1="25" x2="${xEnd}" y2="25" stroke="${color}" stroke-width="3" />
        ${rightCap}
      `;
    }
    default:
      return '';
  }
}

function renderUpperPermanentItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || null;
  const topKey = 'v';
  const btmKey = 'p';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';

  return `
    <div class="tooth-item" data-tooth="${num}">
      <input type="text" class="tooth-input-box recesion-input" data-tooth="${num}" value="${data.recesion[num] || ''}" maxlength="1" pattern="[1-3]" placeholder="-" title="Recesión ${num} (1-3)">
      <input type="text" class="tooth-input-box movilidad-input" data-tooth="${num}" value="${data.movilidad[num] || ''}" maxlength="1" pattern="[1-3]" placeholder="-" title="Movilidad ${num} (1-3)">
      <svg class="tooth-svg permanent" data-tooth="${num}" viewBox="0 0 40 40">
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${topKey}" points="0,0 40,0 30,10 10,10" fill="${getFaceColor(surfaces, topKey)}" style="fill:${getFaceColor(surfaces, topKey)} !important;" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" points="40,0 40,40 30,30 30,10" fill="${getFaceColor(surfaces, rightKey)}" style="fill:${getFaceColor(surfaces, rightKey)} !important;" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" points="40,40 0,40 10,30 30,30" fill="${getFaceColor(surfaces, btmKey)}" style="fill:${getFaceColor(surfaces, btmKey)} !important;" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" points="0,40 0,0 10,10 10,30" fill="${getFaceColor(surfaces, leftKey)}" style="fill:${getFaceColor(surfaces, leftKey)} !important;" />
        <polygon class="tooth-face center" data-tooth="${num}" data-surface="o" points="10,10 30,10 30,30 10,30" fill="${getFaceColor(surfaces, 'o')}" style="fill:${getFaceColor(surfaces, 'o')} !important;" />
        ${renderSurfaceOverlays(surfaces, topKey, rightKey, btmKey, leftKey)}
        ${renderToothOverlay(tState, num, data)}
      </svg>
      <span class="tooth-num" data-tooth="${num}">${num}</span>
    </div>
  `;
}

function renderUpperDeciduaItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || null;
  const topKey = 'v';
  const btmKey = 'p';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';

  return `
    <div class="tooth-item decidua-item" data-tooth="${num}">
      <svg class="tooth-svg decidua" data-tooth="${num}" viewBox="0 0 40 40">
        <path class="tooth-face" data-tooth="${num}" data-surface="${topKey}" d="M 6.57,6.57 A 19 19 0 0 1 33.43,6.57 L 26.36,13.64 A 9 9 0 0 0 13.64,13.64 Z" fill="${getFaceColor(surfaces, topKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" d="M 33.43,6.57 A 19 19 0 0 1 33.43,33.43 L 26.36,26.36 A 9 9 0 0 0 26.36,13.64 Z" fill="${getFaceColor(surfaces, rightKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" d="M 33.43,33.43 A 19 19 0 0 1 6.57,33.43 L 13.64,26.36 A 9 9 0 0 0 26.36,26.36 Z" fill="${getFaceColor(surfaces, btmKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" d="M 6.57,33.43 A 19 19 0 0 1 6.57,6.57 L 13.64,13.64 A 9 9 0 0 0 13.64,26.36 Z" fill="${getFaceColor(surfaces, leftKey)}" />
        <circle class="tooth-face center" data-tooth="${num}" data-surface="o" cx="20" cy="20" r="9" fill="${getFaceColor(surfaces, 'o')}" />
        ${renderSurfaceOverlays(surfaces, topKey, rightKey, btmKey, leftKey)}
        ${renderToothOverlay(tState, num, data)}
      </svg>
      <span class="tooth-num decidua-num" data-tooth="${num}">${num}</span>
    </div>
  `;
}

function renderLowerDeciduaItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || null;
  const topKey = 'l';
  const btmKey = 'v';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';

  return `
    <div class="tooth-item decidua-item" data-tooth="${num}">
      <svg class="tooth-svg decidua" data-tooth="${num}" viewBox="0 0 40 40">
        <path class="tooth-face" data-tooth="${num}" data-surface="${topKey}" d="M 6.57,6.57 A 19 19 0 0 1 33.43,6.57 L 26.36,13.64 A 9 9 0 0 0 13.64,13.64 Z" fill="${getFaceColor(surfaces, topKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" d="M 33.43,6.57 A 19 19 0 0 1 33.43,33.43 L 26.36,26.36 A 9 9 0 0 0 26.36,13.64 Z" fill="${getFaceColor(surfaces, rightKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" d="M 33.43,33.43 A 19 19 0 0 1 6.57,33.43 L 13.64,26.36 A 9 9 0 0 0 26.36,26.36 Z" fill="${getFaceColor(surfaces, btmKey)}" />
        <path class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" d="M 6.57,33.43 A 19 19 0 0 1 6.57,6.57 L 13.64,13.64 A 9 9 0 0 0 13.64,26.36 Z" fill="${getFaceColor(surfaces, leftKey)}" />
        <circle class="tooth-face center" data-tooth="${num}" data-surface="o" cx="20" cy="20" r="9" fill="${getFaceColor(surfaces, 'o')}" />
        ${renderSurfaceOverlays(surfaces, topKey, rightKey, btmKey, leftKey)}
        ${renderToothOverlay(tState, num, data)}
      </svg>
      <span class="tooth-num decidua-num" data-tooth="${num}">${num}</span>
    </div>
  `;
}

function renderLowerPermanentItem(num, data, side) {
  const surfaces = data.surfaces[num] || {};
  const tState = data.teeth[num] || null;
  const topKey = 'l';
  const btmKey = 'v';
  const leftKey = side === 'right' ? 'd' : 'm';
  const rightKey = side === 'right' ? 'm' : 'd';

  return `
    <div class="tooth-item" data-tooth="${num}">
      <span class="tooth-num" data-tooth="${num}">${num}</span>
      <svg class="tooth-svg permanent" data-tooth="${num}" viewBox="0 0 40 40">
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${topKey}" points="0,0 40,0 30,10 10,10" fill="${getFaceColor(surfaces, topKey)}" style="fill:${getFaceColor(surfaces, topKey)} !important;" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${rightKey}" points="40,0 40,40 30,30 30,10" fill="${getFaceColor(surfaces, rightKey)}" style="fill:${getFaceColor(surfaces, rightKey)} !important;" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${btmKey}" points="40,40 0,40 10,30 30,30" fill="${getFaceColor(surfaces, btmKey)}" style="fill:${getFaceColor(surfaces, btmKey)} !important;" />
        <polygon class="tooth-face" data-tooth="${num}" data-surface="${leftKey}" points="0,40 0,0 10,10 10,30" fill="${getFaceColor(surfaces, leftKey)}" style="fill:${getFaceColor(surfaces, leftKey)} !important;" />
        <polygon class="tooth-face center" data-tooth="${num}" data-surface="o" points="10,10 30,10 30,30 10,30" fill="${getFaceColor(surfaces, 'o')}" style="fill:${getFaceColor(surfaces, 'o')} !important;" />
        ${renderSurfaceOverlays(surfaces, topKey, rightKey, btmKey, leftKey)}
        ${renderToothOverlay(tState, num, data)}
      </svg>
      <input type="text" class="tooth-input-box movilidad-input" data-tooth="${num}" value="${data.movilidad[num] || ''}" maxlength="1" pattern="[1-3]" placeholder="-" title="Movilidad ${num} (1-3)">
      <input type="text" class="tooth-input-box recesion-input" data-tooth="${num}" value="${data.recesion[num] || ''}" maxlength="1" pattern="[1-3]" placeholder="-" title="Recesión ${num} (1-3)">
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
    const toothTool = typeof tState === 'object' ? tState?.tool : tState;
    const toothColor = typeof tState === 'object' ? tState?.color : (toothTool === 'extraccion' ? '#E24B4A' : '#378ADD');

    if (toothTool === 'extraccion' || toothTool === 'perdida-otra') {
      pPerm++;
    } else if (toothTool === 'corona' || toothTool === 'implante' || toothTool === 'endodoncia' || (toothTool && toothTool.startsWith('protesis'))) {
      oPerm++;
    } else {
      let hasC = false, hasO = false;
      Object.values(sMap).forEach(surf => {
        const tool = typeof surf === 'object' ? surf.tool : surf;
        const col = typeof surf === 'object' ? surf.color : (tool === 'caries' ? '#E24B4A' : '#378ADD');
        if (tool === 'caries') {
          if (col === '#E24B4A' || col === '#ef4444') hasC = true;
          else hasO = true;
        } else if (tool === 'obturacion' || tool === 'sellante') {
          hasO = true;
        }
      });
      if (hasC) cPerm++;
      else if (hasO) oPerm++;
    }
  });

  return `
    <span style="font-weight:600; margin-right:6px;"><i class="fas fa-calculator"></i> CPO-D Oficial:</span>
    <span style="color:#E24B4A;">C (Caries): <strong>${cPerm}</strong></span> · 
    <span style="color:#dc2626;">P (Perdidos): <strong>${pPerm}</strong></span> · 
    <span style="color:#378ADD;">O (Obturados): <strong>${oPerm}</strong></span> · 
    <span style="color:var(--primary); font-weight:700;">Total: ${cPerm + pPerm + oPerm}</span>
  `;
}

function applyToolToTooth(toothNum, surfKey, toolId, colorVal, data, container, patient) {
  const toolObj = ODONTO_TOOLS_LIST.find(t => t.id === toolId);
  if (!toolObj && toolId !== 'sano') return;

  if (toolId === 'sano') {
    if (surfKey && data.surfaces[toothNum]) {
      delete data.surfaces[toothNum][surfKey];
      if (Object.keys(data.surfaces[toothNum]).length === 0) delete data.surfaces[toothNum];
    } else {
      delete data.teeth[toothNum];
      delete data.surfaces[toothNum];
    }
    prosthesisRangeStart = null;
  } else if (toolObj && toolObj.scope === 'tooth') {
    if (toolId.startsWith('protesis')) {
      const numA = Number(prosthesisRangeStart);
      const numB = Number(toothNum);
      const row = ROW_ORDERS.find(r => r.includes(numA) && r.includes(numB));
      if (prosthesisRangeStart && row && numA !== numB) {
        const idxA = row.indexOf(numA);
        const idxB = row.indexOf(numB);
        const start = Math.min(idxA, idxB);
        const end = Math.max(idxA, idxB);
        for (let i = start; i <= end; i++) {
          data.teeth[row[i]] = { tool: toolId, color: colorVal };
        }
        showToast(`Prótesis extendida entre piezas ${row[start]} y ${row[end]}`, 'info');
        prosthesisRangeStart = null;
      } else {
        data.teeth[toothNum] = { tool: toolId, color: colorVal };
        prosthesisRangeStart = toothNum;
      }
    } else {
      data.teeth[toothNum] = { tool: toolId, color: colorVal };
      prosthesisRangeStart = null;
    }
  } else {
    prosthesisRangeStart = null;
    if (!data.surfaces[toothNum]) data.surfaces[toothNum] = {};
    data.surfaces[toothNum][surfKey || 'o'] = { tool: toolId, color: colorVal };
  }

  renderOdontogram(container, patient);
  updateCpoBadge(container, data);
  triggerDebouncedAutoSave(container, patient, data);
}

function attachOdontogramEvents(container, patient, data) {
  const pop = container.querySelector('#colorpop');
  const armedLabel = container.querySelector('#armed-label');

  function updateArmedBadge() {
    if (!armedLabel) return;
    if (currentTool === 'sano') {
      if (pop) pop.style.display = 'none';
      return;
    }
    if (pop) pop.style.display = 'flex';

    // Regla de color fija por herramienta clínica:
    // Caries: solo rojo disponible y activo. Obturación: solo azul disponible y activo.
    const redSwatch = container.querySelector('.odonto-color-swatch[data-color="#E24B4A"]');
    const blueSwatch = container.querySelector('.odonto-color-swatch[data-color="#378ADD"]');

    if (currentTool === 'caries') {
      currentColor = '#E24B4A';
      if (redSwatch) {
        redSwatch.style.display = 'inline-block';
        redSwatch.classList.add('active');
      }
      if (blueSwatch) {
        blueSwatch.style.display = 'none';
        blueSwatch.classList.remove('active');
      }
    } else if (currentTool === 'obturacion') {
      currentColor = '#378ADD';
      if (blueSwatch) {
        blueSwatch.style.display = 'inline-block';
        blueSwatch.classList.add('active');
      }
      if (redSwatch) {
        redSwatch.style.display = 'none';
        redSwatch.classList.remove('active');
      }
    } else {
      if (redSwatch) {
        redSwatch.style.display = 'inline-block';
        redSwatch.classList.toggle('active', currentColor === '#E24B4A');
      }
      if (blueSwatch) {
        blueSwatch.style.display = 'inline-block';
        blueSwatch.classList.toggle('active', currentColor === '#378ADD');
      }
    }

    const activeToolObj = ODONTO_TOOLS_LIST.find(t => t.id === currentTool) || ODONTO_TOOLS_LIST[1];
    let extraHint = '';
    if (currentTool.startsWith('protesis') && prosthesisRangeStart) {
      extraHint = ` <small style="font-size:0.75rem; opacity:0.85;">(${prosthesisRangeStart} → clic final)</small>`;
    }
    armedLabel.innerHTML = `<i class="fas fa-hand-pointer"></i> <strong>${activeToolObj.label}</strong>${extraHint}`;
    armedLabel.style.color = currentColor;
  }

  // Paleta de Herramientas
  container.querySelectorAll('.odonto-palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.odonto-palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;

      // Color inicial sugerido por convención odontológica oficial
      if (currentTool === 'caries') {
        currentColor = '#E24B4A'; // Rojo exclusivo: patológico / caries
      } else if (currentTool === 'obturacion') {
        currentColor = '#378ADD'; // Azul exclusivo: obturado / restaurado
      } else if (currentTool === 'sellante') {
        currentColor = '#378ADD'; // Azul: sellante
      } else if (currentTool === 'corona' || currentTool === 'implante') {
        currentColor = '#f59e0b';
      } else if (currentTool === 'extraccion' || currentTool === 'perdida-otra') {
        currentColor = '#E24B4A';
      } else if (currentTool === 'endodoncia') {
        if (!currentColor || (currentColor !== '#E24B4A' && currentColor !== '#378ADD')) {
          currentColor = '#E24B4A';
        }
      }
      prosthesisRangeStart = null;

      updateArmedBadge();
    });
  });

  // Selector de Swatches de Color
  container.querySelectorAll('.odonto-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      if (currentTool === 'caries' || currentTool === 'obturacion') return;
      container.querySelectorAll('.odonto-color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentColor = swatch.dataset.color;
      updateArmedBadge();
    });
  });

  // Drag & Drop sobre el armed label
  if (armedLabel) {
    armedLabel.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ tool: currentTool, color: currentColor }));
      e.dataTransfer.effectAllowed = 'copy';
    });
  }

  // Click en Caras Dentales
  container.querySelectorAll('.tooth-face').forEach(face => {
    face.addEventListener('click', (e) => {
      e.stopPropagation();
      const toothNum = face.dataset.tooth;
      const surfKey = face.dataset.surface;
      applyToolToTooth(toothNum, surfKey, currentTool, currentColor, data, container, patient);
    });

    // Drag over face
    face.addEventListener('dragover', (e) => {
      e.preventDefault();
      face.style.opacity = '0.7';
    });
    face.addEventListener('dragleave', () => {
      face.style.opacity = '1';
    });
    face.addEventListener('drop', (e) => {
      e.preventDefault();
      face.style.opacity = '1';
      try {
        const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
        const tool = payload.tool || currentTool;
        const col = payload.color || currentColor;
        applyToolToTooth(face.dataset.tooth, face.dataset.surface, tool, col, data, container, patient);
      } catch (err) {
        applyToolToTooth(face.dataset.tooth, face.dataset.surface, currentTool, currentColor, data, container, patient);
      }
    });
  });

  // Click en Número de Diente
  container.querySelectorAll('.tooth-num').forEach(numEl => {
    numEl.addEventListener('click', () => {
      const t = numEl.dataset.tooth;
      applyToolToTooth(t, null, currentTool, currentColor, data, container, patient);
    });
  });

  // Drag & Drop sobre todo el diente
  container.querySelectorAll('.tooth-item').forEach(item => {
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.style.transform = 'scale(1.06)';
    });
    item.addEventListener('dragleave', () => {
      item.style.transform = '';
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.style.transform = '';
      const toothNum = item.dataset.tooth;
      try {
        const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
        const tool = payload.tool || currentTool;
        const col = payload.color || currentColor;
        applyToolToTooth(toothNum, null, tool, col, data, container, patient);
      } catch (err) {
        applyToolToTooth(toothNum, null, currentTool, currentColor, data, container, patient);
      }
    });
  });

  // Inputs de Recesión y Movilidad (Solo valores 1 al 3)
  container.querySelectorAll('.recesion-input').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/[^1-3]/g, '').slice(0, 1);
      data.recesion[inp.dataset.tooth] = inp.value;
      triggerDebouncedAutoSave(container, patient, data);
    });
  });

  container.querySelectorAll('.movilidad-input').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/[^1-3]/g, '').slice(0, 1);
      data.movilidad[inp.dataset.tooth] = inp.value;
      triggerDebouncedAutoSave(container, patient, data);
    });
  });

  // Notas
  const notesArea = container.querySelector('#odontoNotesInput');
  if (notesArea) {
    notesArea.addEventListener('input', () => {
      data.notes = notesArea.value;
      triggerDebouncedAutoSave(container, patient, data);
    });
  }

  // Guardar Manual
  container.querySelector('#odontoSaveBtn')?.addEventListener('click', async () => {
    clearTimeout(autoSaveTimer);
    await saveOdontogramData(container, patient, data, true);
  });

  // Limpiar Odontograma
  container.querySelector('#odontoResetBtn')?.addEventListener('click', () => {
    if (confirm('¿Deseas limpiar todas las marcas del odontograma actual?')) {
      clearTimeout(autoSaveTimer);
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

function triggerDebouncedAutoSave(container, patient, data) {
  const statusBadge = container.querySelector('#odontoSaveStatus');
  if (statusBadge) {
    statusBadge.innerHTML = '<i class="fas fa-circle" style="color:var(--warning); font-size:0.65rem;"></i> Cambios sin guardar';
    statusBadge.style.color = 'var(--warning)';
  }

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveOdontogramData(container, patient, data, false);
  }, 1500);
}

async function saveOdontogramData(container, patient, data, isExplicit = false) {
  const statusBadge = container.querySelector('#odontoSaveStatus');
  data.updated_at = new Date().toISOString();

  if (statusBadge) {
    statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    statusBadge.style.color = 'var(--warning)';
  }

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
      showToast('Odontograma guardado correctamente', 'success');
    }
  } catch (err) {
    if (statusBadge) {
      statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error al guardar';
      statusBadge.style.color = 'var(--danger)';
    }
  }
}
