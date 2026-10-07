/**
 * supabase-client.js - Conector Universal Supabase PostgreSQL para Doctor2_Pro
 * Brinda persistencia en la nube en tiempo real para Pacientes, Historias Clínicas,
 * Odontogramas, Presupuestos y Citas.
 */

import { getSupabaseConfig, isSupabaseConfigured } from './supabase-config.js';

let supabaseClient = null;
let currentClientConfigKey = '';

/**
 * Obtiene o inicializa la instancia del cliente Supabase
 */
export async function getSupabase() {
  if (!isSupabaseConfigured()) return null;

  const cfg = getSupabaseConfig();
  const configKey = `${cfg.url}::${cfg.anonKey}`;

  if (supabaseClient && currentClientConfigKey === configKey) {
    return supabaseClient;
  }

  try {
    // Carga dinámica de la librería oficial de Supabase
    let createClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      createClient = window.supabase.createClient;
    } else {
      const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      createClient = module.createClient;
    }

    if (createClient) {
      supabaseClient = createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      currentClientConfigKey = configKey;
      return supabaseClient;
    }
  } catch (err) {
    console.error('Error al inicializar cliente Supabase:', err);
  }
  return null;
}

// ==============================================================================
// MAPEADORES DE DATOS (CamelCase <-> Snake_Case)
// ==============================================================================

export function mapPatientFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    hcNumber: row.hc_number || 'ND-0001',
    name: row.name || '',
    dni: row.dni || '',
    sex: row.sex || '',
    birthdate: row.birthdate || null,
    age: row.age !== null ? row.age : null,
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    occupation: row.occupation || '',
    emergencyName: row.emergency_name || '',
    emergencyPhone: row.emergency_phone || '',
    emergencyContact: row.emergency_contact || (row.emergency_name && row.emergency_phone ? `${row.emergency_name} (${row.emergency_phone})` : ''),
    representativeName: row.representative_name || '',
    representativeDni: row.representative_dni || '',
    health_insurance: row.health_insurance || '',
    affiliate_number: row.affiliate_number || '',
    allergies: row.allergies || '',
    notes: row.notes || '',
    assignedProfessionalId: row.assigned_professional_id || null,
    clinicalHistory: row.clinical_history || {},
    clinicalNotes: Array.isArray(row.clinical_notes) ? row.clinical_notes : [],
    treatmentPlans: Array.isArray(row.treatment_plans) ? row.treatment_plans : [],
    odontogramData: row.odontogram_data || { surfaces: [], teeth: [], recesion: [], movilidad: [], notes: '' },
    budgets: Array.isArray(row.budgets) ? row.budgets : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    status: row.status || 'active',
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function mapPatientToSupabase(patient) {
  const row = {
    name: patient.name,
    dni: patient.dni || '',
    sex: patient.sex || '',
    birthdate: patient.birthdate || null,
    age: patient.age !== undefined && patient.age !== null ? parseInt(patient.age, 10) : null,
    phone: patient.phone || '',
    email: patient.email || '',
    address: patient.address || '',
    occupation: patient.occupation || '',
    emergency_name: patient.emergencyName || '',
    emergency_phone: patient.emergencyPhone || '',
    emergency_contact: patient.emergencyContact || '',
    representative_name: patient.representativeName || '',
    representative_dni: patient.representativeDni || '',
    health_insurance: patient.health_insurance || '',
    affiliate_number: patient.affiliate_number || '',
    allergies: patient.allergies || '',
    notes: patient.notes || '',
    assigned_professional_id: patient.assignedProfessionalId || null,
    status: patient.status || 'active',
    updated_at: new Date().toISOString()
  };

  if (patient.id) row.id = patient.id;
  if (patient.hcNumber || patient.hc_number) row.hc_number = patient.hcNumber || patient.hc_number;
  if (patient.clinicalHistory !== undefined) row.clinical_history = patient.clinicalHistory;
  if (patient.clinicalNotes !== undefined) row.clinical_notes = patient.clinicalNotes;
  if (patient.treatmentPlans !== undefined) row.treatment_plans = patient.treatmentPlans;
  if (patient.odontogramData !== undefined) row.odontogram_data = patient.odontogramData;
  if (patient.budgets !== undefined) row.budgets = patient.budgets;
  if (patient.attachments !== undefined) row.attachments = patient.attachments;

  return row;
}

// ==============================================================================
// OPERACIONES CRUD DE PACIENTES
// ==============================================================================

export async function sbGetPatients(search = '') {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  let query = sb.from('patients').select('*').order('created_at', { ascending: false });
  if (search) {
    query = query.or(`name.ilike.%${search}%,dni.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapPatientFromSupabase);
}

export async function sbGetPatientById(id) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const { data, error } = await sb.from('patients').select('*').eq('id', id).single();
  if (error) throw error;
  return mapPatientFromSupabase(data);
}

export async function sbInsertPatient(patientData) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  // Calcular número de HC correlativo
  const { count } = await sb.from('patients').select('*', { count: 'exact', head: true });
  const nextSeq = (count || 0) + 1;
  const hcNumber = `ND-${String(nextSeq).padStart(4, '0')}`;

  const row = mapPatientToSupabase({
    ...patientData,
    hcNumber: patientData.hcNumber || hcNumber,
    id: patientData.id || `pat-${Math.random().toString(36).substring(2, 12)}`
  });

  const { data, error } = await sb.from('patients').insert(row).select().single();
  if (error) throw error;
  return mapPatientFromSupabase(data);
}

export async function sbUpdatePatient(id, updates) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const row = mapPatientToSupabase(updates);
  delete row.id; // No modificar clave primaria

  const { data, error } = await sb.from('patients').update(row).eq('id', id).select().single();
  if (error) throw error;
  return mapPatientFromSupabase(data);
}

export async function sbDeletePatient(id) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const { error } = await sb.from('patients').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ==============================================================================
// OPERACIONES DE HISTORIA CLÍNICA, ODONTOGRAMA Y PRESUPUESTOS
// ==============================================================================

export async function sbSaveClinicalNote(patientId, note) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const patient = await sbGetPatientById(patientId);
  const notes = Array.isArray(patient.clinicalNotes) ? [...patient.clinicalNotes] : [];
  notes.unshift({
    ...note,
    id: note.id || `note_${Date.now()}`
  });

  await sb.from('patients').update({
    clinical_notes: notes,
    updated_at: new Date().toISOString()
  }).eq('id', patientId);

  return notes;
}

export async function sbSaveFullClinicalHistory(patientId, clinicalHistory, clinicalNotes = null, treatmentPlans = null) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const updatePayload = {
    clinical_history: clinicalHistory,
    updated_at: new Date().toISOString()
  };

  if (clinicalNotes !== null) updatePayload.clinical_notes = clinicalNotes;
  if (treatmentPlans !== null) updatePayload.treatment_plans = treatmentPlans;

  const { error } = await sb.from('patients').update(updatePayload).eq('id', patientId);
  if (error) throw error;
  return true;
}

export async function sbSaveOdontogram(patientId, odontogramData) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const { error } = await sb.from('patients').update({
    odontogram_data: odontogramData,
    updated_at: new Date().toISOString()
  }).eq('id', patientId);

  if (error) throw error;
  return true;
}

export async function sbSaveBudget(patientId, budget) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const patient = await sbGetPatientById(patientId);
  const budgets = Array.isArray(patient.budgets) ? [...patient.budgets] : [];
  budgets.unshift({
    ...budget,
    id: budget.id || `bdg_${Date.now()}`
  });

  const { error } = await sb.from('patients').update({
    budgets,
    updated_at: new Date().toISOString()
  }).eq('id', patientId);

  if (error) throw error;
  return budgets;
}

// ==============================================================================
// OPERACIONES DE PROFESIONALES Y AGENDA (TURNOS)
// ==============================================================================

export async function sbGetProfessionals() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const { data, error } = await sb.from('professionals').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function sbGetAppointments(filters = {}) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  let query = sb.from('appointments').select('*').order('date').order('start_time');
  if (filters.date) query = query.eq('date', filters.date);
  if (filters.patientId) query = query.eq('patient_id', filters.patientId);
  if (filters.professionalId && filters.professionalId !== 'all') query = query.eq('professional_id', filters.professionalId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function sbSaveAppointment(appointmentData) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  if (appointmentData.id) {
    const { data, error } = await sb.from('appointments').update(appointmentData).eq('id', appointmentData.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const row = {
      ...appointmentData,
      id: `apt-${Math.random().toString(36).substring(2, 12)}`
    };
    const { data, error } = await sb.from('appointments').insert(row).select().single();
    if (error) throw error;
    return data;
  }
}

export async function sbDeleteAppointment(id) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  const { error } = await sb.from('appointments').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ==============================================================================
// ADAPTADOR UNIVERSAL API FETCH <-> SUPABASE
// Permite que todas las llamadas existentes de Doctor2 funcionen de inmediato
// ==============================================================================

export async function handleSupabaseApiFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const urlObj = new URL(url, window.location.href);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  const getBody = () => {
    if (!options.body) return {};
    return typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  };

  // 1. PACIENTES (api/patients.php)
  if (pathname.includes('patients.php')) {
    const id = searchParams.get('id') || searchParams.get('patientId');
    const action = searchParams.get('action');
    const search = searchParams.get('search') || '';

    if (method === 'GET') {
      if (action === 'get_attachments' && id) {
        const p = await sbGetPatientById(id);
        return { success: true, attachments: p?.attachments || [] };
      }
      if (id) {
        const p = await sbGetPatientById(id);
        if (!p) throw new Error('Paciente no encontrado');
        return { success: true, patient: p };
      }
      const patients = await sbGetPatients(search);
      return { success: true, patients };
    }

    if (method === 'POST') {
      const body = getBody();
      const bodyAction = body.action;

      if (bodyAction === 'save_budget') {
        const budgets = await sbSaveBudget(body.patientId, body.budget);
        return { success: true, budgets };
      }

      if (bodyAction === 'save_clinical_note') {
        const clinicalNotes = await sbSaveClinicalNote(body.patientId, body.note);
        return { success: true, clinicalNotes };
      }

      if (bodyAction === 'save_treatment_plans') {
        await sbUpdatePatient(body.patientId, { treatmentPlans: body.plans });
        return { success: true, treatmentPlans: body.plans };
      }

      if (bodyAction === 'save_attachment') {
        const p = await sbGetPatientById(body.patientId);
        const atts = Array.isArray(p.attachments) ? [...p.attachments] : [];
        atts.unshift(body.attachment);
        await sbUpdatePatient(body.patientId, { attachments: atts });
        return { success: true, attachments: atts };
      }

      if (bodyAction === 'delete_attachment') {
        const p = await sbGetPatientById(body.patientId);
        const atts = (p.attachments || []).filter(a => a.id !== body.attachmentId);
        await sbUpdatePatient(body.patientId, { attachments: atts });
        return { success: true, attachments: atts };
      }

      // Crear nuevo paciente
      const newPatient = await sbInsertPatient(body);
      return { success: true, patient: newPatient };
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = getBody();
      const targetId = body.id || id;
      if (!targetId) throw new Error('ID requerido');
      const updated = await sbUpdatePatient(targetId, body);
      return { success: true, patient: updated };
    }

    if (method === 'DELETE') {
      const targetId = searchParams.get('id') || id;
      if (!targetId) throw new Error('ID requerido');
      await sbDeletePatient(targetId);
      return { success: true };
    }
  }

  // 2. PROFESIONALES (api/professionals.php)
  if (pathname.includes('professionals.php')) {
    if (method === 'GET') {
      const profs = await sbGetProfessionals();
      return { success: true, professionals: profs };
    }
  }

  // 3. TURNOS Y CITAS (api/appointments.php)
  if (pathname.includes('appointments.php')) {
    if (method === 'GET') {
      const date = searchParams.get('date');
      const patientId = searchParams.get('patientId');
      const professionalId = searchParams.get('professionalId');
      const apts = await sbGetAppointments({ date, patientId, professionalId });
      return { success: true, appointments: apts };
    }

    if (method === 'POST') {
      const body = getBody();
      const saved = await sbSaveAppointment(body);
      return { success: true, appointment: saved };
    }

    if (method === 'DELETE') {
      const aptId = searchParams.get('id') || getBody().id;
      if (aptId) await sbDeleteAppointment(aptId);
      return { success: true };
    }
  }

  // Si no coincide con ninguna tabla interceptada, delegar al fetch regular
  throw new Error(`Endpoint ${pathname} no mapeado en Supabase adapter`);
}

export async function sbTestConnection(url, anonKey) {
  try {
    let createClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      createClient = window.supabase.createClient;
    } else {
      const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      createClient = module.createClient;
    }

    const testClient = createClient(url.trim().replace(/\/+$/, ''), anonKey.trim());
    const { data, error } = await testClient.from('patients').select('id').limit(1);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, count: data ? data.length : 0 };
  } catch (err) {
    return { success: false, error: err.message || 'No se pudo contactar a Supabase' };
  }
}


