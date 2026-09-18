/**
 * app-odontogram.js - Odontograma Oficial MSP (Ecuador / LATAM)
 * Incluye:
 * - Arcada Superior Permanente (18-11 | 21-28) con Recesión, Movilidad, Números y Caras Vestibular/Palatina/Mesial/Distal/Oclusal
 * - Arcada Superior Temporal (55-51 | 61-65) con Números y Caras anatómicas
 * - Eje Central Lingual/Palatino
 * - Arcada Inferior Temporal (85-81 | 71-75) con Caras anatómicas y Números
 * - Arcada Inferior Permanente (48-41 | 31-38) con Caras Vestibular/Lingual/Mesial/Distal/Oclusal, Números, Movilidad y Recesión
 * - Paleta de Diagnósticos Clínicos (Caries, Obturación, Endodoncia, Corona, Extracción, Sellante, Prótesis, Sano)
 * - Cálculo automático de Índices CPO-D y ceod
 * - Guardado automático y manual sincronizado con base de datos
 */
import { el, apiFetch, showToast } from './app-utils.js';
import { state, api } from './app-state.js';

// Colores de herramientas odontológicas
export const ODONTO_TOOLS = {
  caries: { label: 'Caries', color: '#ef4444', border: '#b91c1c', icon: 'fa-circle' },
  obturacion: { label: 'Obturación', color: '#3b82f6', border: '#1d4ed8', icon: 'fa-circle' },
  endodoncia: { label: 'Endodoncia', color: '#8b5cf6', border: '#6d28d9', icon: 'fa-bolt' },
  corona: { label: 'Corona', color: '#f59e0b', border: '#b45309', icon: 'fa-crown' },
  extraccion: { label: 'Extracción / Ausente', color: '#dc2626', border: '#991b1b', icon: 'fa-times' },
  sellante: { label: 'Sellante', color: '#06b6d4', border: '#0e7490', icon: 'fa-shield-alt' },
  protesis: { label: 'Prótesis', color: '#10b981', border: '#047857', icon: 'fa-teeth' },
  sano: { label: 'Sano / Borrar', color: '#ffffff', border: '#94a3b8', icon: 'fa-eraser' }
};

let currentTool = 'caries';
let autoSaveTimer = null;

export function renderOdontogram(containerId, patient) {
  const container = typeof containerId === 'string' ? el(containerId) : containerId;
  if (!container || !patient) return;

  // Cargar datos existentes o inicializar estructura
  const data = patient.odontogramData || {
    surfaces: {},
    teeth: {},
    recesion: {},
    movilidad: {},
    notes: '',
    updated_at: ''
  };

  // Asegurar objetos si vienen incompletos
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
    <div class="msp-odontogram-card">
      <!-- Encabezado y Barra de Herramientas -->
      <div class="msp-odonto-header">
        <div class="msp-odonto-title-group">
          <h4><i class="fas fa-tooth" style="color:var(--primary);"></i> Odontograma Clínico Oficial (MSP 033 / FDI)</h4>
          <span class="msp-save-badge" id="odontoSaveStatus"><i class="fas fa-check-circle"></i> Sincronizado</span>
        </div>
        <div class="msp-odonto-actions">
          <button type="button" class="ghost" id="odontoResetBtn" title="Limpiar todas las marcas" style="font-size:0.8rem; color:var(--danger); padding:4px 10px;">
            <i class="fas fa-trash-alt"></i> Limpiar Todo
          </button>
          <button type="button" class="primary" id="odontoSaveBtn" style="font-size:0.8rem; padding:5px 14px; box-shadow:0 3px 10px rgba(99,102,241,0.25);">
            <i class="fas fa-save"></i> Guardar Odontograma
          </button>
        </div>
      </div>

      <!-- Paleta de Diagnósticos -->
      <div class="msp-palette-bar">
        <span class="msp-palette-label"><i class="fas fa-paint-brush"></i> Herramienta activa:</span>
        <div class="msp-tools-list">
          ${Object.entries(ODONTO_TOOLS).map(([key, tool]) => `
            <button type="button" class="msp-tool-btn ${currentTool === key ? 'active' : ''}" data-tool="${key}">
              <span class="msp-tool-dot" style="background:${tool.color}; border-color:${tool.border};"></span>
              <span class="msp-tool-text">${tool.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Indicadores CPO-D y ceod en Vivo -->
      <div class="msp-cpo-bar" id="mspCpoBar">
        ${renderCpoSummary(data)}
      </div>

      <!-- Tablero Gráfico Oficial MSP -->
      <div class="msp-sheet-wrapper">
        <div class="msp-sheet-outer">
          
          <!-- ================= 1. MAXILAR SUPERIOR PERMANENTE ================= -->
          <div class="msp-row-grid">
            <div class="msp-row-label">RECESIÓN</div>
            <div class="msp-quadrant-side right-side">
              ${q1.map(t => `<input type="text" class="msp-box-input recesion-input" data-tooth="${t}" value="${data.recesion[t] || ''}" maxlength="3" autocomplete="off" title="Recesión pieza ${t}">`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q2.map(t => `<input type="text" class="msp-box-input recesion-input" data-tooth="${t}" value="${data.recesion[t] || ''}" maxlength="3" autocomplete="off" title="Recesión pieza ${t}">`).join('')}
            </div>
          </div>

          <div class="msp-row-grid">
            <div class="msp-row-label">MOVILIDAD</div>
            <div class="msp-quadrant-side right-side">
              ${q1.map(t => `<input type="text" class="msp-box-input movilidad-input" data-tooth="${t}" value="${data.movilidad[t] || ''}" maxlength="3" autocomplete="off" title="Movilidad pieza ${t}">`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q2.map(t => `<input type="text" class="msp-box-input movilidad-input" data-tooth="${t}" value="${data.movilidad[t] || ''}" maxlength="3" autocomplete="off" title="Movilidad pieza ${t}">`).join('')}
            </div>
          </div>

          <div class="msp-row-grid">
            <div class="msp-row-label"></div>
            <div class="msp-quadrant-side right-side">
              ${q1.map(t => `<span class="msp-tooth-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q2.map(t => `<span class="msp-tooth-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
          </div>

          <div class="msp-row-grid">
            <div class="msp-row-label">VESTIBULAR</div>
            <div class="msp-quadrant-side right-side">
              ${q1.map(t => renderPermanentToothSvg(t, data, 'upper', 'right')).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q2.map(t => renderPermanentToothSvg(t, data, 'upper', 'left')).join('')}
            </div>
          </div>

          <!-- ================= 2. MAXILAR SUPERIOR TEMPORAL (DECIDUA) ================= -->
          <div class="msp-row-grid msp-decidua-top-row">
            <div class="msp-row-label"></div>
            <div class="msp-quadrant-side right-side msp-decidua-side">
              ${q5.map(t => `<span class="msp-tooth-num decidua-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side msp-decidua-side">
              ${q6.map(t => `<span class="msp-tooth-num decidua-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
          </div>

          <div class="msp-row-grid">
            <div class="msp-row-label"></div>
            <div class="msp-quadrant-side right-side msp-decidua-side">
              ${q5.map(t => renderDeciduousToothSvg(t, data, 'upper', 'right')).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side msp-decidua-side">
              ${q6.map(t => renderDeciduousToothSvg(t, data, 'upper', 'left')).join('')}
            </div>
          </div>

          <!-- ================= EJE CENTRAL: LINGUAL / PALATINO ================= -->
          <div class="msp-row-grid msp-lingual-divider">
            <div class="msp-row-label msp-label-highlight">LINGUAL</div>
            <div class="msp-lingual-line"></div>
          </div>

          <!-- ================= 3. MAXILAR INFERIOR TEMPORAL (DECIDUA) ================= -->
          <div class="msp-row-grid">
            <div class="msp-row-label"></div>
            <div class="msp-quadrant-side right-side msp-decidua-side">
              ${q8.map(t => renderDeciduousToothSvg(t, data, 'lower', 'right')).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side msp-decidua-side">
              ${q7.map(t => renderDeciduousToothSvg(t, data, 'lower', 'left')).join('')}
            </div>
          </div>

          <div class="msp-row-grid msp-decidua-bottom-row">
            <div class="msp-row-label"></div>
            <div class="msp-quadrant-side right-side msp-decidua-side">
              ${q8.map(t => `<span class="msp-tooth-num decidua-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side msp-decidua-side">
              ${q7.map(t => `<span class="msp-tooth-num decidua-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
          </div>

          <!-- ================= 4. MAXILAR INFERIOR PERMANENTE ================= -->
          <div class="msp-row-grid">
            <div class="msp-row-label">VESTIBULAR</div>
            <div class="msp-quadrant-side right-side">
              ${q4.map(t => renderPermanentToothSvg(t, data, 'lower', 'right')).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q3.map(t => renderPermanentToothSvg(t, data, 'lower', 'left')).join('')}
            </div>
          </div>

          <div class="msp-row-grid">
            <div class="msp-row-label"></div>
            <div class="msp-quadrant-side right-side">
              ${q4.map(t => `<span class="msp-tooth-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q3.map(t => `<span class="msp-tooth-num" data-tooth="${t}" title="Opciones pieza ${t}">${t}</span>`).join('')}
            </div>
          </div>

          <div class="msp-row-grid">
            <div class="msp-row-label">MOVILIDAD</div>
            <div class="msp-quadrant-side right-side">
              ${q4.map(t => `<input type="text" class="msp-box-input movilidad-input" data-tooth="${t}" value="${data.movilidad[t] || ''}" maxlength="3" autocomplete="off" title="Movilidad pieza ${t}">`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q3.map(t => `<input type="text" class="msp-box-input movilidad-input" data-tooth="${t}" value="${data.movilidad[t] || ''}" maxlength="3" autocomplete="off" title="Movilidad pieza ${t}">`).join('')}
            </div>
          </div>

          <div class="msp-row-grid">
            <div class="msp-row-label">RECESIÓN</div>
            <div class="msp-quadrant-side right-side">
              ${q4.map(t => `<input type="text" class="msp-box-input recesion-input" data-tooth="${t}" value="${data.recesion[t] || ''}" maxlength="3" autocomplete="off" title="Recesión pieza ${t}">`).join('')}
            </div>
            <div class="msp-midline"></div>
            <div class="msp-quadrant-side left-side">
              ${q3.map(t => `<input type="text" class="msp-box-input recesion-input" data-tooth="${t}" value="${data.recesion[t] || ''}" maxlength="3" autocomplete="off" title="Recesión pieza ${t}">`).join('')}
            </div>
          </div>

        </div>
      </div>

      <!-- Observaciones y Notas Clínicas del Odontograma -->
      <div class="msp-notes-container">
        <label style="font-weight:600; font-size:0.85rem; color:var(--text); margin-bottom:4px; display:block;">
          <i class="fas fa-comment-medical" style="color:var(--primary);"></i> Observaciones y Diagnóstico General del Odontograma:
        </label>
        <textarea class="field-input msp-notes-textarea" id="odontoNotesInput" rows="2" placeholder="Describir anomalías de forma, número, oclusión, tratamientos planificados o detalles clínicos específicos...">${data.notes || ''}</textarea>
      </div>
    </div>
  `;

  // Asignar manejadores de eventos
  attachOdontogramEvents(container, patient, data);
}

/**
 * Renderiza una pieza permanente (cuadrado anatómico de 5 caras)
 */
function renderPermanentToothSvg(num, data, arch, side) {
  const toothSurfaces = data.surfaces[num] || {};
  const toothState = data.teeth[num] || '';

  const topSurfKey = arch === 'upper' ? 'v' : 'l';
  const bottomSurfKey = arch === 'upper' ? 'p' : 'v';
  const leftSurfKey = side === 'right' ? 'd' : 'm';
  const rightSurfKey = side === 'right' ? 'm' : 'd';
  const centerSurfKey = 'o';

  const getColor = (surf) => {
    const code = toothSurfaces[surf];
    return code && ODONTO_TOOLS[code] ? ODONTO_TOOLS[code].color : '#ffffff';
  };

  const isExtracted = toothState === 'extraccion';
  const isCorona = toothState === 'corona';
  const isEndo = toothState === 'endodoncia';
  const isProtesis = toothState === 'protesis';

  return `
    <div class="msp-tooth-cell" data-tooth="${num}">
      <svg class="msp-tooth-svg permanent ${toothState ? 'tooth-' + toothState : ''}" viewBox="0 0 36 36" data-tooth="${num}">
        <!-- Cara Superior (Vestibular / Lingual) -->
        <polygon class="msp-surface" data-tooth="${num}" data-surface="${topSurfKey}" points="0,0 36,0 27,9 9,9" fill="${getColor(topSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Cara Derecha -->
        <polygon class="msp-surface" data-tooth="${num}" data-surface="${rightSurfKey}" points="36,0 36,36 27,27 27,9" fill="${getColor(rightSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Cara Inferior (Palatino / Vestibular) -->
        <polygon class="msp-surface" data-tooth="${num}" data-surface="${bottomSurfKey}" points="36,36 0,36 9,27 27,27" fill="${getColor(bottomSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Cara Izquierda -->
        <polygon class="msp-surface" data-tooth="${num}" data-surface="${leftSurfKey}" points="0,36 0,0 9,9 9,27" fill="${getColor(leftSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Cara Oclusal / Central -->
        <polygon class="msp-surface center" data-tooth="${num}" data-surface="${centerSurfKey}" points="9,9 27,9 27,27 9,27" fill="${getColor(centerSurfKey)}" stroke="#334155" stroke-width="1.2" />

        ${isCorona ? `<rect x="1" y="1" width="34" height="34" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3,2" />` : ''}
        ${isEndo ? `<line x1="18" y1="2" x2="18" y2="34" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" />` : ''}
        ${isProtesis ? `<rect x="2" y="2" width="32" height="32" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="2" />` : ''}
        ${isExtracted ? `<line x1="2" y1="2" x2="34" y2="34" stroke="#dc2626" stroke-width="2.5" /><line x1="34" y1="2" x2="2" y2="34" stroke="#dc2626" stroke-width="2.5" />` : ''}
      </svg>
    </div>
  `;
}

/**
 * Renderiza una pieza temporal / decidua (círculo/dona anatómica de 5 caras)
 */
function renderDeciduousToothSvg(num, data, arch, side) {
  const toothSurfaces = data.surfaces[num] || {};
  const toothState = data.teeth[num] || '';

  const topSurfKey = arch === 'upper' ? 'v' : 'l';
  const bottomSurfKey = arch === 'upper' ? 'p' : 'v';
  const leftSurfKey = side === 'right' ? 'd' : 'm';
  const rightSurfKey = side === 'right' ? 'm' : 'd';
  const centerSurfKey = 'o';

  const getColor = (surf) => {
    const code = toothSurfaces[surf];
    return code && ODONTO_TOOLS[code] ? ODONTO_TOOLS[code].color : '#ffffff';
  };

  const isExtracted = toothState === 'extraccion';
  const isCorona = toothState === 'corona';
  const isEndo = toothState === 'endodoncia';
  const isProtesis = toothState === 'protesis';

  return `
    <div class="msp-tooth-cell decidua-cell" data-tooth="${num}">
      <svg class="msp-tooth-svg decidua ${toothState ? 'tooth-' + toothState : ''}" viewBox="0 0 36 36" data-tooth="${num}">
        <!-- Segmento Superior -->
        <path class="msp-surface" data-tooth="${num}" data-surface="${topSurfKey}" d="M 5.27,5.27 A 18 18 0 0 1 30.73,5.27 L 23.3,12.7 A 7.5 7.5 0 0 0 12.7,12.7 Z" fill="${getColor(topSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Segmento Derecho -->
        <path class="msp-surface" data-tooth="${num}" data-surface="${rightSurfKey}" d="M 30.73,5.27 A 18 18 0 0 1 30.73,30.73 L 23.3,23.3 A 7.5 7.5 0 0 0 23.3,12.7 Z" fill="${getColor(rightSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Segmento Inferior -->
        <path class="msp-surface" data-tooth="${num}" data-surface="${bottomSurfKey}" d="M 30.73,30.73 A 18 18 0 0 1 5.27,30.73 L 12.7,23.3 A 7.5 7.5 0 0 0 23.3,23.3 Z" fill="${getColor(bottomSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Segmento Izquierdo -->
        <path class="msp-surface" data-tooth="${num}" data-surface="${leftSurfKey}" d="M 5.27,30.73 A 18 18 0 0 1 5.27,5.27 L 12.7,12.7 A 7.5 7.5 0 0 0 12.7,23.3 Z" fill="${getColor(leftSurfKey)}" stroke="#334155" stroke-width="1.2" />
        
        <!-- Círculo Central (Oclusal) -->
        <circle class="msp-surface center" data-tooth="${num}" data-surface="${centerSurfKey}" cx="18" cy="18" r="7.5" fill="${getColor(centerSurfKey)}" stroke="#334155" stroke-width="1.2" />

        ${isCorona ? `<circle cx="18" cy="18" r="17" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3,2" />` : ''}
        ${isEndo ? `<line x1="18" y1="2" x2="18" y2="34" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" />` : ''}
        ${isProtesis ? `<circle cx="18" cy="18" r="16" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="2" />` : ''}
        ${isExtracted ? `<line x1="4" y1="4" x2="32" y2="32" stroke="#dc2626" stroke-width="2.5" /><line x1="32" y1="4" x2="4" y2="32" stroke="#dc2626" stroke-width="2.5" />` : ''}
      </svg>
    </div>
  `;
}

/**
 * Renderiza el panel de resumen de índices CPO-D y ceod
 */
function renderCpoSummary(data) {
  const permanentTeeth = [
    18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
    48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38
  ];
  const deciduousTeeth = [
    55,54,53,52,51,61,62,63,64,65,
    85,84,83,82,81,71,72,73,74,75
  ];

  // Cálculo CPO-D (Permanente)
  let cPerm = 0, pPerm = 0, oPerm = 0;
  permanentTeeth.forEach(t => {
    const tState = data.teeth[t];
    const sMap = data.surfaces[t] || {};
    const hasCaries = Object.values(sMap).includes('caries');
    const hasObt = Object.values(sMap).includes('obturacion');

    if (tState === 'extraccion') {
      pPerm++;
    } else if (hasCaries) {
      cPerm++;
    } else if (hasObt) {
      oPerm++;
    }
  });
  const totalCpo = cPerm + pPerm + oPerm;

  // Cálculo ceod (Temporal)
  let cTemp = 0, eTemp = 0, oTemp = 0;
  deciduousTeeth.forEach(t => {
    const tState = data.teeth[t];
    const sMap = data.surfaces[t] || {};
    const hasCaries = Object.values(sMap).includes('caries');
    const hasObt = Object.values(sMap).includes('obturacion');

    if (tState === 'extraccion') {
      eTemp++;
    } else if (hasCaries) {
      cTemp++;
    } else if (hasObt) {
      oTemp++;
    }
  });
  const totalCeod = cTemp + eTemp + oTemp;

  return `
    <div class="msp-cpo-group">
      <span class="msp-cpo-title"><i class="fas fa-calculator"></i> Índice CPO-D:</span>
      <span class="msp-cpo-badge c"><span class="lbl">C:</span> <strong>${cPerm}</strong></span>
      <span class="msp-cpo-badge p"><span class="lbl">P:</span> <strong>${pPerm}</strong></span>
      <span class="msp-cpo-badge o"><span class="lbl">O:</span> <strong>${oPerm}</strong></span>
      <span class="msp-cpo-badge total"><span class="lbl">Total CPO-D:</span> <strong>${totalCpo}</strong></span>
    </div>
    <div class="msp-cpo-divider"></div>
    <div class="msp-cpo-group">
      <span class="msp-cpo-title">Índice ceod:</span>
      <span class="msp-cpo-badge c"><span class="lbl">c:</span> <strong>${cTemp}</strong></span>
      <span class="msp-cpo-badge p"><span class="lbl">e:</span> <strong>${eTemp}</strong></span>
      <span class="msp-cpo-badge o"><span class="lbl">o:</span> <strong>${oTemp}</strong></span>
      <span class="msp-cpo-badge total"><span class="lbl">Total ceod:</span> <strong>${totalCeod}</strong></span>
    </div>
  `;
}

/**
 * Asigna los eventos de interacción y sincronización
 */
function attachOdontogramEvents(container, patient, data) {
  // 1. Selector de Herramienta de Paleta
  container.querySelectorAll('.msp-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.msp-tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  // 2. Click sobre Caras de Dientes
  container.querySelectorAll('.msp-surface').forEach(surf => {
    surf.addEventListener('click', (e) => {
      e.stopPropagation();
      const toothNum = surf.dataset.tooth;
      const surfKey = surf.dataset.surface;

      if (!data.surfaces[toothNum]) data.surfaces[toothNum] = {};

      if (currentTool === 'sano') {
        delete data.surfaces[toothNum][surfKey];
        if (Object.keys(data.surfaces[toothNum]).length === 0) {
          delete data.surfaces[toothNum];
        }
        surf.setAttribute('fill', '#ffffff');
      } else if (currentTool === 'extraccion' || currentTool === 'corona' || currentTool === 'endodoncia' || currentTool === 'protesis') {
        data.teeth[toothNum] = currentTool;
        refreshSingleTooth(container, toothNum, data);
      } else {
        data.surfaces[toothNum][surfKey] = currentTool;
        surf.setAttribute('fill', ODONTO_TOOLS[currentTool].color);
      }

      updateCpoBar(container, data);
      triggerAutoSave(container, patient, data);
    });
  });

  // 3. Click sobre Número de Diente (Opciones Rápidas de Pieza)
  container.querySelectorAll('.msp-tooth-num').forEach(numEl => {
    numEl.addEventListener('click', () => {
      const toothNum = numEl.dataset.tooth;
      openToothOptionsModal(toothNum, patient, data, container);
    });
  });

  // 4. Inputs de Recesión y Movilidad
  container.querySelectorAll('.recesion-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const tooth = inp.dataset.tooth;
      data.recesion[tooth] = inp.value.trim();
      triggerAutoSave(container, patient, data);
    });
  });

  container.querySelectorAll('.movilidad-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const tooth = inp.dataset.tooth;
      data.movilidad[tooth] = inp.value.trim();
      triggerAutoSave(container, patient, data);
    });
  });

  // 5. Textarea de Notas
  const notesArea = container.querySelector('#odontoNotesInput');
  if (notesArea) {
    notesArea.addEventListener('input', () => {
      data.notes = notesArea.value;
      triggerAutoSave(container, patient, data);
    });
  }

  // 6. Botón Guardar Manual
  const saveBtn = container.querySelector('#odontoSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      await saveOdontogramData(container, patient, data, true);
    });
  }

  // 7. Botón Limpiar Todo
  const resetBtn = container.querySelector('#odontoResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Desea limpiar todas las marcas, recesiones y movilidades del odontograma?')) {
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
}

/**
 * Re-renderiza una pieza individual para reflejar estados como Extracción, Corona, etc.
 */
function refreshSingleTooth(container, toothNum, data) {
  const cell = container.querySelector(`.msp-tooth-cell[data-tooth="${toothNum}"]`);
  if (!cell) return;

  const num = parseInt(toothNum, 10);
  const isDecidua = num >= 51 && num <= 85;
  const isUpper = (num >= 11 && num <= 28) || (num >= 51 && num <= 65);
  const isRight = (num >= 11 && num <= 18) || (num >= 51 && num <= 55) || (num >= 81 && num <= 85) || (num >= 41 && num <= 48);

  const arch = isUpper ? 'upper' : 'lower';
  const side = isRight ? 'right' : 'left';

  let newHtml = '';
  if (isDecidua) {
    newHtml = renderDeciduousToothSvg(num, data, arch, side);
  } else {
    newHtml = renderPermanentToothSvg(num, data, arch, side);
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = newHtml;
  const newCell = tempDiv.firstElementChild;
  cell.replaceWith(newCell);

  newCell.querySelectorAll('.msp-surface').forEach(surf => {
    surf.addEventListener('click', (e) => {
      e.stopPropagation();
      const tNum = surf.dataset.tooth;
      const sKey = surf.dataset.surface;

      if (!data.surfaces[tNum]) data.surfaces[tNum] = {};

      if (currentTool === 'sano') {
        delete data.surfaces[tNum][sKey];
        if (Object.keys(data.surfaces[tNum]).length === 0) {
          delete data.surfaces[tNum];
        }
        delete data.teeth[tNum];
        refreshSingleTooth(container, tNum, data);
      } else if (currentTool === 'extraccion' || currentTool === 'corona' || currentTool === 'endodoncia' || currentTool === 'protesis') {
        data.teeth[tNum] = currentTool;
        refreshSingleTooth(container, tNum, data);
      } else {
        data.surfaces[tNum][sKey] = currentTool;
        surf.setAttribute('fill', ODONTO_TOOLS[currentTool].color);
      }

      updateCpoBar(container, data);
      triggerAutoSave(container, patient, data);
    });
  });
}

/**
 * Actualiza la barra de índices CPO-D
 */
function updateCpoBar(container, data) {
  const bar = container.querySelector('#mspCpoBar');
  if (bar) {
    bar.innerHTML = renderCpoSummary(data);
  }
}

/**
 * Guardado automático con debounce
 */
function triggerAutoSave(container, patient, data) {
  const statusBadge = container.querySelector('#odontoSaveStatus');
  if (statusBadge) {
    statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    statusBadge.className = 'msp-save-badge saving';
  }

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveOdontogramData(container, patient, data, false);
  }, 1200);
}

/**
 * Persiste los datos en la base de datos vía API
 */
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
      statusBadge.className = 'msp-save-badge';
    }

    if (isExplicit) {
      showToast('Odontograma guardado correctamente', 'success');
    }
  } catch (err) {
    console.error('Error al guardar odontograma:', err);
    if (statusBadge) {
      statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error al sincronizar';
      statusBadge.className = 'msp-save-badge error';
    }
    if (isExplicit) {
      showToast('Error al guardar datos del odontograma', 'error');
    }
  }
}

/**
 * Modal de Opciones Rápidas para una Pieza Dental Específica
 */
function openToothOptionsModal(toothNum, patient, data, container) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  const currentState = data.teeth[toothNum] || 'sano';
  const recVal = data.recesion[toothNum] || '';
  const movVal = data.movilidad[toothNum] || '';

  modal.innerHTML = `
    <div class="modal-body" style="max-width: 440px;">
      <div class="modal-head">
        <div>
          <p class="muted" style="margin:0; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--primary); font-weight:700;">Pieza Dental</p>
          <h3 style="margin:2px 0 0;">Opciones Pieza #${toothNum}</h3>
        </div>
        <button class="ghost close-tooth-modal"><i class="fas fa-times"></i></button>
      </div>

      <div style="margin:16px 0; display:grid; gap:12px;">
        <div>
          <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:6px;">Estado General de la Pieza:</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <button type="button" class="ghost tooth-opt-btn ${currentState === 'sano' ? 'active' : ''}" data-state="sano">
              <i class="fas fa-check" style="color:#10b981;"></i> Sano / Normal
            </button>
            <button type="button" class="ghost tooth-opt-btn ${currentState === 'extraccion' ? 'active' : ''}" data-state="extraccion">
              <i class="fas fa-times" style="color:#ef4444;"></i> Extraída / Ausente
            </button>
            <button type="button" class="ghost tooth-opt-btn ${currentState === 'corona' ? 'active' : ''}" data-state="corona">
              <i class="fas fa-crown" style="color:#f59e0b;"></i> Corona Completa
            </button>
            <button type="button" class="ghost tooth-opt-btn ${currentState === 'endodoncia' ? 'active' : ''}" data-state="endodoncia">
              <i class="fas fa-bolt" style="color:#8b5cf6;"></i> Endodoncia
            </button>
            <button type="button" class="ghost tooth-opt-btn ${currentState === 'protesis' ? 'active' : ''}" data-state="protesis">
              <i class="fas fa-teeth" style="color:#10b981;"></i> Prótesis Fija/Rem.
            </button>
            <button type="button" class="ghost tooth-opt-btn" data-state="clear-all" style="color:var(--danger);">
              <i class="fas fa-eraser"></i> Limpiar Caras
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:var(--bg-page); padding:10px; border-radius:8px;">
          <div>
            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">Recesión (mm):</label>
            <input type="text" id="modalRecInput" class="field-input" value="${recVal}" placeholder="Ej: 1" style="height:34px;">
          </div>
          <div>
            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">Movilidad (0-3):</label>
            <input type="text" id="modalMovInput" class="field-input" value="${movVal}" placeholder="Ej: 0" style="height:34px;">
          </div>
        </div>
      </div>

      <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="ghost close-tooth-modal">Cancelar</button>
        <button class="primary" id="modalApplyToothBtn">Aplicar Cambios</button>
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

  modal.querySelector('#modalApplyToothBtn')?.addEventListener('click', () => {
    if (selectedState === 'clear-all') {
      delete data.surfaces[toothNum];
      delete data.teeth[toothNum];
    } else if (selectedState === 'sano') {
      delete data.teeth[toothNum];
    } else {
      data.teeth[toothNum] = selectedState;
    }

    const newRec = modal.querySelector('#modalRecInput')?.value.trim();
    const newMov = modal.querySelector('#modalMovInput')?.value.trim();
    if (newRec) data.recesion[toothNum] = newRec; else delete data.recesion[toothNum];
    if (newMov) data.movilidad[toothNum] = newMov; else delete data.movilidad[toothNum];

    refreshSingleTooth(container, toothNum, data);
    updateCpoBar(container, data);
    
    // Sincronizar inputs visuales
    const recInp = container.querySelector(`.recesion-input[data-tooth="${toothNum}"]`);
    if (recInp) recInp.value = newRec || '';
    const movInp = container.querySelector(`.movilidad-input[data-tooth="${toothNum}"]`);
    if (movInp) movInp.value = newMov || '';

    triggerAutoSave(container, patient, data);
    closeModal();
    showToast(`Pieza #${toothNum} actualizada`, 'info');
  });
}
