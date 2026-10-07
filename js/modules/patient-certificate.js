/**
 * patient-certificate.js - Generador Oficial de Certificados Odontológicos y Médicos (MSP / Ecuador)
 */
import { showToast } from './app-utils.js';
import { state } from './app-state.js';
import { NANI_DENT_LOGO_BASE64, NANI_DENT_LETTERHEAD_BASE64, CLINIC_BRANDING } from './branding-assets.js';

export const DEFAULT_CLINIC_LOGO = `<img src="${NANI_DENT_LOGO_BASE64}" alt="Nani Dent" style="max-height:65px; width:auto; max-width:210px; object-fit:contain;">`;

/* ============================================================
 *  Utilidades oficiales de texto y fecha en español
 * ============================================================ */
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const UNIDADES = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
const DECENAS = ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];

export function numeroALetras(n) {
  n = Number(n);
  if (isNaN(n)) return '';
  if (n < 30) return UNIDADES[n] || String(n);
  if (n < 100) {
    const d = Math.floor(n / 10), u = n % 10;
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
  }
  if (n === 100) return 'cien';
  if (n < 1000) {
    const c = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
    const r = n % 100;
    return r === 0 ? c[Math.floor(n / 100)] : `${c[Math.floor(n / 100)]} ${numeroALetras(r)}`;
  }
  if (n < 1000000) {
    const miles = Math.floor(n / 1000), r = n % 1000;
    const pref = miles === 1 ? 'mil' : `${numeroALetras(miles)} mil`;
    return r === 0 ? pref : `${pref} ${numeroALetras(r)}`;
  }
  return String(n);
}

export function anioALetras(y) {
  const resto = y % 100;
  const base = Math.floor(y / 100) * 100;
  const parteBase = numeroALetras(base);
  if (resto === 0) return parteBase;
  if (resto < 20) return `${parteBase} ${numeroALetras(resto)}`;
  const d = Math.floor(resto / 10), u = resto % 10;
  return u === 0 ? `${parteBase} ${DECENAS[d]}` : `${parteBase} ${DECENAS[d]} y ${UNIDADES[u]}`;
}

const pad = (n) => String(n).padStart(2, '0');

export function parseFecha(iso) {
  if (!iso) return { corta: '', letras: '', largaNumerica: '' };
  const parts = iso.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return { corta: iso, letras: iso, largaNumerica: iso };
  const [y, m, d] = parts;
  const mesName = MESES[m - 1] || 'enero';
  return {
    corta: `${pad(d)}/${pad(m)}/${y}`,
    letras: `${numeroALetras(d)} de ${mesName} del ${anioALetras(y)}`,
    largaNumerica: `${pad(d)} de ${mesName.replace(/^./, c => c.toUpperCase())} del ${y}`,
  };
}

export function openCertificateModal(patient, initialData = {}) {
  const existingModal = document.getElementById('certificateModal');
  if (existingModal) existingModal.remove();

  const savedClinic = JSON.parse(localStorage.getItem('doctor2_clinic_settings') || '{}');
  const clinicName = savedClinic.name || CLINIC_BRANDING.name || 'Consultorio Odontológico NaniDent';
  const clinicAddress = savedClinic.address || CLINIC_BRANDING.address || 'Calle Juan Larrea N13-128 y Arenas';
  const clinicPhone = savedClinic.phone || CLINIC_BRANDING.phone || '099 261 4402';
  const clinicEmail = savedClinic.email || CLINIC_BRANDING.email || 'nanident.ec@gmail.com';
  const clinicUnicodigo = savedClinic.unicodigo || CLINIC_BRANDING.unicodigo || '85997';
  const clinicCity = savedClinic.city || CLINIC_BRANDING.city || 'Quito DM';
  const clinicLogoUrl = savedClinic.logoUrl || NANI_DENT_LOGO_BASE64;

  const profs = state.professionals || [];
  const currentUser = state.user || {};
  let selectedProf = profs.find(p => p.id === patient?.assignedProfessionalId) || profs[0] || {
    name: currentUser.name || 'Karla Daniela Sanunga Sánchez',
    specialty: currentUser.specialty || 'ODONTÓLOGA GENERAL',
    dni: currentUser.dni || currentUser.cedula || '1722381124',
    email: currentUser.email || 'nanident.ec@gmail.com',
    senescyt: currentUser.senescyt || '1032-2022-2565446',
    phone: currentUser.phone || '099 261 4402',
    license_code: currentUser.license_code || 'MSP-1032-EC'
  };

  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Calcular hora de ingreso y salida por defecto
  const inDate = new Date(now.getTime() - 45 * 60000);
  const defaultTimeIn = inDate.toTimeString().slice(0, 5);
  const defaultTimeOut = currentTime;

  // Extraer último diagnóstico y procedimiento del paciente si existe
  const lastNote = patient?.clinicalNotes?.[0];
  const lastDx = patient?.clinicalHistory?.diagnosticosCIE10?.[0]?.dx || lastNote?.diagnostico || lastNote?.diagnosticoTipo || 'Examen y control odontológico de rutina';
  const lastCie = patient?.clinicalHistory?.diagnosticosCIE10?.[0]?.cie || lastNote?.cie || 'Z01.2';
  const defaultDxText = initialData.diagnosis || `${lastDx} (CIE-10: ${lastCie})`;
  const defaultObservation = initialData.treatment || (lastNote ? `${lastNote.procedimiento || lastNote.diagnosticoTipo || 'Atención odontológica'}${lastNote.pieza ? ' en pieza ' + lastNote.pieza : ''}` : 'Luego de examen clínico y valoración se realiza tratamiento odontológico integral según protocolo clínico.');

  const defaultHcNumber = patient?.hcNumber || patient?.historiaClinica || (patient?.dni ? patient.dni : 'ND-0001');
  const defaultAddress = patient?.address || patient?.direccion || 'Quito, Ecuador';

  // Fechas de reposo por defecto
  const dateFrom = currentDate;
  const toDateObj = new Date(now.getTime() + 2 * 86400000);
  const dateTo = toDateObj.toISOString().slice(0, 10);

  const modal = document.createElement('div');
  modal.id = 'certificateModal';
  modal.className = 'modal';

  modal.innerHTML = `
    <div class="modal-body" style="max-width:820px; width:95%; max-height:92vh; overflow-y:auto; padding:24px; background:var(--surface);">
      <!-- Modal Header -->
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:14px; margin-bottom:18px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, var(--primary), #8b5cf6); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.3rem; box-shadow:0 4px 12px rgba(99,102,241,0.3);">
            <i class="fas fa-certificate"></i>
          </div>
          <div>
            <h3 style="margin:0; font-size:1.25rem; color:var(--text); font-weight:800;">Emisión de Certificado Odontológico</h3>
            <p class="muted" style="margin:2px 0 0; font-size:0.82rem;">Formato oficial para constancia de atención, diagnóstico CIE-10 y prescripción de reposo absoluto</p>
          </div>
        </div>
        <button class="ghost close-cert-modal" style="font-size:1.2rem; cursor:pointer;" title="Cerrar"><i class="fas fa-times"></i></button>
      </div>

      <!-- Certificate Form Body -->
      <form id="certificateForm" onsubmit="event.preventDefault();">
        
        <!-- SECCIÓN 1: DATOS DE LA CLÍNICA / DISPENSARIO -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:700; font-size:0.85rem; color:var(--primary);"><i class="fas fa-clinic-medical"></i> Datos del Consultorio / Clínica</span>
            <small class="muted">Aparecerán en el encabezado superior</small>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Nombre del Consultorio / Clínica</label>
              <input type="text" id="certClinicName" value="${clinicName}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Dirección</label>
              <input type="text" id="certClinicAddress" value="${clinicAddress}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Ciudad</label>
              <input type="text" id="certClinicCity" value="${clinicCity}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Teléfono</label>
              <input type="text" id="certClinicPhone" value="${clinicPhone}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Correo Electrónico</label>
              <input type="email" id="certClinicEmail" value="${clinicEmail}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--primary); display:block; margin-bottom:4px;">Unicódigo (MSP)</label>
              <input type="text" id="certClinicUnicodigo" value="${clinicUnicodigo}" placeholder="Ej: 85997" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:700;">
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Logo (URL o imagen local)</label>
              <div style="display:flex; gap:6px;">
                <input type="text" id="certClinicLogoUrl" value="${clinicLogoUrl}" placeholder="URL o base64" class="input-field" style="flex:1; padding:7px 10px; font-size:0.85rem;">
                <label class="ghost" style="padding:7px 10px; cursor:pointer; font-size:0.85rem;" title="Subir logo desde este equipo">
                  <i class="fas fa-upload"></i>
                  <input type="file" id="certLogoFile" accept="image/*" style="display:none;">
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- OPCIÓN DE IMPRESIÓN CON HOJA MEMBRETADA -->
        <div style="background:linear-gradient(135deg, rgba(14,116,144,0.06), rgba(99,102,241,0.06)); border:1px solid rgba(14,116,144,0.25); border-radius:10px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="certUseLetterhead" style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;">
            <label for="certUseLetterhead" style="font-weight:700; font-size:0.88rem; color:var(--text); cursor:pointer;">
              <i class="fas fa-file-invoice" style="color:var(--primary); margin-right:4px;"></i> Formato Hoja Membretada Oficial Nani Dent
            </label>
          </div>
          <span class="badge" style="font-size:0.75rem; background:var(--surface); border:1px solid var(--border); color:var(--muted);">
            Ajusta los márgenes exactos para hoja membretada
          </span>
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
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Nombre del Médico / Odontólogo</label>
              <input type="text" id="certDoctorName" value="${selectedProf.name || ''}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Especialidad</label>
              <input type="text" id="certDoctorSpecialty" value="${selectedProf.specialty || 'ODONTÓLOGA GENERAL'}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Cédula CI del Profesional</label>
              <input type="text" id="certDoctorCedula" value="${selectedProf.dni || selectedProf.cedula || '1722381124'}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Correo del Profesional</label>
              <input type="email" id="certDoctorEmail" value="${selectedProf.email || clinicEmail}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--primary); display:block; margin-bottom:4px;">Reg. Senescyt</label>
              <input type="text" id="certDoctorSenescyt" value="${selectedProf.senescyt || '1032-2022-2565446'}" placeholder="Ej: 1032-2022-2565446" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:700;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Teléfono del Profesional</label>
              <input type="text" id="certDoctorPhone" value="${selectedProf.phone || clinicPhone}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Código de Habilitación / Matrícula MSP</label>
              <input type="text" id="certDoctorCode" value="${selectedProf.license_code || selectedProf.licenseCode || currentUser.license_code || 'MSP-1032-EC'}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:700;">
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: DATOS DEL PACIENTE -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
          <span style="font-weight:700; font-size:0.85rem; color:var(--primary); display:block; margin-bottom:10px;"><i class="fas fa-user-injured"></i> Datos del Paciente</span>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
            <div style="grid-column: span 2;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Nombre Completo del Paciente</label>
              <input type="text" id="certPatientName" value="${patient?.name || ''}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:700;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Cédula de Identidad</label>
              <input type="text" id="certPatientDni" value="${patient?.dni || ''}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--primary); display:block; margin-bottom:4px;">Número de Historia Clínica</label>
              <input type="text" id="certPatientHc" value="${defaultHcNumber}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:700; color:var(--primary);">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Teléfono</label>
              <input type="text" id="certPatientPhone" value="${patient?.phone || ''}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div style="grid-column: span 2;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Dirección de Domicilio</label>
              <input type="text" id="certPatientAddress" value="${defaultAddress}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
          </div>
        </div>

        <!-- SECCIÓN 4: FECHA Y HORA DE ATENCIÓN -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
          <span style="font-weight:700; font-size:0.85rem; color:var(--primary); display:block; margin-bottom:10px;"><i class="fas fa-clock"></i> Fecha y Horario de Atención</span>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Fecha de Atención</label>
              <input type="date" id="certDate" value="${currentDate}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;" required>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Hora de Atención (Texto)</label>
              <input type="text" id="certTime" value="10:00 am" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:#059669; display:block; margin-bottom:4px;"><i class="fas fa-sign-in-alt"></i> Hora Ingreso</label>
              <input type="time" id="certTimeIn" value="${defaultTimeIn}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:#dc2626; display:block; margin-bottom:4px;"><i class="fas fa-sign-out-alt"></i> Hora Salida</label>
              <input type="time" id="certTimeOut" value="${defaultTimeOut}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
            </div>
          </div>
        </div>

        <!-- SECCIÓN 5: DIAGNÓSTICO, OBSERVACIÓN Y REPOSO MÉDICO -->
        <div style="background:var(--bg-page); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:18px;">
          <span style="font-weight:700; font-size:0.85rem; color:var(--primary); display:block; margin-bottom:10px;"><i class="fas fa-stethoscope"></i> Diagnóstico, Observación y Reposo Médico</span>
          
          <div style="margin-bottom:10px;">
            <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Diagnóstico(s) (con código CIE-10)</label>
            <input type="text" id="certDiagnosis" value="${defaultDxText}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;" required>
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Observación / Procedimiento Clínico Efectuado</label>
            <textarea id="certObservation" rows="3" class="input-field" style="width:100%; padding:8px 10px; font-size:0.88rem; resize:vertical;" required>${defaultObservation}</textarea>
          </div>

          <!-- BLOQUE DE REPOSO ABSOLUTO -->
          <div style="background:var(--surface); border:1.5px dashed var(--primary); border-radius:8px; padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
              <span style="font-weight:700; font-size:0.85rem; color:var(--primary);"><i class="fas fa-bed"></i> Prescripción de Reposo Absoluto</span>
              <small class="muted">Si es 0 días, no se incluirá el párrafo de reposo</small>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
              <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Días de Reposo (0 = Ninguno)</label>
                <input type="number" id="certRestDays" min="0" max="30" value="3" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem; font-weight:700;">
              </div>
              <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Desde (Fecha)</label>
                <input type="date" id="certRestFrom" value="${dateFrom}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
              </div>
              <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--muted); display:block; margin-bottom:4px;">Hasta (Fecha)</label>
                <input type="date" id="certRestTo" value="${dateTo}" class="input-field" style="width:100%; padding:7px 10px; font-size:0.88rem;">
              </div>
            </div>
          </div>
        </div>

        <!-- ACCIONES DEL MODAL -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-top:1px solid var(--border); padding-top:16px;">
          <button type="button" class="ghost close-cert-modal" style="font-size:0.9rem;">Cancelar</button>
          
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="ghost" id="certWhatsAppBtn" style="background:#25d366; color:#fff; border-color:#25d366; font-size:0.88rem; font-weight:600;">
              <i class="fab fa-whatsapp"></i> Compartir WhatsApp
            </button>
            <button type="button" class="primary" id="certPrintBtn" style="font-size:0.88rem; font-weight:700; padding:8px 20px;">
              <i class="fas fa-print"></i> Imprimir / Guardar PDF
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
        modal.querySelector('#certDoctorSpecialty').value = p.specialty || 'ODONTÓLOGA GENERAL';
        modal.querySelector('#certDoctorCedula').value = p.dni || p.cedula || '1722381124';
        modal.querySelector('#certDoctorEmail').value = p.email || clinicEmail;
        modal.querySelector('#certDoctorSenescyt').value = p.senescyt || '1032-2022-2565446';
        modal.querySelector('#certDoctorPhone').value = p.phone || clinicPhone;
        modal.querySelector('#certDoctorCode').value = p.license_code || p.licenseCode || '';
      }
    });
  }

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

  // Actualizar automáticamente fecha 'Hasta' cuando cambian los días de reposo
  const restDaysInput = modal.querySelector('#certRestDays');
  const restFromInput = modal.querySelector('#certRestFrom');
  const restToInput = modal.querySelector('#certRestTo');

  const updateRestToDate = () => {
    const days = parseInt(restDaysInput?.value, 10) || 0;
    const fromStr = restFromInput?.value || currentDate;
    if (days > 0 && fromStr) {
      const fromParts = fromStr.split('-').map(Number);
      const dObj = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
      dObj.setDate(dObj.getDate() + (days - 1));
      restToInput.value = dObj.toISOString().slice(0, 10);
    }
  };

  restDaysInput?.addEventListener('input', updateRestToDate);
  restFromInput?.addEventListener('change', updateRestToDate);

  // Recolectar datos estructurados del certificado
  function collectCertData() {
    const clinic = {
      nombre: modal.querySelector('#certClinicName')?.value.trim() || clinicName,
      direccion: modal.querySelector('#certClinicAddress')?.value.trim() || clinicAddress,
      ciudad: modal.querySelector('#certClinicCity')?.value.trim() || clinicCity,
      telefono: modal.querySelector('#certClinicPhone')?.value.trim() || clinicPhone,
      correo: modal.querySelector('#certClinicEmail')?.value.trim() || clinicEmail,
      unicodigo: modal.querySelector('#certClinicUnicodigo')?.value.trim() || clinicUnicodigo,
      logoUrl: modal.querySelector('#certClinicLogoUrl')?.value.trim() || clinicLogoUrl
    };

    // Guardar ajustes de clínica para futuras emisiones
    localStorage.setItem('doctor2_clinic_settings', JSON.stringify({
      name: clinic.nombre,
      address: clinic.direccion,
      city: clinic.ciudad,
      phone: clinic.telefono,
      email: clinic.correo,
      unicodigo: clinic.unicodigo,
      logoUrl: clinic.logoUrl
    }));

    const doctorRawName = modal.querySelector('#certDoctorName')?.value.trim() || 'Karla Daniela Sanunga Sánchez';
    const doctor = {
      nombre: doctorRawName,
      nombreConTitulo: doctorRawName.toLowerCase().startsWith('od.') || doctorRawName.toLowerCase().startsWith('dr.') ? doctorRawName : `Od. ${doctorRawName}`,
      nombreMayusculas: doctorRawName.toUpperCase().startsWith('OD.') ? doctorRawName.toUpperCase() : `OD. ${doctorRawName.toUpperCase()}`,
      especialidad: modal.querySelector('#certDoctorSpecialty')?.value.trim() || 'ODONTÓLOGA GENERAL',
      cedula: modal.querySelector('#certDoctorCedula')?.value.trim() || '1722381124',
      correo: modal.querySelector('#certDoctorEmail')?.value.trim() || clinic.correo,
      senescyt: modal.querySelector('#certDoctorSenescyt')?.value.trim() || '1032-2022-2565446',
      telefono: modal.querySelector('#certDoctorPhone')?.value.trim() || clinic.telefono,
      code: modal.querySelector('#certDoctorCode')?.value.trim() || 'MSP-1032-EC'
    };

    const patientData = {
      nombre: (modal.querySelector('#certPatientName')?.value.trim() || patient?.name || '').toUpperCase(),
      cedula: modal.querySelector('#certPatientDni')?.value.trim() || patient?.dni || '',
      historiaClinica: modal.querySelector('#certPatientHc')?.value.trim() || defaultHcNumber,
      telefono: modal.querySelector('#certPatientPhone')?.value.trim() || patient?.phone || '',
      direccion: modal.querySelector('#certPatientAddress')?.value.trim() || defaultAddress
    };

    const atencionFechaIso = modal.querySelector('#certDate')?.value || currentDate;
    const atencionHora = modal.querySelector('#certTime')?.value.trim() || '10:00 am';
    const fAtencion = parseFecha(atencionFechaIso);

    const restDays = parseInt(modal.querySelector('#certRestDays')?.value, 10) || 0;
    const restFromIso = modal.querySelector('#certRestFrom')?.value || atencionFechaIso;
    const restToIso = modal.querySelector('#certRestTo')?.value || atencionFechaIso;
    const fDesde = parseFecha(restFromIso);
    const fHasta = parseFecha(restToIso);

    let reposo = null;
    if (restDays > 0) {
      reposo = {
        dias: restDays,
        desde: restFromIso,
        hasta: restToIso,
        diasTexto: `${restDays} (${numeroALetras(restDays)}) días`,
        desdeTexto: `${fDesde.corta} ${fDesde.letras}`,
        hastaTexto: `${fHasta.corta} ${fHasta.letras}`
      };
    }

    return {
      clinica: clinic,
      doctor,
      paciente: patientData,
      ciudadFechaLarga: `${clinic.ciudad}, ${fAtencion.largaNumerica}`,
      atencion: {
        fecha: atencionFechaIso,
        hora: atencionHora,
        fechaTexto: `${fAtencion.letras}. (${fAtencion.corta})`,
        timeIn: modal.querySelector('#certTimeIn')?.value || defaultTimeIn,
        timeOut: modal.querySelector('#certTimeOut')?.value || defaultTimeOut
      },
      diagnosticoTexto: modal.querySelector('#certDiagnosis')?.value.trim() || defaultDxText,
      observacion: modal.querySelector('#certObservation')?.value.trim() || defaultObservation,
      reposo,
      folio: `CERT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
    };
  }

  // Evento Imprimir / Descargar PDF
  modal.querySelector('#certPrintBtn')?.addEventListener('click', () => {
    const certData = collectCertData();
    const useLetterhead = modal.querySelector('#certUseLetterhead')?.checked || false;
    const html = generateCertificateHTML(certData, useLetterhead);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Permita las ventanas emergentes para ver el Certificado / PDF', 'warning');
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
    const phone = (certData.paciente.telefono || '').replace(/\D/g, '');
    
    let msg = `📜 *CERTIFICADO ODONTOLÓGICO*%0A` +
      `*${certData.clinica.nombre}*%0A` +
      `*Unicódigo MSP:* ${certData.clinica.unicodigo}%0A` +
      `*Emisión:* ${certData.ciudadFechaLarga}%0A%0A` +
      `👤 *Paciente:* ${certData.paciente.nombre}%0A` +
      `🆔 *Cédula CI:* ${certData.paciente.cedula}%0A` +
      `📋 *Historia Clínica N°:* ${certData.paciente.historiaClinica}%0A` +
      `📅 *Fecha y Hora de Atención:* ${certData.atencion.fechaTexto} · ${certData.atencion.hora}%0A` +
      `🩺 *Diagnóstico:* ${certData.diagnosticoTexto}%0A` +
      `📝 *Observación:* ${certData.observacion}%0A`;

    if (certData.reposo && certData.reposo.dias > 0) {
      msg += `%0A🛌 *Prescripción:* Reposo absoluto durante ${certData.reposo.diasTexto}, desde ${certData.reposo.desdeTexto} hasta ${certData.reposo.hastaTexto}.%0A`;
    }

    msg += `%0A👨‍⚕️ *Profesional:* ${certData.doctor.nombreMayusculas}%0A` +
      `🏥 *Especialidad:* ${certData.doctor.especialidad}%0A` +
      `🏛️ *Reg. Senescyt:* ${certData.doctor.senescyt} · CI: ${certData.doctor.cedula}%0A` +
      `_Certificado emitido formalmente desde Doctor2 Pro_`;

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
 * Genera el documento HTML oficial A4 para el Certificado Odontológico
 */
export function generateCertificateHTML(data, useLetterhead = false) {
  const logoHtml = data.clinica.logoUrl
    ? `<img src="${data.clinica.logoUrl}" alt="Logo" class="cert-logo" style="max-width:85mm; max-height:28mm; object-fit:contain;">`
    : `<img src="${NANI_DENT_LOGO_BASE64}" alt="Logo" class="cert-logo" style="max-width:85mm; max-height:28mm; object-fit:contain;">`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Certificado Odontológico - ${data.paciente.nombre}</title>
      <style>
        @page {
          size: A4;
          margin: ${useLetterhead ? '0' : '0'};
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: #e5e7eb;
          font-family: Arial, Helvetica, sans-serif;
          color: #000000;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .cert-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 14mm 22mm 18mm;
          font-size: 11pt;
          line-height: 1.6;
          position: relative;
        }
        .cert-page.on-letterhead {
          background-image: url('${NANI_DENT_LETTERHEAD_BASE64}') !important;
          background-size: 100% 100% !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          padding: 38mm 22mm 24mm 22mm !important;
        }
        .cert-page.on-letterhead .cert-header {
          visibility: hidden !important;
        }
        .cert-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .cert-logo {
          max-width: 85mm;
          max-height: 28mm;
          object-fit: contain;
        }
        .cert-clinic {
          text-align: right;
          font-weight: 700;
          font-size: 11pt;
          line-height: 1.35;
        }
        .cert-clinic a {
          color: #0563c1;
          text-decoration: none;
        }
        .cert-title {
          text-align: center;
          font-weight: 700;
          font-size: 12pt;
          margin: 14mm 0 8mm;
          letter-spacing: 0.5px;
        }
        .cert-city-date {
          text-align: right;
          font-weight: 700;
          margin-bottom: 8mm;
          font-size: 11pt;
        }
        .cert-body {
          padding: 0 4mm 0 0;
        }
        .cert-row {
          margin: 0 0 3px 0;
          line-height: 1.55;
        }
        .cert-row b {
          font-weight: 700;
        }
        .cert-text {
          text-align: justify;
          margin: 4px 0;
          line-height: 1.55;
        }
        .cert-rest-block {
          margin-top: 6px;
        }
        .cert-rest {
          margin: 0 0 2px 0;
          line-height: 1.55;
        }
        .cert-sign {
          margin-top: 14mm;
        }
        .cert-sign .sign-space {
          height: 20mm;
        }
        .cert-sign p {
          margin: 0 0 2px 0;
          font-weight: 700;
          line-height: 1.35;
        }
        .toolbar {
          position: sticky;
          top: 0;
          background: #0f172a;
          padding: 10px;
          text-align: center;
          z-index: 9999;
        }
        .toolbar button {
          padding: 8px 20px;
          border: 0;
          border-radius: 6px;
          background: #14b8a6;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          font-size: 14px;
        }
        @media print {
          body {
            background: #fff;
          }
          .cert-page {
            margin: 0;
            box-shadow: none;
            width: 100%;
            min-height: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .cert-page {
            box-shadow: 0 6px 24px rgba(0,0,0,.15);
            margin-top: 16px;
            margin-bottom: 16px;
          }
        }
      </style>
    </head>
    <body>

      <div class="toolbar no-print">
        <button type="button" onclick="window.print()"><i class="fas fa-print"></i> Imprimir / Guardar PDF</button>
      </div>

      <div class="${useLetterhead ? 'cert-page on-letterhead' : 'cert-page'}" id="certificate">
        <!-- Encabezado: logo a la izquierda, datos del consultorio a la derecha -->
        <header class="cert-header">
          ${logoHtml}
          <div class="cert-clinic">
            <div>${data.clinica.nombre}</div>
            <div>${data.doctor.nombreConTitulo}</div>
            <div>${data.clinica.direccion}</div>
            <div>Teléfono: <span>${data.clinica.telefono}</span></div>
            <div>Correo: <a href="mailto:${data.clinica.correo}">${data.clinica.correo}</a></div>
            <div>Unicódigo: <span>${data.clinica.unicodigo}</span></div>
          </div>
        </header>

        <h1 class="cert-title">CERTIFICADO ODONTOLÓGICO</h1>
        <div class="cert-city-date"><span>${data.ciudadFechaLarga}</span></div>

        <!-- Datos del paciente y atención -->
        <section class="cert-body">
          <p class="cert-row"><b>Paciente:</b> <span>${data.paciente.nombre}</span></p>
          <p class="cert-row"><b>Cédula de identidad:</b> <span>${data.paciente.cedula}</span></p>
          <p class="cert-row"><b>Número de historia clínica:</b> <span>${data.paciente.historiaClinica}</span></p>
          <p class="cert-row"><b>Teléfono:</b> <span>${data.paciente.telefono}</span></p>
          <p class="cert-row"><b>Dirección de domicilio:</b> <span>${data.paciente.direccion}</span></p>
          <p class="cert-row"><b>Fecha de atención:</b> <span>${data.atencion.fechaTexto}</span></p>
          <p class="cert-row"><b>Hora de atención:</b> <span>${data.atencion.hora}</span></p>
          <p class="cert-row"><b>Diagnóstico:</b> <span>${data.diagnosticoTexto}</span></p>
          <p class="cert-text"><b>Observación:</b> <span>${data.observacion}</span></p>

          <!-- Bloque de reposo: se oculta si no hay días de reposo -->
          ${data.reposo && data.reposo.dias > 0 ? `
            <div class="cert-rest-block" id="reposoBlock">
              <p class="cert-rest">Se prescribe reposo <b>absoluto</b> durante <span>${data.reposo.diasTexto}</span>.</p>
              <p class="cert-rest">Desde <span>${data.reposo.desdeTexto}</span>.</p>
              <p class="cert-rest">Hasta <span>${data.reposo.hastaTexto}</span>.</p>
            </div>
          ` : ''}
        </section>

        <!-- Firma -->
        <footer class="cert-sign">
          <p>Atentamente;</p>
          <div class="sign-space"></div>
          <p>${data.doctor.nombreMayusculas}</p>
          <p>${data.doctor.especialidad.toUpperCase()}</p>
          <p>CI. <span>${data.doctor.cedula}</span></p>
          <p>Mail: <a href="mailto:${data.doctor.correo}" style="color:#0563c1; text-decoration:none;">${data.doctor.correo}</a></p>
          <p>Reg.Senescyt: <span>${data.doctor.senescyt}</span></p>
          <p>Teléfono: <span>${data.doctor.telefono}</span></p>
        </footer>
      </div>

    </body>
    </html>
  `;
}
