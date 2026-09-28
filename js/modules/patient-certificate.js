/**
 * patient-certificate.js - Generador Oficial de Certificados de Asistencia y Atención Médica
 */
import { showToast } from './app-utils.js';
import { state } from './app-state.js';

export const DEFAULT_CLINIC_LOGO = `
<svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="20" fill="#2563eb"/>
  <circle cx="50" cy="50" r="38" fill="white" fill-opacity="0.12"/>
  <path d="M50 20C40 20 32 28 32 38C32 45 36 50 40 54V72C40 76 44 80 50 80C56 80 60 76 60 72V54C64 50 68 45 68 38C68 28 60 20 50 20Z" fill="white"/>
  <path d="M42 46H58M50 38V54" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="46" stroke="white" stroke-width="2" stroke-dasharray="4 4" opacity="0.5"/>
</svg>
`;

export function openCertificateModal(patient, initialData = {}) {
  const existingModal = document.getElementById('certificateModal');
  if (existingModal) existingModal.remove();

  const savedClinic = JSON.parse(localStorage.getItem('doctor2_clinic_settings') || '{}');
  const clinicName = savedClinic.name || 'Clínica Odontológica & Médica Integral';
  const clinicAddress = savedClinic.address || 'Av. Principal 1234 · Consultorios Médicos';
  const clinicPhone = savedClinic.phone || '+54 11 5555-4321';
  const clinicEmail = savedClinic.email || 'contacto@clinicadoctor.pro';
  const clinicLogoUrl = savedClinic.logoUrl || '';

  const profs = state.professionals || [];
  const currentUser = state.user || {};
  let selectedProf = profs.find(p => p.id === patient?.assignedProfessionalId) || profs[0] || {
    name: currentUser.name || 'Dr. Médico / Odontólogo Tratante',
    specialty: 'Odontología General / Medicina',
    license_code: currentUser.license_code || 'MSP-12345-EC'
  };

  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Calcular hora de ingreso (ej. 45 min antes) y salida (hora actual)
  const inDate = new Date(now.getTime() - 45 * 60000);
  const defaultTimeIn = inDate.toTimeString().slice(0, 5);
  const defaultTimeOut = currentTime;

  // Extraer último procedimiento del paciente si existe
  const lastNote = patient?.clinicalNotes?.[0];
  const defaultTreatment = initialData.treatment || (lastNote ? `${lastNote.procedimiento || lastNote.diagnosticoTipo || 'Atención odontológica'}${lastNote.pieza ? ' en pieza ' + lastNote.pieza : ''}` : 'Consulta y atención clínica odontológica / procedimiento terapéutico');

  const modal = document.createElement('div');
  modal.id = 'certificateModal';
  modal.className = 'modal';

  modal.innerHTML = `
    <div class="modal-body" style="max-width:760px; width:95%; max-height:92vh; overflow-y:auto; padding:24px;">
      <!-- Modal Header -->
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:14px; margin-bottom:18px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:10px; background:rgba(37,99,235,0.12); display:flex; align-items:center; justify-content:center; color:var(--primary); font-size:1.3rem;">
            <i class="fas fa-certificate"></i>
          </div>
          <div>
            <h3 style="margin:0; font-size:1.25rem; color:var(--text);">Certificado de Asistencia y Atención Médica</h3>
            <p class="muted" style="margin:2px 0 0; font-size:0.82rem;">Emisión de constancia oficial con horarios de ingreso/salida, código médico y firmas</p>
          </div>
        </div>
        <button class="ghost close-cert-modal" style="font-size:1.2rem; cursor:pointer;" title="Cerrar"><i class="fas fa-times"></i></button>
      </div>

      <!-- Certificate Form Body -->
      <form id="certificateForm" onsubmit="event.preventDefault();">
        
        <!-- SECCIÓN 1: DATOS DE LA CLÍNICA / DISPENSARIO -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:700; font-size:0.85rem; color:var(--primary);"><i class="fas fa-clinic-medical"></i> Datos del Dispensario / Clínica</span>
            <small class="muted">Aparecerán en el membrete superior</small>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Nombre del Dispensario / Clínica</label>
              <input type="text" id="certClinicName" value="${clinicName}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Dirección / Ciudad</label>
              <input type="text" id="certClinicAddress" value="${clinicAddress}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Teléfono de Contacto</label>
              <input type="text" id="certClinicPhone" value="${clinicPhone}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Logo (URL o cargar imagen)</label>
              <div style="display:flex; gap:6px;">
                <input type="text" id="certClinicLogoUrl" value="${clinicLogoUrl}" placeholder="URL o usar predeterminado" class="input-field" style="flex:1; padding:7px 10px; font-size:0.85rem;">
                <label class="ghost" style="padding:7px 10px; cursor:pointer; font-size:0.85rem;" title="Subir logo desde este equipo">
                  <i class="fas fa-upload"></i>
                  <input type="file" id="certLogoFile" accept="image/*" style="display:none;">
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: DATOS DEL MÉDICO / ODONTÓLOGO TRATANTE -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:700; font-size:0.85rem; color:var(--primary);"><i class="fas fa-user-md"></i> Datos del Profesional Tratante</span>
            ${profs.length > 0 ? `
              <select id="certProfSelector" style="padding:4px 8px; font-size:0.82rem; border-radius:6px; border:1px solid var(--border); background:var(--surface); color:var(--text);">
                ${profs.map(p => `<option value="${p.id}" ${p.id === selectedProf.id ? 'selected' : ''}>${p.name} · ${p.specialty || 'Profesional'}</option>`).join('')}
              </select>
            ` : ''}
          </div>
          <div style="display:grid; grid-template-columns:1.2fr 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Nombre del Médico / Odontólogo</label>
              <input type="text" id="certDoctorName" value="${selectedProf.name || ''}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Especialidad</label>
              <input type="text" id="certDoctorSpecialty" value="${selectedProf.specialty || 'Odontología General'}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--primary); display:block; margin-bottom:4px;">Código de Habilitación / Matrícula</label>
              <input type="text" id="certDoctorCode" value="${selectedProf.license_code || selectedProf.licenseCode || currentUser.license_code || ''}" placeholder="Ej: MSP-10492-OD" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:700; color:var(--primary);" required>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: DATOS DEL PACIENTE -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
          <span style="font-weight:700; font-size:0.85rem; color:var(--primary); display:block; margin-bottom:10px;"><i class="fas fa-user-injured"></i> Datos del Paciente</span>
          <div style="display:grid; grid-template-columns:1.4fr 1fr 0.8fr 1fr; gap:10px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Nombre Completo del Paciente</label>
              <input type="text" id="certPatientName" value="${patient?.name || ''}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Cédula / Documento ID</label>
              <input type="text" id="certPatientDni" value="${patient?.dni || ''}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Edad</label>
              <input type="text" id="certPatientAge" value="${patient?.birthdate ? (new Date().getFullYear() - new Date(patient.birthdate).getFullYear()) + ' años' : (patient?.age ? patient.age + ' años' : '')}" placeholder="Ej: 32 años" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Seguro / Obra Social</label>
              <input type="text" id="certPatientInsurance" value="${patient?.health_insurance || patient?.insurance || 'Particular'}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
          </div>
        </div>

        <!-- SECCIÓN 4: FECHA, HORA DE INGRESO Y HORA DE SALIDA -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
          <span style="font-weight:700; font-size:0.85rem; color:var(--primary); display:block; margin-bottom:10px;"><i class="fas fa-clock"></i> Fecha y Horarios de Atención</span>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Fecha de Atención</label>
              <input type="date" id="certDate" value="${currentDate}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:#059669; display:block; margin-bottom:4px;"><i class="fas fa-sign-in-alt"></i> Hora de Ingreso</label>
              <input type="time" id="certTimeIn" value="${defaultTimeIn}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:600;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:#dc2626; display:block; margin-bottom:4px;"><i class="fas fa-sign-out-alt"></i> Hora de Salida</label>
              <input type="time" id="certTimeOut" value="${defaultTimeOut}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:600;" required>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 5: TRATAMIENTO, REPOSO E INDICACIONES -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:18px;">
          <span style="font-weight:700; font-size:0.85rem; color:var(--primary); display:block; margin-bottom:10px;"><i class="fas fa-stethoscope"></i> Tratamiento Efectuado y Reposo Médico</span>
          
          <div style="margin-bottom:10px;">
            <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Tratamiento / Procedimiento / Acto Clínico Efectuado</label>
            <textarea id="certTreatment" rows="2" class="input-field" style="width:100%; padding:8px 10px; font-size:0.88rem; resize:vertical;" required>${defaultTreatment}</textarea>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1.2fr; gap:10px; margin-bottom:10px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Diagnóstico / Motivo de Consulta</label>
              <input type="text" id="certDiagnosis" value="${lastNote?.diagnosticoTipo || patient?.motivoConsulta || 'Atención y control odontológico / procedimiento ambulatorio'}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Reposo Médico Sugerido / Justificación</label>
              <select id="certRestQuick" style="width:100%; padding:7px 10px; font-size:0.85rem; border-radius:6px; border:1px solid var(--border); background:var(--surface); color:var(--text); margin-bottom:4px;">
                <option value="Constancia de atención clínica sin reposo laboral (alta inmediata).">Constancia simple (Sin reposo - Alta inmediata)</option>
                <option value="Se recomienda reposo médico por 24 horas por procedimiento efectuado.">Reposo Médico por 24 horas</option>
                <option value="Se recomienda reposo médico por 48 horas con cuidados post-operatorios.">Reposo Médico por 48 horas</option>
                <option value="Se recomienda reposo médico por 72 horas para recuperación post-quirúrgica.">Reposo Médico por 72 horas</option>
                <option value="custom">Otro (Personalizar texto abajo...)</option>
              </select>
              <input type="text" id="certRestText" value="Constancia de atención clínica sin reposo laboral (alta inmediata)." class="input-field" style="width:100%; padding:7px 10px; font-size:0.85rem;">
            </div>
          </div>

          <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Indicaciones / Observaciones Adicionales</label>
            <input type="text" id="certNotes" value="Paciente en condiciones estables. Se emite el presente certificado a solicitud del interesado para los fines que estime convenientes." class="input-field" style="width:100%; padding:7px 10px; font-size:0.85rem;">
          </div>
        </div>

        <!-- ACCIONES DEL MODAL -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-top:1px solid var(--border); padding-top:16px;">
          <button type="button" class="ghost close-cert-modal" style="font-size:0.9rem;">Cancelar</button>
          
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="ghost" id="certWhatsAppBtn" style="background:#25d366; color:#fff; border-color:#25d366; font-size:0.88rem; font-weight:600;">
              <i class="fab fa-whatsapp"></i> Compartir WhatsApp
            </button>
            <button type="button" class="primary" id="certPrintBtn" style="font-size:0.88rem; font-weight:700; padding:8px 18px;">
              <i class="fas fa-print"></i> Imprimir / Descargar PDF
            </button>
          </div>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Helper para cerrar
  const closeModal = () => modal.remove();
  modal.querySelectorAll('.close-cert-modal').forEach(b => b.addEventListener('click', closeModal));

  // Manejar cambio de profesional en selector
  const profSelect = modal.querySelector('#certProfSelector');
  if (profSelect) {
    profSelect.addEventListener('change', (e) => {
      const p = profs.find(pr => pr.id === e.target.value);
      if (p) {
        modal.querySelector('#certDoctorName').value = p.name || '';
        modal.querySelector('#certDoctorSpecialty').value = p.specialty || 'Odontología';
        modal.querySelector('#certDoctorCode').value = p.license_code || p.licenseCode || '';
      }
    });
  }

  // Manejar selector rápido de reposo
  const restQuick = modal.querySelector('#certRestQuick');
  const restText = modal.querySelector('#certRestText');
  restQuick?.addEventListener('change', () => {
    if (restQuick.value !== 'custom') {
      restText.value = restQuick.value;
    } else {
      restText.focus();
    }
  });

  // Manejar subida local de imagen de logo
  const logoFileInput = modal.querySelector('#certLogoFile');
  logoFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const base64 = re.target.result;
        modal.querySelector('#certClinicLogoUrl').value = base64;
        showToast('Logo cargado correctamente', 'success');
      };
      reader.readAsDataURL(file);
    }
  });

  // Recolectar datos del certificado
  function collectCertData() {
    const clinic = {
      name: modal.querySelector('#certClinicName')?.value.trim() || 'Clínica Odontológica & Médica Integral',
      address: modal.querySelector('#certClinicAddress')?.value.trim() || '',
      phone: modal.querySelector('#certClinicPhone')?.value.trim() || '',
      email: clinicEmail,
      logoUrl: modal.querySelector('#certClinicLogoUrl')?.value.trim() || ''
    };

    // Guardar para futuros certificados
    localStorage.setItem('doctor2_clinic_settings', JSON.stringify({
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      logoUrl: clinic.logoUrl
    }));

    return {
      clinic,
      doctor: {
        name: modal.querySelector('#certDoctorName')?.value.trim() || 'Dr. Médico Tratante',
        specialty: modal.querySelector('#certDoctorSpecialty')?.value.trim() || 'Odontología General',
        code: modal.querySelector('#certDoctorCode')?.value.trim() || 'Sin código registrado'
      },
      patient: {
        name: modal.querySelector('#certPatientName')?.value.trim() || patient?.name || '',
        dni: modal.querySelector('#certPatientDni')?.value.trim() || patient?.dni || 'Sin registrar',
        age: modal.querySelector('#certPatientAge')?.value.trim() || '-',
        insurance: modal.querySelector('#certPatientInsurance')?.value.trim() || 'Particular',
        phone: patient?.phone || ''
      },
      date: modal.querySelector('#certDate')?.value || currentDate,
      timeIn: modal.querySelector('#certTimeIn')?.value || defaultTimeIn,
      timeOut: modal.querySelector('#certTimeOut')?.value || defaultTimeOut,
      treatment: modal.querySelector('#certTreatment')?.value.trim() || 'Atención odontológica / médica',
      diagnosis: modal.querySelector('#certDiagnosis')?.value.trim() || '',
      rest: modal.querySelector('#certRestText')?.value.trim() || 'Constancia simple de atención.',
      notes: modal.querySelector('#certNotes')?.value.trim() || '',
      folio: `CERT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
    };
  }

  // Evento Imprimir / Descargar PDF
  modal.querySelector('#certPrintBtn')?.addEventListener('click', () => {
    const certData = collectCertData();
    const html = generateCertificateHTML(certData);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Permití las ventanas emergentes para ver el Certificado / PDF', 'warning');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    showToast('Generando certificado para impresión / PDF...', 'success');
  });

  // Evento WhatsApp
  modal.querySelector('#certWhatsAppBtn')?.addEventListener('click', () => {
    const certData = collectCertData();
    const phone = (certData.patient.phone || '').replace(/\D/g, '');
    
    const msg = `📜 *CERTIFICADO DE ATENCIÓN MÉDICA / ODONTOLÓGICA*%0A` +
      `*Institución:* ${certData.clinic.name}%0A` +
      `*Folio:* ${certData.folio}%0A%0A` +
      `👤 *Paciente:* ${certData.patient.name}%0A` +
      `🆔 *Cédula/ID:* ${certData.patient.dni}%0A` +
      `📅 *Fecha:* ${certData.date}%0A` +
      `⏱️ *Horario:* De ${certData.timeIn} hs a ${certData.timeOut} hs%0A%0A` +
      `🩺 *Tratamiento Efectuado:* ${certData.treatment}%0A` +
      `📋 *Diagnóstico:* ${certData.diagnosis || 'Atención integral'}%0A` +
      `🛌 *Indicación / Reposo:* ${certData.rest}%0A%0A` +
      `👨‍⚕️ *Médico Tratante:* ${certData.doctor.name}%0A` +
      `🏛️ *Código / Matrícula:* ${certData.doctor.code}%0A` +
      `🏥 *Especialidad:* ${certData.doctor.specialty}%0A%0A` +
      `_Certificado emitido formalmente desde Consultorios.pro_`;

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      showToast('Abriendo WhatsApp para enviar certificado...', 'success');
    } else {
      window.open(`https://wa.me/?text=${msg}`, '_blank');
      showToast('Abriendo WhatsApp...', 'info');
    }
  });
}
window.openCertificateModal = openCertificateModal;

/**
 * Genera el documento HTML A4 de alta fidelidad para el Certificado de Atención y Asistencia
 */
export function generateCertificateHTML(data) {
  const logoHtml = data.clinic.logoUrl
    ? `<img src="${data.clinic.logoUrl}" alt="Logo" style="max-height:75px; max-width:140px; object-fit:contain;">`
    : DEFAULT_CLINIC_LOGO;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Certificado de Atención - ${data.patient.name}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          line-height: 1.5;
          font-size: 13px;
          margin: 0;
          padding: 24px 28px;
        }
        .cert-container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #2563eb;
          border-radius: 12px;
          padding: 28px 32px;
          position: relative;
          background: #ffffff;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .cert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 20px;
          gap: 16px;
        }
        .clinic-info h1 {
          margin: 0;
          color: #1e3a8a;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        .clinic-info p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 11.5px;
        }
        .cert-folio-badge {
          text-align: right;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 8px 14px;
          border-radius: 8px;
        }
        .cert-folio-badge .folio-num {
          font-size: 12px;
          font-weight: 800;
          color: #2563eb;
          letter-spacing: 0.5px;
        }
        .cert-folio-badge .folio-date {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .cert-main-title {
          text-align: center;
          margin: 18px 0 22px;
        }
        .cert-main-title h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .cert-main-title .sub-title {
          font-size: 12px;
          font-weight: 600;
          color: #2563eb;
          margin-top: 3px;
          letter-spacing: 0.5px;
        }
        .patient-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: 1.5fr 1fr 0.8fr 1fr;
          gap: 10px;
        }
        .patient-card .p-item label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }
        .patient-card .p-item span {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
        }
        .time-box-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        .time-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          text-align: center;
          background: #ffffff;
        }
        .time-card.in {
          border-left: 4px solid #10b981;
          background: #f0fdf4;
        }
        .time-card.out {
          border-left: 4px solid #ef4444;
          background: #fef2f2;
        }
        .time-card.date-card {
          border-left: 4px solid #3b82f6;
          background: #eff6ff;
        }
        .time-card .lbl {
          font-size: 10.5px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
        }
        .time-card .val {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 3px;
        }
        .cert-statement {
          font-size: 13.5px;
          line-height: 1.7;
          text-align: justify;
          margin-bottom: 20px;
          color: #334155;
        }
        .cert-statement strong {
          color: #0f172a;
        }
        .details-box {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 20px;
          background: #ffffff;
        }
        .details-box .detail-row {
          margin-bottom: 10px;
        }
        .details-box .detail-row:last-child {
          margin-bottom: 0;
        }
        .details-box .d-label {
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }
        .details-box .d-val {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }
        .doctor-box {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 18px;
          margin-bottom: 26px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .doc-badge {
          display: inline-block;
          background: #dbeafe;
          color: #1e40af;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .signatures-area {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 40px;
          padding-top: 10px;
        }
        .sig-block {
          width: 44%;
          text-align: center;
        }
        .sig-line {
          border-top: 1.5px solid #334155;
          margin-bottom: 6px;
        }
        .sig-title {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .sig-sub {
          font-size: 10.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .cert-footer {
          margin-top: 30px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #94a3b8;
        }
        @media print {
          body {
            padding: 0;
            background: transparent;
          }
          .cert-container {
            border: 2px solid #2563eb;
            box-shadow: none;
            padding: 22px 26px;
          }
        }
      </style>
    </head>
    <body>
      <div class="cert-container">
        
        <!-- Header con Logo y Datos de la Institución -->
        <div class="cert-header">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="display:flex; align-items:center; justify-content:center;">
              ${logoHtml}
            </div>
            <div class="clinic-info">
              <h1>${data.clinic.name}</h1>
              <p>Centro Odontológico & Médico de Especialidades</p>
              <p>${data.clinic.address} ${data.clinic.phone ? '· Tel: ' + data.clinic.phone : ''}</p>
            </div>
          </div>
          <div class="cert-folio-badge">
            <div class="folio-num">${data.folio}</div>
            <div class="folio-date">Emisión: ${data.date}</div>
          </div>
        </div>

        <!-- Título Principal -->
        <div class="cert-main-title">
          <h2>Certificado Médico de Atención y Asistencia</h2>
          <div class="sub-title">Constancia Oficial de Asistencia a Consulta y Procedimiento Clínico</div>
        </div>

        <!-- Datos del Paciente -->
        <div class="patient-card">
          <div class="p-item">
            <label>Paciente:</label>
            <span>${data.patient.name}</span>
          </div>
          <div class="p-item">
            <label>Cédula / Documento ID:</label>
            <span>${data.patient.dni}</span>
          </div>
          <div class="p-item">
            <label>Edad:</label>
            <span>${data.patient.age}</span>
          </div>
          <div class="p-item">
            <label>Cobertura / Seguro:</label>
            <span>${data.patient.insurance}</span>
          </div>
        </div>

        <!-- Tarjetas de Horario de Ingreso y Salida -->
        <div class="time-box-grid">
          <div class="time-card date-card">
            <div class="lbl">📅 Fecha de Atención</div>
            <div class="val">${data.date}</div>
          </div>
          <div class="time-card in">
            <div class="lbl">🟢 Hora de Ingreso</div>
            <div class="val">${data.timeIn} hs</div>
          </div>
          <div class="time-card out">
            <div class="lbl">🔴 Hora de Salida</div>
            <div class="val">${data.timeOut} hs</div>
          </div>
        </div>

        <!-- Declaración Formal de Certificación -->
        <div class="cert-statement">
          Por medio del presente documento, el profesional de la salud que suscribe certifica que el/la paciente <strong>${data.patient.name}</strong>, portador/a del documento de identidad N° <strong>${data.patient.dni}</strong>, acudió a este centro de atención y recibió asistencia médica/odontológica el día <strong>${data.date}</strong>, permaneciendo en las instalaciones desde las <strong>${data.timeIn} horas</strong> hasta las <strong>${data.timeOut} horas</strong>.
        </div>

        <!-- Detalle de Tratamiento, Diagnóstico y Reposo -->
        <div class="details-box">
          <div class="detail-row">
            <span class="d-label">Tratamiento / Procedimiento Efectuado:</span>
            <span class="d-val">${data.treatment}</span>
          </div>
          ${data.diagnosis ? `
            <div class="detail-row" style="margin-top:10px;">
              <span class="d-label">Diagnóstico Clínico / Motivo de Consulta:</span>
              <span class="d-val">${data.diagnosis}</span>
            </div>
          ` : ''}
          <div class="detail-row" style="margin-top:10px;">
            <span class="d-label">Indicación / Reposo Médico:</span>
            <span class="d-val" style="color:#b91c1c;">${data.rest}</span>
          </div>
          ${data.notes ? `
            <div class="detail-row" style="margin-top:10px;">
              <span class="d-label">Observaciones:</span>
              <span class="d-val" style="font-size:12px; color:#475569;">${data.notes}</span>
            </div>
          ` : ''}
        </div>

        <!-- Datos del Profesional Tratante -->
        <div class="doctor-box">
          <div>
            <div style="font-weight:800; font-size:13.5px; color:#1e293b;">${data.doctor.name}</div>
            <div style="font-size:11.5px; color:#64748b; margin-top:2px;">${data.doctor.specialty}</div>
          </div>
          <div style="text-align:right;">
            <span class="doc-badge">Matrícula / Código MSP: ${data.doctor.code}</span>
          </div>
        </div>

        <!-- Sección de Firmas y Sellos -->
        <div class="signatures-area">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-title">Firma y Sello del Profesional</div>
            <div class="sig-sub">${data.doctor.name}<br>Cód. / Matrícula: ${data.doctor.code}</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-title">Firma del Paciente / Receptor</div>
            <div class="sig-sub">Cédula: ${data.patient.dni}</div>
          </div>
        </div>

        <!-- Footer de Seguridad y Verificación -->
        <div class="cert-footer">
          <div>Documento emitido para fines legales, laborales o académicos a solicitud de la parte interesada.</div>
          <div>Código de Validación: ${data.folio} · Sistema Consultorios.pro</div>
        </div>

      </div>
    </body>
    </html>
  `;
}
