/**
 * historia-clinica.js - Sistema Integral de Historia Clínica Odontológica (12 Secciones Oficiales + CIE-11)
 * Diseñado con interfaz interactiva (Chips, Switches y Checkboxes táctiles)
 */
import { showToast, apiFetch, formatDate } from './app-utils.js';
import { CIE11_DENTAL_CATALOGUE, searchCIE11 } from './cie11-catalogue.js';

export function createHistoriaClinica(patient, notes = [], plans = [], canEdit = true, onSaveNote, onUpdatePlan) {
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

  const planOptions = plans.map(p => `<option value="${p.id || p.title}">${p.title} · ${p.status}</option>`).join('');

  container.innerHTML = `
    <!-- Encabezado General -->
    <div class="historia-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
      <div>
        <p class="muted" style="font-size:0.85rem; margin-bottom:2px;"><i class="fas fa-hospital-user"></i> Formulario Clínico Oficial de Odontología</p>
        <h3 style="color:var(--primary); font-size:1.3rem;"><i class="fas fa-tooth"></i> Historia Clínica Única</h3>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <span class="badge ${canEdit ? 'attended' : 'pending'}">
          ${canEdit ? '<i class="fas fa-user-md"></i> Modo Profesional (Edición)' : '<i class="fas fa-lock"></i> Solo Lectura'}
        </span>
        ${canEdit ? `
          <button id="hcSaveAllBtn" class="primary" style="box-shadow:0 4px 14px rgba(99,102,241,0.35);">
            <i class="fas fa-save"></i> Guardar Historia Clínica
          </button>
        ` : ''}
      </div>
    </div>

    <!-- SECCIÓN 1: DATOS DEL PACIENTE -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">1</span> Datos del Paciente</h4>
        <small class="muted">Para editar datos administrativos, ve a la pestaña "Ficha"</small>
      </div>
      <div class="grid-2" style="font-size:0.9rem;">
        <div><strong>Paciente:</strong> ${patient.name || 'Sin nombre'}</div>
        <div><strong>Cédula / DNI:</strong> ${patient.dni || 'No registrado'}</div>
        <div><strong>Edad / Sexo:</strong> ${patient.age || '—'} años · ${patient.sex || 'No especificado'}</div>
        <div><strong>Teléfono:</strong> ${patient.phone || 'No registrado'}</div>
        <div><strong>Ocupación:</strong> ${patient.occupation || 'No registrada'}</div>
        <div><strong>Representante:</strong> ${patient.representative_name ? `${patient.representative_name} (C.I: ${patient.representative_dni || '—'})` : 'No aplica (Adulto)'}</div>
        <div style="grid-column: 1 / -1;"><strong>Contacto de Emergencia:</strong> ${patient.emergency_contact ? `${patient.emergency_contact} · Tel: ${patient.emergency_phone || '—'}` : 'No registrado'}</div>
      </div>
    </div>

    <!-- SECCIÓN 2: MOTIVO DE CONSULTA -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">2</span> Motivo de Consulta</h4>
      </div>
      <div class="chips-container" id="motivoChips">
        <span class="chip-toggle" data-val="Control y Chequeo Periódico"><i class="fas fa-stethoscope"></i> Control periódico</span>
        <span class="chip-toggle" data-val="Dolor Dental Agudo"><i class="fas fa-bolt"></i> Dolor agudo</span>
        <span class="chip-toggle" data-val="Limpieza / Profilaxis Dental"><i class="fas fa-sparkles"></i> Limpieza / Profilaxis</span>
        <span class="chip-toggle" data-val="Sangrado de Encías"><i class="fas fa-tint"></i> Sangrado de encías</span>
        <span class="chip-toggle" data-val="Urgencia / Traumatismo"><i class="fas fa-kit-medical"></i> Urgencia / Trauma</span>
        <span class="chip-toggle" data-val="Estética Dental / Blanqueamiento"><i class="fas fa-wand-magic-sparkles"></i> Estética / Blanqueamiento</span>
        <span class="chip-toggle" data-val="Ortodoncia"><i class="fas fa-arrows-alt-h"></i> Ortodoncia</span>
        <span class="chip-toggle" data-val="Rehabilitación / Prótesis"><i class="fas fa-teeth"></i> Prótesis / Implante</span>
      </div>
      <input type="text" id="hcMotivoConsulta" class="field-input" style="width:100%; font-weight:500;" placeholder="Describa el motivo en palabras del paciente..." value="${ch.motivoConsulta || ''}">
    </div>

    <!-- SECCIÓN 3: ENFERMEDAD ACTUAL -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">3</span> Enfermedad Actual</h4>
        <small class="muted">Síntomas, cronología, localización, intensidad y evolución</small>
      </div>
      <div class="grid-2">
        <div class="field">
          <span>Cronología y Tiempo de Evolución</span>
          <input id="hcEaCronologia" type="text" placeholder="Ej: Hace 3 días, inicio insidioso tras masticar" value="${ch.enfermedadActual?.cronologia || ''}">
        </div>
        <div class="field">
          <span>Localización y Zona Afectada</span>
          <input id="hcEaLocalizacion" type="text" placeholder="Ej: Molar inferior derecho (pieza 46)" value="${ch.enfermedadActual?.localizacion || ''}">
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <span>Tipo e Intensidad del Dolor (Escala EVA)</span>
          <div class="chips-container" id="evaChips" style="margin-bottom:0;">
            <span class="chip-toggle" data-val="Sin dolor (0/10)">0 - Sin dolor</span>
            <span class="chip-toggle" data-val="Leve (1-3/10)">Leve (1-3)</span>
            <span class="chip-toggle warning" data-val="Moderado (4-6/10)">Moderado (4-6)</span>
            <span class="chip-toggle danger" data-val="Severo / Intenso (7-10/10)">Severo (7-10)</span>
            <span class="chip-toggle" data-val="Pulsátil">Pulsátil</span>
            <span class="chip-toggle" data-val="Provocado por frío/calor">Provocado (Frío/Calor)</span>
            <span class="chip-toggle" data-val="Espontáneo y Nocturno">Espontáneo / Nocturno</span>
          </div>
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <span>Evolución, Causas Aparentes y Estado Actual</span>
          <textarea id="hcEaEvolucion" rows="2" placeholder="Detalles de analgesia previa, respuesta a medicamentos, estado al momento del examen...">${ch.enfermedadActual?.evolucion || ''}</textarea>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 4: ANTECEDENTES PERSONALES Y FAMILIARES -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">4</span> Antecedentes Personales y Familiares</h4>
        <small class="muted">Toca para activar/desactivar condiciones médicas</small>
      </div>
      <div class="chips-container" id="antecedentesChips">
        <span class="chip-toggle danger ${ant.alergiaAntibiotico ? 'active' : ''}" data-key="alergiaAntibiotico"><i class="fas fa-allergies"></i> 1. Alergia Antibiótico</span>
        <span class="chip-toggle danger ${ant.alergiaAnestesia ? 'active' : ''}" data-key="alergiaAnestesia"><i class="fas fa-syringe"></i> 2. Alergia Anestesia</span>
        <span class="chip-toggle warning ${ant.hemorragias ? 'active' : ''}" data-key="hemorragias"><i class="fas fa-droplet"></i> 3. Hemorragias / Coagulación</span>
        <span class="chip-toggle warning ${ant.vih ? 'active' : ''}" data-key="vih"><i class="fas fa-ribbon"></i> 4. VIH / SIDA</span>
        <span class="chip-toggle warning ${ant.tuberculosis ? 'active' : ''}" data-key="tuberculosis"><i class="fas fa-lungs"></i> 5. Tuberculosis</span>
        <span class="chip-toggle warning ${ant.asma ? 'active' : ''}" data-key="asma"><i class="fas fa-wind"></i> 6. Asma</span>
        <span class="chip-toggle warning ${ant.diabetes ? 'active' : ''}" data-key="diabetes"><i class="fas fa-cubes-stacked"></i> 7. Diabetes</span>
        <span class="chip-toggle warning ${ant.hipertension ? 'active' : ''}" data-key="hipertension"><i class="fas fa-heart-pulse"></i> 8. Hipertensión</span>
        <span class="chip-toggle warning ${ant.cardiaca ? 'active' : ''}" data-key="cardiaca"><i class="fas fa-heart"></i> 9. Enf. Cardíaca</span>
        <span class="chip-toggle ${ant.otro ? 'active' : ''}" data-key="otro"><i class="fas fa-plus"></i> 10. Otro Antecedente</span>
      </div>

      <div class="grid-2" style="margin-top:12px;">
        <div class="field">
          <span>¿Se ha operado anteriormente? / Cirugías</span>
          <input id="hcCirugias" type="text" placeholder="Ej: Apendicectomía hace 5 años / Ninguna" value="${ant.cirugias || ''}">
        </div>
        <div class="field">
          <span>¿Cómo le fue en la recuperación post-quirúrgica?</span>
          <input id="hcRecuperacion" type="text" placeholder="Ej: Buena, sin complicaciones / Sangrado prolongado" value="${ant.recuperacion || ''}">
        </div>
      </div>

      <!-- Alerta Crítica de Bifosfonatos -->
      <div class="bifosfonatos-alert-box">
        <i class="fas fa-triangle-exclamation" style="font-size:1.4rem; margin-top:2px;"></i>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
            <strong>¿Le han recetado Bifosfonatos / Tratamiento antirresortivo óseo?</strong>
            <div class="chips-container" id="bifosfonatosChips" style="margin:0;">
              <span class="chip-toggle danger ${ant.bifosfonatos ? 'active' : ''}" data-val="si">⚠️ Sí, toma/tomó</span>
              <span class="chip-toggle ${!ant.bifosfonatos ? 'active' : ''}" data-val="no">No</span>
            </div>
          </div>
          <small>Fundamental para prevenir <strong>osteonecrosis maxilar</strong> ante extracciones o implantes (Ácido zoledrónico, Alendronato, etc.).</small>
          <input id="hcBifosfonatosDetalle" type="text" placeholder="Fármaco, vía (oral/EV), tiempo de administración..." value="${ant.bifosfonatosDetalle || ''}" style="margin-top:8px; width:100%; ${ant.bifosfonatos ? '' : 'display:none;'}">
        </div>
      </div>
    </div>

    <!-- SECCIÓN 5: SIGNOS VITALES Y DATOS ANTROPOMÉTRICOS -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">5</span> Signos Vitales y Datos Antropométricos</h4>
        <div id="hcImcBadge" class="imc-badge" style="background:var(--primary-light); color:var(--primary);">IMC: —</div>
      </div>
      <div class="vital-signs-grid">
        <div class="vital-input-card">
          <span>Presión Art. (PA)</span>
          <input id="hcPa" type="text" placeholder="120/80" value="${sig.pa || ''}">
          <small class="muted">mmHg</small>
        </div>
        <div class="vital-input-card">
          <span>Frec. Cardíaca (FC)</span>
          <input id="hcFc" type="number" placeholder="75" value="${sig.fc || ''}">
          <small class="muted">lpm</small>
        </div>
        <div class="vital-input-card">
          <span>Frec. Resp. (FR)</span>
          <input id="hcFr" type="number" placeholder="18" value="${sig.fr || ''}">
          <small class="muted">rpm</small>
        </div>
        <div class="vital-input-card">
          <span>Temperatura</span>
          <input id="hcTemp" type="number" step="0.1" placeholder="36.5" value="${sig.temp || ''}">
          <small class="muted">°C</small>
        </div>
        <div class="vital-input-card">
          <span>Saturación SpO2</span>
          <input id="hcSpo2" type="number" placeholder="98" value="${sig.spo2 || ''}">
          <small class="muted">%</small>
        </div>
        <div class="vital-input-card">
          <span>Talla</span>
          <input id="hcTalla" type="number" step="0.01" placeholder="1.70" value="${sig.talla || ''}">
          <small class="muted">metros</small>
        </div>
        <div class="vital-input-card">
          <span>Peso</span>
          <input id="hcPeso" type="number" step="0.5" placeholder="70" value="${sig.peso || ''}">
          <small class="muted">kg</small>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 6: EXAMEN DEL SISTEMA ESTOMATOGNÁTICO -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">6</span> Examen del Sistema Estomatognático</h4>
        <small class="muted">12 Estructuras Anatómicas (Marca si hay patología)</small>
      </div>
      <div class="estomato-grid" id="estomatoGridContainer">
        ${renderEstomatoItems(est)}
      </div>
    </div>

    <!-- SECCIÓN 7: ODONTOGRAMA -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">7</span> Odontograma FDI (Permanente y Temporal)</h4>
        <button class="primary" onclick="window.switchPatientTab && window.switchPatientTab('odontograma')" style="font-size:0.85rem;">
          <i class="fas fa-teeth-open"></i> Abrir Odontograma Completo
        </button>
      </div>
      <p class="muted" style="margin-bottom:12px;">El registro gráfico de caras (Vestibular, Lingual, Oclusal, Mesial, Distal), movilidad dental y recesión gingival se sincroniza en tiempo real con los índices CPO.</p>
    </div>

    <!-- SECCIÓN 8 & 9: INDICADORES DE SALUD BUCAL E ÍNDICES CPO-ceo -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">8 & 9</span> Indicadores de Salud Bucal e Índices CPO-ceo</h4>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
        <!-- Higiene Oral Simplificada -->
        <div>
          <h5 style="margin-bottom:8px; font-weight:700;"><i class="fas fa-broom"></i> Higiene Oral Simplificada (Piezas Índice)</h5>
          <table class="ihos-table">
            <thead>
              <tr>
                <th>Piezas</th>
                <th>Placa (0-3)</th>
                <th>Cálculo (0-3)</th>
                <th>Gingivitis (0-1)</th>
              </tr>
            </thead>
            <tbody>
              ${renderIhosRows(ind.ihos)}
            </tbody>
          </table>
        </div>

        <!-- Condiciones Generales & Índices CPO -->
        <div>
          <h5 style="margin-bottom:8px; font-weight:700;"><i class="fas fa-chart-pie"></i> Diagnóstico Oclusal y Periodontal</h5>
          
          <label class="field"><span>Oclusión (Clasificación de Angle)</span>
            <div class="chips-container" id="oclusionChips">
              <span class="chip-toggle ${ind.oclusion === 'Angle I' || !ind.oclusion ? 'active' : ''}" data-val="Angle I">Angle I</span>
              <span class="chip-toggle ${ind.oclusion === 'Angle II' ? 'active' : ''}" data-val="Angle II">Angle II</span>
              <span class="chip-toggle ${ind.oclusion === 'Angle III' ? 'active' : ''}" data-val="Angle III">Angle III</span>
            </div>
          </label>

          <label class="field"><span>Enfermedad Periodontal</span>
            <div class="chips-container" id="periodontalChips">
              <span class="chip-toggle ${ind.periodontal === 'Sano' || !ind.periodontal ? 'active' : ''}" data-val="Sano">Sano</span>
              <span class="chip-toggle warning ${ind.periodontal === 'Leve' ? 'active' : ''}" data-val="Leve">Leve</span>
              <span class="chip-toggle warning ${ind.periodontal === 'Moderada' ? 'active' : ''}" data-val="Moderada">Moderada</span>
              <span class="chip-toggle danger ${ind.periodontal === 'Severa' ? 'active' : ''}" data-val="Severa">Severa</span>
            </div>
          </label>

          <label class="field"><span>Fluorosis Dental</span>
            <div class="chips-container" id="fluorosisChips">
              <span class="chip-toggle ${ind.fluorosis === 'Ausente' || !ind.fluorosis ? 'active' : ''}" data-val="Ausente">Ausente</span>
              <span class="chip-toggle ${ind.fluorosis === 'Leve' ? 'active' : ''}" data-val="Leve">Leve</span>
              <span class="chip-toggle warning ${ind.fluorosis === 'Moderada' ? 'active' : ''}" data-val="Moderada">Moderada</span>
              <span class="chip-toggle danger ${ind.fluorosis === 'Severa' ? 'active' : ''}" data-val="Severa">Severa</span>
            </div>
          </label>

          <!-- Tarjetas CPO / ceo -->
          <div class="cpo-grid">
            <div class="cpo-card">
              <div class="cpo-card-head">
                <span>Índice CPO (Permanente)</span>
                <span class="cpo-total-badge" id="cpoTotalBadge">${cpoData.totalCPO || 0}</span>
              </div>
              <div class="cpo-row"><span>Cariados (C):</span> <input id="cpoC" type="number" min="0" value="${cpoData.c || 0}" style="width:50px; text-align:center;"></div>
              <div class="cpo-row"><span>Perdidos (P):</span> <input id="cpoP" type="number" min="0" value="${cpoData.p || 0}" style="width:50px; text-align:center;"></div>
              <div class="cpo-row"><span>Obturados (O):</span> <input id="cpoO" type="number" min="0" value="${cpoData.o || 0}" style="width:50px; text-align:center;"></div>
            </div>

            <div class="cpo-card">
              <div class="cpo-card-head">
                <span>Índice ceo (Temporal)</span>
                <span class="cpo-total-badge" id="ceoTotalBadge">${cpoData.totalCeo || 0}</span>
              </div>
              <div class="cpo-row"><span>cariados (c):</span> <input id="ceoC" type="number" min="0" value="${cpoData.c_min || 0}" style="width:50px; text-align:center;"></div>
              <div class="cpo-row"><span>extraídos (e):</span> <input id="ceoE" type="number" min="0" value="${cpoData.e_min || 0}" style="width:50px; text-align:center;"></div>
              <div class="cpo-row"><span>obturados (o):</span> <input id="ceoO" type="number" min="0" value="${cpoData.o_min || 0}" style="width:50px; text-align:center;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 10: PLANES DE DIAGNÓSTICO, TERAPÉUTICO Y EDUCACIONAL -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">10</span> Planes de Diagnóstico, Terapéutico y Educacional</h4>
        <small class="muted">Exámenes solicitados antes o durante el tratamiento</small>
      </div>
      <div class="chips-container" id="planesDxChips">
        <span class="chip-toggle ${planesDx.biometria ? 'active' : ''}" data-key="biometria"><i class="fas fa-vial"></i> Biometría Hemática</span>
        <span class="chip-toggle ${planesDx.quimica ? 'active' : ''}" data-key="quimica"><i class="fas fa-flask"></i> Química Sanguínea / Glucosa</span>
        <span class="chip-toggle ${planesDx.rayosXPeriapical ? 'active' : ''}" data-key="rayosXPeriapical"><i class="fas fa-x-ray"></i> Rayos X Periapical</span>
        <span class="chip-toggle ${planesDx.rayosXPanoramica ? 'active' : ''}" data-key="rayosXPanoramica"><i class="fas fa-film"></i> Rayos X Panorámica</span>
        <span class="chip-toggle ${planesDx.cbct ? 'active' : ''}" data-key="cbct"><i class="fas fa-cube"></i> Tomografía Dental CBCT</span>
        <span class="chip-toggle ${planesDx.educacion ? 'active' : ''}" data-key="educacion"><i class="fas fa-chalkboard-user"></i> Educación en Higiene Oral</span>
      </div>
      <input id="hcPlanesOtros" type="text" placeholder="Otros exámenes, interconsultas médicas o indicaciones preoperatorias..." value="${planesDx.otros || ''}" style="width:100%; margin-top:8px;">
    </div>

    <!-- SECCIÓN 11: DIAGNÓSTICO CON CODIFICACIÓN CIE-11 -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">11</span> Diagnósticos (Clasificación CIE-11 Bucal)</h4>
        <small class="muted">Selecciona Presuntivo (PRE) o Definitivo (DEF)</small>
      </div>
      <div id="cie11Container">
        ${renderCIE11Rows(diagList)}
      </div>
    </div>

    <!-- SECCIÓN 12: TRATAMIENTO Y EVOLUCIÓN (Sesiones de Consulta) -->
    <div class="hc-section-card">
      <div class="hc-section-header">
        <h4><span class="hc-section-num">12</span> Tratamiento y Evolución de Sesiones</h4>
        <button id="hcNewSessionBtn" class="primary" style="font-size:0.85rem;"><i class="fas fa-plus"></i> Registrar Nueva Sesión</button>
      </div>
      
      <!-- Formulario para Nueva Sesión -->
      <div id="newSessionFormArea" style="display:none; background:var(--bg-page); border:1.5px dashed var(--primary); border-radius:12px; padding:16px; margin-bottom:18px;">
        <h5 style="margin-bottom:12px; color:var(--primary);"><i class="fas fa-calendar-plus"></i> Nueva Sesión de Tratamiento</h5>
        <div class="grid-2">
          <label class="field"><span>Fecha de Sesión</span><input id="sesDate" type="date" value="${formatDate(new Date())}"></label>
          <label class="field"><span>Diagnóstico y Complicaciones</span><input id="sesDx" type="text" placeholder="Ej: Caries oclusal profunda en 36, sin sangrado"></label>
          <label class="field" style="grid-column:1/-1;"><span>Procedimiento Clínico Ejecutado</span><input id="sesProc" type="text" placeholder="Ej: Apertura, aislamiento absoluto, obturación composite fotocurable"></label>
          <label class="field" style="grid-column:1/-1;"><span>Prescripciones Farmacológicas (Receta médica)</span><input id="sesRx" type="text" placeholder="Ej: Amoxicilina 500mg c/8h x 7 días + Ibuprofeno 400mg c/8h x dolor"></label>
          <label class="field"><span>Código de Procedimiento</span><input id="sesCode" type="text" placeholder="Ej: OBT-036 / CIR-01"></label>
          <label class="field"><span>Firma Profesional</span><input id="sesSign" type="text" value="${patient.assignedProfessionalName || 'Dr. Asignado'}"></label>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
          <button id="sesSaveBtn" class="primary"><i class="fas fa-check"></i> Guardar Sesión</button>
          <button id="sesCancelBtn" class="ghost">Cancelar</button>
        </div>
      </div>

      <div id="sessionHistoryList">
        ${renderSessionHistory(notes)}
      </div>
    </div>
  `;

  setupInteractiveHandlers(container, patient, notes, onSaveNote, canEdit);

  return container;
}

function renderEstomatoItems(est = {}) {
  const items = [
    { key: 'labios', name: '1. Labios' },
    { key: 'mejillas', name: '2. Mejillas' },
    { key: 'maxilarSup', name: '3. Maxilar Superior' },
    { key: 'maxilarInf', name: '4. Maxilar Inferior' },
    { key: 'lengua', name: '5. Lengua' },
    { key: 'paladar', name: '6. Paladar' },
    { key: 'piso', name: '7. Piso de Boca' },
    { key: 'carrillos', name: '8. Carrillos' },
    { key: 'glandulas', name: '9. Glándulas Salivales' },
    { key: 'orofaringe', name: '10. Orofaringe' },
    { key: 'atm', name: '11. ATM' },
    { key: 'ganglios', name: '12. Ganglios' }
  ];

  return items.map(it => {
    const val = est[it.key] || { estado: 'normal', obs: '' };
    const isPat = val.estado === 'patologico';
    return `
      <div class="estomato-item" data-key="${it.key}">
        <div class="estomato-item-head">
          <span class="estomato-title">${it.name}</span>
          <div class="estomato-switch">
            <button type="button" class="estomato-switch-btn normal ${!isPat ? 'active' : ''}" data-val="normal">Sano</button>
            <button type="button" class="estomato-switch-btn patologico ${isPat ? 'active' : ''}" data-val="patologico">Patol.</button>
          </div>
        </div>
        <input type="text" class="estomato-obs field-input" placeholder="Detalles de lesión..." value="${val.obs || ''}" style="${isPat ? '' : 'display:none;'} font-size:0.8rem;">
      </div>
    `;
  }).join('');
}

function renderIhosRows(ihos = {}) {
  const pieces = [
    { key: 'p16_17_55', label: '16 / 17 / 55' },
    { key: 'p11_21_51', label: '11 / 21 / 51' },
    { key: 'p26_27_65', label: '26 / 27 / 65' },
    { key: 'p36_37_75', label: '36 / 37 / 75' },
    { key: 'p31_41_71', label: '31 / 41 / 71' },
    { key: 'p46_47_85', label: '46 / 47 / 85' }
  ];

  return pieces.map(p => {
    const row = (ihos && ihos[p.key]) || { placa: 0, calculo: 0, gingivitis: 0 };
    return `
      <tr data-key="${p.key}">
        <td><strong>${p.label}</strong></td>
        <td>
          <select class="ihos-placa">
            <option value="0" ${row.placa == 0 ? 'selected' : ''}>0 - Sin placa</option>
            <option value="1" ${row.placa == 1 ? 'selected' : ''}>1 - 1/3 corona</option>
            <option value="2" ${row.placa == 2 ? 'selected' : ''}>2 - 2/3 corona</option>
            <option value="3" ${row.placa == 3 ? 'selected' : ''}>3 - > 2/3</option>
          </select>
        </td>
        <td>
          <select class="ihos-calculo">
            <option value="0" ${row.calculo == 0 ? 'selected' : ''}>0 - Sin cálculo</option>
            <option value="1" ${row.calculo == 1 ? 'selected' : ''}>1 - Supragingival 1/3</option>
            <option value="2" ${row.calculo == 2 ? 'selected' : ''}>2 - Supragingival 2/3</option>
            <option value="3" ${row.calculo == 3 ? 'selected' : ''}>3 - Subgingival continuo</option>
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
      <span style="font-weight:700; color:var(--muted); min-width:20px;">#${index + 1}</span>
      <div class="cie11-input-wrap">
        <input type="text" class="field-input cie11-dx-input" placeholder="Buscar diagnóstico o escribir..." value="${d.dx || ''}" autocomplete="off">
        <div class="cie11-dropdown hidden"></div>
      </div>
      <input type="text" class="field-input cie11-code-input" placeholder="CIE-11" value="${d.cie || ''}" style="width:90px; text-align:center; font-weight:700;">
      <div class="pre-def-btn-group">
        <button type="button" class="pre-def-btn pre ${d.tipo === 'PRE' || !d.tipo ? 'active' : ''}" data-tipo="PRE">PRE</button>
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
          <strong>${n.date || 'Sin fecha'}</strong>
        </div>
        <span class="signature-stamp"><i class="fas fa-signature"></i> ${n.professionalName || 'Dr. Asignado'}</span>
      </div>
      <div style="margin-top:8px; font-size:0.9rem;">
        <p><strong>Diagnóstico:</strong> ${n.procedimiento || n.diagnosticoTipo || 'Atención general'}</p>
        ${n.nota ? `<p class="muted" style="margin-top:4px;"><strong>Procedimiento:</strong> ${n.nota}</p>` : ''}
        ${n.receta ? `<p style="margin-top:4px; color:var(--primary);"><strong>Prescripción:</strong> 💊 ${n.receta}</p>` : ''}
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

function setupInteractiveHandlers(container, patient, notes, onSaveNote, canEdit = true) {
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
      chip.classList.toggle('active');
    });
  });

  // 3. Chips de Antecedentes Médicos
  container.querySelectorAll('#antecedentesChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });

  // 4. Toggle de Bifosfonatos
  container.querySelectorAll('#bifosfonatosChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#bifosfonatosChips .chip-toggle').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const detailInput = container.querySelector('#hcBifosfonatosDetalle');
      if (detailInput) {
        detailInput.style.display = chip.dataset.val === 'si' ? 'block' : 'none';
        if (chip.dataset.val === 'si') detailInput.focus();
      }
    });
  });

  // 5. Switches Estomatognáticos
  container.querySelectorAll('.estomato-item').forEach(item => {
    const normalBtn = item.querySelector('.estomato-switch-btn.normal');
    const patBtn = item.querySelector('.estomato-switch-btn.patologico');
    const obsInput = item.querySelector('.estomato-obs');

    normalBtn?.addEventListener('click', () => {
      normalBtn.classList.add('active');
      patBtn.classList.remove('active');
      if (obsInput) {
        obsInput.style.display = 'none';
        obsInput.value = '';
      }
    });

    patBtn?.addEventListener('click', () => {
      patBtn.classList.add('active');
      normalBtn.classList.remove('active');
      if (obsInput) {
        obsInput.style.display = 'block';
        obsInput.focus();
      }
    });
  });

  // 6. Cálculo automático de IMC
  const pesoInput = container.querySelector('#hcPeso');
  const tallaInput = container.querySelector('#hcTalla');
  const imcBadge = container.querySelector('#hcImcBadge');

  function calculateIMC() {
    const peso = parseFloat(pesoInput?.value) || 0;
    const talla = parseFloat(tallaInput?.value) || 0;
    if (peso > 0 && talla > 0) {
      const imc = (peso / (talla * talla)).toFixed(1);
      let cat = 'Normal';
      let color = '#10b981';
      if (imc < 18.5) { cat = 'Bajo peso'; color = '#3b82f6'; }
      else if (imc >= 25 && imc < 30) { cat = 'Sobrepeso'; color = '#f59e0b'; }
      else if (imc >= 30) { cat = 'Obesidad'; color = '#ef4444'; }

      if (imcBadge) {
        imcBadge.textContent = `IMC: ${imc} (${cat})`;
        imcBadge.style.color = color;
      }
    }
  }

  pesoInput?.addEventListener('input', calculateIMC);
  tallaInput?.addEventListener('input', calculateIMC);
  calculateIMC();

  // 7. Chips de Oclusión, Periodontal y Fluorosis
  ['#oclusionChips', '#periodontalChips', '#fluorosisChips'].forEach(sel => {
    container.querySelectorAll(`${sel} .chip-toggle`).forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll(`${sel} .chip-toggle`).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  });

  // 8. Totales de CPO - ceo en tiempo real
  function updateCPOTotals() {
    const c = parseInt(container.querySelector('#cpoC')?.value) || 0;
    const p = parseInt(container.querySelector('#cpoP')?.value) || 0;
    const o = parseInt(container.querySelector('#cpoO')?.value) || 0;
    const badge = container.querySelector('#cpoTotalBadge');
    if (badge) badge.textContent = c + p + o;

    const c_min = parseInt(container.querySelector('#ceoC')?.value) || 0;
    const e_min = parseInt(container.querySelector('#ceoE')?.value) || 0;
    const o_min = parseInt(container.querySelector('#ceoO')?.value) || 0;
    const badgeCeo = container.querySelector('#ceoTotalBadge');
    if (badgeCeo) badgeCeo.textContent = c_min + e_min + o_min;
  }

  ['#cpoC', '#cpoP', '#cpoO', '#ceoC', '#ceoE', '#ceoO'].forEach(id => {
    container.querySelector(id)?.addEventListener('input', updateCPOTotals);
  });

  // 9. Chips de Planes Diagnósticos
  container.querySelectorAll('#planesDxChips .chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // 10. Buscador Predictivo CIE-11
  container.querySelectorAll('.cie11-row-card').forEach(row => {
    const dxInput = row.querySelector('.cie11-dx-input');
    const codeInput = row.querySelector('.cie11-code-input');
    const dropdown = row.querySelector('.cie11-dropdown');
    const preBtn = row.querySelector('.pre-def-btn.pre');
    const defBtn = row.querySelector('.pre-def-btn.def');

    preBtn?.addEventListener('click', () => { preBtn.classList.add('active'); defBtn.classList.remove('active'); });
    defBtn?.addEventListener('click', () => { defBtn.classList.add('active'); preBtn.classList.remove('active'); });

    dxInput?.addEventListener('input', () => {
      const q = dxInput.value.trim();
      const results = searchCIE11(q);
      if (results.length === 0) {
        dropdown.classList.add('hidden');
        return;
      }

      dropdown.innerHTML = results.slice(0, 6).map(r => `
        <div class="cie11-item" data-code="${r.code}" data-name="${r.name}">
          <span>${r.name}</span>
          <span class="cie11-code-badge">${r.code}</span>
        </div>
      `).join('');

      dropdown.querySelectorAll('.cie11-item').forEach(it => {
        it.addEventListener('click', () => {
          dxInput.value = it.dataset.name;
          codeInput.value = it.dataset.code;
          dropdown.classList.add('hidden');
        });
      });

      dropdown.classList.remove('hidden');
    });

    dxInput?.addEventListener('blur', () => setTimeout(() => dropdown.classList.add('hidden'), 200));
  });

  // 11. Registro de Nueva Sesión (Sección 12)
  const newSessionBtn = container.querySelector('#hcNewSessionBtn');
  const sessionFormArea = container.querySelector('#newSessionFormArea');
  const sesSaveBtn = container.querySelector('#sesSaveBtn');
  const sesCancelBtn = container.querySelector('#sesCancelBtn');

  newSessionBtn?.addEventListener('click', () => {
    sessionFormArea.style.display = sessionFormArea.style.display === 'none' ? 'block' : 'none';
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
      showToast('Ingresá al menos el diagnóstico o procedimiento', 'warning');
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
      showToast('Sesión clínica registrada con éxito', 'success');
      sessionFormArea.style.display = 'none';
    }
  });

  // 12. Guardar Toda la Historia Clínica
  container.querySelector('#hcSaveAllBtn')?.addEventListener('click', async () => {
    await saveFullClinicalHistory(container, patient);
  });

  const notesContainer = container.querySelector('#hcNotesList');
  if (notesContainer) {
    const planMap = (plans || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    renderNotesList(notesContainer, notes, planMap);
  }

  loadAttachments(patient.id, container, canEdit);

  return container;
}

function renderNotesList(notesContainer, notes = [], planMap = {}) {
  if (!notesContainer) return;
  notesContainer.innerHTML = '';
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
    notesContainer.appendChild(div);
  });
}

async function saveFullClinicalHistory(container, patient) {
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

    await apiFetch(`api/patients.php?id=${patient.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ clinicalHistory: fullHistory })
    });

    showToast('Historia Clínica (12 Secciones) guardada con éxito', 'success');
  } catch (err) {
    showToast(err.message || 'Error al guardar la Historia Clínica', 'error');
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
