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
          <div class="field"><label>DNI</label><span>${patient.dni || '-'}</span></div>
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
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Historia Clínica - ${patient.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px; }
          .note-card { border: 1px solid #e2e8f0; border-left: 4px solid #6366f1; border-radius: 6px; padding: 12px; margin-bottom: 10px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color:#6366f1; margin:0; font-size:22px;">Historia Clínica y Evoluciones</h1>
          <p style="color:#64748b; margin:4px 0 0; font-size:12px;">Paciente: <strong>${patient.name}</strong> | DNI: ${patient.dni || '-'} | Fecha: ${new Date().toLocaleDateString('es-AR')}</p>
        </div>

        ${notes.length === 0 ? '<p style="color:#64748b;">Sin evoluciones registradas.</p>' : notes.map(n => `
          <div class="note-card">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <strong>📅 ${n.date || '-'}</strong>
              ${n.pieza ? `<span style="background:#eef2ff; padding:2px 6px; border-radius:4px; font-size:11px;">Pieza ${n.pieza}</span>` : ''}
            </div>
            ${n.diagnosticoTipo ? `<div><strong>Diagnóstico:</strong> ${n.diagnosticoTipo}${n.diagnosticoTexto ? ' - ' + n.diagnosticoTexto : ''}</div>` : ''}
            ${n.procedimiento ? `<div><strong>Procedimiento:</strong> <span style="color:#4f46e5;">${n.procedimiento}</span></div>` : ''}
            ${n.observaciones ? `<div><strong>Observaciones:</strong> ${n.observaciones}</div>` : ''}
            ${n.notaAdicional ? `<div><strong>Indicaciones:</strong> ${n.notaAdicional}</div>` : ''}
          </div>
        `).join('')}
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
          msg += `📋 *Datos:* DNI ${patient.dni || '-'} | OS: ${patient.health_insurance || 'Particular'}%0A`;
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
