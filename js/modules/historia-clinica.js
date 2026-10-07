/**
 * historia-clinica.js - Sistema Integral de Historia Clínica Odontológica (12 Secciones Oficiales + CIE-10)
 * Diseñado con interfaz moderna en formato Accordion Card Deck (desplegable e interactivo)
 */
import { showToast, apiFetch, formatDate, calculateAge, getPatientHcNumber } from './app-utils.js';
import { searchCIE10, getCIE10ByCode, addCustomCIE10, getCIE10Categories, getPopularCIE10, getFullCIE10Catalogue } from './cie10-catalogue.js';
import { renderOdontogram } from './app-odontogram.js';

export function createHistoriaClinica(patient, notes = [], plans = [], canEdit = true, onSaveNote, onUpdatePlan, onSaveFullHistory, professionals = []) {
  const container = document.createElement('div');
  container.className = 'historia-clinica-card';

  const profList = (professionals && professionals.length > 0)
    ? professionals
    : (window.state?.professionals || []);

  const assignedProf = profList.find(p => p.id === patient.assignedProfessionalId)
    || profList.find(p => p.name === patient.assignedProfessionalName)
    || (patient.assignedProfessionalName ? { name: patient.assignedProfessionalName } : null)
    || profList[0]
    || { name: 'Dr. Asignado' };

  const defaultDoctorName = assignedProf.name || patient.assignedProfessionalName || 'Dr. Asignado';

  const ch = patient.clinicalHistory || {};
  const ant = ch.antecedentes || {};
  const antDet = ant.detalles || {};
  const sig = ch.signosVitales || {};
  const est = ch.estomatognatico || {};
  const ind = ch.indicadoresSalud || {};
  const cpoData = ch.cpo || calculateCPOFromNotes(notes);
  const planesDx = ch.planes || {};
  const planesDet = planesDx.detalles || {};
  const otrosList = (Array.isArray(planesDx.otrosList) && planesDx.otrosList.length > 0)
    ? planesDx.otrosList
    : (planesDx.otros ? planesDx.otros.split(/\n|; /).map(s => s.trim()).filter(Boolean) : ['']);
  if (otrosList.length === 0) otrosList.push('');
  const esc = (s) => (s || '').toString().replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const rawBirth = (patient.birthdate || patient.birthDate || patient.birth_date || patient.fecha_nacimiento || patient.dob || '').toString().trim();
  const rawAge = patient.age || patient.edad || null;
  let calcAge = calculateAge(rawBirth || rawAge);
  if (calcAge === 'Sin edad' && rawAge) calcAge = `${rawAge} años`;


  const rawDiagList = (ch.diagnosticosCIE10 && ch.diagnosticosCIE10.length > 0)
    ? [...ch.diagnosticosCIE10]
    : (ch.diagnosticosCIE11 && ch.diagnosticosCIE11.length > 0)
      ? [...ch.diagnosticosCIE11]
      : [];

  while (rawDiagList.length < 4) {
    rawDiagList.push({ dx: '', cie: '', tipo: 'PRE' });
  }
  const diagList = rawDiagList;

  const patientInitials = (patient.name || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  container.innerHTML = `
    <!-- 1. HÉROE SUPERIOR / RESUMEN DEL PACIENTE -->
    <div class="hc-hero-banner" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px; padding:18px 22px; background:var(--glass-bg-card); border:1px solid var(--glass-border); border-radius:18px; box-shadow:var(--glass-shadow);">
      <div class="hc-hero-patient" style="display:flex; align-items:center; gap:14px;">
        <div class="hc-hero-avatar" style="width:52px; height:52px; border-radius:14px; background:linear-gradient(135deg, var(--primary), #8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.3rem; font-weight:800; box-shadow:0 4px 14px rgba(99,102,241,0.35); flex-shrink:0;">${patientInitials}</div>
        <div class="hc-hero-title">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:var(--text); letter-spacing:-0.3px;">${patient.name || 'Paciente sin registrar'}</h3>
            <span class="badge primary" style="font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(99,102,241,0.12); color:var(--primary); border:1px solid rgba(99,102,241,0.25);">
              HISTORIA CLÍNICA Nro: ${getPatientHcNumber(patient)}
            </span>
          </div>
          <div class="hc-hero-meta" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:4px; font-size:0.83rem; color:var(--muted);">
            <span><i class="fas fa-id-card" style="color:var(--primary);"></i> Cédula: <strong style="color:var(--text);">${patient.dni || 'Sin Cédula'}</strong></span>
            <span><i class="fas fa-venus-mars" style="color:var(--primary);"></i> Género: <strong style="color:var(--text);">${patient.sex || 'No espec.'}</strong></span>
            <span><i class="fas fa-shield-halved" style="color:var(--primary);"></i> <strong style="color:var(--text);">${patient.health_insurance || patient.insurance || 'Particular'}</strong></span>
            ${patient.phone ? `<span><i class="fab fa-whatsapp" style="color:#22c55e;"></i> ${patient.phone}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="hc-hero-actions" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <button type="button" id="hcCertificateBtn" class="ghost" style="font-size:0.82rem; padding:8px 14px; color:var(--primary); border-color:rgba(99,102,241,0.3); font-weight:700;" title="Emitir Certificado de Asistencia y Atención Médica">
          <i class="fas fa-certificate"></i> Certificado
        </button>
        <button type="button" id="hcExpandAllBtn" class="ghost" style="font-size:0.82rem; padding:8px 14px;" title="Desplegar todas las secciones">
          <i class="fas fa-angles-down"></i> Desplegar Todo
        </button>
        <button type="button" id="hcCollapseAllBtn" class="ghost" style="font-size:0.82rem; padding:8px 14px;" title="Colapsar todas las secciones">
          <i class="fas fa-angles-up"></i> Colapsar Todo
        </button>
        ${canEdit ? `
          <button id="hcSaveAllBtn" class="primary" style="box-shadow:0 4px 14px rgba(99,102,241,0.35); padding:10px 18px; font-weight:700;">
            <i class="fas fa-save"></i> Guardar Historia
          </button>
        ` : ''}
      </div>
    </div>

    <!-- 2. MAZO DE TARJETAS ACORDEÓN (12 SECCIONES CLÍNICAS OFICIALES) -->
    <div class="hc-accordion-deck">
      
      <!-- ========================================================
           SECCIÓN 1: DATOS DE FILIACIÓN Y REGISTRO
           ======================================================== -->
      <div class="hc-accordion-card open" data-section="1">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-id-card"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">1.</span> Datos de Filiación y Registro</span>
              <span class="hc-acc-sub">Identificación, edad, ocupación, residencia y contacto</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Filiación</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div class="grid-3" style="gap:14px;">
            <label class="field"><span>HISTORIA CLÍNICA Nro:</span><input type="text" value="${getPatientHcNumber(patient)}" readonly class="field-readonly" style="font-weight:700; color:var(--primary);"></label>
            <label class="field"><span>Nombre Completo</span><input type="text" value="${patient.name || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Cédula / Identificación</span><input type="text" value="${patient.dni || ''}" readonly class="field-readonly"></label>
            <div class="field" style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; font-weight:600; color:var(--muted);">Fecha de Nacimiento / Edad</span>
                <span id="hcFiliacionAgeBadge" class="badge" style="font-size:0.8rem; font-weight:700; background:rgba(0,135,121,0.12); color:#008779; border:1px solid rgba(0,135,121,0.25);">
                  ${calcAge !== 'Sin edad' ? calcAge : 'Sin edad'}
                </span>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="date" id="hcFiliacionBirthdate" value="${rawBirth && rawBirth !== '0000-00-00' ? rawBirth : ''}" class="field-input" style="flex:1; padding:6px 10px; font-size:0.88rem; font-weight:600;" title="Seleccionar fecha de nacimiento">
                <input type="text" id="hcFiliacionAgeText" value="${calcAge !== 'Sin edad' ? calcAge : ''}" placeholder="Edad" class="field-input" style="width:95px; padding:6px 8px; font-size:0.88rem; text-align:center; font-weight:700; color:var(--text);" title="Edad del paciente">
              </div>
            </div>
            <label class="field"><span>Género</span><input type="text" value="${patient.sex || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Estado Civil</span><input type="text" value="${patient.civil_status || patient.civilStatus || 'Soltero/a'}" readonly class="field-readonly"></label>
            <label class="field"><span>Ocupación</span><input type="text" value="${patient.occupation || 'No especificada'}" readonly class="field-readonly"></label>
            <label class="field"><span>Teléfono / WhatsApp</span><input type="text" value="${patient.phone || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Email</span><input type="text" value="${patient.email || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Cobertura / Seguro Dental</span><input type="text" value="${patient.health_insurance || patient.insurance || 'Particular'}" readonly class="field-readonly"></label>
            <label class="field" style="grid-column:1/-1;"><span>Dirección de Residencia</span><input type="text" value="${patient.address || 'No registrada'}" readonly class="field-readonly"></label>
            <label class="field" style="grid-column:1/-1;"><span>Contacto de Emergencia</span><input type="text" value="${esc(patient.emergencyPhone ? `${patient.emergencyName ? patient.emergencyName + ' (' + patient.emergencyPhone + ')' : patient.emergencyPhone}` : (patient.emergencyName || patient.emergencyContact || patient.emergency_contact || 'No especificado'))}" readonly class="field-readonly"></label>
          </div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 2: MOTIVO DE CONSULTA
           ======================================================== -->
      <div class="hc-accordion-card" data-section="2">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-comment-medical"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">2.</span> Motivo de Consulta</span>
              <span class="hc-acc-sub">Queja principal anotada con las palabras del paciente</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Motivo</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div class="chips-container" id="motivoChips" style="margin-bottom:12px;">
            <span class="chip-toggle" data-val="Dolor dental agudo"><i class="fas fa-bolt"></i> Dolor Agudo</span>
            <span class="chip-toggle" data-val="Control y Limpieza Bucal"><i class="fas fa-sparkles"></i> Control y Limpieza</span>
            <span class="chip-toggle" data-val="Sangrado o inflamación de encías"><i class="fas fa-droplet"></i> Sangrado Encías</span>
            <span class="chip-toggle" data-val="Calza Caído / Rota"><i class="fas fa-tooth"></i> Calza Caído / Rota</span>
            <span class="chip-toggle" data-val="Estética / Blanqueamiento"><i class="fas fa-wand-magic-sparkles"></i> Estética</span>
            <span class="chip-toggle" data-val="Prótesis / Implante dental"><i class="fas fa-cubes"></i> Prótesis / Implantes</span>
            <span class="chip-toggle" data-val="Traumatismo dental"><i class="fas fa-car-burst"></i> Traumatismo</span>
          </div>
          <label class="field">
            <span>Descripción del Motivo (Palabras textuales del paciente)</span>
            <textarea id="hcMotivoConsulta" rows="2" placeholder="Describa la molestia principal..." style="width:100%;">${ch.motivoConsulta || ''}</textarea>
          </label>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 3: ENFERMEDAD O PROBLEMA ACTUAL
           ======================================================== -->
      <div class="hc-accordion-card" data-section="3">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-timeline"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">3.</span> Enfermedad o Problema Actual</span>
              <span class="hc-acc-sub">Cronología, localización, evolución y escala de dolor</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Evolución</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div class="grid-2" style="gap:14px;">
            <label class="field"><span>Cronología / Tiempo de Evolución</span><input id="hcEaCronologia" type="text" placeholder="Ej: Hace 3 días, empeoró anoche" value="${ch.enfermedadActual?.cronologia || ''}"></label>
            <label class="field"><span>Localización y Síntomas</span><input id="hcEaLocalizacion" type="text" placeholder="Ej: Molar inferior derecha, pulsátil al calor/frío" value="${ch.enfermedadActual?.localizacion || ''}"></label>
          </div>
          <div style="margin-top:14px;">
            <label class="field" style="margin-bottom:6px;"><span>Escala Visual Analógica de Dolor (EVA 0-10)</span></label>
            <div class="chips-container" id="evaChips">
              <span class="chip-toggle ${ch.enfermedadActual?.eva === '0' ? 'active' : ''}" data-val="0">0 - Sin dolor</span>
              <span class="chip-toggle ${ch.enfermedadActual?.eva === '1-3' ? 'active' : ''}" data-val="1-3">1-3 Leve</span>
              <span class="chip-toggle warning ${ch.enfermedadActual?.eva === '4-6' ? 'active' : ''}" data-val="4-6">4-6 Moderado</span>
              <span class="chip-toggle danger ${ch.enfermedadActual?.eva === '7-9' ? 'active' : ''}" data-val="7-9">7-9 Severo</span>
              <span class="chip-toggle danger ${ch.enfermedadActual?.eva === '10' ? 'active' : ''}" data-val="10">10 Insoportable</span>
            </div>
          </div>
          <label class="field" style="margin-top:14px;">
            <span>Evolución y Medicación Tomada</span>
            <textarea id="hcEaEvolucion" rows="2" placeholder="Detalles de analgesia previa recibida o progresión..." style="width:100%;">${ch.enfermedadActual?.evolucion || ''}</textarea>
          </label>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 4: ANTECEDENTES PERSONALES Y FAMILIARES
           ======================================================== -->
      <div class="hc-accordion-card" data-section="4">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-notes-medical"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">4.</span> Antecedentes Personales y Familiares</span>
              <span class="hc-acc-sub">Patologías sistémicas, alergias, cirugías y alerta de bifosfonatos</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Antecedentes</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">Haga clic sobre las condiciones que apliquen al paciente para especificar detalles:</p>
          <div class="chips-container" id="antecedentesChips">
            <span class="chip-toggle danger ${ant.alergiaAntibiotico ? 'active' : ''}" data-key="alergiaAntibiotico"><i class="fas fa-pills"></i> Alergia Antibióticos</span>
            <span class="chip-toggle danger ${ant.alergiaAnestesia ? 'active' : ''}" data-key="alergiaAnestesia"><i class="fas fa-syringe"></i> Alergia Anestesia</span>
            <span class="chip-toggle danger ${ant.hemorragias ? 'active' : ''}" data-key="hemorragias"><i class="fas fa-droplet"></i> Hemorragias / Anticoagulados</span>
            <span class="chip-toggle ${ant.vih ? 'active' : ''}" data-key="vih"><i class="fas fa-shield-virus"></i> VIH / SIDA</span>
            <span class="chip-toggle ${ant.tuberculosis ? 'active' : ''}" data-key="tuberculosis"><i class="fas fa-virus"></i> Tuberculosis</span>
            <span class="chip-toggle ${ant.asma ? 'active' : ''}" data-key="asma"><i class="fas fa-lungs"></i> Asma / Respiratorio</span>
            <span class="chip-toggle warning ${ant.diabetes ? 'active' : ''}" data-key="diabetes"><i class="fas fa-cube"></i> Diabetes</span>
            <span class="chip-toggle warning ${ant.hipertension ? 'active' : ''}" data-key="hipertension"><i class="fas fa-heart"></i> Hipertensión Arterial</span>
            <span class="chip-toggle warning ${ant.cardiaca ? 'active' : ''}" data-key="cardiaca"><i class="fas fa-heart-pulse"></i> Enfermedad Cardíaca</span>
            <span class="chip-toggle ${ant.otro ? 'active' : ''}" data-key="otro"><i class="fas fa-plus"></i> Otro Antecedente</span>
          </div>

          <!-- CONTENEDOR DINÁMICO DE DETALLES DE ANTECEDENTES SELECCIONADOS -->
          <div id="antecedentesDetallesGrid" class="antecedentes-detalles-grid" style="margin-top:14px;">
            <div class="antecedente-det-box danger-border" id="detWrap_alergiaAntibiotico" style="display:${ant.alergiaAntibiotico ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:#ef4444; font-weight:600;"><i class="fas fa-pills"></i> Detalle: Alergia a Antibióticos</span>
                <input type="text" class="field-input" id="hcDet_alergiaAntibiotico" placeholder="Especifique antibióticos (ej: Penicilina, Amoxicilina, Cefalosporinas, Sulfas) y reacción producida..." value="${esc(antDet.alergiaAntibiotico || ant.alergiaAntibioticoDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box danger-border" id="detWrap_alergiaAnestesia" style="display:${ant.alergiaAnestesia ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:#ef4444; font-weight:600;"><i class="fas fa-syringe"></i> Detalle: Alergia / Reacción a Anestesia</span>
                <input type="text" class="field-input" id="hcDet_alergiaAnestesia" placeholder="Especifique anestésico local (ej: Lidocaína con vasoconstrictor, Articaína, Mepivacaína, Bisulfitos)..." value="${esc(antDet.alergiaAnestesia || ant.alergiaAnestesiaDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box danger-border" id="detWrap_hemorragias" style="display:${ant.hemorragias ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:#ef4444; font-weight:600;"><i class="fas fa-droplet"></i> Detalle: Hemorragias / Anticoagulados</span>
                <input type="text" class="field-input" id="hcDet_hemorragias" placeholder="Especifique medicación (ej: Warfarina, Acenocumarol, Aspirina, Clopidogrel), INR o trastorno de coagulación..." value="${esc(antDet.hemorragias || ant.hemorragiasDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box warning-border" id="detWrap_diabetes" style="display:${ant.diabetes ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:#f59e0b; font-weight:600;"><i class="fas fa-cube"></i> Detalle: Diabetes Mellitus</span>
                <input type="text" class="field-input" id="hcDet_diabetes" placeholder="Especifique tipo (Tipo 1 / Tipo 2), medicación (Metformina, Insulina), última glucemia / HbA1c..." value="${esc(antDet.diabetes || ant.diabetesDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box warning-border" id="detWrap_hipertension" style="display:${ant.hipertension ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:#f59e0b; font-weight:600;"><i class="fas fa-heart"></i> Detalle: Hipertensión Arterial</span>
                <input type="text" class="field-input" id="hcDet_hipertension" placeholder="Especifique tratamiento actual (ej: Losartán, Enalapril, Amlodipino), cifras habituales de PA..." value="${esc(antDet.hipertension || ant.hipertensionDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box warning-border" id="detWrap_cardiaca" style="display:${ant.cardiaca ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:#f59e0b; font-weight:600;"><i class="fas fa-heart-pulse"></i> Detalle: Enfermedad Cardíaca / Cardiovascular</span>
                <input type="text" class="field-input" id="hcDet_cardiaca" placeholder="Especifique patología (ej: Valvulopatía, Marcapasos, Arritmia, Profilaxis antibiótica necesaria)..." value="${esc(antDet.cardiaca || ant.cardiacaDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box" id="detWrap_asma" style="display:${ant.asma ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:var(--primary); font-weight:600;"><i class="fas fa-lungs"></i> Detalle: Asma / Afección Respiratoria</span>
                <input type="text" class="field-input" id="hcDet_asma" placeholder="Especifique gravedad, frecuencia de crisis, medicación (ej: Salbutamol, Budesonida, EPOC)..." value="${esc(antDet.asma || ant.asmaDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box" id="detWrap_vih" style="display:${ant.vih ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:var(--primary); font-weight:600;"><i class="fas fa-shield-virus"></i> Detalle: VIH / ITS</span>
                <input type="text" class="field-input" id="hcDet_vih" placeholder="Especifique tratamiento antirretroviral (TARV), última carga viral / recuento CD4..." value="${esc(antDet.vih || ant.vihDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box" id="detWrap_tuberculosis" style="display:${ant.tuberculosis ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:var(--primary); font-weight:600;"><i class="fas fa-virus"></i> Detalle: Tuberculosis</span>
                <input type="text" class="field-input" id="hcDet_tuberculosis" placeholder="Especifique fecha de diagnóstico, fase del tratamiento o estado de curación..." value="${esc(antDet.tuberculosis || ant.tuberculosisDetalle || '')}">
              </label>
            </div>

            <div class="antecedente-det-box" id="detWrap_otro" style="display:${ant.otro ? 'block' : 'none'};">
              <label class="field" style="margin-bottom:0;">
                <span style="color:var(--primary); font-weight:600;"><i class="fas fa-plus"></i> Detalle: Otros Antecedentes</span>
                <input type="text" class="field-input" id="hcDet_otro" placeholder="Especifique otras patologías o condiciones (ej: Epilepsia, Hipotiroidismo, Insuficiencia Renal)..." value="${esc(antDet.otro || ant.otroDetalle || '')}">
              </label>
            </div>
          </div>


          <!-- ALERTA CRÍTICA: TRATAMIENTO CON BIFOSFONATOS -->
          <div class="critical-alert-box" style="margin-top:16px; border:1px solid #fecaca; background:rgba(239,68,68,0.06); border-radius:12px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div>
                <strong style="color:var(--danger); display:flex; align-items:center; gap:6px;">
                  <i class="fas fa-triangle-exclamation"></i> ¿Recibe o recibió tratamiento con Bifosfonatos?
                </strong>
                <small class="muted" style="display:block; margin-top:2px;">Riesgo alto de Osteonecrosis Maxilar por medicamentos (ONM).</small>
              </div>
              <div class="chips-container" id="bifosfonatosChips">
                <span class="chip-toggle ${!ant.bifosfonatos ? 'active' : ''}" data-val="no">NO</span>
                <span class="chip-toggle danger ${ant.bifosfonatos ? 'active' : ''}" data-val="si">SÍ</span>
              </div>
            </div>
            <input id="hcBifosfonatosDetalle" type="text" class="field-input" placeholder="Especifique fármaco (ej. Ácido Zoledrónico, Alendronato), vía y duración..." value="${ant.bifosfonatosDetalle || ''}" style="width:100%; margin-top:10px; display:${ant.bifosfonatos ? 'block' : 'none'};">
          </div>

          <div class="grid-2" style="margin-top:14px; gap:14px;">
            <label class="field"><span>Cirugías y Hospitalizaciones Previas</span><input id="hcCirugias" type="text" placeholder="Ej: Apendicectomía (2020)" value="${ant.cirugias || ''}"></label>
            <label class="field"><span>¿Cómo le fue en la recuperación post quirúrgica?</span><input id="hcRecuperacion" type="text" placeholder="Ej: Cicatrización lenta, mareos con anestésico" value="${ant.recuperacion || ''}"></label>
          </div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 5: SIGNOS VITALES Y SOMATOMETRÍA
           ======================================================== -->
      <div class="hc-accordion-card" data-section="5">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-heart-pulse"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">5.</span> Signos Vitales y Somatometría</span>
              <span class="hc-acc-sub">PA, FC, FR, Temp, Saturación, Talla, Peso y cálculo automático de IMC</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Signos Vitales</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div class="vital-signs-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(135px, 1fr)); gap:12px;">
            <div class="vital-card" style="min-width:0;">
              <div class="vital-label" style="white-space:nowrap;"><i class="fas fa-stethoscope"></i> Presión Art.</div>
              <div class="vital-input-wrap" style="display:flex !important; flex-direction:row !important; align-items:center !important; flex-wrap:nowrap !important; gap:6px;">
                <input id="hcPa" type="text" placeholder="120/80" value="${sig.pa || ''}" style="flex:1 1 auto !important; min-width:0 !important; width:100% !important;">
                <span class="vital-unit" style="flex-shrink:0 !important; white-space:nowrap !important;">mmHg</span>
              </div>
            </div>
            <div class="vital-card" style="min-width:0;">
              <div class="vital-label" style="white-space:nowrap;"><i class="fas fa-heart"></i> Frec. Cardíaca</div>
              <div class="vital-input-wrap" style="display:flex !important; flex-direction:row !important; align-items:center !important; flex-wrap:nowrap !important; gap:6px;">
                <input id="hcFc" type="number" placeholder="72" value="${sig.fc || ''}" style="flex:1 1 auto !important; min-width:0 !important; width:100% !important;">
                <span class="vital-unit" style="flex-shrink:0 !important; white-space:nowrap !important;">lpm</span>
              </div>
            </div>
            <div class="vital-card" style="min-width:0;">
              <div class="vital-label" style="white-space:nowrap;"><i class="fas fa-lungs"></i> Frec. Resp.</div>
              <div class="vital-input-wrap" style="display:flex !important; flex-direction:row !important; align-items:center !important; flex-wrap:nowrap !important; gap:6px;">
                <input id="hcFr" type="number" placeholder="16" value="${sig.fr || ''}" style="flex:1 1 auto !important; min-width:0 !important; width:100% !important;">
                <span class="vital-unit" style="flex-shrink:0 !important; white-space:nowrap !important;">rpm</span>
              </div>
            </div>
            <div class="vital-card" style="min-width:0;">
              <div class="vital-label" style="white-space:nowrap;"><i class="fas fa-temperature-half"></i> Temperatura</div>
              <div class="vital-input-wrap" style="display:flex !important; flex-direction:row !important; align-items:center !important; flex-wrap:nowrap !important; gap:6px;">
                <input id="hcTemp" type="text" placeholder="36.5" value="${sig.temp || ''}" style="flex:1 1 auto !important; min-width:0 !important; width:100% !important;">
                <span class="vital-unit" style="flex-shrink:0 !important; white-space:nowrap !important;">°C</span>
              </div>
            </div>
            <div class="vital-card" style="min-width:0;">
              <div class="vital-label" style="white-space:nowrap;"><i class="fas fa-lungs"></i> Saturación</div>
              <div class="vital-input-wrap" style="display:flex !important; flex-direction:row !important; align-items:center !important; flex-wrap:nowrap !important; gap:6px;">
                <input id="hcSpo2" type="number" placeholder="98" value="${sig.spo2 || ''}" style="flex:1 1 auto !important; min-width:0 !important; width:100% !important;">
                <span class="vital-unit" style="flex-shrink:0 !important; white-space:nowrap !important;">%</span>
              </div>
            </div>
            <div class="vital-card" style="min-width:0;">
              <div class="vital-label" style="white-space:nowrap;"><i class="fas fa-ruler-vertical"></i> Talla</div>
              <div class="vital-input-wrap" style="display:flex !important; flex-direction:row !important; align-items:center !important; flex-wrap:nowrap !important; gap:6px;">
                <input id="hcTalla" type="number" step="0.01" placeholder="1.70" value="${sig.talla || ''}" style="flex:1 1 auto !important; min-width:0 !important; width:100% !important;">
                <span class="vital-unit" style="flex-shrink:0 !important; white-space:nowrap !important;">m</span>
              </div>
            </div>
            <div class="vital-card" style="min-width:0;">
              <div class="vital-label" style="white-space:nowrap;"><i class="fas fa-weight-scale"></i> Peso</div>
              <div class="vital-input-wrap" style="display:flex !important; flex-direction:row !important; align-items:center !important; flex-wrap:nowrap !important; gap:6px;">
                <input id="hcPeso" type="number" step="0.1" placeholder="70.5" value="${sig.peso || ''}" style="flex:1 1 auto !important; min-width:0 !important; width:100% !important;">
                <span class="vital-unit" style="flex-shrink:0 !important; white-space:nowrap !important;">kg</span>
              </div>
            </div>
          </div>
          <div style="margin-top:14px; display:flex; justify-content:flex-end;">
            <div id="hcImcBadge" class="badge" style="font-size:0.92rem; padding:6px 14px; font-weight:700; background:var(--primary-light); color:var(--primary);">
              IMC: —
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 6: EXAMEN DEL SISTEMA ESTOMATOGNÁTICO
           ======================================================== -->
      <div class="hc-accordion-card" data-section="6">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-head-side-medical"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">6.</span> Examen del Sistema Estomatognático</span>
              <span class="hc-acc-sub">12 estructuras anatómicas con switches Sano / Patológico</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Examen Físico</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div class="estomato-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
            ${renderEstomatognaticoItems(est)}
          </div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 7: ODONTOGRAMA FDI
           ======================================================== -->
      <div class="hc-accordion-card" data-section="7">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-tooth"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">7.</span> Odontograma FDI (Permanente y Temporal)</span>
              <span class="hc-acc-sub">Piezas permanentes (11-48), temporales (51-85) y mapeo gráfico</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Odontograma</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div id="hcSection7Odontogram"></div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 8: INDICADORES DE SALUD BUCAL (IHOS)
           ======================================================== -->
      <div class="hc-accordion-card" data-section="8">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-broom"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">8.</span> Indicadores de Salud Bucal (IHOS)</span>
              <span class="hc-acc-sub">Índice de Higiene Oral Simplificado: placa, cálculo y gingivitis</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Higiene Oral</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div style="overflow-x:auto;">
            <table class="ihos-table" style="width:100%;">
              <thead>
                <tr style="background:var(--bg-page); text-align:center;">
                  <th colspan="4" style="text-align:center; font-weight:800; color:var(--primary); font-size:0.92rem; letter-spacing:0.5px; padding:10px;">
                    <i class="fas fa-teeth"></i> HIGIENE ORAL SIMPLIFICADA
                  </th>
                </tr>
                <tr>
                  <th style="min-width:260px; text-align:center;">Piezas Dentales</th>
                  <th style="text-align:center;">Placa (0-1-2-3)</th>
                  <th style="text-align:center;">Cálculo (0-1-2-3)</th>
                  <th style="text-align:center;">Gingivitis (0-1)</th>
                </tr>
              </thead>
              <tbody>
                ${renderIHOSTableRows(ind.ihos)}
              </tbody>
              <tfoot>
                <tr style="background:var(--bg-page); font-weight:800; border-top:2px solid var(--border);">
                  <td style="text-align:center; font-weight:800; color:var(--text);">TOTAL: <span id="ihosTotalPiezas" style="color:var(--primary); font-size:1rem; margin-left:4px;">0</span></td>
                  <td style="text-align:center; font-weight:800; color:var(--primary);" id="ihosTotalPlaca">0</td>
                  <td style="text-align:center; font-weight:800; color:var(--primary);" id="ihosTotalCalculo">0</td>
                  <td style="text-align:center; font-weight:800; color:var(--primary);" id="ihosTotalGingivitis">0</td>
                </tr>
                <tr style="background:var(--surface); font-weight:800;">
                  <td style="text-align:center; font-weight:800; color:var(--text); font-size:0.82rem; letter-spacing:0.5px;">
                    <i class="fas fa-divide" style="margin-right:4px; color:var(--primary);"></i> PROMEDIO / ÍNDICE
                  </td>
                  <td style="text-align:center;">
                    <div class="ihos-calc-result" id="ihosPromPlaca">0.00</div>
                  </td>
                  <td style="text-align:center;">
                    <div class="ihos-calc-result" id="ihosPromCalculo">0.00</div>
                  </td>
                  <td style="text-align:center;">
                    <div class="ihos-calc-result" id="ihosPromGingivitis">0.00</div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 9: DIAGNÓSTICO OCLUSAL & ÍNDICES CPO
           ======================================================== -->
      <div class="hc-accordion-card" data-section="9">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-chart-pie"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">9.</span> Diagnóstico Oclusal & Índices CPO</span>
              <span class="hc-acc-sub">Clasificación de Angle, periodonto, fluorosis y calculadora CPO/ceo</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">CPO & Oclusión</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
            <div>
              <label class="field"><span>Oclusión (Clasificación de Angle)</span>
                <div class="chips-container" id="oclusionChips" style="margin:4px 0 12px;">
                  <span class="chip-toggle ${(!ind.oclusion || ind.oclusion === 'Angle I') ? 'active' : ''}" data-val="Angle I">Angle I</span>
                  <span class="chip-toggle ${ind.oclusion === 'Angle II' ? 'active' : ''}" data-val="Angle II">Angle II</span>
                  <span class="chip-toggle ${ind.oclusion === 'Angle III' ? 'active' : ''}" data-val="Angle III">Angle III</span>
                </div>
              </label>

              <label class="field"><span>Enfermedad Periodontal</span>
                <div class="chips-container" id="periodontalChips" style="margin:4px 0 12px;">
                  <span class="chip-toggle ${(!ind.periodontal || ind.periodontal === 'Sano') ? 'active' : ''}" data-val="Sano">Sano</span>
                  <span class="chip-toggle warning ${ind.periodontal === 'Leve' ? 'active' : ''}" data-val="Leve">Leve</span>
                  <span class="chip-toggle warning ${ind.periodontal === 'Moderada' ? 'active' : ''}" data-val="Moderada">Moderada</span>
                  <span class="chip-toggle danger ${ind.periodontal === 'Severa' ? 'active' : ''}" data-val="Severa">Severa</span>
                </div>
              </label>

              <label class="field"><span>Fluorosis Dental</span>
                <div class="chips-container" id="fluorosisChips" style="margin:4px 0 14px;">
                  <span class="chip-toggle ${(!ind.fluorosis || ind.fluorosis === 'Ausente') ? 'active' : ''}" data-val="Ausente">Ausente</span>
                  <span class="chip-toggle ${ind.fluorosis === 'Leve' ? 'active' : ''}" data-val="Leve">Leve</span>
                  <span class="chip-toggle warning ${ind.fluorosis === 'Moderada' ? 'active' : ''}" data-val="Moderada">Moderada</span>
                  <span class="chip-toggle danger ${ind.fluorosis === 'Severa' ? 'active' : ''}" data-val="Severa">Severa</span>
                </div>
              </label>
            </div>

            <!-- Calculadoras CPO / ceo (Ambos activos) -->
            <div class="cpo-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
              <div class="cpo-card active-card" id="cpoCardAdult">
                <div class="cpo-card-head" style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="display:flex; align-items:center; gap:6px; font-weight:700; color:var(--primary);">
                    <i class="fas fa-user"></i>
                    <span>Índice CPO (Adulto / Permanente)</span>
                  </span>
                  <span class="cpo-total-badge" id="cpoTotalBadge">${cpoData.totalCPO || 0}</span>
                </div>
                <div class="cpo-row"><span>Cariados (C):</span> <input id="cpoC" type="number" min="0" value="${cpoData.c || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>Perdidos (P):</span> <input id="cpoP" type="number" min="0" value="${cpoData.p || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>Obturados (O):</span> <input id="cpoO" type="number" min="0" value="${cpoData.o || 0}" style="width:55px; text-align:center;"></div>
              </div>

              <div class="cpo-card active-card" id="cpoCardChild">
                <div class="cpo-card-head" style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="display:flex; align-items:center; gap:6px; font-weight:700; color:#0284c7;">
                    <i class="fas fa-child"></i>
                    <span>Índice ceo (Niño / Temporal)</span>
                  </span>
                  <span class="cpo-total-badge" id="ceoTotalBadge">${cpoData.totalCeo || 0}</span>
                </div>
                <div class="cpo-row"><span>cariados (c):</span> <input id="ceoC" type="number" min="0" value="${cpoData.c_min || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>extraídos (e):</span> <input id="ceoE" type="number" min="0" value="${cpoData.e_min || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>obturados (o):</span> <input id="ceoO" type="number" min="0" value="${cpoData.o_min || 0}" style="width:55px; text-align:center;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 10: PLANES DE DIAGNÓSTICO, TERAPÉUTICO Y EDUCACIONAL
           ======================================================== -->
      <div class="hc-accordion-card" data-section="10">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-list-check"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">10.</span> Planes de Diagnóstico, Terapéutico y Educacional</span>
              <span class="hc-acc-sub">Exámenes complementarios, radiografías y recomendaciones</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Plan Clínico</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">
            Seleccione los planes o exámenes requeridos. Al activar cada opción se habilitará su especificación y se registrará automáticamente como <strong>nota clínica de evolución</strong>:
          </p>
          <div class="chips-container" id="planesDxChips" style="margin-bottom:14px;">
            <span class="chip-toggle ${planesDx.biometria ? 'active' : ''}" data-key="biometria"><i class="fas fa-vial"></i> Biometría Hemática</span>
            <span class="chip-toggle ${planesDx.quimica ? 'active' : ''}" data-key="quimica"><i class="fas fa-flask"></i> Química Sanguínea / Glucosa</span>
            <span class="chip-toggle ${planesDx.rayosXPeriapical ? 'active' : ''}" data-key="rayosXPeriapical"><i class="fas fa-x-ray"></i> Rayos X Periapical</span>
            <span class="chip-toggle ${planesDx.rayosXPanoramica ? 'active' : ''}" data-key="rayosXPanoramica"><i class="fas fa-film"></i> Rayos X Panorámica</span>
            <span class="chip-toggle ${planesDx.cbct ? 'active' : ''}" data-key="cbct"><i class="fas fa-cube"></i> Tomografía Dental CBCT</span>
            <span class="chip-toggle ${planesDx.educacion ? 'active' : ''}" data-key="educacion"><i class="fas fa-chalkboard-user"></i> Educación en Higiene Oral</span>
          </div>

          <!-- CONTENEDOR DINÁMICO DE DETALLES Y NOTAS CLÍNICAS DE PLANES -->
          <div id="planesDetallesGrid" class="antecedentes-detalles-grid" style="margin-bottom:14px;">
            <div class="antecedente-det-box" id="detWrap_plan_biometria" style="display:${planesDx.biometria ? 'block' : 'none'}; border-left-color:#8b5cf6;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#8b5cf6; font-weight:600; font-size:0.85rem;"><i class="fas fa-vial"></i> Plan: Biometría Hemática</span>
                <span class="badge" style="background:rgba(139,92,246,0.12); color:#8b5cf6; font-size:0.75rem;"><i class="fas fa-file-medical"></i> Genera Nota Clínica</span>
              </div>
              <input type="text" class="field-input hc-plan-det-input" id="hcDet_plan_biometria" data-plan="biometria" placeholder="Indicación clínica (ej: Recuento de plaquetas y leucocitos prequirúrgico / Evaluación de anemia)..." value="${esc(planesDet.biometria || planesDx.biometriaDetalle || '')}" style="width:100%;">
            </div>

            <div class="antecedente-det-box" id="detWrap_plan_quimica" style="display:${planesDx.quimica ? 'block' : 'none'}; border-left-color:#8b5cf6;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#8b5cf6; font-weight:600; font-size:0.85rem;"><i class="fas fa-flask"></i> Plan: Química Sanguínea / Glucosa</span>
                <span class="badge" style="background:rgba(139,92,246,0.12); color:#8b5cf6; font-size:0.75rem;"><i class="fas fa-file-medical"></i> Genera Nota Clínica</span>
              </div>
              <input type="text" class="field-input hc-plan-det-input" id="hcDet_plan_quimica" data-plan="quimica" placeholder="Indicación clínica (ej: Glucemia en ayunas, Urea, Creatinina, Perfil de coagulación TP/TTP)..." value="${esc(planesDet.quimica || planesDx.quimicaDetalle || '')}" style="width:100%;">
            </div>

            <div class="antecedente-det-box" id="detWrap_plan_rayosXPeriapical" style="display:${planesDx.rayosXPeriapical ? 'block' : 'none'}; border-left-color:#0284c7;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#0284c7; font-weight:600; font-size:0.85rem;"><i class="fas fa-x-ray"></i> Plan: Rayos X Periapical</span>
                <span class="badge" style="background:rgba(2,132,199,0.12); color:#0284c7; font-size:0.75rem;"><i class="fas fa-file-medical"></i> Genera Nota Clínica</span>
              </div>
              <input type="text" class="field-input hc-plan-det-input" id="hcDet_plan_rayosXPeriapical" data-plan="rayosXPeriapical" placeholder="Indicación clínica (ej: Piezas dentales a radiografiar 36 y 46, evaluación de lesión periapical)..." value="${esc(planesDet.rayosXPeriapical || planesDx.rayosXPeriapicalDetalle || '')}" style="width:100%;">
            </div>

            <div class="antecedente-det-box" id="detWrap_plan_rayosXPanoramica" style="display:${planesDx.rayosXPanoramica ? 'block' : 'none'}; border-left-color:#0284c7;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#0284c7; font-weight:600; font-size:0.85rem;"><i class="fas fa-film"></i> Plan: Rayos X Panorámica</span>
                <span class="badge" style="background:rgba(2,132,199,0.12); color:#0284c7; font-size:0.75rem;"><i class="fas fa-file-medical"></i> Genera Nota Clínica</span>
              </div>
              <input type="text" class="field-input hc-plan-det-input" id="hcDet_plan_rayosXPanoramica" data-plan="rayosXPanoramica" placeholder="Indicación clínica (ej: Evaluación integral de terceros molares 18, 28, 38, 48 y reborde óseo)..." value="${esc(planesDet.rayosXPanoramica || planesDx.rayosXPanoramicaDetalle || '')}" style="width:100%;">
            </div>

            <div class="antecedente-det-box" id="detWrap_plan_cbct" style="display:${planesDx.cbct ? 'block' : 'none'}; border-left-color:#0284c7;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#0284c7; font-weight:600; font-size:0.85rem;"><i class="fas fa-cube"></i> Plan: Tomografía Dental CBCT</span>
                <span class="badge" style="background:rgba(2,132,199,0.12); color:#0284c7; font-size:0.75rem;"><i class="fas fa-file-medical"></i> Genera Nota Clínica</span>
              </div>
              <input type="text" class="field-input hc-plan-det-input" id="hcDet_plan_cbct" data-plan="cbct" placeholder="Indicación clínica (ej: CBCT maxilar superior para planificación de implantes 11, 21 / Relación con conducto dentario)..." value="${esc(planesDet.cbct || planesDx.cbctDetalle || '')}" style="width:100%;">
            </div>

            <div class="antecedente-det-box" id="detWrap_plan_educacion" style="display:${planesDx.educacion ? 'block' : 'none'}; border-left-color:#10b981;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#10b981; font-weight:600; font-size:0.85rem;"><i class="fas fa-chalkboard-user"></i> Plan Educacional: Higiene Oral</span>
                <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.75rem;"><i class="fas fa-file-medical"></i> Genera Nota Clínica</span>
              </div>
              <input type="text" class="field-input hc-plan-det-input" id="hcDet_plan_educacion" data-plan="educacion" placeholder="Indicación clínica (ej: Instrucción de técnica de Bass modificada, hilo dental y enjuague bucal antiséptico)..." value="${esc(planesDet.educacion || planesDx.educacionDetalle || '')}" style="width:100%;">
            </div>
          </div>

          <div style="margin-top:14px; background:var(--bg-page); border:1px solid var(--border); border-radius:12px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
              <span style="font-weight:700; font-size:0.88rem; color:var(--text);">
                <i class="fas fa-notes-medical" style="color:var(--primary); margin-right:6px;"></i> Otros exámenes, interconsultas médicas o indicaciones:
              </span>
              <button type="button" id="btnAddOtroPlan" class="ghost" style="font-size:0.82rem; color:var(--primary); border:1.5px dashed var(--primary); padding:5px 12px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="fas fa-plus"></i> + Agregar Otro Examen / Indicación
              </button>
            </div>
            <div id="otrosPlanesContainer" style="display:flex; flex-direction:column; gap:8px;">
              ${renderOtrosPlanesRows(otrosList)}
            </div>
          </div>
        </div>

      </div>

      <!-- ========================================================
           SECCIÓN 11: DIAGNÓSTICOS ODONTOLÓGICOS (CIE-10 OMS)
           ======================================================== -->
      <div class="hc-accordion-card" data-section="11">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-stethoscope"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">11.</span> Diagnósticos Odontológicos (CIE-10 OMS)</span>
              <span class="hc-acc-sub">Buscador predictivo oficial CIE-10 (K00-K14 / Z01.2) y asignación Presuntivo / Definitivo</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">CIE-10 OMS</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <p class="muted" style="font-size:0.85rem; margin:0;">Escriba o seleccione del catálogo oficial odontológico CIE-10 (K00-K14, Z01.2 y afines):</p>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" id="cieBrowseCatalogBtn" class="ghost" style="font-size:0.82rem; color:var(--primary); border:1px solid var(--border); padding:6px 12px; border-radius:8px; font-weight:700; background:var(--surface);" title="Explorar todos los diagnósticos CIE-10 por categoría">
                <i class="fas fa-book-medical"></i> Explorar Catálogo Completo
              </button>
              <button type="button" id="cieAddNewBtn" class="ghost" style="font-size:0.82rem; color:var(--primary); border:1.5px dashed var(--primary); padding:6px 14px; border-radius:8px; font-weight:700;">
                <i class="fas fa-plus"></i> + Fila de Diagnóstico
              </button>
            </div>
          </div>
          <div id="cie11Container">
            ${renderCIE10Rows(diagList)}
          </div>
          <div style="margin-top:10px; display:flex; justify-content:flex-end;">
            <span class="muted" style="font-size:0.78rem;"><i class="fas fa-database"></i> Catálogo CIE-10 ampliable: los códigos personalizados nuevos se integran dinámicamente.</span>
          </div>
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 12: TRATAMIENTO, SESIONES CLÍNICAS & PRESCRIPCIONES
           ======================================================== -->
      <div class="hc-accordion-card" data-section="12">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-calendar-check"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">12.</span> Tratamiento, Sesiones Clínicas & Prescripciones</span>
              <span class="hc-acc-sub">Evoluciones cronológicas, notas clínicas y recetas farmacológicas</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Sesiones & Recetas</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
            <p class="muted" style="margin:0; font-size:0.88rem;">Historial de atenciones, evolución y recetas médicas emitidas:</p>
            <button type="button" id="hcNewSessionBtn" class="primary" style="font-size:0.85rem;"><i class="fas fa-plus"></i> Registrar Nueva Sesión</button>
          </div>
          
          <!-- Formulario para Nueva Sesión -->
          <div id="newSessionFormArea" style="display:none; background:var(--bg-page); border:1.5px dashed var(--primary); border-radius:14px; padding:18px; margin-bottom:20px;">
            <h5 style="margin-bottom:14px; color:var(--primary); font-size:1rem;"><i class="fas fa-calendar-plus"></i> Registrar Nueva Sesión de Tratamiento</h5>
            <div class="grid-2" style="gap:12px;">
              <label class="field"><span>Fecha de Sesión</span><input id="sesDate" type="date" value="${formatDate(new Date())}"></label>
              <div></div>
              <label class="field" style="grid-column:1/-1; position:relative;">
                <span style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-weight:700;"><i class="fas fa-stethoscope" style="color:var(--primary);"></i> Diagnóstico y Complicaciones (CIE-10)</span>
                  <small class="muted" style="font-size:0.75rem; font-weight:normal;"><i class="fas fa-search"></i> Búsqueda en vivo / Catálogo</small>
                </span>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; position:relative;">
                  <select id="sesDxSyncSelect" style="flex:0 0 180px; max-width:210px; font-size:0.83rem; background:var(--surface);" title="Seleccionar del Catálogo CIE-10 o de la Sec. 11">
                    <option value="">-- Seleccionar CIE-10 --</option>
                  </select>
                  <div style="flex:1 1 240px; min-width:160px; position:relative;">
                    <input id="sesDx" type="text" placeholder="Escriba código o diagnóstico para buscar en vivo (Ej: K02.1, Caries, Gingivitis)..." style="width:100%; font-size:0.88rem;" autocomplete="off">
                    <div id="sesDxDropdown" class="cie11-dropdown hidden" style="position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:260px; overflow-y:auto; z-index:999; background:var(--surface); border:1px solid var(--border); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.18);"></div>
                  </div>
                  <button type="button" id="sesDxPickerBtn" class="ghost" style="flex-shrink:0; padding:8px 12px; font-size:0.85rem; border:1px solid var(--border); border-radius:8px; color:var(--primary); background:var(--surface);" title="Abrir Catálogo Completo CIE-10">
                    <i class="fas fa-book-medical"></i> Catálogo
                  </button>
                </div>
              </label>
              <label class="field" style="grid-column:1/-1;"><span>Procedimiento Clínico Ejecutado *</span><input id="sesProc" type="text" placeholder="Ej: Obturación con resina composite en pieza 36 / Profilaxis"></label>
              <label class="field" style="grid-column:1/-1;"><span>Prescripciones Farmacológicas (Receta médica)</span><input id="sesRx" type="text" placeholder="Ej: Amoxicilina 500mg c/8h x 7 días + Ibuprofeno 400mg c/8h x dolor"></label>
              <label class="field">
                <span style="display:flex; justify-content:space-between;">
                  <span>Código de Habilitación Profesional</span>
                  <small class="muted" style="font-size:0.75rem;"><i class="fas fa-id-card"></i> Matrícula / MSP</small>
                </span>
                <input id="sesCode" type="text" placeholder="Ej: MSP-10293" value="${esc(assignedProf?.license_code || '')}" readonly style="background:var(--bg-page); font-weight:700; color:var(--text); cursor:default;" title="Código de Habilitación del profesional tratante">
              </label>
              <label class="field">
                <span>Firma Profesional / Médico Tratante</span>
                <div style="display:flex; gap:6px;">
                  <select id="sesSignSelect" style="max-width:170px; font-size:0.83rem; background:var(--surface);">
                    <option value="">-- Cambiar Médico --</option>
                    ${profList.map(p => `<option value="${p.name}" ${p.id === patient.assignedProfessionalId || p.name === defaultDoctorName ? 'selected' : ''}>${p.name}${p.specialty ? ' (' + p.specialty + ')' : ''}</option>`).join('')}
                  </select>
                  <input id="sesSign" type="text" value="${defaultDoctorName}" style="flex:1;" placeholder="Nombre del profesional...">
                </div>
              </label>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
              <button type="button" id="sesCancelBtn" class="ghost">Cancelar</button>
              <button type="button" id="sesSaveBtn" class="primary"><i class="fas fa-check"></i> Guardar Sesión</button>
            </div>
          </div>

          <div id="sessionHistoryList">
            ${renderSessionHistory(notes)}
          </div>

          <!-- Área de Adjuntos y Radiografías -->
          <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h5 style="margin:0; font-size:0.95rem; font-weight:700;"><i class="fas fa-images" style="color:var(--primary);"></i> Radiografías y Fotos Clínicas</h5>
              <button type="button" id="hcShowAttachments" class="ghost" style="font-size:0.85rem;"><i class="fas fa-folder-open"></i> Ver adjuntos (0)</button>
            </div>
            <div id="hcAttachmentsArea" style="display:none; margin-top:12px;">
              ${canEdit ? `
                <div class="upload-box" style="border:2px dashed var(--border); border-radius:12px; padding:20px; text-align:center; background:var(--bg-page); margin-bottom:16px; cursor:pointer;" onclick="document.getElementById('hcFileInput').click()">
                  <i class="fas fa-cloud-upload-alt" style="font-size:2rem; color:var(--primary); margin-bottom:8px;"></i>
                  <p style="margin:0; font-weight:600; font-size:0.9rem;">Haz clic o arrastra radiografías / fotos aquí</p>
                  <small class="muted">PNG, JPG, JPEG, WEBP, PDF</small>
                  <input type="file" id="hcFileInput" multiple accept="image/*,application/pdf" style="display:none;">
                </div>
              ` : ''}
              <div id="hcAttachmentsList" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:12px;"></div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 3. BARRA INFERIOR DE GUARDADO -->
    ${canEdit ? `
      <div style="margin-top:24px; display:flex; justify-content:flex-end; gap:12px;">
        <button id="hcBottomSaveBtn" class="primary" style="box-shadow:0 4px 14px rgba(99,102,241,0.35); padding:12px 24px; font-weight:700;">
          <i class="fas fa-save"></i> Guardar Historia Clínica Completa
        </button>
      </div>
    ` : ''}
  `;

  setupInteractiveHandlers(container, patient, notes, onSaveNote, canEdit, onSaveFullHistory);

  return container;
}

function renderEstomatognaticoItems(est = {}) {
  const items = [
    { key: 'labios', label: '1. Labios' },
    { key: 'mejillas', label: '2. Mejillas' },
    { key: 'maxilarSup', label: '3. Maxilar Superior' },
    { key: 'maxilarInf', label: '4. Maxilar Inferior' },
    { key: 'lengua', label: '5. Lengua' },
    { key: 'paladar', label: '6. Paladar' },
    { key: 'pisoBoca', label: '7. Piso de Boca' },
    { key: 'carrillos', label: '8. Carrillos' },
    { key: 'glandulas', label: '9. Glándulas Salivales' },
    { key: 'orofaringe', label: '10. Orofaringe' },
    { key: 'atm', label: '11. ATM (Articulación)' },
    { key: 'ganglios', label: '12. Ganglios Linfáticos' }
  ];

  return items.map(item => {
    const val = est[item.key] || { estado: 'normal', obs: '' };
    const isPat = val.estado === 'patologico';

    return `
      <div class="estomato-item" data-key="${item.key}">
        <div class="estomato-item-head">
          <span class="estomato-label">${item.label}</span>
          <div class="estomato-switch-group">
            <button type="button" class="estomato-switch-btn sano ${!isPat ? 'active' : ''}" data-val="normal">
              <i class="fas fa-check"></i> Sano
            </button>
            <button type="button" class="estomato-switch-btn patologico ${isPat ? 'active' : ''}" data-val="patologico">
              <i class="fas fa-triangle-exclamation"></i> Patológico
            </button>
          </div>
        </div>
        <input type="text" class="field-input estomato-obs" placeholder="Describa la lesión o alteración patológica..." value="${val.obs || ''}" style="width:100%; margin-top:8px; display:${isPat ? 'block' : 'none'}; font-size:0.85rem; border-color:#fca5a5;">
      </div>
    `;
  }).join('');
}

function renderIHOSTableRows(ihos = {}) {
  const pieces = [
    { key: 'p16', n1: '16', n2: '17', n3: '55' },
    { key: 'p11', n1: '11', n2: '21', n3: '51' },
    { key: 'p26', n1: '26', n2: '27', n3: '65' },
    { key: 'p36', n1: '36', n2: '37', n3: '75' },
    { key: 'p31', n1: '31', n2: '41', n3: '71' },
    { key: 'p46', n1: '46', n2: '47', n3: '85' }
  ];

  return pieces.map(p => {
    const row = ihos[p.key] || { placa: 0, calculo: 0, gingivitis: 0, m1: '', m2: '', m3: '' };
    return `
      <tr data-key="${p.key}">
        <td>
          <div class="ihos-pieces-cell">
            <span class="ihos-piece-num">${p.n1}</span>
            <select class="ihos-mark-sel ihos-mark-1" title="Estado pieza ${p.n1}">
              <option value="" ${row.m1 === '' || !row.m1 ? 'selected' : ''}></option>
              <option value="X" ${row.m1 === 'X' ? 'selected' : ''}>X</option>
              <option value="-" ${row.m1 === '-' ? 'selected' : ''}>-</option>
            </select>
            <span class="ihos-piece-num">${p.n2}</span>
            <select class="ihos-mark-sel ihos-mark-2" title="Estado pieza ${p.n2}">
              <option value="" ${row.m2 === '' || !row.m2 ? 'selected' : ''}></option>
              <option value="X" ${row.m2 === 'X' ? 'selected' : ''}>X</option>
              <option value="-" ${row.m2 === '-' ? 'selected' : ''}>-</option>
            </select>
            <span class="ihos-piece-num">${p.n3}</span>
            <select class="ihos-mark-sel ihos-mark-3" title="Estado pieza ${p.n3}">
              <option value="" ${row.m3 === '' || !row.m3 ? 'selected' : ''}></option>
              <option value="X" ${row.m3 === 'X' ? 'selected' : ''}>X</option>
              <option value="-" ${row.m3 === '-' ? 'selected' : ''}>-</option>
            </select>
          </div>
        </td>
        <td>
          <select class="ihos-placa">
            <option value="0" ${row.placa == 0 ? 'selected' : ''}>0 - Ausente</option>
            <option value="1" ${row.placa == 1 ? 'selected' : ''}>1 - 1/3 de corona</option>
            <option value="2" ${row.placa == 2 ? 'selected' : ''}>2 - 2/3 de corona</option>
            <option value="3" ${row.placa == 3 ? 'selected' : ''}>3 - Más de 2/3</option>
          </select>
        </td>
        <td>
          <select class="ihos-calculo">
            <option value="0" ${row.calculo == 0 ? 'selected' : ''}>0 - Ausente</option>
            <option value="1" ${row.calculo == 1 ? 'selected' : ''}>1 - Supragingival 1/3</option>
            <option value="2" ${row.calculo == 2 ? 'selected' : ''}>2 - Supragingival 2/3</option>
            <option value="3" ${row.calculo == 3 ? 'selected' : ''}>3 - Subgingival / Abundante</option>
          </select>
        </td>
        <td>
          <select class="ihos-gingivitis">
            <option value="0" ${row.gingivitis == 0 ? 'selected' : ''}>0 - Sano</option>
            <option value="1" ${row.gingivitis == 1 ? 'selected' : ''}>1 - Sangrado / Inflamado</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

function renderOtrosPlanesRows(list = []) {
  const items = (Array.isArray(list) && list.length > 0) ? list : [''];
  const esc = (s) => (s || '').toString().replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return items.map((val, idx) => `
    <div class="otro-plan-row" style="display:flex; gap:8px; align-items:center;">
      <span class="muted" style="font-size:0.82rem; min-width:22px; text-align:center; font-weight:700;">${idx + 1}.</span>
      <input type="text" class="field-input otro-plan-input" placeholder="Ej: Interconsulta con médico tratante para pase quirúrgico / Biopsia de mucosa..." value="${esc(val)}" style="flex:1;">
      <button type="button" class="ghost btn-remove-otro-plan" title="Eliminar indicación" style="color:var(--danger); padding:6px 10px; border-radius:6px; font-size:0.85rem; cursor:pointer;">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `).join('');
}

function createSingleCIERowHTML(index, dx = '', cie = '', tipo = 'PRE') {
  return `
    <div class="cie11-row-card" data-index="${index}">
      <span class="cie-row-num" style="font-weight:700; color:var(--muted); min-width:24px;">#${index + 1}</span>
      <div class="cie11-input-wrap">
        <input type="text" class="field-input cie11-dx-input" placeholder="Buscar diagnóstico CIE-10 (clic para ver frecuentes)..." value="${dx}" autocomplete="off">
        <div class="cie11-dropdown hidden"></div>
      </div>
      <div style="position:relative; display:flex; align-items:center;">
        <input type="text" class="field-input cie11-code-input" placeholder="CIE-10" value="${cie}" style="width:95px; text-align:center; font-weight:700;" autocomplete="off" title="Código CIE-10">
        <div class="cie11-code-dropdown hidden"></div>
      </div>
      <div class="pre-def-btn-group">
        <button type="button" class="pre-def-btn pre ${tipo === 'PRE' ? 'active' : ''}" data-tipo="PRE" title="Presuntivo">PRE</button>
        <button type="button" class="pre-def-btn def ${tipo === 'DEF' ? 'active' : ''}" data-tipo="DEF" title="Definitivo">DEF</button>
      </div>
      <button type="button" class="cie-row-picker-btn ghost" title="Elegir del Catálogo CIE-10" style="padding:6px 8px; border-radius:6px; color:var(--primary); font-size:0.88rem;">
        <i class="fas fa-list-ul"></i>
      </button>
      <button type="button" class="cie-del-row-btn" title="Eliminar fila" style="background:transparent; border:none; color:var(--muted); cursor:pointer; padding:6px 8px; border-radius:6px; font-size:0.9rem; transition:color 0.15s ease;">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `;
}

function renderCIE10Rows(diagList = []) {
  if (!diagList || diagList.length === 0) {
    diagList = [
      { dx: '', cie: '', tipo: 'PRE' },
      { dx: '', cie: '', tipo: 'PRE' },
      { dx: '', cie: '', tipo: 'PRE' },
      { dx: '', cie: '', tipo: 'PRE' }
    ];
  } else {
    while (diagList.length < 4) {
      diagList.push({ dx: '', cie: '', tipo: 'PRE' });
    }
  }
  return diagList.map((d, index) => createSingleCIERowHTML(index, d.dx || '', d.cie || '', d.tipo || 'PRE')).join('');
}

const renderCIE11Rows = renderCIE10Rows;

function renderSessionHistory(notes = []) {
  if (!notes || notes.length === 0) {
    return '<div class="empty"><i class="fas fa-file-medical" style="font-size:2rem; margin-bottom:8px; display:block;"></i>No hay sesiones de tratamiento registradas aún.</div>';
  }

  // Deduplicación preventiva de sesiones por id o por clave única (fecha + procedimiento + nota)
  const seen = new Set();
  const uniqueNotes = [];
  for (const n of notes) {
    const key = n.id || `${n.date || ''}|${n.procedimiento || ''}|${n.nota || ''}|${n.receta || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueNotes.push(n);
    }
  }

  return uniqueNotes.map((n, i) => `
    <div class="session-card">
      <div class="session-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="session-badge">Sesión #${uniqueNotes.length - i}</span>
          <strong><i class="fas fa-calendar-day" style="color:var(--primary); margin-right:4px;"></i> ${n.date || 'Sin fecha'}</strong>
          ${n.pieza ? `<span class="badge pending">Pieza #${n.pieza}</span>` : ''}
        </div>
        <span class="signature-stamp"><i class="fas fa-signature"></i> ${n.professionalName || 'Dr. Asignado'}</span>
      </div>
      <div style="margin-top:8px; font-size:0.9rem;">
        <p><strong>Procedimiento / Diagnóstico:</strong> ${n.procedimiento || n.diagnosticoTipo || 'Atención general'}</p>
        ${n.nota ? `<p class="muted" style="margin-top:4px;"><strong>Detalle:</strong> ${n.nota}</p>` : ''}
        ${n.receta ? `<p style="margin-top:4px; color:var(--primary); font-weight:600;"><strong>Prescripción:</strong> 💊 ${n.receta}</p>` : ''}
      </div>
    </div>
  `).join('');
}

function calculateCPOFromNotes(notes = []) {
  let c = 0, p = 0, o = 0;
  notes.forEach(n => {
    const proc = (n.procedimiento || '').toLowerCase();
    if (proc.includes('caries')) c++;
    else if (proc.includes('extra') || proc.includes('perdid')) p++;
    else if (proc.includes('obtur') || proc.includes('resina') || proc.includes('composite')) o++;
  });
  return { c, p, o, totalCPO: c + p + o, c_min: 0, e_min: 0, o_min: 0, totalCeo: 0 };
}

function setupInteractiveHandlers(container, patient, notes, onSaveNote, canEdit = true, onSaveFullHistory) {
  // 0. Interacción Acordeón de 12 Secciones
  const cards = container.querySelectorAll('.hc-accordion-card');
  cards.forEach(card => {
    const header = card.querySelector('.hc-accordion-header');
    if (header) {
      header.addEventListener('click', () => {
        // Toggle card open state
        card.classList.toggle('open');
      });
      // Accessibility: toggle on Enter / Space
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.classList.toggle('open');
        }
      });
    }
  });

  // Botones Desplegar Todo / Colapsar Todo
  const expandAllBtn = container.querySelector('#hcExpandAllBtn');
  const collapseAllBtn = container.querySelector('#hcCollapseAllBtn');

  expandAllBtn?.addEventListener('click', () => {
    cards.forEach(c => c.classList.add('open'));
  });

  collapseAllBtn?.addEventListener('click', () => {
    cards.forEach(c => c.classList.remove('open'));
  });

  const certificateBtn = container.querySelector('#hcCertificateBtn');
  certificateBtn?.addEventListener('click', () => {
    import('./patient-certificate.js').then(m => m.openCertificateModal(patient));
  });

  // 1. Chips de Motivo de Consulta
  container.querySelectorAll('#motivoChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = container.querySelector('#hcMotivoConsulta');
      if (input) {
        input.value = chip.dataset.val;
        container.querySelectorAll('#motivoChips .chip-toggle').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      }
    });
  });

  // 2. Chips de Dolor EVA
  container.querySelectorAll('#evaChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#evaChips .chip-toggle').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // 3. Chips de Antecedentes con despliegue interactivo de detalles
  container.querySelectorAll('#antecedentesChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const key = chip.dataset.key;
      const detWrap = container.querySelector(`#detWrap_${key}`);
      const detInput = container.querySelector(`#hcDet_${key}`);
      if (detWrap) {
        const isActive = chip.classList.contains('active');
        detWrap.style.display = isActive ? 'block' : 'none';
        if (isActive && detInput) {
          detInput.focus();
        }
      }
    });
  });


  // 4. Toggle Bifosfonatos
  const bifosChips = container.querySelectorAll('#bifosfonatosChips .chip-toggle');
  const bifosDetalle = container.querySelector('#hcBifosfonatosDetalle');
  bifosChips.forEach(chip => {
    chip.addEventListener('click', () => {
      bifosChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (bifosDetalle) {
        bifosDetalle.style.display = chip.dataset.val === 'si' ? 'block' : 'none';
      }
    });
  });

  // 5. Cálculo Automático de IMC
  const tallaInput = container.querySelector('#hcTalla');
  const pesoInput = container.querySelector('#hcPeso');
  const imcBadge = container.querySelector('#hcImcBadge');

  function computeIMC() {
    const t = parseFloat(tallaInput?.value);
    const p = parseFloat(pesoInput?.value);
    if (t > 0 && p > 0) {
      const imc = (p / (t * t)).toFixed(1);
      let cat = 'Normal';
      let color = 'var(--primary)';
      let bg = 'var(--primary-light)';

      if (imc < 18.5) { cat = 'Bajo peso'; color = '#f59e0b'; bg = 'rgba(245,158,11,0.15)'; }
      else if (imc >= 25 && imc < 30) { cat = 'Sobrepeso'; color = '#f97316'; bg = 'rgba(249,115,22,0.15)'; }
      else if (imc >= 30) { cat = 'Obesidad'; color = '#ef4444'; bg = 'rgba(239,68,68,0.15)'; }

      if (imcBadge) {
        imcBadge.textContent = `IMC: ${imc} (${cat})`;
        imcBadge.style.color = color;
        imcBadge.style.background = bg;
      }
    } else if (imcBadge) {
      imcBadge.textContent = 'IMC: —';
    }
  }

  tallaInput?.addEventListener('input', computeIMC);
  pesoInput?.addEventListener('input', computeIMC);
  computeIMC();

  // 5b. Control Interactivo de Fecha de Nacimiento y Edad en Filiación
  const hcBirthInput = container.querySelector('#hcFiliacionBirthdate');
  const hcAgeText = container.querySelector('#hcFiliacionAgeText');
  const hcAgeBadge = container.querySelector('#hcFiliacionAgeBadge');

  if (hcBirthInput) {
    hcBirthInput.addEventListener('input', () => {
      const val = hcBirthInput.value;
      const ageStr = calculateAge(val);
      if (hcAgeBadge) {
        hcAgeBadge.textContent = ageStr !== 'Sin edad' ? ageStr : 'Sin edad';
      }
      if (hcAgeText) {
        hcAgeText.value = ageStr !== 'Sin edad' ? ageStr : '';
      }
      patient.birthdate = val;
      if (ageStr !== 'Sin edad') {
        const num = parseInt(ageStr, 10);
        if (!isNaN(num)) patient.age = num;
      }
      // Actualizar cabezal superior de ficha si está visible
      const headerAge = document.querySelector('#patientDetail .muted strong:nth-of-type(2)');
      if (headerAge && ageStr !== 'Sin edad') {
        headerAge.textContent = ageStr;
      }
    });
  }

  if (hcAgeText) {
    hcAgeText.addEventListener('input', () => {
      const val = hcAgeText.value.trim();
      const ageStr = calculateAge(val);
      if (hcAgeBadge && ageStr !== 'Sin edad') {
        hcAgeBadge.textContent = ageStr;
      }
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        patient.age = num;
        const headerAge = document.querySelector('#patientDetail .muted strong:nth-of-type(2)');
        if (headerAge) headerAge.textContent = `${num} años`;
      }
    });
  }

  // 6. Switches Estomatognático
  container.querySelectorAll('.estomato-item').forEach(item => {
    const btns = item.querySelectorAll('.estomato-switch-btn');
    const obs = item.querySelector('.estomato-obs');
    btns.forEach(b => {
      b.addEventListener('click', () => {
        btns.forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        if (obs) {
          obs.style.display = b.dataset.val === 'patologico' ? 'block' : 'none';
        }
      });
    });
  });

  // 7. Chips Oclusión / Periodontal / Fluorosis
  ['oclusionChips', 'periodontalChips', 'fluorosisChips'].forEach(id => {
    container.querySelectorAll(`#${id} .chip-toggle`).forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll(`#${id} .chip-toggle`).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  });

  // 7b. Cálculo Dinámico de Totales e Índices de Higiene Oral Simplificada (IHO-S)
  function updateIHOSTotals() {
    let totP = 0, totC = 0, totG = 0, totPiezas = 0;
    container.querySelectorAll('.ihos-table tbody tr[data-key]').forEach(tr => {
      totP += parseInt(tr.querySelector('.ihos-placa')?.value) || 0;
      totC += parseInt(tr.querySelector('.ihos-calculo')?.value) || 0;
      totG += parseInt(tr.querySelector('.ihos-gingivitis')?.value) || 0;

      // Sumar piezas marcadas: X = 1, - = 0
      ['.ihos-mark-1', '.ihos-mark-2', '.ihos-mark-3'].forEach(selClass => {
        const val = tr.querySelector(selClass)?.value;
        if (val === 'X') {
          totPiezas += 1;
        }
      });
    });

    const pSpan = container.querySelector('#ihosTotalPlaca');
    const cSpan = container.querySelector('#ihosTotalCalculo');
    const gSpan = container.querySelector('#ihosTotalGingivitis');
    const piezasSpan = container.querySelector('#ihosTotalPiezas');

    if (piezasSpan) piezasSpan.textContent = String(totPiezas);
    if (pSpan) pSpan.textContent = String(totP);
    if (cSpan) cSpan.textContent = String(totC);
    if (gSpan) gSpan.textContent = String(totG);

    // División de cada total para el total de piezas evaluadas con X
    const promP = totPiezas > 0 ? (totP / totPiezas).toFixed(2) : '0.00';
    const promC = totPiezas > 0 ? (totC / totPiezas).toFixed(2) : '0.00';
    const promG = totPiezas > 0 ? (totG / totPiezas).toFixed(2) : '0.00';

    const promPSpan = container.querySelector('#ihosPromPlaca');
    const promCSpan = container.querySelector('#ihosPromCalculo');
    const promGSpan = container.querySelector('#ihosPromGingivitis');

    if (promPSpan) promPSpan.textContent = promP;
    if (promCSpan) promCSpan.textContent = promC;
    if (promGSpan) promGSpan.textContent = promG;
  }

  container.querySelectorAll('.ihos-placa, .ihos-calculo, .ihos-gingivitis, .ihos-mark-sel').forEach(sel => {
    sel.addEventListener('change', updateIHOSTotals);
  });
  updateIHOSTotals();

  // 8. Calculadora Dinámica CPO / ceo (Ambos Activos Simultáneamente)
  const cpoC = container.querySelector('#cpoC');
  const cpoP = container.querySelector('#cpoP');
  const cpoO = container.querySelector('#cpoO');
  const cpoBadge = container.querySelector('#cpoTotalBadge');

  const ceoC = container.querySelector('#ceoC');
  const ceoE = container.querySelector('#ceoE');
  const ceoO = container.querySelector('#ceoO');
  const ceoBadge = container.querySelector('#ceoTotalBadge');

  function updateCPOTotals() {
    const c = parseInt(cpoC?.value) || 0;
    const p = parseInt(cpoP?.value) || 0;
    const o = parseInt(cpoO?.value) || 0;
    if (cpoBadge) cpoBadge.textContent = String(c + p + o);

    const cMin = parseInt(ceoC?.value) || 0;
    const eMin = parseInt(ceoE?.value) || 0;
    const oMin = parseInt(ceoO?.value) || 0;
    if (ceoBadge) ceoBadge.textContent = String(cMin + eMin + oMin);
  }

  [cpoC, cpoP, cpoO, ceoC, ceoE, ceoO].forEach(inp => {
    inp?.addEventListener('input', updateCPOTotals);
    inp?.addEventListener('change', updateCPOTotals);
  });
  updateCPOTotals();

  // 9. Chips de Planes Diagnósticos con despliegue de detalles y creación automática de Nota Clínica
  const planMeta = {
    biometria: {
      title: 'Plan de Diagnóstico: Biometría Hemática',
      code: 'PLN-BIO',
      defaultNote: 'Solicitud de Biometría Hemática completa (recuento leucocitario y plaquetario preoperatorio).'
    },
    quimica: {
      title: 'Plan de Diagnóstico: Química Sanguínea / Glucosa',
      code: 'PLN-LAB',
      defaultNote: 'Solicitud de Química Sanguínea (Glucemia en ayunas, Urea, Creatinina y perfil de coagulación).'
    },
    rayosXPeriapical: {
      title: 'Plan Radiológico: Rayos X Periapical',
      code: 'PLN-RXP',
      defaultNote: 'Toma e informe de Radiografía Periapical para evaluación diagnóstica dental y periapical.'
    },
    rayosXPanoramica: {
      title: 'Plan Radiológico: Rayos X Panorámica',
      code: 'PLN-RXPAN',
      defaultNote: 'Solicitud de Radiografía Panorámica (Ortopantomografía) para valoración de arcadas y terceros molares.'
    },
    cbct: {
      title: 'Plan Tomográfico: Tomografía Dental CBCT',
      code: 'PLN-CBCT',
      defaultNote: 'Solicitud de Tomografía Dental Cone Beam (CBCT) 3D para planificación de implantes / estudio óseo.'
    },
    educacion: {
      title: 'Plan Educacional: Higiene Oral',
      code: 'PLN-EDU',
      defaultNote: 'Instrucción y entrenamiento de técnica de cepillado de Bass modificada, uso de seda dental y control de placa.'
    }
  };

  container.querySelectorAll('#planesDxChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const key = chip.dataset.key;
      const detWrap = container.querySelector(`#detWrap_plan_${key}`);
      const detInput = container.querySelector(`#hcDet_plan_${key}`);
      const isActive = chip.classList.contains('active');

      if (detWrap) {
        detWrap.style.display = isActive ? 'block' : 'none';
        if (isActive && detInput) {
          detInput.focus();
        }
      }
    });
  });

  // 9b. Otros Exámenes / Interconsultas Dinámicos (+ Agregar y Eliminar)
  const otrosContainer = container.querySelector('#otrosPlanesContainer');
  const btnAddOtro = container.querySelector('#btnAddOtroPlan');

  function attachOtroPlanRowEvents(row) {
    const removeBtn = row.querySelector('.btn-remove-otro-plan');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const rows = otrosContainer ? otrosContainer.querySelectorAll('.otro-plan-row') : [];
        if (rows.length > 1) {
          row.remove();
        } else {
          const inp = row.querySelector('.otro-plan-input');
          if (inp) inp.value = '';
        }
        reindexOtrosPlanRows();
      });
    }

    const inp = row.querySelector('.otro-plan-input');
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (btnAddOtro) {
            btnAddOtro.click();
          }
        }
      });
    }
  }

  function reindexOtrosPlanRows() {
    if (!otrosContainer) return;
    otrosContainer.querySelectorAll('.otro-plan-row').forEach((r, i) => {
      const numSpan = r.querySelector('span.muted');
      if (numSpan) numSpan.textContent = `${i + 1}.`;
    });
  }

  if (otrosContainer) {
    otrosContainer.querySelectorAll('.otro-plan-row').forEach(row => attachOtroPlanRowEvents(row));
  }

  if (btnAddOtro && otrosContainer) {
    btnAddOtro.addEventListener('click', () => {
      const div = document.createElement('div');
      div.className = 'otro-plan-row';
      div.style.cssText = 'display:flex; gap:8px; align-items:center;';
      const idx = otrosContainer.querySelectorAll('.otro-plan-row').length + 1;
      div.innerHTML = `
        <span class="muted" style="font-size:0.82rem; min-width:22px; text-align:center; font-weight:700;">${idx}.</span>
        <input type="text" class="field-input otro-plan-input" placeholder="Ej: Interconsulta con médico tratante para pase quirúrgico / Biopsia de mucosa..." value="" style="flex:1;">
        <button type="button" class="ghost btn-remove-otro-plan" title="Eliminar indicación" style="color:var(--danger); padding:6px 10px; border-radius:6px; font-size:0.85rem; cursor:pointer;">
          <i class="fas fa-trash-alt"></i>
        </button>
      `;
      otrosContainer.appendChild(div);
      attachOtroPlanRowEvents(div);
      div.querySelector('input')?.focus();
    });
  }

  // 10. CIE-10 Odontológico (K00-K14 / Z01.2) con Typeahead, PRE/DEF Toggles y Filas Dinámicas (+ Nuevo)
  function reindexCIERows() {
    const allRows = container.querySelectorAll('#cie11Container .cie11-row-card');
    allRows.forEach((r, idx) => {
      r.dataset.index = idx;
      const numSpan = r.querySelector('.cie-row-num');
      if (numSpan) numSpan.textContent = `#${idx + 1}`;
    });
  }

  function openCIE10CatalogModal(targetRow = null) {
    const existingModal = document.getElementById('cie10CatalogModal');
    if (existingModal) existingModal.remove();

    const categories = ['Todas', ...getCIE10Categories()];
    let activeCategory = 'Todas';
    let searchQuery = '';

    const modal = document.createElement('div');
    modal.id = 'cie10CatalogModal';
    modal.className = 'modal';
    modal.style.zIndex = '999999';
    modal.innerHTML = `
      <div class="modal-body" style="max-width: 820px; width: 95%;">
        <div class="modal-head" style="border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <p class="muted" style="font-size:0.8rem; margin:0;"><i class="fas fa-stethoscope"></i> Clasificación Internacional de Enfermedades (OMS)</p>
            <h3 style="margin:2px 0 0 0; font-size:1.25rem;"><i class="fas fa-book-medical" style="color:var(--primary); margin-right:6px;"></i> Catálogo Odontológico CIE-10</h3>
          </div>
          <button type="button" class="ghost close-cie-modal" style="font-size:1.1rem;"><i class="fas fa-times"></i></button>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:12px;">
          <div style="position:relative; flex:1;">
            <i class="fas fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:0.9rem;"></i>
            <input type="text" id="cieModalSearch" class="field-input" placeholder="Buscar por código (ej: K02.1), nombre (ej: Caries, Pulpitis) o categoría..." style="padding-left:36px; width:100%; font-size:0.92rem;">
          </div>
          <button type="button" id="cieModalClearSearch" class="ghost" style="padding:6px 12px; font-size:0.85rem;" title="Limpiar búsqueda">
            <i class="fas fa-eraser"></i> Limpiar
          </button>
        </div>

        <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:12px; scrollbar-width:thin;" id="cieCategoryChips">
          ${categories.map(cat => `
            <span class="cie-category-chip ${cat === 'Todas' ? 'active' : ''}" data-cat="${cat}">${cat}</span>
          `).join('')}
        </div>

        <div class="cie-catalog-grid" id="cieCatalogGrid"></div>

        <div class="modal-actions" style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:12px;">
          <span class="muted" id="cieModalCounter" style="font-size:0.82rem;">Cargando...</span>
          <button type="button" class="ghost close-cie-modal">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const grid = modal.querySelector('#cieCatalogGrid');
    const searchInp = modal.querySelector('#cieModalSearch');
    const counter = modal.querySelector('#cieModalCounter');
    const catChips = modal.querySelectorAll('.cie-category-chip');

    const renderGrid = () => {
      const items = searchCIE10(searchQuery, activeCategory);
      if (items.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--muted);">
            <i class="fas fa-search" style="font-size:2rem; margin-bottom:8px; display:block;"></i>
            No se encontraron diagnósticos para "${searchQuery}".
          </div>
        `;
        counter.textContent = '0 diagnósticos';
        return;
      }

      counter.textContent = `${items.length} diagnóstico${items.length === 1 ? '' : 's'} disponible${items.length === 1 ? '' : 's'}`;
      grid.innerHTML = items.map(item => `
        <div class="cie-catalog-card" data-code="${item.code}" data-name="${item.name}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="cie11-code-badge">${item.code}</span>
            <small class="muted" style="font-size:0.73rem;">${item.category || ''}</small>
          </div>
          <div style="font-weight:600; font-size:0.85rem; color:var(--text); line-height:1.35;">${item.name}</div>
          <div style="margin-top:auto; font-size:0.75rem; color:var(--primary); font-weight:700; display:flex; align-items:center; gap:4px;">
            <i class="fas fa-check-circle"></i> Seleccionar
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.cie-catalog-card').forEach(card => {
        card.addEventListener('click', () => {
          const code = card.dataset.code;
          const name = card.dataset.name;

          // Si se especificó un callback (por ejemplo, desde Sección 12 Sesiones)
          if (typeof targetRow === 'function') {
            targetRow(code, name);
            modal.remove();
            return;
          }

          let rowToUse = targetRow;
          if (!rowToUse) {
            const allRows = container.querySelectorAll('#cie11Container .cie11-row-card');
            for (const r of allRows) {
              const dxVal = r.querySelector('.cie11-dx-input')?.value.trim();
              const cieVal = r.querySelector('.cie11-code-input')?.value.trim();
              if (!dxVal && !cieVal) {
                rowToUse = r;
                break;
              }
            }
          }

          if (!rowToUse) {
            const cieContainer = container.querySelector('#cie11Container');
            if (cieContainer) {
              const count = cieContainer.querySelectorAll('.cie11-row-card').length;
              const temp = document.createElement('div');
              temp.innerHTML = createSingleCIERowHTML(count, name, code, 'PRE');
              rowToUse = temp.firstElementChild;
              cieContainer.appendChild(rowToUse);
              setupCIERowEvents(rowToUse);
            }
          }

          if (rowToUse) {
            const dxInp = rowToUse.querySelector('.cie11-dx-input');
            const codeInp = rowToUse.querySelector('.cie11-code-input');
            if (dxInp) dxInp.value = name;
            if (codeInp) codeInp.value = code;
            rowToUse.scrollIntoView({ behavior: 'smooth', block: 'center' });
            syncSesDxWithCIE10();
          }

          showToast(`CIE-10 seleccionado: ${code} - ${name}`, 'success');
          modal.remove();
        });
      });
    };

    catChips.forEach(chip => {
      chip.addEventListener('click', () => {
        catChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeCategory = chip.dataset.cat;
        renderGrid();
      });
    });

    searchInp?.addEventListener('input', () => {
      searchQuery = searchInp.value.trim();
      renderGrid();
    });

    modal.querySelector('#cieModalClearSearch')?.addEventListener('click', () => {
      if (searchInp) searchInp.value = '';
      searchQuery = '';
      renderGrid();
      searchInp?.focus();
    });

    const closeModal = () => modal.remove();
    modal.querySelectorAll('.close-cie-modal').forEach(b => b.addEventListener('click', closeModal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    renderGrid();
    setTimeout(() => searchInp?.focus(), 80);
  }

  function setupCIERowEvents(row) {
    const dxInput = row.querySelector('.cie11-dx-input');
    const codeInput = row.querySelector('.cie11-code-input');
    const dropdown = row.querySelector('.cie11-dropdown');
    const codeDropdown = row.querySelector('.cie11-code-dropdown');
    const preDefBtns = row.querySelectorAll('.pre-def-btn');
    const pickerBtn = row.querySelector('.cie-row-picker-btn');
    const delBtn = row.querySelector('.cie-del-row-btn');

    const closeAllDropdowns = () => {
      if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('drop-up');
      }
      if (codeDropdown) {
        codeDropdown.classList.add('hidden');
        codeDropdown.classList.remove('drop-up');
      }
      row.style.zIndex = '1';
    };

    const openDropdown = () => {
      container.querySelectorAll('#cie11Container .cie11-dropdown, #cie11Container .cie11-code-dropdown').forEach(d => {
        d.classList.add('hidden');
        d.classList.remove('drop-up');
      });
      container.querySelectorAll('#cie11Container .cie11-row-card').forEach(r => r.style.zIndex = '1');
      if (dropdown) {
        if (dxInput) {
          const rect = dxInput.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          const neededHeight = 230;

          if (spaceBelow < neededHeight && spaceAbove >= 160) {
            dropdown.classList.add('drop-up');
          } else {
            dropdown.classList.remove('drop-up');
          }
          if (spaceBelow < neededHeight && spaceAbove < neededHeight) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        dropdown.classList.remove('hidden');
      }
      row.style.zIndex = '100';
    };

    const openCodeDropdown = () => {
      container.querySelectorAll('#cie11Container .cie11-dropdown, #cie11Container .cie11-code-dropdown').forEach(d => {
        d.classList.add('hidden');
      });
      container.querySelectorAll('#cie11Container .cie11-row-card').forEach(r => r.style.zIndex = '1');
      if (codeDropdown) {
        if (codeInput) {
          const rect = codeInput.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 220 && rect.top >= 150) {
            codeDropdown.classList.add('drop-up');
          } else {
            codeDropdown.classList.remove('drop-up');
          }
        }
        codeDropdown.classList.remove('hidden');
      }
      row.style.zIndex = '100';
    };

    preDefBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        preDefBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    pickerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openCIE10CatalogModal(row);
    });

    delBtn?.addEventListener('click', () => {
      const allRows = container.querySelectorAll('#cie11Container .cie11-row-card');
      if (allRows.length > 1) {
        row.remove();
        reindexCIERows();
      } else {
        if (dxInput) dxInput.value = '';
        if (codeInput) codeInput.value = '';
      }
      syncSesDxWithCIE10();
    });

    // Renderizado del dropdown de diagnósticos
    const renderDxDropdown = (results, isPopular = false) => {
      if (!dropdown) return;
      if (results.length === 0) {
        dropdown.innerHTML = `
          <div class="cie11-dropdown-item" style="color:var(--muted); font-style:italic; justify-content:center; padding:10px;">
            <span>No encontrado en catálogo base (puede escribir libremente)</span>
          </div>
        `;
      } else {
        const headerHtml = isPopular
          ? `<div style="padding:6px 12px; font-size:0.75rem; font-weight:700; color:var(--primary); background:var(--bg-page); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
               <span><i class="fas fa-star" style="margin-right:4px;"></i> Diagnósticos Odontológicos Frecuentes:</span>
               <span style="font-size:0.72rem; color:var(--muted); font-weight:normal;">o escriba para filtrar</span>
             </div>`
          : '';
        dropdown.innerHTML = headerHtml + results.slice(0, 10).map(r => `
          <div class="cie11-dropdown-item" data-code="${r.code}" data-name="${r.name}">
            <span class="cie11-code-badge">${r.code}</span>
            <span style="font-weight:600; font-size:0.83rem;">${r.name}</span>
            <small class="muted" style="margin-left:auto; font-size:0.75rem; white-space:nowrap; padding-left:8px;">${r.category || ''}</small>
          </div>
        `).join('');
      }
      openDropdown();

      dropdown.querySelectorAll('.cie11-dropdown-item').forEach(item => {
        if (!item.dataset.code) return;
        const selectItem = (e) => {
          if (e) e.preventDefault();
          dxInput.value = item.dataset.name;
          if (codeInput) codeInput.value = item.dataset.code;
          closeAllDropdowns();
          syncSesDxWithCIE10();
        };
        item.addEventListener('mousedown', selectItem);
        item.addEventListener('click', selectItem);
      });
    };

    if (dxInput && dropdown) {
      dxInput.addEventListener('focus', () => {
        const q = dxInput.value.trim();
        if (!q) {
          renderDxDropdown(getPopularCIE10(), true);
        } else {
          renderDxDropdown(searchCIE10(q), false);
        }
      });

      dxInput.addEventListener('click', () => {
        const q = dxInput.value.trim();
        if (!q) {
          renderDxDropdown(getPopularCIE10(), true);
        } else {
          renderDxDropdown(searchCIE10(q), false);
        }
      });

      dxInput.addEventListener('input', () => {
        const q = dxInput.value.trim();
        if (!q) {
          renderDxDropdown(getPopularCIE10(), true);
          syncSesDxWithCIE10();
          return;
        }
        renderDxDropdown(searchCIE10(q), false);
      });

      dxInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllDropdowns();
      });
    }

    // Dropdown interactivo para el código CIE-10
    const renderCodeDropdown = (q = '') => {
      if (!codeDropdown) return;
      const results = searchCIE10(q);
      if (results.length === 0) {
        codeDropdown.classList.add('hidden');
        return;
      }
      codeDropdown.innerHTML = results.slice(0, 8).map(r => `
        <div class="cie11-dropdown-item" data-code="${r.code}" data-name="${r.name}" style="padding:6px 10px; font-size:0.8rem;">
          <span class="cie11-code-badge">${r.code}</span>
          <span style="font-size:0.78rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.name}</span>
        </div>
      `).join('');
      openCodeDropdown();

      codeDropdown.querySelectorAll('.cie11-dropdown-item').forEach(item => {
        const selectCode = (e) => {
          if (e) e.preventDefault();
          codeInput.value = item.dataset.code;
          if (dxInput) dxInput.value = item.dataset.name;
          closeAllDropdowns();
          syncSesDxWithCIE10();
        };
        item.addEventListener('mousedown', selectCode);
        item.addEventListener('click', selectCode);
      });
    };

    if (codeInput) {
      codeInput.addEventListener('focus', () => {
        renderCodeDropdown(codeInput.value.trim());
      });
      codeInput.addEventListener('click', () => {
        renderCodeDropdown(codeInput.value.trim());
      });
      codeInput.addEventListener('input', () => {
        renderCodeDropdown(codeInput.value.trim());
      });
      codeInput.addEventListener('change', () => {
        const c = codeInput.value.trim().toUpperCase();
        const match = getCIE10ByCode(c);
        if (match && !dxInput.value.trim()) {
          dxInput.value = match.name;
        }
        syncSesDxWithCIE10();
      });
      codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllDropdowns();
      });
    }

    document.addEventListener('click', (e) => {
      if (!row.contains(e.target)) closeAllDropdowns();
    });
  }

  // Bind initial CIE-10 rows
  container.querySelectorAll('#cie11Container .cie11-row-card').forEach(row => {
    setupCIERowEvents(row);
  });

  // Handler for "Explorar Catálogo Completo" button
  const cieBrowseCatalogBtn = container.querySelector('#cieBrowseCatalogBtn');
  cieBrowseCatalogBtn?.addEventListener('click', () => {
    openCIE10CatalogModal(null);
  });

  // Handler for "+ Nuevo Diagnóstico" button
  const cieAddNewBtn = container.querySelector('#cieAddNewBtn');
  cieAddNewBtn?.addEventListener('click', () => {
    const cieContainer = container.querySelector('#cie11Container');
    if (!cieContainer) return;
    const currentCount = cieContainer.querySelectorAll('.cie11-row-card').length;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = createSingleCIERowHTML(currentCount, '', '', 'PRE');
    const newRow = tempDiv.firstElementChild;
    cieContainer.appendChild(newRow);
    setupCIERowEvents(newRow);
    newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const newDxInput = newRow.querySelector('.cie11-dx-input');
    if (newDxInput) newDxInput.focus();
  });

  // 11. Sesiones de Tratamiento y Autocompletado de Código y Firma Médica
  const newSesBtn = container.querySelector('#hcNewSessionBtn');
  const sessionFormArea = container.querySelector('#newSessionFormArea');
  const sesCancelBtn = container.querySelector('#sesCancelBtn');
  const sesSaveBtn = container.querySelector('#sesSaveBtn');
  const sesProcInput = container.querySelector('#sesProc');
  const sesDxInput = container.querySelector('#sesDx');
  const sesDxSyncSelect = container.querySelector('#sesDxSyncSelect');
  const sesDxDatalist = container.querySelector('#sesDxDatalist');
  const sesCodeInput = container.querySelector('#sesCode');
  const sesSignSelect = container.querySelector('#sesSignSelect');
  const sesSignInput = container.querySelector('#sesSign');

  const syncSesDxWithCIE10 = () => {
    const allCatalogue = getFullCIE10Catalogue();
    const rows = container.querySelectorAll('#cie11Container .cie11-row-card');
    const sec11List = [];
    rows.forEach(r => {
      const code = r.querySelector('.cie11-code-input')?.value.trim() || '';
      const name = r.querySelector('.cie11-dx-input')?.value.trim() || '';
      if (code && name) sec11List.push(`${code} - ${name}`);
      else if (name) sec11List.push(name);
      else if (code) sec11List.push(code);
    });

    if (sesDxDatalist) {
      const combinedDatalist = [...new Set([
        ...sec11List,
        ...allCatalogue.map(c => `${c.code} - ${c.name}`)
      ])];
      sesDxDatalist.innerHTML = combinedDatalist.map(item => `<option value="${item}">`).join('');
    }

    if (sesDxSyncSelect) {
      const currVal = sesDxSyncSelect.value;
      let optionsHtml = '<option value="">-- Seleccionar CIE-10 --</option>';

      if (sec11List.length > 0) {
        optionsHtml += `<optgroup label="📋 Diagnósticos del Paciente (Sec. 11)">`;
        sec11List.forEach(item => {
          optionsHtml += `<option value="${item}">${item}</option>`;
        });
        optionsHtml += `</optgroup>`;
      }

      const categories = getCIE10Categories();
      categories.forEach(cat => {
        const catItems = allCatalogue.filter(i => i.category === cat);
        if (catItems.length > 0) {
          optionsHtml += `<optgroup label="🩺 ${cat}">`;
          catItems.forEach(i => {
            const label = `${i.code} - ${i.name}`;
            optionsHtml += `<option value="${label}">${label}</option>`;
          });
          optionsHtml += `</optgroup>`;
        }
      });

      sesDxSyncSelect.innerHTML = optionsHtml;
      if (currVal) {
        sesDxSyncSelect.value = currVal;
      }
    }
  };

  const sesDxDropdown = container.querySelector('#sesDxDropdown');

  const renderSesDxSearchResults = (query = '') => {
    if (!sesDxDropdown) return;
    const cleanQuery = query.trim().toLowerCase();
    const results = searchCIE10(cleanQuery);
    
    if (results.length === 0) {
      sesDxDropdown.innerHTML = `
        <div style="padding:10px 14px; font-size:0.8rem; color:var(--muted); text-align:center;">
          <i class="fas fa-search"></i> Sin coincidencias para "${esc(query)}"
        </div>
      `;
      sesDxDropdown.classList.remove('hidden');
      return;
    }

    sesDxDropdown.innerHTML = results.slice(0, 30).map(item => `
      <div class="cie11-dropdown-item" data-code="${esc(item.code)}" data-name="${esc(item.name)}" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="flex:1;">
          <span class="cie11-code-badge" style="font-size:0.75rem; font-weight:800; padding:2px 6px; border-radius:4px; background:rgba(99,102,241,0.15); color:var(--primary); margin-right:6px;">${item.code}</span>
          <span style="font-size:0.83rem; font-weight:600; color:var(--text);">${item.name}</span>
        </div>
        <small class="muted" style="font-size:0.72rem; flex-shrink:0;">${item.category || ''}</small>
      </div>
    `).join('');

    sesDxDropdown.querySelectorAll('.cie11-dropdown-item').forEach(elItem => {
      elItem.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const code = elItem.dataset.code;
        const name = elItem.dataset.name;
        const val = `${code} - ${name}`;
        if (sesDxInput) sesDxInput.value = val;
        if (sesDxSyncSelect) sesDxSyncSelect.value = val;
        sesDxDropdown.classList.add('hidden');
        showToast(`CIE-10 seleccionado: ${code}`, 'info');
      });
    });

    sesDxDropdown.classList.remove('hidden');
  };

  sesDxSyncSelect?.addEventListener('change', () => {
    if (sesDxSyncSelect.value && sesDxInput) {
      sesDxInput.value = sesDxSyncSelect.value;
      sesDxInput.focus();
      sesDxDropdown?.classList.add('hidden');
    }
  });

  sesDxInput?.addEventListener('input', () => {
    const q = sesDxInput.value;
    if (sesDxSyncSelect) {
      const match = Array.from(sesDxSyncSelect.options).find(opt => opt.value.toLowerCase() === q.trim().toLowerCase());
      sesDxSyncSelect.value = match ? match.value : '';
    }
    renderSesDxSearchResults(q);
  });

  sesDxInput?.addEventListener('focus', () => {
    renderSesDxSearchResults(sesDxInput.value || '');
  });

  sesDxInput?.addEventListener('blur', () => {
    setTimeout(() => {
      sesDxDropdown?.classList.add('hidden');
    }, 200);
  });

  const sesDxPickerBtn = container.querySelector('#sesDxPickerBtn');
  sesDxPickerBtn?.addEventListener('click', () => {
    openCIE10CatalogModal((code, name) => {
      const val = `${code} - ${name}`;
      if (sesDxInput) {
        sesDxInput.value = val;
        sesDxInput.focus();
      }
      if (sesDxSyncSelect) sesDxSyncSelect.value = val;
      sesDxDropdown?.classList.add('hidden');
      showToast(`Diagnóstico asignado a sesión: ${code}`, 'success');
    });
  });

  const updateDoctorLicenseCode = () => {
    const selectedName = sesSignSelect?.value || sesSignInput?.value || defaultDoctorName;
    const prof = profList.find(p => p.name === selectedName || p.id === selectedName);
    if (sesCodeInput) {
      sesCodeInput.value = prof?.license_code || assignedProf?.license_code || '';
    }
  };

  // Sincronizar selección de médico desde el dropdown y actualizar código de habilitación
  sesSignSelect?.addEventListener('change', () => {
    if (sesSignSelect.value && sesSignInput) {
      sesSignInput.value = sesSignSelect.value;
    }
    updateDoctorLicenseCode();
  });

  sesSignInput?.addEventListener('input', () => {
    updateDoctorLicenseCode();
  });

  newSesBtn?.addEventListener('click', () => {
    sessionFormArea.style.display = 'block';
    sessionFormArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    syncSesDxWithCIE10();
    if (sesSignInput && !sesSignInput.value) {
      sesSignInput.value = defaultDoctorName;
    }
    updateDoctorLicenseCode();
    if (sesProcInput) sesProcInput.focus();
  });

  // Run initial sync on load
  syncSesDxWithCIE10();

  sesCancelBtn?.addEventListener('click', () => {
    sessionFormArea.style.display = 'none';
  });

  sesSaveBtn?.addEventListener('click', async () => {
    const fecha = container.querySelector('#sesDate')?.value;
    const dx = container.querySelector('#sesDx')?.value.trim();
    const proc = container.querySelector('#sesProc')?.value.trim();
    const rx = container.querySelector('#sesRx')?.value.trim();
    const code = container.querySelector('#sesCode')?.value.trim();
    const sign = container.querySelector('#sesSign')?.value.trim() || defaultDoctorName;

    if (!proc && !dx) {
      showToast('Ingresá al menos el procedimiento o diagnóstico', 'warning');
      return;
    }

    const notePayload = {
      patientId: patient.id,
      date: fecha,
      procedimiento: proc || dx,
      diagnosticoTipo: dx,
      nota: proc,
      receta: rx,
      code,
      professionalName: sign
    };

    if (onSaveNote) {
      await onSaveNote(notePayload);
      showToast('Sesión registrada exitosamente', 'success');
      sessionFormArea.style.display = 'none';
      if (!patient.clinicalNotes) patient.clinicalNotes = [];
      if (!patient.clinicalNotes.some(n => n.id === notePayload.id || (n.date === notePayload.date && n.procedimiento === notePayload.procedimiento && n.nota === notePayload.nota))) {
        patient.clinicalNotes.unshift(notePayload);
      }
      const listDiv = container.querySelector('#sessionHistoryList');
      if (listDiv) listDiv.innerHTML = renderSessionHistory(patient.clinicalNotes);

      // Limpiar campos para la próxima sesión
      if (sesDxInput) sesDxInput.value = '';
      if (sesProcInput) sesProcInput.value = '';
      if (sesRxInput) container.querySelector('#sesRx').value = '';
      updateDoctorLicenseCode();
    }
  });

  // 12. Guardar Toda la Historia Clínica
  const saveHandler = async () => {
    await saveFullClinicalHistory(container, patient, onSaveFullHistory);
  };
  container.querySelectorAll('#hcSaveAllBtn, #hcBottomSaveBtn').forEach(btn => {
    btn.addEventListener('click', saveHandler);
  });

  // 7. Renderizar Odontograma MSP Oficial en Sección 7
  const odontoBox = container.querySelector('#hcSection7Odontogram');
  if (odontoBox) {
    renderOdontogram(odontoBox, patient);
  }

  loadAttachments(patient.id, container, canEdit);
  return container;
}

async function saveFullClinicalHistory(container, patient, onSaveFullHistory) {
  const saveBtns = container.querySelectorAll('#hcSaveAllBtn, #hcBottomSaveBtn');
  saveBtns.forEach(b => {
    b.disabled = true;
    b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  });

  try {
    const antecedentes = {
      alergiaAntibiotico: container.querySelector('[data-key="alergiaAntibiotico"]')?.classList.contains('active') || false,
      alergiaAnestesia: container.querySelector('[data-key="alergiaAnestesia"]')?.classList.contains('active') || false,
      hemorragias: container.querySelector('[data-key="hemorragias"]')?.classList.contains('active') || false,
      diabetes: container.querySelector('[data-key="diabetes"]')?.classList.contains('active') || false,
      hipertension: container.querySelector('[data-key="hipertension"]')?.classList.contains('active') || false,
      cardiaca: container.querySelector('[data-key="cardiaca"]')?.classList.contains('active') || false,
      asma: container.querySelector('[data-key="asma"]')?.classList.contains('active') || false,
      vih: container.querySelector('[data-key="vih"]')?.classList.contains('active') || false,
      tuberculosis: container.querySelector('[data-key="tuberculosis"]')?.classList.contains('active') || false,
      otro: container.querySelector('[data-key="otro"]')?.classList.contains('active') || false,

      detalles: {
        alergiaAntibiotico: container.querySelector('#hcDet_alergiaAntibiotico')?.value.trim() || '',
        alergiaAnestesia: container.querySelector('#hcDet_alergiaAnestesia')?.value.trim() || '',
        hemorragias: container.querySelector('#hcDet_hemorragias')?.value.trim() || '',
        diabetes: container.querySelector('#hcDet_diabetes')?.value.trim() || '',
        hipertension: container.querySelector('#hcDet_hipertension')?.value.trim() || '',
        cardiaca: container.querySelector('#hcDet_cardiaca')?.value.trim() || '',
        asma: container.querySelector('#hcDet_asma')?.value.trim() || '',
        vih: container.querySelector('#hcDet_vih')?.value.trim() || '',
        tuberculosis: container.querySelector('#hcDet_tuberculosis')?.value.trim() || '',
        otro: container.querySelector('#hcDet_otro')?.value.trim() || ''
      },

      alergiaAntibioticoDetalle: container.querySelector('#hcDet_alergiaAntibiotico')?.value.trim() || '',
      alergiaAnestesiaDetalle: container.querySelector('#hcDet_alergiaAnestesia')?.value.trim() || '',
      hemorragiasDetalle: container.querySelector('#hcDet_hemorragias')?.value.trim() || '',
      diabetesDetalle: container.querySelector('#hcDet_diabetes')?.value.trim() || '',
      hipertensionDetalle: container.querySelector('#hcDet_hipertension')?.value.trim() || '',
      cardiacaDetalle: container.querySelector('#hcDet_cardiaca')?.value.trim() || '',
      asmaDetalle: container.querySelector('#hcDet_asma')?.value.trim() || '',
      vihDetalle: container.querySelector('#hcDet_vih')?.value.trim() || '',
      tuberculosisDetalle: container.querySelector('#hcDet_tuberculosis')?.value.trim() || '',
      otroDetalle: container.querySelector('#hcDet_otro')?.value.trim() || '',

      cirugias: container.querySelector('#hcCirugias')?.value.trim() || '',
      recuperacion: container.querySelector('#hcRecuperacion')?.value.trim() || '',
      bifosfonatos: container.querySelector('#bifosfonatosChips .chip-toggle.danger')?.classList.contains('active') || false,
      bifosfonatosDetalle: container.querySelector('#hcBifosfonatosDetalle')?.value.trim() || ''
    };


    const signosVitales = {
      pa: container.querySelector('#hcPa')?.value.trim() || '',
      fc: container.querySelector('#hcFc')?.value.trim() || '',
      fr: container.querySelector('#hcFr')?.value.trim() || '',
      temp: container.querySelector('#hcTemp')?.value.trim() || '',
      spo2: container.querySelector('#hcSpo2')?.value.trim() || '',
      talla: container.querySelector('#hcTalla')?.value.trim() || '',
      peso: container.querySelector('#hcPeso')?.value.trim() || ''
    };

    const estomatognatico = {};
    container.querySelectorAll('.estomato-item').forEach(it => {
      const key = it.dataset.key;
      const isPat = it.querySelector('.estomato-switch-btn.patologico')?.classList.contains('active');
      const obs = it.querySelector('.estomato-obs')?.value.trim() || '';
      estomatognatico[key] = { estado: isPat ? 'patologico' : 'normal', obs };
    });

    const ihos = {};
    let totP = 0, totC = 0, totG = 0, totPiezas = 0;
    container.querySelectorAll('.ihos-table tbody tr[data-key]').forEach(tr => {
      const key = tr.dataset.key;
      const m1 = tr.querySelector('.ihos-mark-1')?.value || '';
      const m2 = tr.querySelector('.ihos-mark-2')?.value || '';
      const m3 = tr.querySelector('.ihos-mark-3')?.value || '';
      const placa = parseInt(tr.querySelector('.ihos-placa')?.value) || 0;
      const calculo = parseInt(tr.querySelector('.ihos-calculo')?.value) || 0;
      const gingivitis = parseInt(tr.querySelector('.ihos-gingivitis')?.value) || 0;

      [m1, m2, m3].forEach(v => { if (v === 'X') totPiezas++; });
      totP += placa;
      totC += calculo;
      totG += gingivitis;

      ihos[key] = { m1, m2, m3, placa, calculo, gingivitis };
    });

    const ihosResumen = {
      totalPiezas: totPiezas,
      totalPlaca: totP,
      totalCalculo: totC,
      totalGingivitis: totG,
      indicePlaca: totPiezas > 0 ? Number((totP / totPiezas).toFixed(2)) : 0,
      indiceCalculo: totPiezas > 0 ? Number((totC / totPiezas).toFixed(2)) : 0,
      indiceGingivitis: totPiezas > 0 ? Number((totG / totPiezas).toFixed(2)) : 0
    };

    const oclusion = container.querySelector('#oclusionChips .chip-toggle.active')?.dataset.val || 'Angle I';
    const periodontal = container.querySelector('#periodontalChips .chip-toggle.active')?.dataset.val || 'Sano';
    const fluorosis = container.querySelector('#fluorosisChips .chip-toggle.active')?.dataset.val || 'Ausente';

    const cpo = {
      c: parseInt(container.querySelector('#cpoC')?.value) || 0,
      p: parseInt(container.querySelector('#cpoP')?.value) || 0,
      o: parseInt(container.querySelector('#cpoO')?.value) || 0,
      totalCPO: parseInt(container.querySelector('#cpoTotalBadge')?.textContent) || 0,
      c_min: parseInt(container.querySelector('#ceoC')?.value) || 0,
      e_min: parseInt(container.querySelector('#ceoE')?.value) || 0,
      o_min: parseInt(container.querySelector('#ceoO')?.value) || 0,
      totalCeo: parseInt(container.querySelector('#ceoTotalBadge')?.textContent) || 0
    };

    const planes = {
      biometria: container.querySelector('[data-key="biometria"]')?.classList.contains('active') || false,
      quimica: container.querySelector('[data-key="quimica"]')?.classList.contains('active') || false,
      rayosXPeriapical: container.querySelector('[data-key="rayosXPeriapical"]')?.classList.contains('active') || false,
      rayosXPanoramica: container.querySelector('[data-key="rayosXPanoramica"]')?.classList.contains('active') || false,
      cbct: container.querySelector('[data-key="cbct"]')?.classList.contains('active') || false,
      educacion: container.querySelector('[data-key="educacion"]')?.classList.contains('active') || false,

      detalles: {
        biometria: container.querySelector('#hcDet_plan_biometria')?.value.trim() || '',
        quimica: container.querySelector('#hcDet_plan_quimica')?.value.trim() || '',
        rayosXPeriapical: container.querySelector('#hcDet_plan_rayosXPeriapical')?.value.trim() || '',
        rayosXPanoramica: container.querySelector('#hcDet_plan_rayosXPanoramica')?.value.trim() || '',
        cbct: container.querySelector('#hcDet_plan_cbct')?.value.trim() || '',
        educacion: container.querySelector('#hcDet_plan_educacion')?.value.trim() || ''
      },

      biometriaDetalle: container.querySelector('#hcDet_plan_biometria')?.value.trim() || '',
      quimicaDetalle: container.querySelector('#hcDet_plan_quimica')?.value.trim() || '',
      rayosXPeriapicalDetalle: container.querySelector('#hcDet_plan_rayosXPeriapical')?.value.trim() || '',
      rayosXPanoramicaDetalle: container.querySelector('#hcDet_plan_rayosXPanoramica')?.value.trim() || '',
      cbctDetalle: container.querySelector('#hcDet_plan_cbct')?.value.trim() || '',
      educacionDetalle: container.querySelector('#hcDet_plan_educacion')?.value.trim() || '',

      otros: (() => {
        const list = [];
        container.querySelectorAll('.otro-plan-input').forEach(inp => {
          const v = inp.value.trim();
          if (v) list.push(v);
        });
        return list.join(' \n ');
      })(),
      otrosList: (() => {
        const list = [];
        container.querySelectorAll('.otro-plan-input').forEach(inp => {
          const v = inp.value.trim();
          if (v) list.push(v);
        });
        return list;
      })()
    };

    const diagnosticosCIE10 = [];
    container.querySelectorAll('#cie11Container .cie11-row-card').forEach(row => {
      const dx = row.querySelector('.cie11-dx-input')?.value.trim() || '';
      const cie = row.querySelector('.cie11-code-input')?.value.trim() || '';
      const tipo = row.querySelector('.pre-def-btn.active')?.dataset.tipo || 'PRE';
      if (dx || cie) {
        diagnosticosCIE10.push({ dx, cie, tipo });
        if (cie && dx) {
          addCustomCIE10({ code: cie, name: dx });
        }
      }
    });

    const fullHistory = {
      motivoConsulta: container.querySelector('#hcMotivoConsulta')?.value.trim() || '',
      enfermedadActual: {
        cronologia: container.querySelector('#hcEaCronologia')?.value.trim() || '',
        localizacion: container.querySelector('#hcEaLocalizacion')?.value.trim() || '',
        eva: container.querySelector('#evaChips .chip-toggle.active')?.dataset.val || '0',
        evolucion: container.querySelector('#hcEaEvolucion')?.value.trim() || ''
      },
      antecedentes,
      signosVitales,
      estomatognatico,
      indicadoresSalud: { ihos, ihosResumen, oclusion, periodontal, fluorosis },
      cpo,
      planes,
      diagnosticosCIE10,
      diagnosticosCIE11: diagnosticosCIE10
    };

    const updatedBirthdate = container.querySelector('#hcFiliacionBirthdate')?.value || patient.birthdate || null;
    const updatedAgeText = container.querySelector('#hcFiliacionAgeText')?.value || '';
    const updatedAge = parseInt(updatedAgeText, 10) || patient.age || null;
    if (updatedBirthdate) patient.birthdate = updatedBirthdate;
    if (updatedAge) patient.age = updatedAge;

    patient.clinicalHistory = fullHistory;

    const patchPayload = {
      clinicalHistory: fullHistory
    };
    if (updatedBirthdate) patchPayload.birthdate = updatedBirthdate;
    if (updatedAge) patchPayload.age = updatedAge;

    if (onSaveFullHistory) {
      await onSaveFullHistory(fullHistory, patchPayload);
    } else {
      await apiFetch(`api/patients.php?id=${patient.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchPayload)
      });
    }

    showToast('Historia Clínica completa guardada con éxito', 'success');
  } catch (err) {
    showToast(err.message || 'Error al guardar la Historia Clínica', 'error');
  } finally {
    saveBtns.forEach(b => {
      b.disabled = false;
      if (b.id === 'hcBottomSaveBtn') {
        b.innerHTML = '<i class="fas fa-save"></i> Guardar Historia Clínica Completa';
      } else {
        b.innerHTML = '<i class="fas fa-save"></i> Guardar Historia';
      }
    });
  }
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
  } catch (err) {}
}

function renderAttachments(listContainer, attachments, patientId, canEdit, parentContainer) {
  if (!listContainer) return;
  listContainer.innerHTML = '';
  
  if (attachments.length === 0) {
    listContainer.innerHTML = '<p class="muted" style="grid-column:1/-1; text-align:center;">No hay fotos o radiografías adjuntas.</p>';
    return;
  }
  
  attachments.forEach(att => {
    const card = document.createElement('div');
    card.className = 'attachment-card';
    card.style.cssText = 'border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--bg-page); position:relative;';
    
    const isPdf = att.originalName?.toLowerCase().endsWith('.pdf');
    
    card.innerHTML = `
      <div style="height:120px; background:var(--surface); display:flex; align-items:center; justify-content:center; cursor:pointer;" class="att-preview">
        ${isPdf 
          ? '<i class="fas fa-file-pdf" style="font-size:3rem; color:var(--danger);"></i>'
          : `<img src="${att.url}" style="width:100%; height:100%; object-fit:cover;" />`
        }
      </div>
      <div style="padding:8px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px;" title="${att.originalName}">${att.originalName}</span>
        ${canEdit ? `<button class="ghost att-del-btn" style="padding:2px 6px; color:var(--danger); border:none;" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    `;
    
    card.querySelector('.att-preview').addEventListener('click', () => {
      openLightbox(att);
    });
    
    if (canEdit) {
      card.querySelector('.att-del-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar ${att.originalName}?`)) {
          await deleteAttachment(att.id, patientId, parentContainer, canEdit);
        }
      });
    }
    
    listContainer.appendChild(card);
  });
}

function openLightbox(att) {
  const isPdf = att.originalName?.toLowerCase().endsWith('.pdf');
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px);';
  
  overlay.innerHTML = `
    <div style="position:relative; max-width:90%; max-height:90%; display:flex; flex-direction:column; align-items:center;">
      <button style="position:absolute; top:-40px; right:0; background:transparent; border:none; color:#fff; font-size:1.5rem; cursor:pointer;" id="closeLightbox"><i class="fas fa-times"></i></button>
      ${isPdf 
        ? `<iframe src="${att.url}" style="width:80vw; height:80vh; border:none; border-radius:8px;"></iframe>`
        : `<img src="${att.url}" style="max-width:100%; max-height:80vh; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.5);" />`
      }
      <p style="color:#fff; margin-top:10px; font-size:0.9rem;">${att.originalName} · ${att.date || ''}</p>
    </div>
  `;
  
  overlay.querySelector('#closeLightbox').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
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
