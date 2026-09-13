/**
 * patient-export.js - Generación de PDF y Envíos por WhatsApp / Email
 */
import { getWhatsAppStatus, sendWhatsAppReport } from './whatsapp-manager.js';
import { generateOdontogramHTML } from './patient-charts.js';
import { showToast } from './app-utils.js';

export function createExportActions(patient, notes = [], plans = [], professionals = [], onSendEmail, clinicName = 'Consultorios.pro') {
  const container = document.createElement('div');
  container.className = 'export-actions-card modal';
  
  const prof = professionals.find(p => p.id === patient?.assignedProfessionalId) || professionals[0] || { name: 'Profesional Principal' };
  
  container.innerHTML = `
    <div class="modal-body" style="max-width:560px;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fas fa-share-alt" style="color:var(--primary); font-size:1.4rem;"></i>
          <h3 style="margin:0;">Exportar y Compartir Historia Clínica</h3>
        </div>
        <button class="ghost close-export-modal" title="Cerrar"><i class="fas fa-times"></i></button>
      </div>
      
      <div class="export-options">
        <div class="export-section" style="background:var(--bg-page); padding:16px; border-radius:10px; margin-bottom:16px;">
          <h5 style="margin-bottom:10px; color:var(--text);"><i class="fas fa-file-pdf" style="color:var(--danger);"></i> Imprimir / Descargar en PDF</h5>
          <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px;">
            <button class="ghost" id="downloadFicha" style="text-align:left; padding:10px;">
              <i class="fas fa-id-card"></i> <strong>Ficha del Paciente</strong>
            </button>
            <button class="ghost" id="downloadHistoria" style="text-align:left; padding:10px;">
              <i class="fas fa-notes-medical"></i> <strong>Evoluciones Médicas</strong>
            </button>
            <button class="ghost" id="downloadOdontogram" style="text-align:left; padding:10px;">
              <i class="fas fa-tooth"></i> <strong>Odontograma</strong>
            </button>
            <button class="primary" id="downloadComplete" style="text-align:left; padding:10px;">
              <i class="fas fa-file-medical-alt"></i> <strong>Expediente Completo</strong>
            </button>
          </div>
        </div>
        
        <div class="export-section" style="background:var(--bg-page); padding:16px; border-radius:10px; margin-bottom:16px;">
          <h5 style="margin-bottom:10px;"><i class="fas fa-paper-plane" style="color:var(--primary);"></i> Enviar al Paciente</h5>
          
          <div style="display:flex; gap:16px; margin-bottom:12px; font-size:0.9rem;">
            <label style="cursor:pointer;">
              <input type="radio" name="exportSendTo" value="patient" checked>
              <span>Teléfono / Email del Paciente</span>
            </label>
            <label style="cursor:pointer;">
              <input type="radio" name="exportSendTo" value="custom">
              <span>Otro Destinatario</span>
            </label>
          </div>
          
          <div class="custom-destination-export hidden" id="customExportDest" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
            <input type="email" id="customExportEmail" placeholder="Email alternativo" style="padding:8px;">
            <input type="tel" id="customExportPhone" placeholder="WhatsApp (ej: 1155551234)" style="padding:8px;">
          </div>
          
          <div style="display:flex; gap:8px;">
            <button class="ghost" id="sendWhatsApp" style="flex:1; background:#25d366; color:#fff; border-color:#25d366;">
              <i class="fab fa-whatsapp"></i> <strong>Compartir por WhatsApp</strong>
            </button>
            <button class="ghost" id="sendEmail" style="flex:1;">
              <i class="fas fa-envelope"></i> <strong>Enviar por Email</strong>
            </button>
          </div>
        </div>
        
        <div class="send-options hidden" id="sendOptionsPanel" style="border-top:1px solid var(--border); padding-top:12px;">
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px; font-size:0.9rem;">
            <label><input type="checkbox" id="sendFicha" checked> Incluir ficha administrativa</label>
            <label><input type="checkbox" id="sendHistoria" checked> Incluir historial de evoluciones</label>
            <label><input type="checkbox" id="sendOdontogram"> Incluir odontograma</label>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="ghost" id="cancelSend">Cancelar</button>
            <button class="primary" id="confirmSend"><i class="fas fa-paper-plane"></i> Confirmar y Enviar</button>
          </div>
        </div>
      </div>
      <div id="exportMsg" class="msg" style="margin-top:10px; font-weight:600;"></div>
    </div>
  `;
  
  function generateFichaHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ficha - ${patient.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px; display:flex; justify-content:space-between; }
          .header h1 { color: #6366f1; margin: 0; font-size:22px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .field { margin-bottom: 8px; }
          .field label { font-size: 11px; color: #64748b; display: block; }
          .field span { font-size: 14px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${clinicName}</h1>
            <p style="color:#64748b; margin:4px 0 0; font-size:12px;">Ficha Administrativa del Paciente</p>
          </div>
          <div style="text-align:right; font-size:12px; color:#64748b;">
            Fecha: ${new Date().toLocaleDateString('es-AR')}
          </div>
        </div>
        
        <div class="grid">
          <div class="field"><label>Nombre completo</label><span>${patient.name || '-'}</span></div>
          <div class="field"><label>Cédula / ID</label><span>${patient.dni || '-'}</span></div>
          <div class="field"><label>Teléfono</label><span>${patient.phone || '-'}</span></div>
          <div class="field"><label>Email</label><span>${patient.email || '-'}</span></div>
          <div class="field"><label>Obra Social</label><span>${patient.health_insurance || patient.insurance || 'Particular'}</span></div>
          <div class="field"><label>N° Afiliado</label><span>${patient.affiliate_number || patient.insuranceNumber || '-'}</span></div>
          <div class="field"><label>Fecha de Nacimiento</label><span>${patient.birthdate || patient.birthDate || '-'}</span></div>
          <div class="field"><label>Profesional Asignado</label><span>${prof ? prof.name : 'Sin asignar'}</span></div>
        </div>

        <div style="margin-top:20px;">
          <label style="font-size:11px; color:#64748b;">Observaciones Médicas / Alergias:</label>
          <p style="background:#f8fafc; padding:12px; border-radius:6px; font-size:13px;">${patient.allergies || patient.notes || patient.generalNotes || 'Sin antecedentes registrados.'}</p>
        </div>
      </body>
      </html>
    `;
  }
  
  function generateHistoriaHTML() {
    const hc = patient.clinicalHistory || {};
    const antecedentes = hc.antecedentes || [];
    const estomato = hc.estomatognatico || [];
    const cie11 = hc.diagnosticosCIE11 || [];
    const sv = hc.signosVitales || {};
    const cpo = hc.cpo || {};
    const ind = hc.indicadoresSalud || {};
    const planes = hc.planes || {};
    const presc = hc.prescripciones || {};

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Historia Clínica Odontológica - ${patient.name}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.4; font-size: 12px; margin: 0; padding: 12px; }
          .hc-header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
          .hc-title { font-size: 18px; font-weight: 700; color: #1e3a8a; margin: 0; }
          .hc-subtitle { font-size: 11px; color: #64748b; margin: 2px 0 0; }
          .sec-box { border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; }
          .sec-title { background: #f1f5f9; padding: 5px 10px; font-size: 11px; font-weight: 700; color: #1e40af; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; }
          .sec-body { padding: 8px 10px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
          .data-item label { font-size: 10px; color: #64748b; display: block; }
          .data-item span { font-weight: 600; font-size: 12px; }
          .chip { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin: 2px; }
          .alert-chip { background: #fee2e2; color: #991b1b; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
          th, td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; color: #475569; }
          .badge-pre { background: #fef3c7; color: #92400e; padding: 2px 5px; border-radius: 3px; font-weight: 700; font-size: 9px; }
          .badge-def { background: #dcfce7; color: #166534; padding: 2px 5px; border-radius: 3px; font-weight: 700; font-size: 9px; }
          .sig-box { display: flex; justify-content: space-around; margin-top: 25px; page-break-inside: avoid; }
          .sig-line { width: 200px; border-top: 1px solid #333; text-align: center; font-size: 11px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="hc-header">
          <div>
            <div class="hc-title">${clinicName} - HISTORIA CLÍNICA ODONTOLÓGICA</div>
            <div class="hc-subtitle">Sistema Odontológico Integral · Cumplimiento CIE-11 OMS / MSP</div>
          </div>
          <div style="text-align:right; font-size:11px; color:#64748b;">
            Emisión: ${new Date().toLocaleDateString('es-AR')}
          </div>
        </div>

        <!-- Sec 1: Filiación -->
        <div class="sec-box">
          <div class="sec-title">1. Datos de Filiación y Registro</div>
          <div class="sec-body grid-4">
            <div class="data-item"><label>Paciente:</label><span>${patient.name || '-'}</span></div>
            <div class="data-item"><label>Cédula / ID:</label><span>${patient.dni || '-'}</span></div>
            <div class="data-item"><label>Género / Edad:</label><span>${patient.sex || 'No espec.'} / ${patient.birthdate ? (new Date().getFullYear() - new Date(patient.birthdate).getFullYear()) + ' años' : '-'}</span></div>
            <div class="data-item"><label>Teléfono:</label><span>${patient.phone || '-'}</span></div>
            <div class="data-item"><label>Ocupación:</label><span>${patient.occupation || '-'}</span></div>
            <div class="data-item"><label>Cobertura:</label><span>${patient.health_insurance || patient.insurance || 'Particular'}</span></div>
            <div class="data-item"><label>Representante Legal:</label><span>${patient.representativeName ? `${patient.representativeName} (Cédula ${patient.representativeDni || '-'})` : 'N/A'}</span></div>
            <div class="data-item"><label>Contacto Emergencia:</label><span>${patient.emergencyPhone || '-'}</span></div>
          </div>
        </div>

        <!-- Sec 2 y 3: Motivo y Enfermedad Actual -->
        <div class="grid-2">
          <div class="sec-box">
            <div class="sec-title">2. Motivo de Consulta</div>
            <div class="sec-body">${hc.motivoConsulta || patient.motivoConsulta || 'Consulta general odontológica.'}</div>
          </div>
          <div class="sec-box">
            <div class="sec-title">3. Enfermedad Actual y Evolución</div>
            <div class="sec-body">${hc.enfermedadActual || 'Paciente refiere inicio del cuadro sin complicaciones agudas.'}</div>
          </div>
        </div>

        <!-- Sec 4: Antecedentes -->
        <div class="sec-box">
          <div class="sec-title">4. Antecedentes Personales y Familiares</div>
          <div class="sec-body">
            <div style="margin-bottom: 4px;">
              ${antecedentes.length > 0 ? antecedentes.map(a => `<span class="chip">${a}</span>`).join('') : '<span style="color:#64748b;">Sin antecedentes patológicos declarados.</span>'}
              ${hc.antecedentesOtros ? `<div style="margin-top:4px; font-size:11px;"><strong>Otros:</strong> ${hc.antecedentesOtros}</div>` : ''}
            </div>
            ${hc.bifosfonatos ? `<div style="margin-top:4px; color:#b91c1c; font-weight:600; font-size:11px;">⚠️ ALERTA: Paciente con tratamiento de Bifosfonatos / Medicación Antirreabsortiva (${hc.bifosfonatosDetalle || 'Precaución de osteonecrosis'})</div>` : ''}
          </div>
        </div>

        <!-- Sec 5: Signos Vitales -->
        <div class="sec-box">
          <div class="sec-title">5. Signos Vitales y Somatometría</div>
          <div class="sec-body grid-4">
            <div class="data-item"><label>Presión Arterial (PA):</label><span>${sv.pa || '-'} mmHg</span></div>
            <div class="data-item"><label>Frecuencia Cardíaca (FC):</label><span>${sv.fc || '-'} lpm</span></div>
            <div class="data-item"><label>Frecuencia Respiratoria:</label><span>${sv.fr || '-'} rpm</span></div>
            <div class="data-item"><label>Temperatura:</label><span>${sv.temp || '-'} °C</span></div>
            <div class="data-item"><label>Peso:</label><span>${sv.peso || '-'} kg</span></div>
            <div class="data-item"><label>Talla / Estatura:</label><span>${sv.talla || '-'} m</span></div>
            <div class="data-item"><label>IMC Calculado:</label><span>${sv.imc || '-'}</span></div>
            <div class="data-item"><label>Alergias:</label><span style="color:#dc2626;">${patient.allergies || 'Ninguna conocida'}</span></div>
          </div>
        </div>

        <!-- Sec 6: Sistema Estomatognático -->
        <div class="sec-box">
          <div class="sec-title">6. Examen del Sistema Estomatognático</div>
          <div class="sec-body">
            <table>
              <thead>
                <tr>
                  <th style="width:30%;">Región Anatómica</th>
                  <th style="width:20%;">Estado</th>
                  <th>Hallazgos / Descripción Clínica</th>
                </tr>
              </thead>
              <tbody>
                ${estomato.length > 0 ? estomato.map(e => `
                  <tr>
                    <td><strong>${e.nombre}</strong></td>
                    <td><span class="chip ${e.estado === 'patologico' ? 'alert-chip' : ''}">${e.estado === 'patologico' ? 'PATOLÓGICO' : 'SANO / NORMAL'}</span></td>
                    <td>${e.notas || '-'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="3" style="text-align:center; color:#64748b;">Todas las estructuras estomatognáticas evaluadas sin patología aparente.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sec 8: Indicadores de Salud Bucal & Índices CPO / ceo -->
        <div class="sec-box">
          <div class="sec-title">8. Indicadores de Salud Bucal e Índices CPO / ceo</div>
          <div class="sec-body">
            <div class="grid-4" style="margin-bottom:8px;">
              <div class="data-item"><label>Higiene Bucal:</label><span>${ind.higiene || 'Aceptable'}</span></div>
              <div class="data-item"><label>Placa Bacteriana:</label><span>${ind.placa || 'Leve'}</span></div>
              <div class="data-item"><label>Cálculo / Sarro:</label><span>${ind.calculo || 'Ausente'}</span></div>
              <div class="data-item"><label>Enfermedad Periodontal:</label><span>${ind.periodontitis || 'No'}</span></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Índice CPO-D (Dientes Permanentes)</th>
                  <th>Índice ceo-d (Dientes Temporales)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cariados: <strong>${cpo.cpodC || '0'}</strong> | Perdidos: <strong>${cpo.cpodP || '0'}</strong> | Obturados: <strong>${cpo.cpodO || '0'}</strong> | <strong>Total CPO-D: ${cpo.cpodTotal || '0'}</strong></td>
                  <td>Cariados: <strong>${cpo.ceodC || '0'}</strong> | Extracción: <strong>${cpo.ceodE || '0'}</strong> | Obturados: <strong>${cpo.ceodO || '0'}</strong> | <strong>Total ceo-d: ${cpo.ceodTotal || '0'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sec 9: Diagnósticos CIE-11 OMS -->
        <div class="sec-box">
          <div class="sec-title">9. Diagnósticos Odontológicos (Codificación OMS CIE-11)</div>
          <div class="sec-body">
            <table>
              <thead>
                <tr>
                  <th style="width:15%;">Código CIE-11</th>
                  <th style="width:65%;">Diagnóstico Clínico / Descripción</th>
                  <th style="width:20%;">Tipo</th>
                </tr>
              </thead>
              <tbody>
                ${cie11.length > 0 ? cie11.map(d => `
                  <tr>
                    <td><strong style="color:#2563eb;">${d.code}</strong></td>
                    <td>${d.title}</td>
                    <td><span class="${d.tipo === 'DEF' ? 'badge-def' : 'badge-pre'}">${d.tipo === 'DEF' ? 'DEFINITIVO (DEF)' : 'PRESUNTIVO (PRE)'}</span></td>
                  </tr>
                `).join('') : '<tr><td colspan="3" style="text-align:center; color:#64748b;">Sin diagnósticos CIE-11 formalizados.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sec 10: Planes -->
        <div class="sec-box">
          <div class="sec-title">10. Planes de Diagnóstico, Terapéutico y Educacional</div>
          <div class="sec-body grid-3">
            <div class="data-item"><label>Plan Diagnóstico (Rx, Tomografía):</label><p style="margin:2px 0;">${planes.planesDiagnostico || 'Evaluación clínica de rutina y control radiográfico periapical.'}</p></div>
            <div class="data-item"><label>Plan Terapéutico (Tratamientos):</label><p style="margin:2px 0;">${planes.planesTerapeutico || 'Restauraciones adhesivas y profilaxis dental.'}</p></div>
            <div class="data-item"><label>Plan Educacional (Prevención):</label><p style="margin:2px 0;">${planes.planesEducacional || 'Instrucción de técnica de cepillado y uso de hilo dental.'}</p></div>
          </div>
        </div>

        <!-- Sec 11: Evoluciones y Tratamientos -->
        <div class="sec-box">
          <div class="sec-title">11. Evolución del Tratamiento y Sesiones Clínicas</div>
          <div class="sec-body">
            ${notes.length === 0 ? '<p style="color:#64748b; margin:0;">Sin evoluciones registradas aún.</p>' : `
              <table>
                <thead>
                  <tr>
                    <th style="width:15%;">Fecha</th>
                    <th style="width:10%;">Pieza</th>
                    <th style="width:45%;">Procedimiento / Evolución</th>
                    <th style="width:30%;">Firma / Profesional</th>
                  </tr>
                </thead>
                <tbody>
                  ${notes.map(n => `
                    <tr>
                      <td><strong>${n.date || '-'}</strong></td>
                      <td>${n.pieza ? 'Pza ' + n.pieza : '-'}</td>
                      <td>
                        <strong>${n.procedimiento || n.diagnosticoTipo || 'Sesión'}</strong>
                        ${n.observaciones ? `<div style="color:#64748b; font-size:10px;">${n.observaciones}</div>` : ''}
                      </td>
                      <td>${prof ? prof.name : 'Dr. Asignado'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Sec 12: Prescripciones y Firmas -->
        <div class="sec-box">
          <div class="sec-title">12. Prescripciones Médicas y Firmas de Conformidad</div>
          <div class="sec-body">
            <div class="grid-2">
              <div class="data-item"><label>Fármacos Recetados / Posología:</label><p style="margin:2px 0;">${presc.farmacos || 'Sin medicación prescrita actualmente.'}</p></div>
              <div class="data-item"><label>Indicaciones Post-operatorias:</label><p style="margin:2px 0;">${presc.indicacionesGenerales || 'Dieta blanda y frío local según necesidad.'}</p></div>
            </div>
            <div class="sig-box">
              <div class="sig-line">Firma del Odontólogo / Matrícula<br><small>${prof ? prof.name : 'Odontólogo'}</small></div>
              <div class="sig-line">Firma del Paciente / Representante<br><small>Conformidad Informada</small></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  function downloadPDF(html, filename) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Permití las ventanas emergentes para ver el PDF/imprimir', 'warning');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  function getExportDestination() {
    const sendTo = container.querySelector('input[name="exportSendTo"]:checked')?.value || 'patient';
    if (sendTo === 'custom') {
      return {
        email: container.querySelector('#customExportEmail')?.value.trim() || '',
        phone: container.querySelector('#customExportPhone')?.value.trim() || ''
      };
    }
    return {
      email: patient.email || '',
      phone: patient.phone || ''
    };
  }

  let currentSendMethod = null;

  setTimeout(() => {
    const msgDiv = container.querySelector('#exportMsg');
    const sendPanel = container.querySelector('#sendOptionsPanel');
    const closeBtn = container.querySelector('.close-export-modal');

    closeBtn?.addEventListener('click', () => container.remove());

    container.querySelectorAll('input[name="exportSendTo"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const customDiv = container.querySelector('#customExportDest');
        if (radio.value === 'custom') customDiv?.classList.remove('hidden');
        else customDiv?.classList.add('hidden');
      });
    });

    container.querySelector('#downloadFicha')?.addEventListener('click', () => {
      downloadPDF(generateFichaHTML(), `Ficha_${patient.name}.pdf`);
    });

    container.querySelector('#downloadHistoria')?.addEventListener('click', () => {
      downloadPDF(generateHistoriaHTML(), `Historia_${patient.name}.pdf`);
    });

    container.querySelector('#downloadOdontogram')?.addEventListener('click', () => {
      const odontogramHtml = generateOdontogramHTML(patient, notes, prof, clinicName);
      downloadPDF(odontogramHtml, `Odontograma_${patient.name}.pdf`);
    });

    container.querySelector('#downloadComplete')?.addEventListener('click', () => {
      const odontogramHtml = generateOdontogramHTML(patient, notes, prof, clinicName);
      const completeHtml = generateFichaHTML() + '<div style="page-break-before:always;"></div>' + generateHistoriaHTML() + '<div style="page-break-before:always;"></div>' + odontogramHtml;
      downloadPDF(completeHtml, `Expediente_${patient.name}.pdf`);
    });

    container.querySelector('#sendWhatsApp')?.addEventListener('click', () => {
      const dest = getExportDestination();
      if (!dest.phone) {
        msgDiv.textContent = 'Ingrese un número de WhatsApp';
        msgDiv.style.color = 'var(--danger)';
        return;
      }
      currentSendMethod = 'whatsapp';
      sendPanel?.classList.remove('hidden');
    });

    container.querySelector('#sendEmail')?.addEventListener('click', () => {
      const dest = getExportDestination();
      if (!dest.email) {
        msgDiv.textContent = 'Ingrese un email de destino';
        msgDiv.style.color = 'var(--danger)';
        return;
      }
      currentSendMethod = 'email';
      sendPanel?.classList.remove('hidden');
    });

    container.querySelector('#cancelSend')?.addEventListener('click', () => {
      sendPanel?.classList.add('hidden');
      currentSendMethod = null;
    });

    container.querySelector('#confirmSend')?.addEventListener('click', async () => {
      const dest = getExportDestination();
      const includeFicha = container.querySelector('#sendFicha')?.checked;
      const includeHistoria = container.querySelector('#sendHistoria')?.checked;

      if (currentSendMethod === 'whatsapp') {
        let msg = `🦷 *RESUMEN CLÍNICO - ${patient.name.toUpperCase()}*%0A%0A`;
        if (includeFicha) {
          msg += `📋 *Datos:* Cédula ${patient.dni || '-'} | OS: ${patient.health_insurance || 'Particular'}%0A`;
        }
        if (includeHistoria) {
          msg += `🩺 *Evoluciones Registradas:* ${notes.length}%0A`;
          if (notes.length > 0) {
            msg += `Última visita (${notes[0].date}): ${notes[0].procedimiento || notes[0].motivoTipo || 'Consulta'}%0A`;
          }
        }
        msg += `%0A_Generado desde Consultorios.pro_`;

        const phone = dest.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        showToast('Abriendo WhatsApp para compartir...', 'success');
        container.remove();
      } else if (currentSendMethod === 'email') {
        showToast(`Enviando reporte a ${dest.email}...`, 'info');
        if (onSendEmail) await onSendEmail({ to: dest.email, patient });
        container.remove();
      }
    });
  }, 0);

  return container;
}
