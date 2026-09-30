/**
 * app-patients.js - Gestión de Pacientes, Ficha Médica e Historia Clínica
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast, calculateAge } from './app-utils.js';
import { renderOdontogram } from './app-odontogram.js';

export async function loadPatients() {
  try {
    const data = await apiFetch(api.patients);
    state.patients = data.patients || [];
    renderPatients();
  } catch (err) {
    console.warn('Error al cargar pacientes:', err);
  }
}

export function renderPatients() {
  const tbody = el('patientsTable');
  const searchInput = el('patientSearch');
  if (!tbody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filtered = state.patients.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.dni && p.dni.includes(query)) ||
    (p.phone && p.phone.includes(query))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No se encontraron pacientes</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr style="cursor:pointer;" class="${state.selectedPatient?.id === p.id ? 'active-row' : ''}" onclick="window.selectPatient('${p.id}')">
      <td><strong>${p.name}</strong></td>
      <td>${p.dni || '-'}</td>
      <td>${p.phone || '-'}</td>
      <td>${p.email || '-'}</td>
      <td>${calculateAge(p.birthdate || p.age)}</td>
      <td>${p.emergencyPhone ? `${p.emergencyName ? p.emergencyName + ': ' : ''}${p.emergencyPhone}` : (p.emergencyName || p.emergencyContact || '-')}</td>
      <td>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="ghost" style="padding:4px 8px; font-size:11px;" title="Ver Historia Clínica" onclick="event.stopPropagation(); window.selectPatient('${p.id}', 'historia')">
            <i class="fas fa-notes-medical" style="color:var(--primary);"></i> Historia
          </button>
          <button class="ghost" style="padding:4px 8px; font-size:11px;" title="Editar Datos" onclick="event.stopPropagation(); window.openEditPatient('${p.id}')">
            <i class="fas fa-edit" style="color:var(--text);"></i>
          </button>
          <button class="ghost" style="padding:4px 8px; font-size:11px; color:var(--danger);" title="Eliminar Paciente" onclick="event.stopPropagation(); window.confirmDeletePatient('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

export function backToPatientList() {
  state.selectedPatient = null;
  const listHead = el('patientsListHead');
  const tableContainer = el('patientsTableContainer');
  const detailContainer = el('patientDetail');

  if (listHead) listHead.classList.remove('hidden');
  if (tableContainer) tableContainer.classList.remove('hidden');
  if (detailContainer) {
    detailContainer.classList.add('hidden');
    detailContainer.innerHTML = '<div class="empty">Seleccioná un paciente de la lista para ver su ficha clínica y odontograma.</div>';
  }
  renderPatients();
}
window.backToPatientList = backToPatientList;

export async function selectPatient(patientId, defaultTab = 'historia') {
  try {
    const data = await apiFetch(`${api.patients}?id=${patientId}`);
    if (data.patient) {
      const inList = state.patients.find(p => p.id === patientId);
      if (inList?.birthdate && !data.patient.birthdate) {
        data.patient.birthdate = inList.birthdate;
      }
      if (inList?.age && !data.patient.age) {
        data.patient.age = inList.age;
      }
      state.selectedPatient = data.patient;
      
      // Ocultar la tabla de pacientes y su cabezal para mostrar la ficha completa
      const listHead = el('patientsListHead');
      const tableContainer = el('patientsTableContainer');
      const detailContainer = el('patientDetail');

      if (listHead) listHead.classList.add('hidden');
      if (tableContainer) tableContainer.classList.add('hidden');
      if (detailContainer) detailContainer.classList.remove('hidden');

      renderPatients();
      renderPatientDetail(data.patient, defaultTab);
      
      // Asegurar scroll suave hacia arriba en la vista del paciente
      const mainContainer = document.querySelector('.main-content') || window;
      if (mainContainer.scrollTo) {
        mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  } catch (err) {
    showToast('No se pudo cargar la ficha del paciente', 'error');
  }
}
window.selectPatient = selectPatient;

export function renderPatientDetail(patient, initialTab = 'historia') {
  const container = el('patientDetail');
  if (!container) return;

  const emergencyInfo = patient.emergencyPhone
    ? `${patient.emergencyName ? patient.emergencyName + ' (' + patient.emergencyPhone + ')' : patient.emergencyPhone}`
    : (patient.emergencyName || patient.emergencyContact || 'Sin registrar');

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px; border-bottom:1px solid var(--border); padding-bottom:16px;">
      <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
        <button class="ghost" onclick="window.backToPatientList()" title="Volver al padrón de pacientes" style="font-weight:700; font-size:0.88rem; display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:8px; background:var(--bg-page); border:1px solid var(--border); color:var(--text); cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:all 0.2s;">
          <i class="fas fa-arrow-left" style="color:var(--primary);"></i> Volver a la Lista
        </button>
        <div style="border-left:2px solid var(--border); height:28px;"></div>
        <div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <h3 style="margin:0; color:var(--primary); font-size:1.35rem; font-weight:800;">${patient.name}</h3>
            <span class="badge ${patient.status || 'active'}" style="font-size:0.75rem; text-transform:capitalize; padding:2px 8px;">${patient.status || 'Activo'}</span>
            <span class="badge primary" style="font-size:0.75rem; font-weight:700; padding:2px 8px; background:rgba(99,102,241,0.12); color:var(--primary); border:1px solid rgba(99,102,241,0.25);">HISTORIA CLÍNICA Nro: ${patient.hcNumber || patient.hc_number || (patient.id ? patient.id.replace('pat-', 'HC-').toUpperCase() : 'HC-001')}</span>
          </div>
          <p class="muted" style="margin:3px 0 0 0; font-size:0.84rem;">
            Cédula / ID: <strong style="color:var(--text);">${patient.dni || 'Sin registrar'}</strong> · 
            Edad: <strong style="color:var(--text);">${calculateAge(patient.birthdate || patient.age)}</strong> · 
            Género: <strong style="color:var(--text);">${patient.sex || '-'}</strong> · 
            Tel: <strong style="color:var(--text);">${patient.phone || '-'}</strong> · 
            Contacto Emergencia: <strong style="color:var(--primary);">${emergencyInfo}</strong>
          </p>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="ghost" style="font-size:0.85rem;" onclick="window.openEditPatient('${patient.id}')" title="Editar datos del paciente"><i class="fas fa-edit"></i> Editar</button>
        <button class="ghost" style="font-size:0.85rem; color:var(--primary); font-weight:600;" onclick="window.openCertificateModal()" title="Generar Certificado de Asistencia y Atención Médica"><i class="fas fa-certificate"></i> Certificado</button>
        <button class="ghost" style="font-size:0.85rem; color:var(--danger); border-color:rgba(239,68,68,0.3);" onclick="window.confirmDeletePatient('${patient.id}', '${patient.name.replace(/'/g, "\\'")}')" title="Eliminar paciente"><i class="fas fa-trash-alt"></i> Eliminar</button>
        <button class="ghost" style="font-size:0.85rem;" onclick="window.openPatientExportModal()"><i class="fas fa-share-alt"></i> Exportar / Imprimir</button>
        <button class="primary" style="font-size:0.85rem;" onclick="window.quickNewAptForPatient('${patient.id}', '${patient.name.replace(/'/g, "\\'")}', '${patient.phone || ''}')"><i class="fas fa-calendar-plus"></i> Dar turno</button>
      </div>
    </div>

    <div class="patient-tabs">
      <button class="patient-tab ${initialTab === 'historia' ? 'active' : ''}" onclick="window.switchPatientTab('historia')"><i class="fas fa-notes-medical"></i> Historia Clínica (12 Sec)</button>
      <button class="patient-tab ${initialTab === 'ficha' ? 'active' : ''}" onclick="window.switchPatientTab('ficha')"><i class="fas fa-id-card"></i> Ficha y Datos</button>
      <button class="patient-tab ${initialTab === 'odonto' ? 'active' : ''}" onclick="window.switchPatientTab('odonto')"><i class="fas fa-tooth"></i> Odontograma</button>
      <button class="patient-tab ${initialTab === 'presupuestos' ? 'active' : ''}" onclick="window.switchPatientTab('presupuestos')"><i class="fas fa-file-invoice-dollar"></i> Presupuestos</button>
      <button class="patient-tab ${initialTab === 'dashboard' ? 'active' : ''}" onclick="window.switchPatientTab('dashboard')"><i class="fas fa-chart-pie"></i> Dashboard</button>
      <button class="patient-tab ${initialTab === 'apts' ? 'active' : ''}" onclick="window.switchPatientTab('apts')"><i class="fas fa-calendar-alt"></i> Turnos</button>
    </div>

    <div id="patientTabContent"></div>
  `;

  window.switchPatientTab(initialTab);
}

window.openEditPatient = async (patientId) => {
  await selectPatient(patientId, 'ficha');
  setTimeout(() => {
    const editBtn = document.querySelector('#editFichaBtn');
    if (editBtn) editBtn.click();
  }, 100);
};

window.confirmDeletePatient = (patientId, patientName) => {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-body" style="max-width: 440px;">
      <div class="modal-head">
        <div>
          <p class="muted" style="color:var(--danger); font-weight:600;"><i class="fas fa-exclamation-triangle"></i> Confirmar Eliminación</p>
          <h3 style="margin:0;">Eliminar Paciente</h3>
        </div>
        <button class="ghost close-del-modal"><i class="fas fa-times"></i></button>
      </div>
      <div style="margin: 16px 0; font-size:0.95rem; line-height:1.5;">
        ¿Estás seguro de que deseas eliminar a <strong>${patientName}</strong>?<br>
        <small style="color:var(--muted); display:block; margin-top:8px;">Se eliminarán permanentemente su ficha, historia clínica y presupuestos asociados. Esta acción no se puede deshacer.</small>
      </div>
      <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="ghost close-del-modal">Cancelar</button>
        <button class="primary" id="btnConfirmDelete" style="background:var(--danger); border-color:var(--danger);"><i class="fas fa-trash-alt"></i> Sí, Eliminar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelectorAll('.close-del-modal').forEach(b => b.addEventListener('click', closeModal));

  modal.querySelector('#btnConfirmDelete')?.addEventListener('click', async () => {
    const btn = modal.querySelector('#btnConfirmDelete');
    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
      
      await apiFetch(`${api.patients}?id=${patientId}`, {
        method: 'DELETE'
      });

      showToast(`Paciente ${patientName} eliminado correctamente`, 'success');
      closeModal();

      if (state.selectedPatient?.id === patientId) {
        backToPatientList();
      }

      await loadPatients();
    } catch (err) {
      showToast(err.message || 'Error al eliminar paciente', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-trash-alt"></i> Sí, Eliminar';
    }
  });
};

window.switchPatientTab = (tab) => {
  const content = el('patientTabContent');
  if (!content || !state.selectedPatient) return;

  document.querySelectorAll('.patient-tab').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('onclick')?.includes(`'${tab}'`)) {
      b.classList.add('active');
    }
  });

  const patient = state.selectedPatient;
  const userRole = state.user?.role || 'admin';
  const canEdit = userRole === 'admin' || userRole === 'medico' || userRole === 'odontologo';

  if (tab === 'ficha') {
    content.innerHTML = '';
    import('./patient-ficha.js').then(mod => {
      const fichaNode = mod.createPatientFicha(
        patient,
        state.professionals || [],
        true,
        async (updatedData) => {
          await apiFetch(api.patients, {
            method: 'PATCH',
            body: JSON.stringify(updatedData)
          });
          Object.assign(state.selectedPatient, updatedData);
          renderPatients();
        }
      );
      content.appendChild(fichaNode);
    });
  } else if (tab === 'dashboard') {
    content.innerHTML = '';
    import('./patient-charts.js').then(mod => {
      const notes = patient.clinicalNotes || [];
      const apts = patient.appointments || [];
      const dashNode = mod.createPatientDashboard(patient, notes, apts);
      content.appendChild(dashNode);
    });
  } else if (tab === 'historia') {
    content.innerHTML = '';
    import('./historia-clinica.js').then(mod => {
      const notes = patient.clinicalNotes || [];
      const plans = patient.treatmentPlans || [];
      const hcNode = mod.createHistoriaClinica(
        patient,
        notes,
        plans,
        canEdit,
        async (newNote) => {
          await apiFetch(api.patients, {
            method: 'POST',
            body: JSON.stringify({
              action: 'save_clinical_note',
              patientId: patient.id,
              note: newNote
            })
          });
          if (!patient.clinicalNotes) patient.clinicalNotes = [];
          patient.clinicalNotes.unshift(newNote);
        },
        async (newPlans) => {
          await apiFetch(api.patients, {
            method: 'POST',
            body: JSON.stringify({
              action: 'save_treatment_plans',
              patientId: patient.id,
              plans: newPlans
            })
          });
          patient.treatmentPlans = newPlans;
        },
        async (hcData, patchPayload = {}) => {
          const payload = {
            id: patient.id,
            clinicalHistory: hcData,
            ...patchPayload
          };
          await apiFetch(api.patients, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
          patient.clinicalHistory = hcData;
          if (patchPayload.birthdate) {
            patient.birthdate = patchPayload.birthdate;
            const inList = state.patients.find(p => p.id === patient.id);
            if (inList) inList.birthdate = patchPayload.birthdate;
          }
          if (patchPayload.age) {
            patient.age = patchPayload.age;
            const inList = state.patients.find(p => p.id === patient.id);
            if (inList) inList.age = patchPayload.age;
          }
          renderPatients();
        },
        state.professionals || []
      );
      content.appendChild(hcNode);
    });
  } else if (tab === 'odonto') {
    content.innerHTML = '<div id="odontoContainer"></div>';
    renderOdontogram('odontoContainer', patient);
  } else if (tab === 'presupuestos') {
    content.innerHTML = '';
    import('./app-budget.js').then(mod => {
      const notes = patient.clinicalNotes || [];
      const plans = patient.treatmentPlans || [];
      const profs = state.professionals || [];
      const budgetNode = mod.createBudgetManager(
        patient,
        notes,
        plans,
        profs,
        null,
        (updatedBudgets) => {
          patient.budgets = updatedBudgets;
        }
      );
      content.appendChild(budgetNode);
    });
  } else if (tab === 'apts') {
    const apts = patient.appointments || [];
    if (apts.length === 0) {
      content.innerHTML = '<div class="empty" style="padding:24px; text-align:center;"><i class="fas fa-calendar-times" style="font-size:2rem; color:var(--muted); margin-bottom:8px; display:block;"></i>Sin turnos previos registrados para este paciente.</div>';
    } else {
      content.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Motivo</th>
                <th>Profesional</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${apts.map(a => `
                <tr>
                  <td><strong>${a.date} · ${a.time}</strong></td>
                  <td>${a.reason || 'Consulta'}</td>
                  <td>${a.professional_name || 'Dr. Asignado'}</td>
                  <td><strong>$${(a.cost || 0).toLocaleString('es-AR')}</strong></td>
                  <td><span class="badge ${a.status}">${a.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
};

window.quickNewAptForPatient = (id, name, phone) => {
  import('./app-modal.js').then(m => {
    m.openModal({ patientId: id, patientName: name, patientPhone: phone });
  });
};

const PATIENT_DRAFT_KEY = 'doctor2_new_patient_draft';

export function savePatientDraft() {
  const modal = el('patientModal');
  if (!modal) return;
  const draft = {
    name: el('newPatName')?.value || '',
    dni: el('newPatDni')?.value || '',
    sex: el('newPatSex')?.value || 'Femenino',
    birthdate: el('newPatBirthdate')?.value || '',
    phone: el('newPatPhone')?.value || '',
    email: el('newPatEmail')?.value || '',
    occupation: el('newPatOccupation')?.value || '',
    address: el('newPatAddress')?.value || '',
    emergencyName: el('newPatEmergencyName')?.value || '',
    emergencyPhone: el('newPatEmergencyPhone')?.value || '',
    representative: el('newPatRepresentative')?.value || '',
    allergies: el('newPatAllergies')?.value || '',
    notes: el('newPatNotes')?.value || '',
    openHC: el('newPatOpenHC')?.checked ?? true,
    savedAt: Date.now()
  };

  if (draft.name || draft.dni || draft.phone || draft.email || draft.address || draft.notes || draft.emergencyName || draft.emergencyPhone) {
    localStorage.setItem(PATIENT_DRAFT_KEY, JSON.stringify(draft));
    const indicator = el('newPatDraftIndicator');
    if (indicator) {
      indicator.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> Autoguardado local activo';
      indicator.classList.remove('hidden');
    }
  }
}

export function clearPatientDraft() {
  localStorage.removeItem(PATIENT_DRAFT_KEY);
  const modal = el('patientModal');
  if (modal) {
    const inputs = modal.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      if (input.type === 'checkbox') input.checked = true;
      else if (input.tagName === 'SELECT') input.selectedIndex = 0;
      else input.value = '';
    });
    const indicator = el('newPatDraftIndicator');
    if (indicator) indicator.classList.add('hidden');
  }
}

export function restorePatientDraft() {
  try {
    const saved = localStorage.getItem(PATIENT_DRAFT_KEY);
    if (!saved) return false;
    const draft = JSON.parse(saved);
    if (!draft) return false;

    if (el('newPatName')) el('newPatName').value = draft.name || '';
    if (el('newPatDni')) el('newPatDni').value = draft.dni || '';
    if (el('newPatSex')) el('newPatSex').value = draft.sex || 'Femenino';
    if (el('newPatBirthdate')) el('newPatBirthdate').value = draft.birthdate || '';
    if (el('newPatPhone')) el('newPatPhone').value = draft.phone || '';
    if (el('newPatEmail')) el('newPatEmail').value = draft.email || '';
    if (el('newPatOccupation')) el('newPatOccupation').value = draft.occupation || '';
    if (el('newPatAddress')) el('newPatAddress').value = draft.address || '';
    if (el('newPatEmergencyName')) el('newPatEmergencyName').value = draft.emergencyName || '';
    if (el('newPatEmergencyPhone')) el('newPatEmergencyPhone').value = draft.emergencyPhone || '';
    if (el('newPatRepresentative')) el('newPatRepresentative').value = draft.representative || '';
    if (el('newPatAllergies')) el('newPatAllergies').value = draft.allergies || '';
    if (el('newPatNotes')) el('newPatNotes').value = draft.notes || '';
    if (el('newPatOpenHC') && draft.openHC !== undefined) el('newPatOpenHC').checked = draft.openHC;

    const indicator = el('newPatDraftIndicator');
    if (indicator) {
      indicator.innerHTML = '<i class="fas fa-clock-rotate-left" style="color:#f59e0b;"></i> Borrador recuperado automáticamente <button type="button" id="discardPatDraftBtn" style="font-size:0.75rem; padding:2px 6px; margin-left:6px; color:var(--danger); text-decoration:underline; border:none; background:none; cursor:pointer; font-weight:700;">Descartar</button>';
      indicator.classList.remove('hidden');
      el('discardPatDraftBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearPatientDraft();
        showToast('Borrador descartado', 'info');
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function openNewPatientModal() {
  const modal = el('patientModal');
  if (modal) {
    const hasDraft = restorePatientDraft();
    if (!hasDraft) {
      const inputs = modal.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = true;
        } else {
          input.value = '';
        }
      });
      el('newPatDraftIndicator')?.classList.add('hidden');
    }

    const bInput = el('newPatBirthdate');
    if (bInput && !bInput._ageBound) {
      bInput._ageBound = true;
      bInput.addEventListener('input', () => {
        const ageStr = calculateAge(bInput.value);
        const prev = el('newPatAgePreview');
        if (prev) {
          prev.textContent = (ageStr && ageStr !== 'Sin edad') ? `(Edad: ${ageStr})` : '';
        }
      });
    }
    const ageInit = calculateAge(bInput?.value);
    const prevInit = el('newPatAgePreview');
    if (prevInit) {
      prevInit.textContent = (ageInit && ageInit !== 'Sin edad') ? `(Edad: ${ageInit})` : '';
    }

    modal.classList.remove('hidden');
  }
}

export function closeNewPatientModal() {
  el('patientModal')?.classList.add('hidden');
}

export async function saveNewPatient() {
  const name = el('newPatName')?.value.trim();
  const dni = el('newPatDni')?.value.trim();
  const sex = el('newPatSex')?.value;
  const birthdateRaw = el('newPatBirthdate')?.value ? el('newPatBirthdate').value.trim() : null;
  const ageStr = calculateAge(birthdateRaw);
  const ageNum = parseInt(ageStr, 10);
  const age = isNaN(ageNum) ? null : ageNum;
  const phone = el('newPatPhone')?.value.trim();
  const email = el('newPatEmail')?.value.trim();
  const occupation = el('newPatOccupation')?.value.trim();
  const address = el('newPatAddress')?.value.trim();
  const emergencyName = el('newPatEmergencyName')?.value.trim();
  const emergencyPhone = el('newPatEmergencyPhone')?.value.trim();
  const representativeName = el('newPatRepresentative')?.value.trim();
  const allergies = el('newPatAllergies')?.value.trim();
  const notes = el('newPatNotes')?.value.trim();
  const openHC = el('newPatOpenHC')?.checked;

  if (!name) {
    showToast('El nombre del paciente es requerido', 'warning');
    return;
  }

  try {
    const res = await apiFetch(api.patients, {
      method: 'POST',
      body: JSON.stringify({
        name,
        dni,
        sex,
        birthdate: birthdateRaw,
        age,
        phone,
        email,
        occupation,
        address,
        emergencyName,
        emergencyPhone,
        emergencyContact: (emergencyName && emergencyPhone) ? `${emergencyName} (${emergencyPhone})` : (emergencyName || emergencyPhone || ''),
        representativeName,
        allergies,
        notes
      })
    });

    showToast('Paciente guardado exitosamente', 'success');
    clearPatientDraft();
    closeNewPatientModal();
    await loadPatients();

    if (res?.patient?.id) {
      await selectPatient(res.patient.id);
      if (openHC) {
        window.switchPatientTab('historia');
      }
    }
  } catch (err) {
    showToast(err.message || 'Error al guardar paciente', 'error');
  }
}

window.openPatientExportModal = () => {
  const patient = state.selectedPatient;
  if (!patient) return;
  import('./patient-export.js').then(mod => {
    const notes = patient.clinicalNotes || [];
    const plans = patient.treatmentPlans || [];
    const profs = state.professionals || [];
    const exportNode = mod.createExportActions(
      patient,
      notes,
      plans,
      profs,
      async (emailPayload) => {
        showToast(`Email enviado a ${emailPayload.to}`, 'success');
      },
      'Consultorios.pro'
    );
    document.body.appendChild(exportNode);
  });
};

window.openCertificateModal = (targetPatient = state.selectedPatient) => {
  if (!targetPatient) {
    showToast('Seleccione un paciente para emitir el certificado', 'warning');
    return;
  }
  import('./patient-certificate.js').then(mod => {
    mod.openCertificateModal(targetPatient);
  });
};

export function setupPatientImportExport() {
  const exportBtn = el('exportPatientsBtn');
  const importBtn = el('importPatientsBtn');

  exportBtn?.addEventListener('click', () => {
    import('./import-export-manager.js').then(mod => {
      mod.exportPatients(state.patients || [], state.professionals || []);
    });
  });

  importBtn?.addEventListener('click', () => {
    import('./import-export-manager.js').then(mod => {
      const expectedFields = [
        'name', 'dni', 'phone', 'email', 'birthDate', 'age',
        'insurance', 'insuranceNumber', 'address', 'assignedProfessionalId', 'generalNotes'
      ];
      const importModal = mod.createImportUI('patients', expectedFields, async (importedData) => {
        for (const item of importedData) {
          await apiFetch(api.patients, {
            method: 'POST',
            body: JSON.stringify({
              name: item.name,
              dni: item.dni || '',
              phone: item.phone || '',
              email: item.email || '',
              birthdate: item.birthDate || '',
              health_insurance: item.insurance || 'Particular',
              affiliate_number: item.insuranceNumber || '',
              address: item.address || '',
              notes: item.generalNotes || ''
            })
          });
        }
        await loadPatients();
      });
      document.body.appendChild(importModal);
    });
  });
}

export function setupPatientDraftAutoSave() {
  const modal = el('patientModal');
  if (!modal) return;
  modal.addEventListener('input', savePatientDraft);
  modal.addEventListener('change', savePatientDraft);
}

// Auto-run setup listeners
setTimeout(() => {
  setupPatientImportExport();
  setupPatientDraftAutoSave();
}, 0);

