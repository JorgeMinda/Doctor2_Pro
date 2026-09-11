/**
 * app-odontogram.js - Odontograma Digital Interactivo SVG
 */
import { el, showToast } from './app-utils.js';

export function renderOdontogram(containerId, patient) {
  const container = el(containerId);
  if (!container) return;

  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  container.innerHTML = `
    <div class="odontogram-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h4><i class="fas fa-tooth"></i> Odontograma Clínico</h4>
        <div style="display:flex; gap:8px;">
          <span style="font-size:0.75rem;"><i style="color:#ef4444;" class="fas fa-circle"></i> Caries</span>
          <span style="font-size:0.75rem;"><i style="color:#3b82f6;" class="fas fa-circle"></i> Obturación</span>
          <span style="font-size:0.75rem;"><i style="color:#10b981;" class="fas fa-circle"></i> Sano</span>
        </div>
      </div>

      <div class="arch-container">
        <div class="arch-label" style="font-size:0.8rem; font-weight:600; color:var(--muted);">Arcada Superior</div>
        <div class="dental-arch upper">
          ${upperTeeth.map(t => renderToothSvg(t)).join('')}
        </div>

        <div class="arch-label" style="font-size:0.8rem; font-weight:600; color:var(--muted); margin-top:12px;">Arcada Inferior</div>
        <div class="dental-arch lower">
          ${lowerTeeth.map(t => renderToothSvg(t)).join('')}
        </div>
      </div>
    </div>
  `;

  // Asignar eventos de click a cada cara dental
  container.querySelectorAll('.tooth-svg').forEach(svg => {
    svg.addEventListener('click', (e) => {
      const toothNum = svg.dataset.tooth;
      svg.classList.toggle('has-caries');
      showToast(`Pieza ${toothNum} actualizada`, 'info');
    });
  });
}

function renderToothSvg(num) {
  return `
    <div class="tooth-item">
      <span class="tooth-num">${num}</span>
      <svg class="tooth-svg" data-tooth="${num}" viewBox="0 0 40 40">
        <!-- Vestibular -->
        <polygon points="0,0 40,0 30,10 10,10" />
        <!-- Distal/Mesial -->
        <polygon points="40,0 40,40 30,30 30,10" />
        <!-- Lingual/Palatino -->
        <polygon points="40,40 0,40 10,30 30,30" />
        <!-- Mesial/Distal -->
        <polygon points="0,40 0,0 10,10 10,30" />
        <!-- Oclusal / Central -->
        <polygon class="center" points="10,10 30,10 30,30 10,30" />
      </svg>
    </div>
  `;
}
