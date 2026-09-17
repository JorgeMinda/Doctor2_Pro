/**
 * app-patients.js - Gestión de Pacientes, Ficha Médica e Historia Clínica
 */
import { state, api } from './app-state.js';
import { el, apiFetch, showToast } from './app-utils.js';
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
      <td>${calculateAge(p.birthdate)}</td>
      <td>${p.health_insurance || 'Particular'}</td>
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

function calculateAge(birthdate) {
  if (!birthdate) return '-';
  const diff = Date.now() - new Date(birthdate).getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + ' años';
}

export async function selectPatient(patientId, defaultTab = 'historia') {
  try {
    const data = await apiFetch(`${api.patients}?id=${patientId}`);
    if (data.patient) {
      state.selectedPatient = data.patient;
      renderPatients();
      renderPatientDetail(data.patient, defaultTab);
    }
  } catch (err) {
    showToast('No se pudo cargar la ficha del paciente', 'error');
  }
}
window.selectPatient = selectPatient;

export function renderPatientDetail(patient, initialTab = 'historia') {
  const container = el('patientDetail');
  if (!container) return;

  container.innerHTML = `
    <div class="patient-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <div>
        <h3 style="margin:0 0 4px 0; color:var(--primary); font-size:1.3rem;">${patient.name}</h3>
        <p class="muted" style="margin:0; font-size:0.85rem;">
          Cédula: <strong>${patient.dni || 'Sin registrar'}</strong> · 
          Género: <strong>${patient.sex || '-'}</strong> · 
          Obra Social / Seguro: <strong>${patient.health_insurance || patient.insurance || 'Particular'}</strong>
        </p>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="ghost" style="font-size:0.85rem;" onclick="window.openEditPatient('${patient.id}')" title="Editar datos del paciente"><i class="fas fa-edit"></i> Editar</button>
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
        state.selectedPatient = null;
        const container = el('patientDetail');
        if (container) {
          container.innerHTML = '<div class="empty">Seleccioná un paciente de la lista para ver su historia clínica y ficha.</div>';
        }
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
        async (hcData) => {
          await apiFetch(api.patients, {
            method: 'PATCH',
            body: JSON.stringify({
              id: patient.id,
              clinicalHistory: hcData
            })
          });
          patient.clinicalHistory = hcData;
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

export function openNewPatientModal() {
  el('patientModal')?.classList.remove('hidden');
}

export function closeNewPatientModal() {
  el('patientModal')?.classList.add('hidden');
}

export async function saveNewPatient() {
  const name = el('newPatName')?.value.trim();
  const dni = el('newPatDni')?.value.trim();
  const sex = el('newPatSex')?.value;
  const birthdate = el('newPatBirthdate')?.value;
  const phone = el('newPatPhone')?.value.trim();
  const email = el('newPatEmail')?.value.trim();
  const occupation = el('newPatOccupation')?.value.trim();
  const insurance = el('newPatInsurance')?.value.trim();
  const affiliate_number = el('newPatInsuranceNumber')?.value.trim();
  const emergencyPhone = el('newPatEmergency')?.value.trim();
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
        birthdate,
        phone,
        email,
        occupation,
        health_insurance: insurance,
        affiliate_number,
        emergencyPhone,
        representativeName,
        allergies,
        notes
      })
    });

    showToast('Paciente guardado exitosamente', 'success');
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

// Auto-run setup listeners
setTimeout(setupPatientImportExport, 0);

