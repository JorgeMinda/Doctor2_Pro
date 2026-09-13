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
    <tr style="cursor:pointer;" onclick="window.selectPatient('${p.id}')">
      <td><strong>${p.name}</strong></td>
      <td>${p.dni || '-'}</td>
      <td>${p.phone || '-'}</td>
      <td>${p.email || '-'}</td>
      <td>${calculateAge(p.birthdate)}</td>
      <td>${p.health_insurance || 'Particular'}</td>
      <td><button class="ghost" onclick="event.stopPropagation(); window.selectPatient('${p.id}')"><i class="fas fa-file-medical"></i> Ver ficha</button></td>
    </tr>
  `).join('');
}

function calculateAge(birthdate) {
  if (!birthdate) return '-';
  const diff = Date.now() - new Date(birthdate).getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + ' años';
}

export async function selectPatient(patientId) {
  try {
    const data = await apiFetch(`${api.patients}?id=${patientId}`);
    if (data.patient) {
      state.selectedPatient = data.patient;
      renderPatientDetail(data.patient);
    }
  } catch (err) {
    showToast('No se pudo cargar la ficha del paciente', 'error');
  }
}
window.selectPatient = selectPatient;

export function renderPatientDetail(patient) {
  const container = el('patientDetail');
  if (!container) return;

  container.innerHTML = `
    <div class="patient-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <h3>${patient.name}</h3>
        <p class="muted">DNI: ${patient.dni || 'Sin registrar'} · Obra Social: ${patient.health_insurance || patient.insurance || 'Particular'}</p>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="ghost" onclick="window.openPatientExportModal()"><i class="fas fa-share-alt"></i> Exportar / Compartir</button>
        <button class="primary" onclick="window.quickNewAptForPatient('${patient.id}', '${patient.name}', '${patient.phone || ''}')"><i class="fas fa-calendar-plus"></i> Dar turno</button>
      </div>
    </div>

    <div class="patient-tabs">
      <button class="patient-tab active" onclick="window.switchPatientTab('ficha')"><i class="fas fa-id-card"></i> Ficha</button>
      <button class="patient-tab" onclick="window.switchPatientTab('dashboard')"><i class="fas fa-chart-pie"></i> Dashboard</button>
      <button class="patient-tab" onclick="window.switchPatientTab('historia')"><i class="fas fa-notes-medical"></i> Historia Clínica</button>
      <button class="patient-tab" onclick="window.switchPatientTab('odonto')"><i class="fas fa-tooth"></i> Odontograma</button>
      <button class="patient-tab" onclick="window.switchPatientTab('presupuestos')"><i class="fas fa-file-invoice-dollar"></i> Presupuestos</button>
      <button class="patient-tab" onclick="window.switchPatientTab('apts')"><i class="fas fa-calendar-alt"></i> Turnos</button>
    </div>

    <div id="patientTabContent"></div>
  `;

  window.switchPatientTab('ficha');
}

window.switchPatientTab = (tab) => {
  const content = el('patientTabContent');
  if (!content || !state.selectedPatient) return;

  document.querySelectorAll('.patient-tab').forEach(b => b.classList.remove('active'));
  if (event && event.target && event.target.classList) {
    event.target.closest('.patient-tab')?.classList.add('active');
  }

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
        }
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
  const phone = el('newPatPhone')?.value.trim();
  const email = el('newPatEmail')?.value.trim();
  const birthdate = el('newPatBirthdate')?.value;
  const insurance = el('newPatInsurance')?.value.trim();
  const notes = el('newPatNotes')?.value.trim();

  if (!name) {
    showToast('El nombre del paciente es requerido', 'warning');
    return;
  }

  try {
    await apiFetch(api.patients, {
      method: 'POST',
      body: JSON.stringify({ name, dni, phone, email, birthdate, health_insurance: insurance, notes })
    });
    showToast('Paciente guardado exitosamente', 'success');
    closeNewPatientModal();
    loadPatients();
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

