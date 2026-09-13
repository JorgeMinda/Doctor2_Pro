/**
 * historia-clinica.js - Sistema Integral de Historia Clínica Odontológica (12 Secciones Oficiales + CIE-11)
 * Diseñado con interfaz interactiva, Wizard de Pasos y diseño Glass UI de alta estética.
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
    <div class="hc-hero-banner">
      <div class="hc-hero-patient">
        <div class="hc-hero-avatar">${patientInitials}</div>
        <div class="hc-hero-title">
          <h3>${patient.name || 'Paciente sin registrar'}</h3>
          <div class="hc-hero-meta">
            <span><i class="fas fa-id-card"></i> DNI: <strong>${patient.dni || 'Sin DNI'}</strong></span>
            <span><i class="fas fa-venus-mars"></i> Sexo: <strong>${patient.sex || 'No espec.'}</strong></span>
            <span><i class="fas fa-shield-halved"></i> <strong>${patient.health_insurance || patient.insurance || 'Particular'}</strong></span>
            ${patient.phone ? `<span><i class="fab fa-whatsapp" style="color:#22c55e;"></i> ${patient.phone}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="hc-hero-actions">
        <div class="hc-view-mode-toggle">
          <button type="button" class="hc-view-mode-btn active" data-mode="wizard"><i class="fas fa-layer-group"></i> Por Pasos</button>
          <button type="button" class="hc-view-mode-btn" data-mode="full"><i class="fas fa-bars-staggered"></i> Ver Todo</button>
        </div>
        ${canEdit ? `
          <button id="hcSaveAllBtn" class="primary" style="box-shadow:0 4px 14px rgba(99,102,241,0.35); padding:10px 18px;">
            <i class="fas fa-save"></i> Guardar Historia
          </button>
        ` : ''}
      </div>
    </div>

    <!-- 2. BARRA DE PASOS / NAVEGACIÓN CLÍNICA -->
    <div class="hc-tabs-nav" id="hcTabsNav">
      <button type="button" class="hc-tab-btn active" data-step="1">
        <div class="hc-tab-icon"><i class="fas fa-clipboard-user"></i></div>
        <div class="hc-tab-text">
          <span class="hc-tab-title">1. Anamnesis</span>
          <span class="hc-tab-sub">Filiación & Antecedentes</span>
        </div>
      </button>

      <button type="button" class="hc-tab-btn" data-step="2">
        <div class="hc-tab-icon"><i class="fas fa-heart-pulse"></i></div>
        <div class="hc-tab-text">
          <span class="hc-tab-title">2. Examen Físico</span>
          <span class="hc-tab-sub">Signos & Estomatognático</span>
        </div>
      </button>

      <button type="button" class="hc-tab-btn" data-step="3">
        <div class="hc-tab-icon"><i class="fas fa-tooth"></i></div>
        <div class="hc-tab-text">
          <span class="hc-tab-title">3. Higiene & CPO</span>
          <span class="hc-tab-sub">IHOS & Índices Dentales</span>
        </div>
      </button>

      <button type="button" class="hc-tab-btn" data-step="4">
        <div class="hc-tab-icon"><i class="fas fa-file-medical-alt"></i></div>
        <div class="hc-tab-text">
          <span class="hc-tab-title">4. CIE-11 & Planes</span>
          <span class="hc-tab-sub">Diagnósticos & Tratamiento</span>
        </div>
      </button>

      <button type="button" class="hc-tab-btn" data-step="5">
        <div class="hc-tab-icon"><i class="fas fa-notes-medical"></i></div>
        <div class="hc-tab-text">
          <span class="hc-tab-title">5. Sesiones</span>
          <span class="hc-tab-sub">Evolución & Firmas</span>
        </div>
      </button>
    </div>

    <!-- ========================================================
         PASO 1: ANAMNESIS & ANTECEDENTES (Secciones 1, 2, 3, 4)
         ======================================================== -->
    <div class="hc-step-pane active" id="paneStep1" data-step="1">
      
      <!-- SECCIÓN 1: DATOS DEL PACIENTE -->
      <div class="hc-section-card">
        <div class="hc-section-header">
          <h4><span class="hc-section-num">1</span> Datos de Filiación y Registro</h4>
          <small class="muted"><i class="fas fa-info-circle"></i> Para modificar datos de contacto ve a la pestaña "Ficha"</small>
        </div>
        <div class="grid-2" style="font-size:0.9rem; gap:12px 20px;">
          <div><span class="muted" style="font-size:0.8rem; display:block;">Nombre y Apellido</span><strong>${patient.name || 'Sin nombre'}</strong></div>
          <div><span class="muted" style="font-size:0.8rem; display:block;">Documento de Identidad (DNI)</span><strong>${patient.dni || 'No registrado'}</strong></div>
          <div><span class="muted" style="font-size:0.8rem; display:block;">Sexo / Edad</span><strong>${patient.sex || 'No especificado'}</strong> · ${patient.birthdate ? calculateAge(patient.birthdate) : 'Edad no reg.'}</div>
          <div><span class="muted" style="font-size:0.8rem; display:block;">Teléfono / WhatsApp</span><strong>${patient.phone || 'No registrado'}</strong></div>
          <div><span class="muted" style="font-size:0.8rem; display:block;">Ocupación / Profesión</span><strong>${patient.occupation || 'No registrada'}</strong></div>
          <div><span class="muted" style="font-size:0.8rem; display:block;">Representante Legal (Menores)</span><strong>${patient.representativeName ? `${patient.representativeName} (DNI: ${patient.representativeDni || '-'})` : 'No aplica (Mayor de edad)'}</strong></div>
          <div style="grid-column: 1 / -1;"><span class="muted" style="font-size:0.8rem; display:block;">Contacto de Emergencia</span><strong>${patient.emergencyPhone || 'No registrado'}</strong></div>
        </div>
      </div>

      <!-- SECCIÓN 2: MOTIVO DE CONSULTA -->
      <div class="hc-section-card">
        <div class="hc-section-header">
          <h4><span class="hc-section-num">2</span> Motivo de Consulta</h4>
          <small class="muted">Selecciona un motivo frecuente o redacta en las palabras del paciente</small>
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
          <small class="muted">Toca para activar o desactivar condiciones médicas</small>
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
            <input id="hcBifosfonatosDetalle" type="text" placeholder="Fármaco, vía (oral/EV), tiempo de administración..." value="${ant.bifosfonatosDetalle || ''}" style="margin-top:8px; width:100%; display:${ant.bifosfonatos ? 'block' : 'none'};">
          </div>
        </div>
      </div>

      <div class="hc-step-footer">
        <div></div>
        <button type="button" class="primary hc-next-step-btn" data-next="2">
          Siguiente: Examen Físico <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>

    <!-- ========================================================
         PASO 2: EXAMEN FÍSICO & ESTOMATOGNÁTICO (Secciones 5, 6)
         ======================================================== -->
    <div class="hc-step-pane" id="paneStep2" data-step="2">
      
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
            <span>Talla (Estatura)</span>
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
          <small class="muted">12 Estructuras Anatómicas (Marca Patológico si hay lesión)</small>
        </div>
        <div class="estomato-grid" id="estomatoGridContainer">
          ${renderEstomatoItems(est)}
        </div>
      </div>

      <div class="hc-step-footer">
        <button type="button" class="ghost hc-prev-step-btn" data-prev="1">
          <i class="fas fa-arrow-left"></i> Anterior: Anamnesis
        </button>
        <button type="button" class="primary hc-next-step-btn" data-next="3">
          Siguiente: Higiene & CPO <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>

    <!-- ========================================================
         PASO 3: ODONTO & ÍNDICES DE SALUD (Secciones 7, 8, 9)
         ======================================================== -->
    <div class="hc-step-pane" id="paneStep3" data-step="3">
      
      <!-- SECCIÓN 7: ODONTOGRAMA -->
      <div class="hc-section-card" style="background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.06)); border-color:rgba(99,102,241,0.25);">
        <div class="hc-section-header">
          <h4><span class="hc-section-num">7</span> Odontograma FDI (Permanente y Temporal)</h4>
          <button type="button" class="primary" onclick="window.switchPatientTab && window.switchPatientTab('odonto')" style="font-size:0.85rem;">
            <i class="fas fa-tooth"></i> Abrir Odontograma Gráfico Completo
          </button>
        </div>
        <p class="muted" style="margin:0; font-size:0.88rem;">
          El esquema interactivo permite registrar patologías por caras (Vestibular, Lingual, Oclusal, Mesial, Distal) y sincroniza automáticamente las intervenciones con los índices CPO.
        </p>
      </div>

      <!-- SECCIÓN 8 & 9: INDICADORES DE SALUD BUCAL E ÍNDICES CPO-ceo -->
      <div class="hc-section-card">
        <div class="hc-section-header">
          <h4><span class="hc-section-num">8 & 9</span> Indicadores de Salud Bucal e Índices CPO / ceo</h4>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
          <!-- Higiene Oral Simplificada -->
          <div>
            <h5 style="margin-bottom:10px; font-weight:700; color:var(--text);"><i class="fas fa-broom" style="color:var(--primary);"></i> Higiene Oral Simplificada (Piezas Índice)</h5>
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
                ${renderIHOSTableRows(ind.ihos)}
              </tbody>
            </table>
          </div>

          <!-- Condiciones Generales & Índices CPO -->
          <div>
            <h5 style="margin-bottom:10px; font-weight:700; color:var(--text);"><i class="fas fa-chart-pie" style="color:var(--primary);"></i> Diagnóstico Oclusal y Periodontal</h5>
            
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

            <!-- Tarjetas CPO / ceo -->
            <div class="cpo-grid">
              <div class="cpo-card">
                <div class="cpo-card-head">
                  <span>Índice CPO (Permanente)</span>
                  <span class="cpo-total-badge" id="cpoTotalBadge">${cpoData.totalCPO || 0}</span>
                </div>
                <div class="cpo-row"><span>Cariados (C):</span> <input id="cpoC" type="number" min="0" value="${cpoData.c || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>Perdidos (P):</span> <input id="cpoP" type="number" min="0" value="${cpoData.p || 0}" style="width:55px; text-align:center;"></div>
                <div class="cpo-row"><span>Obturados (O):</span> <input id="cpoO" type="number" min="0" value="${cpoData.o || 0}" style="width:55px; text-align:center;"></div>
              </div>

              <div class="cpo-card">
                <div class="cpo-card-head">
                  <span>Índice ceo (Temporal)</span>
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

      <div class="hc-step-footer">
        <button type="button" class="ghost hc-prev-step-btn" data-prev="2">
          <i class="fas fa-arrow-left"></i> Anterior: Examen Físico
        </button>
        <button type="button" class="primary hc-next-step-btn" data-next="4">
          Siguiente: CIE-11 & Planes <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>

    <!-- ========================================================
         PASO 4: CIE-11 & PLANES DE TRATAMIENTO (Secciones 10, 11)
         ======================================================== -->
    <div class="hc-step-pane" id="paneStep4" data-step="4">
      
      <!-- SECCIÓN 10: PLANES DE DIAGNÓSTICO, TERAPÉUTICO Y EDUCACIONAL -->
      <div class="hc-section-card">
        <div class="hc-section-header">
          <h4><span class="hc-section-num">10</span> Planes de Diagnóstico, Terapéutico y Educacional</h4>
          <small class="muted">Exámenes complementarios solicitados antes o durante el tratamiento</small>
        </div>
        <div class="chips-container" id="planesDxChips">
          <span class="chip-toggle ${planesDx.biometria ? 'active' : ''}" data-key="biometria"><i class="fas fa-vial"></i> Biometría Hemática</span>
          <span class="chip-toggle ${planesDx.quimica ? 'active' : ''}" data-key="quimica"><i class="fas fa-flask"></i> Química Sanguínea / Glucosa</span>
          <span class="chip-toggle ${planesDx.rayosXPeriapical ? 'active' : ''}" data-key="rayosXPeriapical"><i class="fas fa-x-ray"></i> Rayos X Periapical</span>
          <span class="chip-toggle ${planesDx.rayosXPanoramica ? 'active' : ''}" data-key="rayosXPanoramica"><i class="fas fa-film"></i> Rayos X Panorámica</span>
          <span class="chip-toggle ${planesDx.cbct ? 'active' : ''}" data-key="cbct"><i class="fas fa-cube"></i> Tomografía Dental CBCT</span>
          <span class="chip-toggle ${planesDx.educacion ? 'active' : ''}" data-key="educacion"><i class="fas fa-chalkboard-user"></i> Educación en Higiene Oral</span>
        </div>
        <input id="hcPlanesOtros" type="text" class="field-input" placeholder="Otros exámenes, interconsultas médicas o indicaciones preoperatorias..." value="${planesDx.otros || ''}" style="width:100%; margin-top:8px;">
      </div>

      <!-- SECCIÓN 11: DIAGNÓSTICO CON CODIFICACIÓN CIE-11 -->
      <div class="hc-section-card">
        <div class="hc-section-header">
          <h4><span class="hc-section-num">11</span> Diagnósticos (Clasificación CIE-11 Bucal)</h4>
          <small class="muted">Búsqueda predictiva oficial OMS · Presuntivo (PRE) / Definitivo (DEF)</small>
        </div>
        <div id="cie11Container">
          ${renderCIE11Rows(diagList)}
        </div>
      </div>

      <div class="hc-step-footer">
        <button type="button" class="ghost hc-prev-step-btn" data-prev="3">
          <i class="fas fa-arrow-left"></i> Anterior: Higiene & CPO
        </button>
        <button type="button" class="primary hc-next-step-btn" data-next="5">
          Siguiente: Sesiones Clínicas <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>

    <!-- ========================================================
         PASO 5: TRATAMIENTO, SESIONES Y FIRMAS (Sección 12)
         ======================================================== -->
    <div class="hc-step-pane" id="paneStep5" data-step="5">
      
      <!-- SECCIÓN 12: TRATAMIENTO Y EVOLUCIÓN (Sesiones de Consulta) -->
      <div class="hc-section-card">
        <div class="hc-section-header">
          <h4><span class="hc-section-num">12</span> Tratamiento y Evolución de Sesiones</h4>
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
      </div>

      <!-- Área de Adjuntos y Radiografías -->
      <div class="hc-section-card">
        <div class="hc-section-header">
          <h4><i class="fas fa-images" style="color:var(--primary);"></i> Estudios Radiográficos y Fotos Clínicas</h4>
          <button type="button" id="hcShowAttachments" class="ghost" style="font-size:0.85rem;"><i class="fas fa-folder-open"></i> Ver adjuntos (0)</button>
        </div>
        <div id="hcAttachmentsArea" style="display:none; margin-top:12px;">
          ${canEdit ? `
            <div style="margin-bottom:12px; display:flex; gap:10px; align-items:center;">
              <input type="file" id="hcFileInput" multiple accept="image/*,.pdf" style="display:none;">
              <button type="button" class="ghost" onclick="this.previousElementSibling.click()"><i class="fas fa-upload"></i> Subir Foto o Radiografía</button>
              <small class="muted">Formatos admitidos: JPG, PNG, PDF</small>
            </div>
          ` : ''}
          <div id="hcAttachmentsList" class="attachments-grid"></div>
        </div>
      </div>

      <div class="hc-step-footer">
        <button type="button" class="ghost hc-prev-step-btn" data-prev="4">
          <i class="fas fa-arrow-left"></i> Anterior: CIE-11 & Planes
        </button>
        ${canEdit ? `
          <button type="button" id="hcBottomSaveBtn" class="primary" style="box-shadow:0 4px 14px rgba(99,102,241,0.35);">
            <i class="fas fa-save"></i> Guardar Historia Clínica Completa
          </button>
        ` : '<div></div>'}
      </div>
    </div>
  `;

  setupInteractiveHandlers(container, patient, notes, onSaveNote, canEdit, onSaveFullHistory);

  return container;
}

function calculateAge(birthdate) {
  if (!birthdate) return '—';
  const diff = Date.now() - new Date(birthdate).getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + ' años';
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
    const isPat = est[it.key]?.estado === 'patologico';
    const obs = est[it.key]?.obs || '';
    return `
      <div class="estomato-item" data-key="${it.key}">
        <div class="estomato-item-head">
          <span class="estomato-title">${it.name}</span>
          <div class="estomato-switch">
            <button type="button" class="estomato-switch-btn normal ${!isPat ? 'active' : ''}" data-val="normal">Sano</button>
            <button type="button" class="estomato-switch-btn patologico ${isPat ? 'active' : ''}" data-val="patologico">Patol.</button>
          </div>
        </div>
        <input type="text" class="estomato-obs field-input" placeholder="Detalles de la lesión..." value="${obs}" style="display:${isPat ? 'block' : 'none'}; font-size:0.8rem; margin-top:4px;">
      </div>
    `;
  }).join('');
}

function renderIHOSTableRows(ihos = {}) {
  const pieces = [
    { key: 'p16_17_55', label: '16 / 17 / 55' },
    { key: 'p11_21_51', label: '11 / 21 / 51' },
    { key: 'p26_27_65', label: '26 / 27 / 65' },
    { key: 'p36_37_75', label: '36 / 37 / 75' },
    { key: 'p31_41_71', label: '31 / 41 / 71' },
    { key: 'p46_47_85', label: '46 / 47 / 85' }
  ];

  return pieces.map(p => {
    const row = ihos[p.key] || { placa: 0, calculo: 0, gingivitis: 0 };
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
  // 0. Navegación por Pasos (Wizard)
  const tabBtns = container.querySelectorAll('.hc-tab-btn');
  const panes = container.querySelectorAll('.hc-step-pane');
  const viewModeBtns = container.querySelectorAll('.hc-view-mode-btn');

  function goToStep(stepNum) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.step === String(stepNum)));
    panes.forEach(p => p.classList.toggle('active', p.dataset.step === String(stepNum)));
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(btn.dataset.step);
    });
  });

  container.querySelectorAll('.hc-next-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(btn.dataset.next);
      window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
    });
  });

  container.querySelectorAll('.hc-prev-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(btn.dataset.prev);
      window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
    });
  });

  // Toggle Modo Vista: Wizard vs Full
  viewModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      if (mode === 'full') {
        panes.forEach(p => p.style.display = 'block');
        const nav = container.querySelector('#hcTabsNav');
        if (nav) nav.style.display = 'none';
      } else {
        const nav = container.querySelector('#hcTabsNav');
        if (nav) nav.style.display = 'flex';
        panes.forEach(p => p.style.display = '');
        goToStep(1);
      }
    });
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
      chip.classList.toggle('active');
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
