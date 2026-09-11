/**
 * historia-clinica.js - Evoluciones médicas, planes de tratamiento y radiografías/fotos
 * Compatible con roles: Admin, Médico (edición) y Secretaria (lectura)
 */
import { showToast, apiFetch } from './app-utils.js';

export function createHistoriaClinica(patient, notes = [], plans = [], canEdit = true, onSaveNote, onUpdatePlan) {
  const container = document.createElement('div');
  container.className = 'historia-clinica-card';
  
  const planOptions = plans.map(p => `<option value="${p.id || p.title}">${p.title} · ${p.status}</option>`).join('');
  
  container.innerHTML = `
    <div class="historia-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <p class="muted" style="font-size:0.85rem; margin-bottom:2px;">Historia Clínica Odontológica y Médica</p>
        <h3 style="color:var(--primary);"><i class="fas fa-notes-medical"></i> Evoluciones y Tratamientos</h3>
      </div>
      <div class="badge ${canEdit ? 'attended' : 'pending'}">
        ${canEdit ? '<i class="fas fa-user-md"></i> Modo Profesional (Edición)' : '<i class="fas fa-lock"></i> Solo Lectura'}
      </div>
    </div>
    
    ${canEdit ? `
    <div class="historia-section plan-section" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div class="section-header" style="margin-bottom:12px;">
        <h4 style="font-size:1rem;"><i class="fas fa-clipboard-list" style="color:var(--primary);"></i> Planes de Tratamiento</h4>
      </div>
      <div class="inline-actions plan-form" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        <input id="hcPlanTitle" class="field-input" style="flex:1; min-width:200px;" placeholder="Ej: Tratamiento de conducto molar 36 + Corona">
        <select id="hcPlanStatus" style="width:140px;">
          <option value="Pendiente">Pendiente</option>
          <option value="En curso">En curso</option>
          <option value="Finalizado">Finalizado</option>
        </select>
        <button id="hcAddPlan" class="primary"><i class="fas fa-plus"></i> Agregar Plan</button>
      </div>
      <div id="hcPlanList" class="plan-list"></div>
    </div>
    
    <div class="historia-section attachments-section" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div class="section-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="font-size:1rem;"><i class="fas fa-images" style="color:var(--warning);"></i> Fotos, Estudios y Radiografías</h4>
        <button id="hcShowAttachments" class="ghost" style="font-size:0.85rem;"><i class="fas fa-folder-open"></i> Ver adjuntos (0)</button>
      </div>
      <div id="hcAttachmentsArea" class="attachments-area" style="display:none; margin-top:12px;">
        <div class="upload-zone" style="border:2px dashed var(--border); border-radius:10px; padding:20px; text-align:center; background:var(--bg-page); cursor:pointer;">
          <input type="file" id="hcFileInput" accept="image/*" multiple style="display:none;">
          <label for="hcFileInput" class="upload-label" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px;">
            <i class="fas fa-cloud-upload-alt" style="font-size:2rem; color:var(--primary);"></i>
            <span><strong>Haz click para subir radiografías o fotos clínicas</strong></span>
            <small class="muted">JPG, PNG, WEBP (máx. 15MB por archivo)</small>
          </label>
        </div>
        <div id="hcAttachmentsList" class="attachments-list" style="margin-top:12px;"></div>
      </div>
    </div>
    
    <div class="historia-section evolucion-form" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div class="section-header" style="margin-bottom:12px;">
        <h4 style="font-size:1rem;"><i class="fas fa-edit" style="color:var(--success);"></i> Registrar Nueva Evolución</h4>
      </div>
      <div class="evolucion-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
        <label class="field"><span>Motivo de consulta</span>
          <select id="hcMotivoTipo">
            <option value="Control">Control Periódico</option>
            <option value="Dolor">Dolor / Molestia</option>
            <option value="Post-operatorio">Post-operatorio</option>
            <option value="Limpieza">Limpieza / Profilaxis</option>
            <option value="Urgencia">Urgencia Odontológica</option>
            <option value="Estética">Estética Dental</option>
            <option value="Otro">Otro Motivo</option>
          </select>
        </label>
        <label class="field"><span>Detalle motivo</span>
          <input id="hcMotivoTexto" class="field-input" placeholder="Ej: Dolor agudo en sector posterior">
        </label>
        <label class="field"><span>Diagnóstico</span>
          <select id="hcDxTipo">
            <option value="Caries">Caries</option>
            <option value="Gingivitis">Gingivitis</option>
            <option value="Periodontitis">Periodontitis</option>
            <option value="Endodoncia indicada">Endodoncia indicada</option>
            <option value="Fractura">Fractura Dental</option>
            <option value="Sano">Sano / Sin patología</option>
            <option value="Otro">Otro Diagnóstico</option>
          </select>
        </label>
        <label class="field"><span>Detalle diagnóstico</span>
          <input id="hcDxTexto" class="field-input" placeholder="Detalles de la lesión o estado">
        </label>
        <label class="field"><span>Procedimiento Realizado</span>
          <select id="hcProc">
            <option value="Limpieza">Limpieza / Profilaxis</option>
            <option value="Obturación">Obturación / Composite</option>
            <option value="Extracción">Extracción Simple / Quirúrgica</option>
            <option value="Conducto">Tratamiento de Conducto</option>
            <option value="Corona">Corona / Perno</option>
            <option value="Prótesis">Prótesis Removible / Fija</option>
            <option value="Implante">Implante Dental</option>
            <option value="Incrustación">Incrustación</option>
            <option value="Carilla">Carilla Estética</option>
            <option value="Blanqueamiento">Blanqueamiento</option>
            <option value="Ortodoncia">Ortodoncia (Ajuste/Colocación)</option>
            <option value="Periodoncia">Periodoncia</option>
            <option value="Control">Control y Evolución</option>
            <option value="Urgencia">Urgencia Médica</option>
            <option value="Otro">Otro Procedimiento</option>
          </select>
        </label>
        <label class="field"><span>Pieza dental (11-48)</span>
          <input id="hcPieza" type="number" min="11" max="48" class="field-input" placeholder="Ej: 36">
        </label>
        <label class="field"><span>Superficie / Cara</span>
          <select id="hcSuperficie">
            <option value="">Todas / General</option>
            <option value="O">Oclusal (O)</option>
            <option value="M">Mesial (M)</option>
            <option value="D">Distal (D)</option>
            <option value="V">Vestibular (V)</option>
            <option value="P">Palatino/Lingual (P)</option>
            <option value="O,M">Ocluso-Mesial (OM)</option>
            <option value="O,D">Ocluso-Distal (OD)</option>
            <option value="O,M,D">Mesio-Ocluso-Distal (MOD)</option>
          </select>
        </label>
        <label class="field" style="grid-column:1/-1;"><span>Observaciones Clínicas</span>
          <input id="hcObs" class="field-input" placeholder="Medicamentos suministrados, anestesia utilizada, instrumental...">
        </label>
        <label class="field" style="grid-column:1/-1;"><span>Nota Adicional / Receta</span>
          <input id="hcExtra" class="field-input" placeholder="Indicaciones para el paciente, pautas de alarma...">
        </label>
        <label class="field"><span>Plan Vinculado</span>
          <select id="hcPlan">
            <option value="">Sin plan vinculado</option>
            ${planOptions}
          </select>
        </label>
        <label class="field"><span>Próximo Control</span>
          <input id="hcNext" type="date" class="field-input">
        </label>
        <label class="field">
          <span>¿Agendar turno próximo?</span>
          <select id="hcScheduleNext">
            <option value="no">No programar ahora</option>
            <option value="yes">Sí, agendar ahora</option>
          </select>
        </label>
      </div>
      <div class="evolucion-actions" style="margin-top:16px; display:flex; justify-content:flex-end;">
        <button id="hcSaveNote" class="primary" style="padding:10px 20px;"><i class="fas fa-save"></i> Guardar Evolución</button>
      </div>
      <div id="hcMsg" class="msg" style="margin-top:8px; font-weight:600;"></div>
    </div>
    ` : `
    <div class="historia-section" style="background:var(--bg-page); border:1px dashed var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div class="readonly-notice" style="display:flex; align-items:center; gap:8px; color:var(--muted);">
        <i class="fas fa-info-circle"></i>
        <span>Modo solo lectura. La historia clínica solo puede ser modificada por profesionales médicos / odontólogos.</span>
      </div>
    </div>
    <div class="historia-section attachments-section" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div class="section-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="font-size:1rem;"><i class="fas fa-images"></i> Fotos y Radiografías</h4>
        <button id="hcShowAttachments" class="ghost" style="font-size:0.85rem;"><i class="fas fa-folder-open"></i> Ver adjuntos (0)</button>
      </div>
      <div id="hcAttachmentsArea" class="attachments-area" style="display:none; margin-top:12px;">
        <div id="hcAttachmentsList" class="attachments-list"></div>
      </div>
    </div>
    `}
    
    <div class="historia-section evoluciones-list" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px;">
      <div class="section-header" style="margin-bottom:12px;">
        <h4 style="font-size:1rem;"><i class="fas fa-history" style="color:var(--primary);"></i> Historial de Evoluciones</h4>
      </div>
      <div id="hcNotes"></div>
    </div>
  `;
  
  // Render notes & listeners
  setTimeout(() => {
    renderNotes(container.querySelector('#hcNotes'), notes, plans);
    loadAttachments(patient.id, container, canEdit);
    
    if (canEdit) {
      renderPlanList(container.querySelector('#hcPlanList'), plans, onUpdatePlan);
      
      // Add plan handler
      container.querySelector('#hcAddPlan')?.addEventListener('click', async () => {
        const title = container.querySelector('#hcPlanTitle')?.value.trim();
        const status = container.querySelector('#hcPlanStatus')?.value;
        if (!title) return;
        
        const newPlans = [...plans, { id: 'plan_' + Date.now(), title, status, date: new Date().toISOString().slice(0, 10) }];
        try {
          if (onUpdatePlan) await onUpdatePlan(newPlans);
          container.querySelector('#hcPlanTitle').value = '';
          renderPlanList(container.querySelector('#hcPlanList'), newPlans, onUpdatePlan);
          showToast('Plan de tratamiento agregado', 'success');
        } catch (err) {
          console.error(err);
        }
      });
      
      // Save note handler
      container.querySelector('#hcSaveNote')?.addEventListener('click', async () => {
        const btn = container.querySelector('#hcSaveNote');
        const msgDiv = container.querySelector('#hcMsg');
        
        const payload = {
          patientId: patient.id,
          date: new Date().toISOString().slice(0, 10),
          motivoTipo: container.querySelector('#hcMotivoTipo').value,
          motivoTexto: container.querySelector('#hcMotivoTexto').value.trim(),
          diagnosticoTipo: container.querySelector('#hcDxTipo').value,
          diagnosticoTexto: container.querySelector('#hcDxTexto').value.trim(),
          procedimiento: container.querySelector('#hcProc').value,
          pieza: container.querySelector('#hcPieza').value,
          superficie: container.querySelector('#hcSuperficie').value,
          observaciones: container.querySelector('#hcObs').value.trim(),
          notaAdicional: container.querySelector('#hcExtra').value.trim(),
          proximoControl: container.querySelector('#hcNext').value,
          planId: container.querySelector('#hcPlan').value || null,
          scheduleNext: container.querySelector('#hcScheduleNext').value === 'yes'
        };
        
        try {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
          if (onSaveNote) await onSaveNote(payload);
          msgDiv.textContent = '✓ Evolución clínica guardada correctamente';
          msgDiv.style.color = 'var(--success)';
          
          // Clear form
          container.querySelector('#hcMotivoTexto').value = '';
          container.querySelector('#hcDxTexto').value = '';
          container.querySelector('#hcPieza').value = '';
          container.querySelector('#hcSuperficie').value = '';
          container.querySelector('#hcObs').value = '';
          container.querySelector('#hcExtra').value = '';
          container.querySelector('#hcNext').value = '';
          container.querySelector('#hcScheduleNext').value = 'no';
          
          // Re-render notes
          notes.unshift(payload);
          renderNotes(container.querySelector('#hcNotes'), notes, plans);
          
          if (payload.scheduleNext) {
            import('./app-modal.js').then(m => {
              m.openModal({
                patientId: patient.id,
                patientName: patient.name,
                patientPhone: patient.phone || '',
                date: payload.proximoControl || ''
              });
            });
          }
          
          setTimeout(() => { if (msgDiv) msgDiv.textContent = ''; }, 3000);
        } catch (err) {
          msgDiv.textContent = err.message || 'Error al guardar evolución';
          msgDiv.style.color = 'var(--danger)';
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-save"></i> Guardar Evolución';
        }
      });
    }
  }, 0);
  
  return container;
}

function renderPlanList(container, plans, onUpdatePlan) {
  if (!container) return;
  if (!plans || !plans.length) {
    container.innerHTML = '<div class="muted" style="font-size:0.85rem; padding:8px 0;">No hay planes de tratamiento cargados actualmente.</div>';
    return;
  }
  
  container.innerHTML = '';
  const statuses = ['Pendiente', 'En curso', 'Finalizado'];
  
  plans.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'plan-item';
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-page); border-radius:8px; margin-bottom:6px;';
    
    const statusColor = p.status === 'Finalizado' ? 'var(--success)' : p.status === 'En curso' ? 'var(--warning)' : 'var(--muted)';
    
    row.innerHTML = `
      <div class="plan-info" style="display:flex; align-items:center; gap:8px;">
        <span style="width:10px; height:10px; border-radius:50%; background:${statusColor}; display:inline-block;"></span>
        <strong>${p.title}</strong>
      </div>
      <select class="plan-status-select" data-plan-idx="${idx}" style="font-size:0.85rem; padding:4px 8px;">
        ${statuses.map(st => `<option value="${st}" ${st === p.status ? 'selected' : ''}>${st}</option>`).join('')}
      </select>
    `;
    
    const select = row.querySelector('select');
    select.addEventListener('change', async () => {
      const newPlans = plans.map((pl, i) => i === idx ? { ...pl, status: select.value } : pl);
      try {
        if (onUpdatePlan) await onUpdatePlan(newPlans);
        showToast('Estado del plan actualizado', 'info');
      } catch (err) {
        select.value = p.status;
      }
    });
    
    container.appendChild(row);
  });
}

function renderNotes(container, notes, plans) {
  if (!container) return;
  const planMap = {};
  (plans || []).forEach(p => { planMap[p.id || p.title] = p; });
  
  if (!notes || !notes.length) {
    container.innerHTML = '<div class="muted" style="text-align:center; padding:24px 0;"><i class="fas fa-inbox" style="font-size:1.5rem; margin-bottom:8px; display:block;"></i>Sin evoluciones registradas en la historia clínica.</div>';
    return;
  }
  
  container.innerHTML = '';
  notes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'evolucion-note';
    div.style.cssText = 'background:var(--bg-page); border:1px solid var(--border); border-left:4px solid var(--primary); border-radius:8px; padding:14px; margin-bottom:12px;';
    
    const planTxt = n.planId && planMap[n.planId] 
      ? `<span class="badge" style="margin-top:6px; display:inline-block;"><i class="fas fa-clipboard-list"></i> Plan: ${planMap[n.planId].title}</span>` 
      : '';
    
    div.innerHTML = `
      <div class="note-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong><i class="fas fa-calendar-day" style="color:var(--primary);"></i> ${n.date || 'Sin fecha'}</strong>
        ${n.pieza ? `<span class="badge pending">Pieza Dental #${n.pieza}${n.superficie ? ` (${n.superficie})` : ''}</span>` : ''}
      </div>
      <div class="note-content" style="font-size:0.9rem; display:grid; gap:4px;">
        ${n.motivoTipo ? `<div><strong class="muted">Motivo:</strong> ${n.motivoTipo}${n.motivoTexto ? ' · ' + n.motivoTexto : ''}</div>` : ''}
        ${n.diagnosticoTipo ? `<div><strong class="muted">Diagnóstico:</strong> ${n.diagnosticoTipo}${n.diagnosticoTexto ? ' · ' + n.diagnosticoTexto : ''}</div>` : ''}
        ${n.procedimiento ? `<div><strong class="muted">Procedimiento:</strong> <span style="color:var(--primary-strong); font-weight:600;">${n.procedimiento}</span></div>` : ''}
        ${n.observaciones ? `<div><strong class="muted">Observaciones:</strong> ${n.observaciones}</div>` : ''}
        ${n.notaAdicional ? `<div><strong class="muted">Indicaciones:</strong> ${n.notaAdicional}</div>` : ''}
        ${n.proximoControl ? `<div><strong class="muted">Próximo Control:</strong> <span style="color:var(--warning); font-weight:600;">${n.proximoControl}</span></div>` : ''}
        ${planTxt}
      </div>
    `;
    container.appendChild(div);
  });
}

function parseJsonSafe(text) {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  return JSON.parse(cleanText);
}

async function loadAttachments(patientId, container, canEdit) {
  try {
    const res = await fetch(`api/patients.php?action=get_attachments&patientId=${patientId}`);
    const text = await res.text();
    const data = parseJsonSafe(text);
    
    if (data.success) {
      const count = data.attachments?.length || 0;
      const btn = container.querySelector('#hcShowAttachments');
      if (!btn) return;
      
      btn.innerHTML = `<i class="fas fa-folder-open"></i> Ver adjuntos (${count})`;
      
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        const area = container.querySelector('#hcAttachmentsArea');
        if (area.style.display === 'none') {
          area.style.display = 'block';
          renderAttachments(container.querySelector('#hcAttachmentsList'), data.attachments || [], patientId, canEdit, container);
        } else {
          area.style.display = 'none';
        }
      });
      
      if (canEdit) {
        const fileInput = container.querySelector('#hcFileInput');
        if (fileInput) {
          fileInput.addEventListener('change', (e) => {
            uploadFiles(e.target.files, patientId, container, canEdit);
          });
        }
      }
    }
  } catch (err) {
    console.warn('Attachments loading info:', err);
  }
}

function renderAttachments(listContainer, attachments, patientId, canEdit, parentContainer) {
  if (!attachments || attachments.length === 0) {
    listContainer.innerHTML = '<div class="muted" style="text-align:center; padding:16px 0;">No hay fotos o radiografías adjuntas todavía.</div>';
    return;
  }
  
  listContainer.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px; margin-top:12px;">
      ${attachments.map(att => `
        <div class="attachment-item" data-id="${att.id}" style="background:var(--bg-page); border:1px solid var(--border); border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
          <div class="attachment-preview" style="height:110px; background:#000; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden;">
            <img src="${att.url || att.thumbUrl}" alt="${att.originalName}" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div style="padding:8px; font-size:0.8rem; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${att.originalName}">${att.originalName}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
              <small class="muted">${att.date || ''}</small>
              <div style="display:flex; gap:4px;">
                <button class="ghost view-btn" data-id="${att.id}" style="padding:2px 6px;" title="Ampliar"><i class="fas fa-expand"></i></button>
                ${canEdit ? `<button class="ghost delete-btn" data-id="${att.id}" style="padding:2px 6px; color:var(--danger);" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  listContainer.querySelectorAll('.attachment-preview, .view-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = e.currentTarget.closest('[data-id]').dataset.id;
      const att = attachments.find(x => x.id === id);
      if (att) openLightbox(att);
    });
  });
  
  if (canEdit) {
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const att = attachments.find(x => x.id === id);
        if (confirm(`¿Eliminar la imagen "${att?.originalName || ''}"?`)) {
          await deleteAttachment(id, patientId, parentContainer || listContainer, canEdit);
        }
      });
    });
  }
}

function openLightbox(attachment) {
  const existing = document.querySelector('.lightbox-overlay');
  if (existing) existing.remove();
  
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
  
  overlay.innerHTML = `
    <div style="max-width:90vw; max-height:90vh; display:flex; flex-direction:column; background:var(--surface); border-radius:12px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
      <div style="padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border);">
        <strong>${attachment.originalName}</strong>
        <button class="ghost lightbox-close" style="font-size:1.2rem; cursor:pointer;"><i class="fas fa-times"></i></button>
      </div>
      <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#000; padding:10px; overflow:auto;">
        <img src="${attachment.url || attachment.thumbUrl}" alt="${attachment.originalName}" style="max-width:100%; max-height:75vh; object-fit:contain;">
      </div>
      <div style="padding:10px 16px; display:flex; justify-content:space-between; font-size:0.85rem;" class="muted">
        <span>Fecha: ${attachment.date || new Date().toISOString().slice(0, 10)}</span>
        <a href="${attachment.url || attachment.thumbUrl}" download="${attachment.originalName}" style="color:var(--primary); text-decoration:none;"><i class="fas fa-download"></i> Descargar</a>
      </div>
    </div>
  `;
  
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.lightbox-close')?.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

async function uploadFiles(files, patientId, container, canEdit) {
  if (!files || files.length === 0) return;
  showToast('Subiendo archivo(s)...', 'info');
  
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      try {
        await apiFetch('api/patients.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'save_attachment',
            patientId,
            attachment: {
              id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              originalName: file.name,
              size: file.size,
              type: file.name.toLowerCase().includes('rx') ? 'radiografia' : 'foto',
              url: base64Data,
              date: new Date().toISOString().slice(0, 10)
            }
          })
        });
        showToast(`"${file.name}" subido con éxito`, 'success');
        await loadAttachments(patientId, container, canEdit);
        const area = container.querySelector('#hcAttachmentsArea');
        if (area) area.style.display = 'block';
      } catch (err) {
        showToast('Error al subir imagen', 'error');
      }
    };
    reader.readAsDataURL(file);
  }
}

async function deleteAttachment(attachmentId, patientId, parentContainer, canEdit) {
  try {
    await apiFetch('api/patients.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete_attachment',
        patientId,
        attachmentId
      })
    });
    showToast('Adjunto eliminado', 'info');
    await loadAttachments(patientId, parentContainer, canEdit);
  } catch (err) {
    showToast('Error al eliminar adjunto', 'error');
  }
}
