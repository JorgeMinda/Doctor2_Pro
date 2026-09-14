/**
 * drug-interactions.js - Motor de Apoyo Clínico & Alertas de Interacción Medicamentosa / Alergias
 * 100% Local, Seguro y Determinístico (Cero costo, cero APIs externas, HIPAA/GDPR friendly)
 */

export const DRUG_DATABASE = [
  {
    id: 'amoxi',
    name: 'Amoxicilina',
    category: 'Antibiótico (Betalactámico)',
    aliases: ['amoxicilina', 'amoxidal', 'amoxil', 'amoxi-clavulánico', 'augmentin', 'trifamox', 'amoxipen'],
    family: 'penicilinas',
    contraindications: [
      { condition: 'penicilina', severity: 'CRITICAL', message: 'Riesgo alto de shock anafiláctico o reacción alérgica grave por hipersensibilidad a penicilinas.' },
      { condition: 'betalactamicos', severity: 'CRITICAL', message: 'Alergia cruzada a betalactámicos.' }
    ],
    interactions: [
      { withDrug: 'metotrexato', severity: 'WARNING', message: 'Disminuye la excreción de metotrexato aumentando su toxicidad.' },
      { withDrug: 'anticonceptivos', severity: 'INFO', message: 'Puede reducir levemente la eficacia de anticonceptivos orales.' }
    ],
    safeAlternatives: ['Clindamicina 300mg', 'Claritromicina 500mg', 'Azitromicina 500mg']
  },
  {
    id: 'penicilina',
    name: 'Penicilina / Ampicilina',
    category: 'Antibiótico (Betalactámico)',
    aliases: ['penicilina', 'ampicilina', 'benzetacil', 'penicilina benzatínica', 'amplicilina'],
    family: 'penicilinas',
    contraindications: [
      { condition: 'penicilina', severity: 'CRITICAL', message: 'Paciente con alergia registrada a Penicilina. Contraindicación absoluta.' }
    ],
    interactions: [],
    safeAlternatives: ['Clindamicina 300mg', 'Azitromicina 500mg']
  },
  {
    id: 'clinda',
    name: 'Clindamicina',
    category: 'Antibiótico (Lincosamida)',
    aliases: ['clindamicina', 'dalacin', 'clinwas'],
    family: 'lincosamidas',
    contraindications: [
      { condition: 'colitis', severity: 'WARNING', message: 'Antecedentes de colitis pseudomembranosa o enfermedad inflamatoria intestinal.' }
    ],
    interactions: [
      { withDrug: 'eritromicina', severity: 'WARNING', message: 'Antagonismo competitivo en el sitio de unión ribosomal.' }
    ],
    safeAlternatives: ['Azitromicina 500mg', 'Amoxicilina (si no es alérgico a penicilinas)']
  },
  {
    id: 'azitro',
    name: 'Azitromicina',
    category: 'Antibiótico (Macrólido)',
    aliases: ['azitromicina', 'zitromax', 'azitral', 'azitrex'],
    family: 'macrolidos',
    contraindications: [
      { condition: 'arritmia', severity: 'WARNING', message: 'Prolongación del intervalo QT o arritmias cardíacas.' }
    ],
    interactions: [
      { withDrug: 'warfarina', severity: 'WARNING', message: 'Puede potenciar el efecto anticoagulante de la warfarina/acenocumarol.' }
    ],
    safeAlternatives: ['Clindamicina 300mg']
  },
  {
    id: 'ibuprofeno',
    name: 'Ibuprofeno',
    category: 'AINE (Analgésico / Antiinflamatorio)',
    aliases: ['ibuprofeno', 'ibupirac', 'actron', 'motrin', 'advil'],
    family: 'aines',
    contraindications: [
      { condition: 'aines', severity: 'CRITICAL', message: 'Hipersensibilidad o alergia a los AINEs.' },
      { condition: 'ulcera', severity: 'CRITICAL', message: 'Úlcera péptica activa o antecedentes de sangrado gastrointestinal.' },
      { condition: 'asma', severity: 'WARNING', message: 'Riesgo de broncoespasmo inducido por AINEs (Tríada de Samter).' },
      { condition: 'embarazo_3t', severity: 'CRITICAL', message: 'Contraindicado en 3er trimestre de embarazo (cierre prematuro del ductus arterioso).' }
    ],
    interactions: [
      { withDrug: 'anticoagulantes', severity: 'CRITICAL', message: 'Aumenta significativamente el riesgo de hemorragia digestiva.' },
      { withDrug: 'antihipertensivos', severity: 'INFO', message: 'Puede reducir la eficacia de fármacos antihipertensivos (IECA/ARA II).' }
    ],
    safeAlternatives: ['Paracetamol 500mg/1g', 'Tramadol + Paracetamol']
  },
  {
    id: 'ketorolac',
    name: 'Ketorolac',
    category: 'AINE Potente (Uso Corto plazo)',
    aliases: ['ketorolac', 'ketorolaco', 'sinalgico', 'dolorac', 'toradol'],
    family: 'aines',
    contraindications: [
      { condition: 'aines', severity: 'CRITICAL', message: 'Alergia a AINEs.' },
      { condition: 'ulcera', severity: 'CRITICAL', message: 'Alto riesgo de úlcera y sangrado gástrico. No usar por más de 5 días.' },
      { condition: 'insuficiencia_renal', severity: 'CRITICAL', message: 'Nefrotóxico en pacientes con insuficiencia renal moderada a severa.' }
    ],
    interactions: [
      { withDrug: 'anticoagulantes', severity: 'CRITICAL', message: 'Riesgo severo de hemorragia.' }
    ],
    safeAlternatives: ['Paracetamol 1g', 'Dexametasona 4mg (antiinflamatorio esteroideo)']
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol / Acetaminofén',
    category: 'Analgésico / Antipirético',
    aliases: ['paracetamol', 'acetaminofén', 'acetaminofen', 'tafirol', 'tylenol', 'termalgin'],
    family: 'analgesicos_puros',
    contraindications: [
      { condition: 'insuficiencia_hepatica', severity: 'CRITICAL', message: 'Insuficiencia hepática grave o hepatitis aguda.' }
    ],
    interactions: [
      { withDrug: 'alcohol', severity: 'WARNING', message: 'El consumo crónico de alcohol aumenta el riesgo de hepatotoxicidad.' }
    ],
    safeAlternatives: ['Ibuprofeno 400mg (si no hay contraindicación gástrica)']
  },
  {
    id: 'anestesia_epi',
    name: 'Anestésico Local con Epinefrina / Adrenalina',
    category: 'Anestésico Odontológico con Vasoconstrictor',
    aliases: ['epinefrina', 'adrenalina', 'lidocaína con epinefrina', 'cartucaína', 'anestesia con vasoconstrictor'],
    family: 'anestesicos',
    contraindications: [
      { condition: 'hipertension', severity: 'WARNING', message: 'Hipertensión arterial no controlada o antecedentes de infarto reciente (< 6 meses).' },
      { condition: 'tirotoxicosis', severity: 'CRITICAL', message: 'Hipertiroidismo descompensado.' },
      { condition: 'glaucoma', severity: 'WARNING', message: 'Glaucoma de ángulo cerrado.' }
    ],
    interactions: [
      { withDrug: 'betabloqueantes', severity: 'WARNING', message: 'Puede desencadenar crisis hipertensiva con bradicardia refleja (ej: Propranolol).' }
    ],
    safeAlternatives: ['Mepivacaína 3% sin vasoconstrictor', 'Prilocaína con Felipresina']
  }
];

/**
 * Normaliza textos clínicos para búsqueda semántica
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Detecta fármacos mencionados en un texto o prescripción médica
 */
export function detectDrugsInText(text) {
  const normalized = normalizeText(text);
  const found = [];

  DRUG_DATABASE.forEach(drug => {
    const isPresent = drug.aliases.some(alias => {
      const normAlias = normalizeText(alias);
      const regex = new RegExp(`\\b${normAlias}\\b`, 'i');
      return regex.test(normalized);
    });

    if (isPresent && !found.some(f => f.id === drug.id)) {
      found.push(drug);
    }
  });

  return found;
}

/**
 * Valida un fármaco o lista de fármacos contra los antecedentes del paciente
 */
export function evaluatePrescriptionSafety(prescribedTextOrDrugs, patient) {
  const patientAllergies = normalizeText(patient?.allergies || patient?.alergias || '');
  const patientNotes = normalizeText(patient?.notes || patient?.antecedentes || '');
  const patientDiseases = normalizeText(
    (patient?.pathologies || []).join(' ') + ' ' +
    (patient?.antecedentesMedicos || '') + ' ' +
    patientAllergies + ' ' +
    patientNotes
  );

  let drugsToCheck = [];
  if (typeof prescribedTextOrDrugs === 'string') {
    drugsToCheck = detectDrugsInText(prescribedTextOrDrugs);
  } else if (Array.isArray(prescribedTextOrDrugs)) {
    drugsToCheck = prescribedTextOrDrugs;
  }

  const alerts = [];

  drugsToCheck.forEach(drug => {
    // 1. Chequeo de Alergias y Contraindicaciones
    drug.contraindications.forEach(contra => {
      const normCond = normalizeText(contra.condition);
      const hasMatch = patientDiseases.includes(normCond) ||
        (normCond === 'penicilina' && (patientAllergies.includes('penicilina') || patientAllergies.includes('amoxi') || patientAllergies.includes('betalactam'))) ||
        (normCond === 'aines' && (patientAllergies.includes('aine') || patientAllergies.includes('ibuprofeno') || patientAllergies.includes('aspirina'))) ||
        (normCond === 'hipertension' && (patientDiseases.includes('hipertension') || patientDiseases.includes('presion alta') || patientDiseases.includes('hta')));

      if (hasMatch) {
        alerts.push({
          drug: drug.name,
          category: drug.category,
          severity: contra.severity, // 'CRITICAL' | 'WARNING'
          type: 'CONTRAINDICATION_ALLERGY',
          reason: contra.message,
          alternatives: drug.safeAlternatives
        });
      }
    });
  });

  return {
    isSafe: alerts.filter(a => a.severity === 'CRITICAL').length === 0,
    alerts,
    detectedDrugs: drugsToCheck
  };
}

/**
 * Muestra el modal de Alerta Farmacológica de Seguridad Clínica
 */
export function showClinicalSafetyModal(safetyResult, onProceed) {
  let modal = document.getElementById('clinicalSafetyModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'clinicalSafetyModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }

  const criticals = safetyResult.alerts.filter(a => a.severity === 'CRITICAL');
  const warnings = safetyResult.alerts.filter(a => a.severity === 'WARNING');

  modal.innerHTML = `
    <div class="modal-body" style="max-width:560px; border-top: 4px solid ${criticals.length > 0 ? '#ef4444' : '#f59e0b'};">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:38px; height:38px; border-radius:50%; background:${criticals.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}; display:flex; align-items:center; justify-content:center; color:${criticals.length > 0 ? '#ef4444' : '#f59e0b'}; font-size:1.2rem;">
            <i class="fas ${criticals.length > 0 ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i>
          </div>
          <div>
            <h3 style="margin:0; font-size:1.15rem; color:${criticals.length > 0 ? 'var(--danger)' : 'var(--warning)'};">
              ${criticals.length > 0 ? 'Alerta Crítica: Contraindicación Médica' : 'Advertencia Farmacológica'}
            </h3>
            <p class="muted" style="margin:2px 0 0; font-size:0.8rem;">Control Clínico de Seguridad del Paciente</p>
          </div>
        </div>
        <button id="closeSafetyModal" class="ghost"><i class="fas fa-times"></i></button>
      </div>

      <div style="margin-bottom:16px;">
        ${safetyResult.alerts.map(a => `
          <div style="background:${a.severity === 'CRITICAL' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'}; border:1px solid ${a.severity === 'CRITICAL' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}; border-radius:10px; padding:14px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <strong style="color:${a.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}; font-size:0.95rem;">
                <i class="fas fa-pills"></i> ${a.drug} (${a.category})
              </strong>
              <span class="badge ${a.severity === 'CRITICAL' ? 'cancelled' : 'pending'}">${a.severity === 'CRITICAL' ? 'PELIGRO' : 'PRECAUCIÓN'}</span>
            </div>
            <p style="margin:0 0 8px 0; font-size:0.87rem; line-height:1.4;">${a.reason}</p>
            ${a.alternatives && a.alternatives.length > 0 ? `
              <div style="background:var(--surface); padding:8px 12px; border-radius:6px; font-size:0.8rem;">
                <strong style="color:var(--success);"><i class="fas fa-check-circle"></i> Alternativas Seguras Sugeridas:</strong>
                <span style="color:var(--text); margin-left:6px;">${a.alternatives.join(' · ')}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
        <button id="btnCancelPrescription" class="ghost">Corregir Prescripción</button>
        ${criticals.length === 0 ? `
          <button id="btnProceedPrescription" class="primary" style="background:#f59e0b; border-color:#f59e0b;">Continuar bajo criterio médico</button>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  modal.querySelector('#closeSafetyModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#btnCancelPrescription')?.addEventListener('click', () => modal.classList.add('hidden'));

  modal.querySelector('#btnProceedPrescription')?.addEventListener('click', () => {
    modal.classList.add('hidden');
    if (onProceed) onProceed();
  });
}
