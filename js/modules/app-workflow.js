/**
 * app-workflow.js - Motor de Flujos Clínicos Automatizados Doctor2
 * Orquesta llamadas secuenciales a APIs para "Finalizar Consulta" en un solo clic.
 */

import { state, api } from './app-state.js';
import { el, showToast, apiFetch } from './app-utils.js';

/**
 * FLUJO CLÍNICO: Finalizar Consulta
 * Secuencia: Guardar evolución → Descontar insumos → Generar recibo → Enviar WhatsApp
 * @param {object} options - Opciones del flujo
 * @param {string} options.patientId - ID del paciente
 * @param {string} options.patientName - Nombre del paciente
 * @param {string} options.cost - Costo de la consulta
 * @param {string[]} options.usedItems - Array de IDs de insumos usados
 * @param {string} options.observations - Observaciones clínicas
 */
export async function finishConsultation(options = {}) {
  const {
    patientId = state.selectedPatient?.id || '',
    patientName = state.selectedPatient?.name || '',
    cost = 0,
    usedItems = [],
    observations = ''
  } = options;

  if (!patientId) {
    showToast('⚠️ No hay paciente seleccionado', 'error');
    return false;
  }

  showToast('🔄 Ejecutando flujo de finalización de consulta...', 'info');

  try {
    // Paso 1: Guardar evolución clínica en paciente
    await saveClinicalEvolution(patientId, observations);

    // Paso 2: Descontar insumos usados del inventario
    await deductInventoryItems(usedItems, patientId);

    // Paso 3: Generar recibo/pago en tesorería
    await recordPayment(patientId, cost, patientName);

    // Paso 4: Enviar resumen por WhatsApp
    await sendConsultationSummary(patientName, cost, observations);

    showToast('✅ Consulta finalizada y registrado completamente', 'success');
    return true;

  } catch (error) {
    console.error('❌ Error en flujo de consulta:', error);
    showToast('❌ Error al finalizar consulta. Revisar consola.', 'error');
    // Aún así, mostramos parcialmente lo que se logró
    showToast('⚠️ Flujo parcialmente completado', 'warning');
    return false;
  }
}

/**
 * Paso 1: Guardar evolución clínica en el ficha del paciente
 */
async function saveClinicalEvolution(patientId, observations) {
  const evolutionData = {
    id: 'evo-' + Date.now(),
    timestamp: new Date().toISOString(),
    type: 'clinical_evolution',
    observations: observations || 'Consulta finalizada',
    recordedBy: state.user?.name || 'Dr. Admin'
  };

  // Usar API existente de pacientes
  const formData = new FormData();
  formData.append('action', 'add_evolution');
  formData.append('patient_id', patientId);
  formData.append('evolution', JSON.stringify(evolutionData));

  try {
    const response = await fetch(api.patients, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Error guardando evolución');
    console.log('✅ Evolución guardada:', evolutionData.id);
    return true;
  } catch (error) {
    console.error('❌ Error guardando evolución:', error);
    throw error;
  }
}

/**
 * Paso 2: Descontar insumos usados del inventario
 */
async function deductInventoryItems(usedItemIds, patientId) {
  if (!usedItemIds || usedItemIds.length === 0) {
    console.log('ℹ️ No hay insumos para descontar');
    return true;
  }

  for (const itemId of usedItemIds) {
    // Buscar el insumo en el state local primero
    const item = state.inventory?.find(i => i.id === itemId);
    if (!item) {
      // Buscar en API
      try {
        const response = await fetch(`${api.inventory}?id=${itemId}`);
        const data = await response.json();
        if (data && data.length > 0) {
          item = data[0];
        }
      } catch (e) {
        console.warn('⚠️ No se pudo buscar insumo:', itemId);
        continue;
      }
    }

    if (item) {
      // Descontar stock
      const newStock = Math.max(0, (item.stock || 0) - 1);
      await apiFetch('inventory', 'update', {
        id: itemId,
        stock: newStock
      });

      // Registrar movimiento de stock (salida)
      await apiFetch('inventory', 'insert', {
        id: 'mov-' + Date.now(),
        type: 'salida',
        item_id: itemId,
        item_name: item.name,
        quantity: 1,
        patient_id: patientId,
        notes: 'Uso en consulta clínica automatizada'
      });

      console.log(`✅ Insumo descontado: ${item.name} (stock: ${item.stock} → ${newStock})`);
    }
  }

  return true;
}

/**
 * Paso 3: Generar recibo/pago en tesorería
 */
async function recordPayment(patientId, cost, patientName) {
  if (cost <= 0) {
    console.log('ℹ️ Sin costo para registrar');
    return true;
  }

  const paymentData = {
    id: 'pay-' + Date.now(),
    patient_id: patientId,
    patient_name: patientName || 'Paciente',
    amount: cost,
    type: 'consultation',
    concept: 'Consulta clínica',
    date: new Date().toISOString(),
    payment_method: 'Efectivo', // Default, se podría preguntar
    status: 'completed',
    registered_by: state.user?.name || 'Dr. Admin'
  };

  try {
    const response = await fetch(api.treasury, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'add_movement',
        movement: paymentData
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Error registrando pago');
    console.log('✅ Pago registrado:', paymentData.id, `- $${cost}`);
    return true;
  } catch (error) {
    console.error('❌ Error registrando pago:', error);
    throw error;
  }
}

/**
 * Paso 4: Enviar resumen por WhatsApp
 */
async function sendConsultationSummary(patientName, cost, observations) {
  if (!state.user?.phone) {
    console.log('ℹ️ No hay número de WhatsApp del usuario');
    return true;
  }

  const message = `🩺 <b>Consulta Finalizada</b>\n\n`;
  message += `<b>Paciente:</b> ${patientName || 'Paciente'}\n`;
  message += `<b>Costo:</b> $${cost || 0}\n`;
  if (observations) {
    message += `<b>Observaciones:</b> ${observations}\n`;
  }
  message += `\n— Generado automáticamente por Doctor2 Pro`;

  try {
    const response = await fetch(`${api.galiciaNave}?action=send_whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: state.user?.phone,
        message: message
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ WhatsApp enviado exitosamente');
      showToast('📱 Resumen enviado por WhatsApp', 'success');
    } else {
      console.warn('⚠️ Error enviando WhatsApp:', result.error);
    }
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error);
  }
}

// Exponer función global para botón HTML
window.finishConsultation = finishConsultation;

/**
 * Inicializar botón de flujo en la UI
 * Se llama desde patient-ficha.js o history-clinica.js
 */
export function initFinishConsultationButton() {
  const btn = el('finishConsultationBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const patient = state.selectedPatient;
      if (!patient) {
        showToast('⚠️ Seleccione un paciente primero', 'error');
        return;
      }

      // Recolectar insumos usados (podría venir de un selector en la UI)
      const usedItems = []; // TODO: obtener de UI local

      finishConsultation({
        patientId: patient.id,
        patientName: patient.name,
        cost: patient.cost || 0,
        usedItems,
        observations: patient.notes || ''
      });
    });
  }
}