/**
 * patient-ficha.js - Ficha de Datos Administrativos del Paciente
 * Permite ver y editar los datos demográficos, cobertura médica y agendar controles sugeridos.
 */
import { showToast, formatDate } from './app-utils.js';

export function createPatientFicha(patient, professionals = [], canEdit = true, onSave) {
  const container = document.createElement('div');
  container.className = 'patient-ficha-card';
  
  const prof = professionals.find(p => p.id === patient.assignedProfessionalId) || { name: 'Sin asignar' };
  
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDateNice(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  container.innerHTML = `
    <div class="ficha-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <p class="muted" style="font-size:0.85rem; margin-bottom:2px;">Ficha Administrativa</p>
        <h3 style="color:var(--primary);"><i class="fas fa-id-card"></i> Datos del Paciente</h3>
      </div>
      ${canEdit ? '<button class="ghost" id="editFichaBtn"><i class="fas fa-edit"></i> Editar Datos</button>' : ''}
    </div>
    
    <div class="ficha-content" id="fichaView" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px;">
      <div class="ficha-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">Nombre y Apellido</label>
          <strong style="font-size:1.05rem;">${escapeHtml(patient.name || '-')}</strong>
        </div>
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">DNI / Documento</label>
          <span>${escapeHtml(patient.dni || '-')}</span>
        </div>
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">Teléfono / WhatsApp</label>
          <span>${patient.phone ? `<a href="https://wa.me/${patient.phone.replace(/\D/g, '')}" target="_blank" style="color:var(--success); text-decoration:none;"><i class="fab fa-whatsapp"></i> ${patient.phone}</a>` : '-'}</span>
        </div>
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">Email</label>
          <span>${escapeHtml(patient.email || '-')}</span>
        </div>
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">Obra Social / Prepaga</label>
          <span class="badge ${patient.health_insurance || patient.insurance ? 'attended' : 'pending'}">${escapeHtml(patient.health_insurance || patient.insurance || 'Particular')}</span>
        </div>
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">N° de Afiliado</label>
          <span>${escapeHtml(patient.affiliate_number || patient.insuranceNumber || '-')}</span>
        </div>
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">Fecha de Nacimiento</label>
          <span>${patient.birthdate || patient.birthDate ? formatDateNice(patient.birthdate || patient.birthDate) : '-'}</span>
        </div>
        <div class="ficha-item">
          <label class="muted" style="font-size:0.8rem; display:block;">Profesional Asignado</label>
          <span><strong>${escapeHtml(prof.name)}</strong></span>
        </div>
        <div class="ficha-item" style="grid-column:1/-1;">
          <label class="muted" style="font-size:0.8rem; display:block;">Dirección / Localidad</label>
          <span>${escapeHtml(patient.address || 'Sin registrar')}</span>
        </div>
        <div class="ficha-item" style="grid-column:1/-1;">
          <label class="muted" style="font-size:0.8rem; display:block;">Alergias o Condiciones Médicas Especiales</label>
          <span style="color:var(--danger); font-weight:600;">${escapeHtml(patient.allergies || 'Ninguna conocida')}</span>
        </div>
        <div class="ficha-item" style="grid-column:1/-1;">
          <label class="muted" style="font-size:0.8rem; display:block;">Observaciones Generales</label>
          <p style="background:var(--bg-page); padding:10px; border-radius:8px; margin-top:4px;">${escapeHtml(patient.notes || patient.generalNotes || 'Sin observaciones')}</p>
        </div>
      </div>
    </div>
    
    <div class="ficha-content hidden" id="fichaEdit" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px;">
      <div class="ficha-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
        <label class="field">
          <span>Nombre completo</span>
          <input type="text" id="fichaName" value="${escapeHtml(patient.name || '')}" class="field-input">
        </label>
        <label class="field">
          <span>DNI</span>
          <input type="text" id="fichaDni" value="${escapeHtml(patient.dni || '')}" class="field-input">
        </label>
        <label class="field">
          <span>Teléfono / WhatsApp</span>
          <input type="tel" id="fichaPhone" value="${escapeHtml(patient.phone || '')}" class="field-input">
        </label>
        <label class="field">
          <span>Email</span>
          <input type="email" id="fichaEmail" value="${escapeHtml(patient.email || '')}" class="field-input">
        </label>
        <label class="field">
          <span>Fecha de nacimiento</span>
          <input type="date" id="fichaBirthDate" value="${patient.birthdate || patient.birthDate || ''}" class="field-input">
        </label>
        <label class="field">
          <span>Obra Social</span>
          <input type="text" id="fichaInsurance" value="${escapeHtml(patient.health_insurance || patient.insurance || '')}" class="field-input" placeholder="Ej: OSDE, Swiss Medical, Particular">
        </label>
        <label class="field">
          <span>N° de Afiliado</span>
          <input type="text" id="fichaInsuranceNumber" value="${escapeHtml(patient.affiliate_number || patient.insuranceNumber || '')}" class="field-input">
        </label>
        <label class="field">
          <span>Profesional asignado</span>
          <select id="fichaProfessional" class="field-input">
            <option value="">Sin asignar</option>
            ${professionals.map(p => `<option value="${p.id}" ${p.id === patient.assignedProfessionalId ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </label>
        <label class="field" style="grid-column:1/-1;">
          <span>Dirección</span>
          <input type="text" id="fichaAddress" value="${escapeHtml(patient.address || '')}" class="field-input">
        </label>
        <label class="field" style="grid-column:1/-1;">
          <span>Alergias / Advertencias Clínicas</span>
          <input type="text" id="fichaAllergies" value="${escapeHtml(patient.allergies || '')}" class="field-input" placeholder="Ej: Penicilina, Látex, Hipertenso">
        </label>
        <label class="field" style="grid-column:1/-1;">
          <span>Observaciones generales</span>
          <textarea id="fichaGeneralNotes" class="field-input" rows="2">${escapeHtml(patient.notes || patient.generalNotes || '')}</textarea>
        </label>
      </div>
      <div class="ficha-actions" style="margin-top:16px; display:flex; justify-content:flex-end; gap:8px;">
        <button id="cancelFichaBtn" class="ghost">Cancelar</button>
        <button id="saveFichaBtn" class="primary"><i class="fas fa-save"></i> Guardar Cambios</button>
      </div>
      <div id="fichaMsg" class="msg" style="margin-top:8px;"></div>
    </div>
  `;
  
  // Event handlers
  setTimeout(() => {
    const editBtn = container.querySelector('#editFichaBtn');
    const viewDiv = container.querySelector('#fichaView');
    const editDiv = container.querySelector('#fichaEdit');
    const saveBtn = container.querySelector('#saveFichaBtn');
    const cancelBtn = container.querySelector('#cancelFichaBtn');
    const msgDiv = container.querySelector('#fichaMsg');
    
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        viewDiv.classList.add('hidden');
        editDiv.classList.remove('hidden');
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editDiv.classList.add('hidden');
        viewDiv.classList.remove('hidden');
      });
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const data = {
          id: patient.id,
          name: container.querySelector('#fichaName').value.trim(),
          phone: container.querySelector('#fichaPhone').value.trim(),
          email: container.querySelector('#fichaEmail').value.trim(),
          dni: container.querySelector('#fichaDni').value.trim(),
          birthdate: container.querySelector('#fichaBirthDate').value,
          health_insurance: container.querySelector('#fichaInsurance').value.trim(),
          affiliate_number: container.querySelector('#fichaInsuranceNumber').value.trim(),
          address: container.querySelector('#fichaAddress').value.trim(),
          allergies: container.querySelector('#fichaAllergies').value.trim(),
          assignedProfessionalId: container.querySelector('#fichaProfessional').value || null,
          notes: container.querySelector('#fichaGeneralNotes').value.trim()
        };
        
        try {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
          if (onSave) await onSave(data);
          Object.assign(patient, data);
          showToast('Ficha actualizada correctamente', 'success');
          editDiv.classList.add('hidden');
          viewDiv.classList.remove('hidden');
        } catch (err) {
          msgDiv.textContent = err.message || 'Error al guardar';
          msgDiv.style.color = 'var(--danger)';
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        }
      });
    }
  }, 0);
  
  return container;
}
