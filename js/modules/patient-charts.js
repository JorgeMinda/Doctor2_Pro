/**
 * patient-charts.js - Gráficos visuales del paciente, Odontograma Interactivo FDI (Adulto/Niño),
 * Resumen clínico, estadísticas de visitas y Línea de tiempo.
 */

export function createPatientDashboard(patient, notes = [], appointments = []) {
  const container = document.createElement('div');
  container.className = 'patient-dashboard';
  
  // Patient Summary Header
  container.appendChild(createPatientSummary(patient, notes, appointments));
  
  // Charts Row
  const chartsRow = document.createElement('div');
  chartsRow.className = 'charts-row';
  chartsRow.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:16px;';
  chartsRow.appendChild(createActivityChart(appointments));
  chartsRow.appendChild(createTreatmentStatus(patient.treatmentPlans || patient.plans || []));
  container.appendChild(chartsRow);
  
  // Interactive Odontogram
  container.appendChild(createOdontogram(notes));
  
  return container;
}

function createPatientSummary(patient, notes, appointments) {
  const patientApts = appointments.filter(a => a.patientId === patient.id || a.patient_id === patient.id);
  const attendedApts = patientApts.filter(a => a.status === 'Atendido' || a.status === 'attended');
  
  const totalVisits = attendedApts.length;
  const lastVisitApt = attendedApts.sort((a, b) => b.date.localeCompare(a.date))[0];
  const lastVisit = lastVisitApt ? formatDateNice(lastVisitApt.date) : 'Sin visitas';
  
  const _now = new Date();
  const _todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const futureApts = patientApts.filter(a => 
    a.date >= _todayStr && 
    !['Cancelado', 'cancelled', 'Atendido', 'attended', 'Ausente'].includes(a.status)
  ).sort((a, b) => a.date.localeCompare(b.date));
  const nextApt = futureApts[0];
  const nextVisit = nextApt ? `${formatDateNice(nextApt.date)} ${nextApt.time || ''}` : 'Sin turno programado';
  
  const avgTime = calculateAvgTimeBetweenVisits(attendedApts);
  const latestNoteWithControl = notes.find(n => n.proximoControl);
  const proximoControl = latestNoteWithControl ? latestNoteWithControl.proximoControl : null;
  
  const summary = document.createElement('div');
  summary.className = 'patient-summary-card';
  summary.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;';
  
  summary.innerHTML = `
    <div class="summary-header" style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <div class="summary-avatar avatar" style="width:48px; height:48px; font-size:1.2rem;"><i class="fas fa-user"></i></div>
      <div class="summary-info">
        <h3 style="margin:0;">${patient.name}</h3>
        <p class="muted" style="margin:2px 0 0; font-size:0.85rem;">${patient.phone || ''} · ${patient.email || ''}</p>
        <p class="muted" style="margin:2px 0 0; font-size:0.85rem;">${patient.age ? patient.age + ' años' : ''} ${patient.health_insurance || patient.insurance ? '· ' + (patient.health_insurance || patient.insurance) : ''}</p>
      </div>
    </div>
    <div class="summary-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
      <div class="stat-item" style="background:var(--bg-page); padding:10px; border-radius:8px; text-align:center;">
        <div class="stat-value" style="font-size:1.4rem; font-weight:700; color:var(--primary);">${totalVisits}</div>
        <div class="stat-label muted" style="font-size:0.75rem;">Visitas totales</div>
      </div>
      <div class="stat-item" style="background:var(--bg-page); padding:10px; border-radius:8px; text-align:center;">
        <div class="stat-value" style="font-size:1rem; font-weight:600;">${lastVisit}</div>
        <div class="stat-label muted" style="font-size:0.75rem;">Última visita</div>
      </div>
      <div class="stat-item" style="background:var(--bg-page); padding:10px; border-radius:8px; text-align:center;">
        <div class="stat-value" style="font-size:1rem; font-weight:600;">${avgTime}</div>
        <div class="stat-label muted" style="font-size:0.75rem;">Frecuencia visitas</div>
      </div>
      <div class="stat-item" style="background:var(--bg-page); padding:10px; border-radius:8px; text-align:center;">
        <div class="stat-value" style="font-size:0.95rem; font-weight:600; color:var(--success);">${nextVisit}</div>
        <div class="stat-label muted" style="font-size:0.75rem;">Próxima cita</div>
      </div>
    </div>
  `;
  
  return summary;
}

function createActivityChart(appointments) {
  const card = document.createElement('div');
  card.className = 'chart-card';
  card.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px;';
  
  card.innerHTML = `
    <div class="chart-header" style="margin-bottom:12px;">
      <h4 style="font-size:0.95rem;"><i class="fas fa-chart-line" style="color:var(--primary);"></i> Actividad del Paciente</h4>
      <p class="muted" style="font-size:0.8rem; margin:0;">Visitas realizadas en los últimos 12 meses</p>
    </div>
    <div class="activity-chart-container" style="height:120px; display:flex; align-items:flex-end; gap:4px; padding-top:10px;"></div>
  `;
  
  const chartContainer = card.querySelector('.activity-chart-container');
  const months = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'narrow' })
    });
  }
  
  const visitsByMonth = {};
  months.forEach(m => visitsByMonth[m.key] = 0);
  
  appointments
    .filter(a => a.status === 'Atendido' || a.status === 'attended')
    .forEach(a => {
      const monthKey = (a.date || '').slice(0, 7);
      if (visitsByMonth.hasOwnProperty(monthKey)) {
        visitsByMonth[monthKey]++;
      }
    });
  
  const maxVisits = Math.max(1, ...Object.values(visitsByMonth));
  
  months.forEach(m => {
    const count = visitsByMonth[m.key];
    const height = (count / maxVisits) * 100;
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;';
    
    barWrap.innerHTML = `
      <div style="width:100%; max-width:16px; height:${Math.max(6, height)}%; background:${count > 0 ? 'var(--primary)' : 'var(--border)'}; border-radius:3px 3px 0 0;" title="${count} visitas en ${m.key}"></div>
      <span style="font-size:0.65rem; margin-top:4px;" class="muted">${m.label}</span>
    `;
    chartContainer.appendChild(barWrap);
  });
  
  return card;
}

function createTreatmentStatus(plans) {
  const card = document.createElement('div');
  card.className = 'chart-card';
  card.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px;';
  
  const completed = plans.filter(p => p.status === 'Finalizado').length;
  const inProgress = plans.filter(p => p.status === 'En curso').length;
  const pending = plans.filter(p => p.status === 'Pendiente').length;
  const total = Math.max(1, plans.length);
  
  const completedPct = Math.round((completed / total) * 100);
  const inProgressPct = Math.round((inProgress / total) * 100);
  const pendingPct = Math.round((pending / total) * 100);
  
  card.innerHTML = `
    <div class="chart-header" style="margin-bottom:12px;">
      <h4 style="font-size:0.95rem;"><i class="fas fa-tasks" style="color:var(--success);"></i> Estado de Tratamientos</h4>
      <p class="muted" style="font-size:0.8rem; margin:0;">Progreso de planes cargados</p>
    </div>
    <div style="display:flex; align-items:center; gap:16px; justify-content:space-around;">
      <div style="position:relative; width:90px; height:90px;">
        <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform:rotate(-90deg);">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" stroke-width="3"></circle>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--success)" stroke-width="3"
            stroke-dasharray="${completedPct} ${100 - completedPct}"
            stroke-dashoffset="0"></circle>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--warning)" stroke-width="3"
            stroke-dasharray="${inProgressPct} ${100 - inProgressPct}"
            stroke-dashoffset="${-completedPct}"></circle>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" stroke-width="3"
            stroke-dasharray="${pendingPct} ${100 - pendingPct}"
            stroke-dashoffset="${-(completedPct + inProgressPct)}"></circle>
        </svg>
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <span style="font-weight:700; font-size:1.1rem; color:var(--text);">${completedPct}%</span>
          <span style="font-size:0.65rem;" class="muted">Listo</span>
        </div>
      </div>
      <div style="font-size:0.8rem; display:grid; gap:4px;">
        <div><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--success); margin-right:4px;"></span> Finalizado: <strong>${completed}</strong></div>
        <div><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--warning); margin-right:4px;"></span> En curso: <strong>${inProgress}</strong></div>
        <div><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--muted); margin-right:4px;"></span> Pendiente: <strong>${pending}</strong></div>
      </div>
    </div>
  `;
  
  return card;
}

export function createOdontogram(notes) {
  const card = document.createElement('div');
  card.className = 'odontogram-card odontogram-professional';
  card.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-top:16px;';

  const validTeeth = new Set([
    18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
    48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38,
    55,54,53,52,51,61,62,63,64,65,
    85,84,83,82,81,71,72,73,74,75
  ]);

  function getProcedureType(note) {
    const proc = (note.procedimiento || '').toLowerCase();
    const dx = (note.diagnosticoTipo || '').toLowerCase();
    if (proc.includes('corona')) return 'corona';
    if (proc.includes('extracción') || proc.includes('ausente')) return 'extraccion';
    if (proc.includes('implante')) return 'implante';
    if (proc.includes('conducto') || proc.includes('endodoncia')) return 'endodoncia';
    if (proc.includes('perno')) return 'perno';
    if (proc.includes('obturación') || proc.includes('resina') || proc.includes('amalgama')) return 'obturacion';
    if (proc.includes('incrustación')) return 'incrustacion';
    if (proc.includes('carilla')) return 'carilla';
    if (dx.includes('caries') || dx.includes('fractura')) return 'caries';
    if (proc.includes('pendiente') || dx.includes('indicada')) return 'pendiente';
    if (proc.includes('limpieza') || proc.includes('profilaxis')) return 'limpieza';
    if (proc.includes('control')) return 'control';
    return 'tratado';
  }

  const toothHistory = {};
  const toothSurfaceData = {};
  const sortedNotes = [...(notes || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  sortedNotes.forEach(n => {
    if (!n.pieza) return;
    const pieceNum = parseInt(n.pieza, 10);
    if (isNaN(pieceNum) || !validTeeth.has(pieceNum)) return;

    if (!toothHistory[pieceNum]) toothHistory[pieceNum] = [];
    toothHistory[pieceNum].push(n);

    const procType = getProcedureType(n);
    if (!toothSurfaceData[pieceNum]) toothSurfaceData[pieceNum] = {};

    const surfacesRaw = (n.superficie || n.caras || '').trim();
    if (surfacesRaw !== '') {
      const surfaces = surfacesRaw.split(',').map(s => s.trim().toLowerCase());
      surfaces.forEach(surf => {
        if (['o', 'm', 'd', 'v', 'p'].includes(surf) && !toothSurfaceData[pieceNum][surf]) {
          toothSurfaceData[pieceNum][surf] = { status: procType, procedure: n.procedimiento || '', date: n.date || '' };
        }
      });
    } else {
      ['o', 'm', 'd', 'v', 'p'].forEach(surf => {
        if (!toothSurfaceData[pieceNum][surf]) {
          toothSurfaceData[pieceNum][surf] = { status: procType, procedure: n.procedimiento || '', date: n.date || '' };
        }
      });
    }
  });

  const getToothStatus = (toothNum) => {
    if (toothSurfaceData[toothNum] && Object.keys(toothSurfaceData[toothNum]).length > 0) {
      return Object.values(toothSurfaceData[toothNum])[0].status;
    }
    return 'sin-intervencion';
  };

  card.innerHTML = `
    <div class="odontogram-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <div>
        <h4 style="font-size:1rem; margin:0;"><i class="fas fa-tooth" style="color:var(--primary);"></i> Odontograma Clínico Interactivo (FDI)</h4>
        <p class="muted" style="font-size:0.8rem; margin:2px 0 0;">Hacé clic en cualquier cara o pieza para ver historial o cargar tratamientos</p>
      </div>
      <div class="odontogram-type-toggle" style="display:flex; gap:4px; background:var(--bg-page); padding:4px; border-radius:8px;">
        <button type="button" class="ghost odontogram-type-btn active" data-dentition="adult" style="font-size:0.8rem; padding:4px 10px;">Adulto</button>
        <button type="button" class="ghost odontogram-type-btn" data-dentition="child" style="font-size:0.8rem; padding:4px 10px;">Niños</button>
      </div>
    </div>

    <div class="odontogram-main" style="background:var(--bg-page); padding:16px; border-radius:10px; overflow-x:auto;">
      <div class="odontogram-dentition-section" data-dentition-content="adult">
        <div style="display:flex; justify-content:center; gap:16px; margin-bottom:12px;">
          <div style="display:flex; gap:4px;">${createTeethRowHtml([18,17,16,15,14,13,12,11], getToothStatus, toothSurfaceData, 'upper')}</div>
          <div style="width:2px; background:var(--border);"></div>
          <div style="display:flex; gap:4px;">${createTeethRowHtml([21,22,23,24,25,26,27,28], getToothStatus, toothSurfaceData, 'upper')}</div>
        </div>
        <hr style="border:none; border-top:1px dashed var(--border); margin:12px 0;">
        <div style="display:flex; justify-content:center; gap:16px;">
          <div style="display:flex; gap:4px;">${createTeethRowHtml([48,47,46,45,44,43,42,41], getToothStatus, toothSurfaceData, 'lower')}</div>
          <div style="width:2px; background:var(--border);"></div>
          <div style="display:flex; gap:4px;">${createTeethRowHtml([31,32,33,34,35,36,37,38], getToothStatus, toothSurfaceData, 'lower')}</div>
        </div>
      </div>

      <div class="odontogram-dentition-section hidden" data-dentition-content="child">
        <div style="display:flex; justify-content:center; gap:16px; margin-bottom:12px;">
          <div style="display:flex; gap:4px;">${createTeethRowHtml([55,54,53,52,51], getToothStatus, toothSurfaceData, 'upper')}</div>
          <div style="width:2px; background:var(--border);"></div>
          <div style="display:flex; gap:4px;">${createTeethRowHtml([61,62,63,64,65], getToothStatus, toothSurfaceData, 'upper')}</div>
        </div>
        <hr style="border:none; border-top:1px dashed var(--border); margin:12px 0;">
        <div style="display:flex; justify-content:center; gap:16px;">
          <div style="display:flex; gap:4px;">${createTeethRowHtml([85,84,83,82,81], getToothStatus, toothSurfaceData, 'lower')}</div>
          <div style="width:2px; background:var(--border);"></div>
          <div style="display:flex; gap:4px;">${createTeethRowHtml([71,72,73,74,75], getToothStatus, toothSurfaceData, 'lower')}</div>
        </div>
      </div>
    </div>

    <!-- Referencias de Colores -->
    <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:12px; font-size:0.75rem;" class="muted">
      <span><span style="display:inline-block; width:10px; height:10px; background:#3b82f6; border-radius:2px;"></span> Obturación</span>
      <span><span style="display:inline-block; width:10px; height:10px; background:#fbbf24; border-radius:2px;"></span> Corona</span>
      <span><span style="display:inline-block; width:10px; height:10px; background:#f97316; border-radius:2px;"></span> Conducto</span>
      <span><span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius:2px;"></span> Extracción</span>
      <span><span style="display:inline-block; width:10px; height:10px; background:#8b5cf6; border-radius:2px;"></span> Implante</span>
      <span><span style="display:inline-block; width:10px; height:10px; background:#dc2626; border-radius:2px;"></span> Caries</span>
    </div>

    <div id="toothDetail" class="tooth-detail hidden" style="margin-top:16px; background:var(--bg-page); border:1px solid var(--border); border-radius:8px; padding:12px;"></div>
  `;

  setTimeout(() => {
    card.querySelectorAll('.odontogram-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.dentition;
        card.querySelectorAll('.odontogram-type-btn').forEach(b => b.classList.toggle('active', b === btn));
        card.querySelectorAll('.odontogram-dentition-section').forEach(section => {
          section.classList.toggle('hidden', section.dataset.dentitionContent !== target);
        });
      });
    });

    card.querySelectorAll('.tooth-box').forEach(tooth => {
      tooth.addEventListener('click', (e) => {
        const num = tooth.dataset.tooth;
        const history = toothHistory[num] || [];
        showToothDetail(card, num, history);
      });
    });
  }, 0);

  return card;
}

function createTeethRowHtml(teeth, getStatus, surfaceData, arch) {
  const colorMap = {
    'obturacion': '#3b82f6',
    'corona': '#fbbf24',
    'endodoncia': '#f97316',
    'extraccion': '#ef4444',
    'implante': '#8b5cf6',
    'caries': '#dc2626',
    'pendiente': '#facc15',
    'tratado': '#22c55e'
  };

  return teeth.map(num => {
    const status = getStatus(num);
    const hasIssues = status !== 'sin-intervencion';
    const bgFill = colorMap[status] || '#f8fafc';
    const textColor = hasIssues ? '#fff' : 'var(--text)';

    return `
      <div class="tooth-box" data-tooth="${num}" style="cursor:pointer; text-align:center; width:34px;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--muted);">${num}</div>
        <div style="width:32px; height:36px; border:1px solid var(--border); border-radius:4px; background:${bgFill}; color:${textColor}; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; box-shadow:var(--shadow-sm);">
          ${hasIssues ? '●' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function showToothDetail(container, toothNum, history) {
  const detail = container.querySelector('#toothDetail');
  if (!detail) return;

  const historyHtml = history.length > 0 
    ? history.map(n => `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:8px 10px; margin-bottom:6px; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong>📅 ${n.date}</strong>
            ${n.superficie ? `<span class="badge pending">Cara: ${n.superficie}</span>` : ''}
          </div>
          <div><strong style="color:var(--primary);">${n.procedimiento || 'Consulta'}</strong> ${n.diagnosticoTipo ? `(${n.diagnosticoTipo})` : ''}</div>
          ${n.observaciones ? `<div class="muted" style="font-size:0.8rem; margin-top:2px;">${n.observaciones}</div>` : ''}
        </div>
      `).join('')
    : '<p class="muted" style="font-size:0.85rem; margin:4px 0;">Sin tratamientos o intervenciones previas en esta pieza.</p>';

  detail.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <h5 style="margin:0;"><i class="fas fa-tooth"></i> Historial Clínico - Pieza Dental #${toothNum}</h5>
      <button class="ghost close-tooth-detail" style="padding:2px 6px;"><i class="fas fa-times"></i></button>
    </div>
    <div>${historyHtml}</div>
  `;

  detail.classList.remove('hidden');
  detail.querySelector('.close-tooth-detail')?.addEventListener('click', () => {
    detail.classList.add('hidden');
  });
}

function formatDateNice(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calculateAvgTimeBetweenVisits(apts) {
  if (apts.length < 2) return 'N/A';
  const sortedDates = apts.map(a => new Date(a.date)).sort((a, b) => a - b);
  let totalDays = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    totalDays += (sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24);
  }
  const avgDays = Math.round(totalDays / (sortedDates.length - 1));
  if (avgDays < 7) return `${avgDays} días`;
  if (avgDays < 30) return `${Math.round(avgDays / 7)} semanas`;
  return `${Math.round(avgDays / 30)} meses`;
}

export function generateOdontogramHTML(patient, notes = [], prof = {}, clinicName = 'Consultorios.pro') {
  const adultTeethUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const adultTeethLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const notesByTooth = {};
  notes.forEach(n => {
    if (n.pieza) {
      if (!notesByTooth[n.pieza]) notesByTooth[n.pieza] = [];
      notesByTooth[n.pieza].push(n);
    }
  });

  function renderToothBox(num) {
    const toothNotes = notesByTooth[num] || [];
    const hasIssues = toothNotes.length > 0;
    const lastProc = toothNotes[0]?.procedimiento || toothNotes[0]?.diagnosticoTipo || '';
    return `
      <div style="display:inline-block; width:38px; margin:2px; text-align:center; vertical-align:top; font-family:Arial, sans-serif;">
        <div style="font-size:10px; font-weight:bold; color:#475569;">${num}</div>
        <div style="width:32px; height:32px; margin:2px auto; border:1px solid ${hasIssues ? '#ef4444' : '#94a3b8'}; border-radius:4px; background:${hasIssues ? '#fee2e2' : '#f8fafc'}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:${hasIssues ? '#b91c1c' : '#64748b'};">
          ${hasIssues ? '●' : ''}
        </div>
        <div style="font-size:8px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${lastProc}</div>
      </div>
    `;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Odontograma - ${patient.name}</title>
<style>
body{font-family:Arial,sans-serif;margin:30px;color:#1e293b;}
.header{display:flex;justify-content:space-between;border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:20px;}
.patient-box{background:#f1f5f9;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.quadrant-box{text-align:center;padding:16px;background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;}
.tooth-row{display:flex;justify-content:center;flex-wrap:wrap;margin-bottom:8px;}
</style></head><body>
<div class="header">
  <div><h1 style="color:#6366f1;margin:0;font-size:22px;">${clinicName}</h1><p style="margin:4px 0 0;color:#64748b;font-size:12px;">Odontograma y Registro Dental</p></div>
  <div style="text-align:right;font-size:12px;color:#64748b;">Fecha: ${new Date().toLocaleDateString('es-AR')}<br>Profesional: ${prof.name || 'Principal'}</div>
</div>
<div class="patient-box">
  <div><strong>Paciente:</strong> ${patient.name}</div>
  <div><strong>Cédula / ID:</strong> ${patient.dni || '-'}</div>
  <div><strong>Teléfono:</strong> ${patient.phone || '-'}</div>
  <div><strong>Obra Social:</strong> ${patient.health_insurance || patient.insurance || 'Particular'}</div>
</div>
<div class="quadrant-box">
  <div style="font-size:11px;font-weight:bold;color:#64748b;margin-bottom:6px;">Maxilar Superior</div>
  <div class="tooth-row">${adultTeethUpper.map(renderToothBox).join('')}</div>
  <hr style="border:none;border-top:1px dashed #cbd5e1;margin:10px 0;">
  <div class="tooth-row">${adultTeethLower.map(renderToothBox).join('')}</div>
  <div style="font-size:11px;font-weight:bold;color:#64748b;margin-top:6px;">Maxilar Inferior</div>
</div>
</body></html>`;
}
