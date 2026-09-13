/**
 * historia-clinica.js - Sistema Integral de Historia Clínica Odontológica (12 Secciones Oficiales + CIE-11)
 * Diseñado con interfaz moderna en formato Accordion Card Deck (desplegable e interactivo)
 */
import { showToast, apiFetch, formatDate } from './app-utils.js';
import { CIE11_DENTAL_CATALOGUE, searchCIE11 } from './cie11-catalogue.js';

export function createHistoriaClinica(patient, notes = [], plans = [], canEdit = true, onSaveNote, onUpdatePlan, onSaveFullHistory) {
  const container = document.createElement('div');
  container.className = 'historia-clinica-card';

  const ch = patient.clinicalHistory || {};
  const ant = ch.antecedentes || {};
  const sig = ch.signosVitales || {};
  const est = ch.estomatognatico || {};
  const ind = ch.indicadoresSalud || {};
  const cpoData = ch.cpo || calculateCPOFromNotes(notes);
  const planesDx = ch.planes || {};
  const diagList = ch.diagnosticosCIE11 && ch.diagnosticosCIE11.length > 0 
    ? ch.diagnosticosCIE11 
    : [
        { dx: 'Caries de la dentina', cie: 'DA01.1', tipo: 'DEF' },
        { dx: 'Gingivitis inducida por placa dental', cie: 'DA0F.0', tipo: 'DEF' },
        { dx: '', cie: '', tipo: 'PRE' },
        { dx: '', cie: '', tipo: 'PRE' }
      ];

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
          <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:var(--text); letter-spacing:-0.3px;">${patient.name || 'Paciente sin registrar'}</h3>
          <div class="hc-hero-meta" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:4px; font-size:0.83rem; color:var(--muted);">
            <span><i class="fas fa-id-card" style="color:var(--primary);"></i> Cédula: <strong style="color:var(--text);">${patient.dni || 'Sin Cédula'}</strong></span>
            <span><i class="fas fa-venus-mars" style="color:var(--primary);"></i> Género: <strong style="color:var(--text);">${patient.sex || 'No espec.'}</strong></span>
            <span><i class="fas fa-shield-halved" style="color:var(--primary);"></i> <strong style="color:var(--text);">${patient.health_insurance || patient.insurance || 'Particular'}</strong></span>
            ${patient.phone ? `<span><i class="fab fa-whatsapp" style="color:#22c55e;"></i> ${patient.phone}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="hc-hero-actions" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
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
            <label class="field"><span>Nombre Completo</span><input type="text" value="${patient.name || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Cédula / Identificación</span><input type="text" value="${patient.dni || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Fecha de Nacimiento / Edad</span><input type="text" value="${patient.birth_date || ''} (${patient.age ? patient.age + ' años' : 'Sin edad'})" readonly class="field-readonly"></label>
            <label class="field"><span>Género</span><input type="text" value="${patient.sex || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Estado Civil</span><input type="text" value="${patient.civil_status || patient.civilStatus || 'Soltero/a'}" readonly class="field-readonly"></label>
            <label class="field"><span>Ocupación</span><input type="text" value="${patient.occupation || 'No especificada'}" readonly class="field-readonly"></label>
            <label class="field"><span>Teléfono / WhatsApp</span><input type="text" value="${patient.phone || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Email</span><input type="text" value="${patient.email || ''}" readonly class="field-readonly"></label>
            <label class="field"><span>Cobertura / Seguro Dental</span><input type="text" value="${patient.health_insurance || patient.insurance || 'Particular'}" readonly class="field-readonly"></label>
            <label class="field" style="grid-column:1/-1;"><span>Dirección de Residencia</span><input type="text" value="${patient.address || 'No registrada'}" readonly class="field-readonly"></label>
            <label class="field" style="grid-column:1/-1;"><span>Contacto de Emergencia</span><input type="text" value="${patient.emergency_contact || patient.emergencyContact || 'No especificado'}" readonly class="field-readonly"></label>
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
            <span class="chip-toggle" data-val="Restauración / Calce caído"><i class="fas fa-tooth"></i> Calce Caído</span>
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
              <span class="chip-toggle danger ${ch.enfermedadActual?.eva === '10' ? 'active' : ''}" data-val="10">10 Insupportable</span>
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
          <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">Haga clic sobre las condiciones que apliquen al paciente:</p>
          <div class="chips-container" id="antecedentesChips">
            <span class="chip-toggle danger ${ant.alergiaAntibiotico ? 'active' : ''}" data-key="alergiaAntibiotico"><i class="fas fa-pills"></i> Alergia Antibióticos</span>
            <span class="chip-toggle danger ${ant.alergiaAnestesia ? 'active' : ''}" data-key="alergiaAnestesia"><i class="fas fa-syringe"></i> Alergia Anestesia</span>
            <span class="chip-toggle danger ${ant.hemorragias ? 'active' : ''}" data-key="hemorragias"><i class="fas fa-droplet"></i> Hemorragias / Anticoagulados</span>
            <span class="chip-toggle warning ${ant.diabetes ? 'active' : ''}" data-key="diabetes"><i class="fas fa-cube"></i> Diabetes</span>
            <span class="chip-toggle warning ${ant.hipertension ? 'active' : ''}" data-key="hipertension"><i class="fas fa-heart"></i> Hipertensión Arterial</span>
            <span class="chip-toggle warning ${ant.cardiaca ? 'active' : ''}" data-key="cardiaca"><i class="fas fa-heart-pulse"></i> Enfermedad Cardíaca</span>
            <span class="chip-toggle ${ant.asma ? 'active' : ''}" data-key="asma"><i class="fas fa-lungs"></i> Asma / Respiratorio</span>
            <span class="chip-toggle ${ant.vih ? 'active' : ''}" data-key="vih"><i class="fas fa-shield-virus"></i> VIH / ITS</span>
            <span class="chip-toggle ${ant.tuberculosis ? 'active' : ''}" data-key="tuberculosis"><i class="fas fa-virus"></i> Tuberculosis</span>
            <span class="chip-toggle ${ant.otro ? 'active' : ''}" data-key="otro"><i class="fas fa-plus"></i> Otro Antecedente</span>
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
            <label class="field"><span>Complicaciones en Anestesia / Cicatrización</span><input id="hcRecuperacion" type="text" placeholder="Ej: Cicatrización lenta, mareos con anestésico" value="${ant.recuperacion || ''}"></label>
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
              <span class="hc-acc-sub">PA, FC, FR, Temp, SpO2, Talla, Peso y cálculo automático de IMC</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">Signos Vitales</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <div class="vital-signs-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px;">
            <div class="vital-card"><div class="vital-label"><i class="fas fa-stethoscope"></i> Presión Art.</div><input id="hcPa" type="text" placeholder="120/80" value="${sig.pa || ''}"><span class="vital-unit">mmHg</span></div>
            <div class="vital-card"><div class="vital-label"><i class="fas fa-heart"></i> Frec. Cardíaca</div><input id="hcFc" type="number" placeholder="72" value="${sig.fc || ''}"><span class="vital-unit">lpm</span></div>
            <div class="vital-card"><div class="vital-label"><i class="fas fa-lungs"></i> Frec. Resp.</div><input id="hcFr" type="number" placeholder="16" value="${sig.fr || ''}"><span class="vital-unit">rpm</span></div>
            <div class="vital-card"><div class="vital-label"><i class="fas fa-temperature-half"></i> Temperatura</div><input id="hcTemp" type="text" placeholder="36.5" value="${sig.temp || ''}"><span class="vital-unit">°C</span></div>
            <div class="vital-card"><div class="vital-label"><i class="fas fa-lungs"></i> SpO2</div><input id="hcSpo2" type="number" placeholder="98" value="${sig.spo2 || ''}"><span class="vital-unit">%</span></div>
            <div class="vital-card"><div class="vital-label"><i class="fas fa-ruler-vertical"></i> Talla</div><input id="hcTalla" type="number" step="0.01" placeholder="1.70" value="${sig.talla || ''}"><span class="vital-unit">m</span></div>
            <div class="vital-card"><div class="vital-label"><i class="fas fa-weight-scale"></i> Peso</div><input id="hcPeso" type="number" step="0.1" placeholder="70.5" value="${sig.peso || ''}"><span class="vital-unit">kg</span></div>
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
          <div style="background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.06)); border:1px solid rgba(99,102,241,0.25); border-radius:14px; padding:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <h4 style="margin:0 0 6px 0; color:var(--primary); font-size:1.05rem;"><i class="fas fa-teeth-open"></i> Odontograma Interactivo FDI</h4>
              <p class="muted" style="margin:0; font-size:0.88rem; max-width:550px;">
                Permite registrar patologías por caras anatómicas (Vestibular, Lingual/Palatina, Oclusal, Mesial, Distal) y sincroniza automáticamente las intervenciones con los índices CPO.
              </p>
            </div>
            <button type="button" class="primary" onclick="window.switchPatientTab && window.switchPatientTab('odonto')" style="box-shadow:0 4px 14px rgba(99,102,241,0.35);">
              <i class="fas fa-tooth"></i> Abrir Odontograma Gráfico
            </button>
          </div>
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
                <tr>
                  <th>Piezas Índice</th>
                  <th>Placa Bacteriana (0-3)</th>
                  <th>Cálculo / Tártaro (0-3)</th>
                  <th>Gingivitis (0-1)</th>
                </tr>
              </thead>
              <tbody>
                ${renderIHOSTableRows(ind.ihos)}
              </tbody>
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

            <!-- Calculadoras CPO / ceo -->
            <div class="cpo-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="cpo-card">
                <div class="cpo-card-head">
                  <span>Índice CPO (Adulto)</span>
                  <span class="cpo-total-badge" id="cpoTotalBadge">${cpoData.totalCPO || 0}</span>
                </div>
                <div class="cpo-row"><span>Cariados (C):</span> <input id="cpoC" type="number" min="0" value="${cpoData.c || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>Perdidos (P):</span> <input id="cpoP" type="number" min="0" value="${cpoData.p || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>Obturados (O):</span> <input id="cpoO" type="number" min="0" value="${cpoData.o || 0}" style="width:55px; text-align:center;"></div>
              </div>

              <div class="cpo-card">
                <div class="cpo-card-head">
                  <span>Índice ceo (Niño)</span>
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
          <div class="chips-container" id="planesDxChips" style="margin-bottom:12px;">
            <span class="chip-toggle ${planesDx.biometria ? 'active' : ''}" data-key="biometria"><i class="fas fa-vial"></i> Biometría Hemática</span>
            <span class="chip-toggle ${planesDx.quimica ? 'active' : ''}" data-key="quimica"><i class="fas fa-flask"></i> Química Sanguínea / Glucosa</span>
            <span class="chip-toggle ${planesDx.rayosXPeriapical ? 'active' : ''}" data-key="rayosXPeriapical"><i class="fas fa-x-ray"></i> Rayos X Periapical</span>
            <span class="chip-toggle ${planesDx.rayosXPanoramica ? 'active' : ''}" data-key="rayosXPanoramica"><i class="fas fa-film"></i> Rayos X Panorámica</span>
            <span class="chip-toggle ${planesDx.cbct ? 'active' : ''}" data-key="cbct"><i class="fas fa-cube"></i> Tomografía Dental CBCT</span>
            <span class="chip-toggle ${planesDx.educacion ? 'active' : ''}" data-key="educacion"><i class="fas fa-chalkboard-user"></i> Educación en Higiene Oral</span>
          </div>
          <input id="hcPlanesOtros" type="text" class="field-input" placeholder="Otros exámenes, interconsultas médicas o indicaciones preoperatorias..." value="${planesDx.otros || ''}" style="width:100%;">
        </div>
      </div>

      <!-- ========================================================
           SECCIÓN 11: DIAGNÓSTICOS ODONTOLÓGICOS (CIE-11 OMS)
           ======================================================== -->
      <div class="hc-accordion-card" data-section="11">
        <div class="hc-accordion-header" role="button" tabindex="0">
          <div class="hc-acc-left">
            <div class="hc-acc-icon"><i class="fas fa-stethoscope"></i></div>
            <div class="hc-acc-text">
              <span class="hc-acc-title"><span class="hc-acc-num">11.</span> Diagnósticos Odontológicos (CIE-11 OMS)</span>
              <span class="hc-acc-sub">Buscador predictivo oficial OMS y asignación Presuntivo / Definitivo</span>
            </div>
          </div>
          <div class="hc-acc-right">
            <span class="hc-acc-badge">CIE-11 OMS</span>
            <div class="hc-acc-chevron"><i class="fas fa-chevron-down"></i></div>
          </div>
        </div>
        <div class="hc-accordion-body">
          <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">Escriba para autocompletar diagnósticos del catálogo internacional CIE-11 de la OMS:</p>
          <div id="cie11Container">
            ${renderCIE11Rows(diagList)}
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
              <label class="field"><span>Diagnóstico y Complicaciones</span><input id="sesDx" type="text" placeholder="Ej: Caries oclusal profunda en 36, sin sangrado"></label>
              <label class="field" style="grid-column:1/-1;"><span>Procedimiento Clínico Ejecutado *</span><input id="sesProc" type="text" placeholder="Ej: Apertura, aislamiento absoluto, obturación composite fotocurable"></label>
              <label class="field" style="grid-column:1/-1;"><span>Prescripciones Farmacológicas (Receta médica)</span><input id="sesRx" type="text" placeholder="Ej: Amoxicilina 500mg c/8h x 7 días + Ibuprofeno 400mg c/8h x dolor"></label>
              <label class="field"><span>Código de Procedimiento</span><input id="sesCode" type="text" placeholder="Ej: OBT-036 / CIR-01"></label>
              <label class="field"><span>Firma Profesional</span><input id="sesSign" type="text" value="${patient.assignedProfessionalName || 'Dr. Asignado'}"></label>
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
    { key: 'p16', label: 'Pieza 16 / 55' },
    { key: 'p11', label: 'Pieza 11 / 51' },
    { key: 'p26', label: 'Pieza 26 / 65' },
    { key: 'p36', label: 'Pieza 36 / 75' },
    { key: 'p31', label: 'Pieza 31 / 71' },
    { key: 'p46', label: 'Pieza 46 / 85' }
  ];

  return pieces.map(p => {
    const row = ihos[p.key] || { placa: 0, calculo: 0, gingivitis: 0 };
    return `
      <tr data-key="${p.key}">
        <td><strong>${p.label}</strong></td>
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

function renderCIE11Rows(diagList = []) {
  return diagList.map((d, index) => `
    <div class="cie11-row-card" data-index="${index}">
      <span style="font-weight:700; color:var(--muted); min-width:24px;">#${index + 1}</span>
      <div class="cie11-input-wrap">
        <input type="text" class="field-input cie11-dx-input" placeholder="Buscar diagnóstico o escribir..." value="${d.dx || ''}" autocomplete="off">
        <div class="cie11-dropdown hidden"></div>
      </div>
      <input type="text" class="field-input cie11-code-input" placeholder="CIE-11" value="${d.cie || ''}" style="width:95px; text-align:center; font-weight:700;">
      <div class="pre-def-btn-group">
        <button type="button" class="pre-def-btn pre ${d.tipo === 'PRE' ? 'active' : ''}" data-tipo="PRE">PRE</button>
        <button type="button" class="pre-def-btn def ${d.tipo === 'DEF' ? 'active' : ''}" data-tipo="DEF">DEF</button>
      </div>
    </div>
  `).join('');
}

function renderSessionHistory(notes = []) {
  if (!notes || notes.length === 0) {
    return '<div class="empty"><i class="fas fa-file-medical" style="font-size:2rem; margin-bottom:8px; display:block;"></i>No hay sesiones de tratamiento registradas aún.</div>';
  }

  return notes.map((n, i) => `
    <div class="session-card">
      <div class="session-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="session-badge">Sesión #${notes.length - i}</span>
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

  // 3. Chips de Antecedentes
  container.querySelectorAll('#antecedentesChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
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

  // 8. Calculadora Dinámica CPO / ceo
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

  [cpoC, cpoP, cpoO, ceoC, ceoE, ceoO].forEach(inp => inp?.addEventListener('input', updateCPOTotals));

  // 9. Chips de Planes Diagnósticos
  container.querySelectorAll('#planesDxChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });

  // 10. CIE-11 Typeahead y PRE/DEF Toggles
  container.querySelectorAll('.cie11-row-card').forEach(row => {
    const dxInput = row.querySelector('.cie11-dx-input');
    const codeInput = row.querySelector('.cie11-code-input');
    const dropdown = row.querySelector('.cie11-dropdown');
    const preDefBtns = row.querySelectorAll('.pre-def-btn');

    preDefBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        preDefBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    if (dxInput && dropdown) {
      dxInput.addEventListener('input', () => {
        const q = dxInput.value.trim();
        if (q.length < 2) {
          dropdown.classList.add('hidden');
          return;
        }

        const results = searchCIE11(q);
        if (results.length === 0) {
          dropdown.classList.add('hidden');
          return;
        }

        dropdown.innerHTML = results.slice(0, 6).map(r => `
          <div class="cie11-dropdown-item" data-code="${r.code}" data-title="${r.title}">
            <span class="cie11-code-badge">${r.code}</span>
            <span>${r.title}</span>
          </div>
        `).join('');
        dropdown.classList.remove('hidden');

        dropdown.querySelectorAll('.cie11-dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            dxInput.value = item.dataset.title;
            if (codeInput) codeInput.value = item.dataset.code;
            dropdown.classList.add('hidden');
          });
        });
      });

      document.addEventListener('click', (e) => {
        if (!row.contains(e.target)) dropdown.classList.add('hidden');
      });
    }
  });

  // 11. Sesiones de Tratamiento
  const newSesBtn = container.querySelector('#hcNewSessionBtn');
  const sessionFormArea = container.querySelector('#newSessionFormArea');
  const sesCancelBtn = container.querySelector('#sesCancelBtn');
  const sesSaveBtn = container.querySelector('#sesSaveBtn');

  newSesBtn?.addEventListener('click', () => {
    sessionFormArea.style.display = 'block';
    sessionFormArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  sesCancelBtn?.addEventListener('click', () => {
    sessionFormArea.style.display = 'none';
  });

  sesSaveBtn?.addEventListener('click', async () => {
    const fecha = container.querySelector('#sesDate')?.value;
    const dx = container.querySelector('#sesDx')?.value.trim();
    const proc = container.querySelector('#sesProc')?.value.trim();
    const rx = container.querySelector('#sesRx')?.value.trim();
    const code = container.querySelector('#sesCode')?.value.trim();
    const sign = container.querySelector('#sesSign')?.value.trim();

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
      patient.clinicalNotes.unshift(notePayload);
      const listDiv = container.querySelector('#sessionHistoryList');
      if (listDiv) listDiv.innerHTML = renderSessionHistory(patient.clinicalNotes);
    }
  });

  // 12. Guardar Toda la Historia Clínica
  const saveHandler = async () => {
    await saveFullClinicalHistory(container, patient, onSaveFullHistory);
  };

  container.querySelector('#hcSaveAllBtn')?.addEventListener('click', saveHandler);
  container.querySelector('#hcBottomSaveBtn')?.addEventListener('click', saveHandler);

  loadAttachments(patient.id, container, canEdit);
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
      vih: container.querySelector('[data-key="vih"]')?.classList.contains('active') || false,
      tuberculosis: container.querySelector('[data-key="tuberculosis"]')?.classList.contains('active') || false,
      asma: container.querySelector('[data-key="asma"]')?.classList.contains('active') || false,
      diabetes: container.querySelector('[data-key="diabetes"]')?.classList.contains('active') || false,
      hipertension: container.querySelector('[data-key="hipertension"]')?.classList.contains('active') || false,
      cardiaca: container.querySelector('[data-key="cardiaca"]')?.classList.contains('active') || false,
      otro: container.querySelector('[data-key="otro"]')?.classList.contains('active') || false,
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
    container.querySelectorAll('.ihos-table tbody tr').forEach(tr => {
      const key = tr.dataset.key;
      ihos[key] = {
        placa: parseInt(tr.querySelector('.ihos-placa')?.value) || 0,
        calculo: parseInt(tr.querySelector('.ihos-calculo')?.value) || 0,
        gingivitis: parseInt(tr.querySelector('.ihos-gingivitis')?.value) || 0
      };
    });

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
      otros: container.querySelector('#hcPlanesOtros')?.value.trim() || ''
    };

    const diagnosticosCIE11 = [];
    container.querySelectorAll('.cie11-row-card').forEach(row => {
      const dx = row.querySelector('.cie11-dx-input')?.value.trim() || '';
      const cie = row.querySelector('.cie11-code-input')?.value.trim() || '';
      const tipo = row.querySelector('.pre-def-btn.active')?.dataset.tipo || 'PRE';
      if (dx || cie) {
        diagnosticosCIE11.push({ dx, cie, tipo });
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
      indicadoresSalud: { ihos, oclusion, periodontal, fluorosis },
      cpo,
      planes,
      diagnosticosCIE11
    };

    patient.clinicalHistory = fullHistory;

    if (onSaveFullHistory) {
      await onSaveFullHistory(fullHistory);
    } else {
      await apiFetch(`api/patients.php?id=${patient.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ clinicalHistory: fullHistory })
      });
    }

    showToast('Historia Clínica guardada con éxito', 'success');
  } catch (err) {
    showToast(err.message || 'Error al guardar la Historia Clínica', 'error');
  } finally {
    saveBtns.forEach(b => {
      b.disabled = false;
      b.innerHTML = '<i class="fas fa-save"></i> Guardar Historia';
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
