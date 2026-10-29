/**
 * supabase-client.js - Conector Universal Supabase PostgreSQL para Doctor2_Pro
 * Brinda persistencia en la nube en tiempo real para Pacientes, Historias Clínicas,
 * Odontogramas, Presupuestos y Citas.
 */

import { getSupabaseConfig, isSupabaseConfigured } from './supabase-config.js';

let supabaseClient = null;
let currentClientConfigKey = '';
let supabaseInitPromise = null;

/**
 * Obtiene o inicializa la instancia única del cliente Supabase (Singleton Promise Lock)
 * Evita la inicialización concurrente de múltiples GoTrueClients en el mismo contexto.
 */
export async function getSupabase() {
  if (!isSupabaseConfigured()) return null;

  const cfg = getSupabaseConfig();
  const configKey = `${cfg.url}::${cfg.anonKey}`;

  // Si ya está listo con la misma configuración, devolverlo directamente
  if (supabaseClient && currentClientConfigKey === configKey) {
    return supabaseClient;
  }

  // Si hay una inicialización en curso para la misma configuración, reutilizar la misma promesa
  if (supabaseInitPromise && currentClientConfigKey === configKey) {
    return supabaseInitPromise;
  }

  currentClientConfigKey = configKey;
  supabaseInitPromise = (async () => {
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
        return supabaseClient;
      }
    } catch (err) {
      console.error('Error al inicializar cliente Supabase:', err);
    } finally {
      supabaseInitPromise = null;
    }
    return null;
  })();

  return supabaseInitPromise;
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

function normalizeAppointmentStatus(status) {
  if (!status) return 'Reservado';
  const s = String(status).toLowerCase();
  if (s === 'scheduled' || s === 'reservado') return 'Reservado';
  if (s === 'confirmed' || s === 'confirmado') return 'Confirmado';
  if (s === 'en curso' || s === 'in_progress' || s === 'in-progress') return 'En curso';
  if (s === 'cancelled' || s === 'cancelado') return 'Cancelado';
  if (s === 'completed' || s === 'atendido' || s === 'done') return 'Atendido';
  if (s === 'rescheduled' || s === 'reprogramado') return 'Reprogramado';
  if (s === 'absent' || s === 'ausente') return 'Ausente';
  return status;
}

export function mapAppointmentFromSupabase(row) {
  if (!row) return null;

  let meta = {};
  let cleanNotes = row.notes || '';
  if (typeof cleanNotes === 'string' && cleanNotes.includes('<!--META:')) {
    try {
      const match = cleanNotes.match(/<!--META:([\s\S]*?)-->/);
      if (match && match[1]) {
        meta = JSON.parse(match[1]);
        cleanNotes = cleanNotes.replace(/<!--META:[\s\S]*?-->/g, '').trim();
      }
    } catch (e) {
      console.warn('Error al parsear metadatos de cita:', e);
    }
  }

  const cost = (row.cost !== undefined && row.cost !== null) ? Number(row.cost) : (meta.cost !== undefined && meta.cost !== null ? Number(meta.cost) : 0);
  const observation = row.observation || meta.observation || cleanNotes || '';
  const patientEmail = row.patient_email || meta.patient_email || '';
  const payments = Array.isArray(row.payments) ? row.payments : (Array.isArray(meta.payments) ? meta.payments : []);
  const time = row.start_time || row.time || '08:00';

  return {
    id: row.id,
    patient_id: row.patient_id || null,
    patientId: row.patient_id || null,
    patient_name: row.patient_name || '',
    patientName: row.patient_name || '',
    patient_phone: row.patient_phone || '',
    patientPhone: row.patient_phone || '',
    patient_email: patientEmail,
    patientEmail: patientEmail,
    professional_id: row.professional_id || null,
    professionalId: row.professional_id || null,
    professional_name: row.professional_name || '',
    professionalName: row.professional_name || '',
    date: row.date,
    time: time,
    start_time: time,
    end_time: row.end_time || '',
    duration: row.duration || 30,
    reason: row.reason || row.treatment || '',
    treatment: row.treatment || row.reason || '',
    status: normalizeAppointmentStatus(row.status),
    cost: cost,
    observation: observation,
    notes: cleanNotes,
    payments: payments,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function mapAppointmentToSupabase(apt) {
  if (!apt) return null;

  const startTime = apt.time || apt.start_time || '08:00';
  const duration = parseInt(apt.duration, 10) || 30;

  const parts = (startTime || '08:00').split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const endMinutes = h * 60 + m + duration;
  const endH = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');
  const endTime = `${endH}:${endM}`;

  const cost = apt.cost !== undefined && apt.cost !== null ? parseFloat(apt.cost) || 0 : 0;
  const observation = (apt.observation !== undefined && apt.observation !== null ? apt.observation : (apt.notes || '')).toString();
  const patientEmail = (apt.patient_email || apt.patientEmail || '').toString().trim();
  const payments = Array.isArray(apt.payments) ? apt.payments : [];

  const meta = {
    cost,
    observation,
    patient_email: patientEmail,
    payments
  };

  const cleanObs = observation.replace(/<!--META:[\s\S]*?-->/g, '').trim();
  const notesWithMeta = cleanObs ? `${cleanObs}\n<!--META:${JSON.stringify(meta)}-->` : `<!--META:${JSON.stringify(meta)}-->`;

  let profId = apt.professional_id || apt.professionalId || null;
  let profName = apt.professional_name || apt.professionalName || '';
  if (typeof profId === 'string' && profId.trim() === '') profId = null;

  let patientId = apt.patient_id || apt.patientId || null;
  if (typeof patientId === 'string' && patientId.trim() === '') patientId = null;

  const row = {
    patient_name: (apt.patient_name || apt.patientName || 'Paciente').trim(),
    patient_phone: (apt.patient_phone || apt.patientPhone || '').trim(),
    date: apt.date,
    start_time: startTime,
    end_time: endTime,
    duration: duration,
    treatment: (apt.treatment || apt.reason || '').trim(),
    reason: (apt.reason || apt.treatment || 'Consulta').trim(),
    status: apt.status || 'Reservado',
    notes: notesWithMeta,
    updated_at: new Date().toISOString()
  };

  if (apt.id) row.id = apt.id;
  if (patientId) row.patient_id = patientId;
  if (profId) row.professional_id = profId;
  if (profName) row.professional_name = profName;

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
  const patient = mapPatientFromSupabase(data);
  if (patient) {
    try {
      const apts = await sbGetAppointments({ patientId: id });
      patient.appointments = apts || [];
    } catch (e) {
      patient.appointments = [];
    }
  }
  return patient;
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
  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  if (filters.month) {
    const parts = String(filters.month).split('-');
    const yNum = parseInt(parts[0], 10) || new Date().getFullYear();
    const mNum = parseInt(parts[1], 10) || 1;
    const lastDay = new Date(yNum, mNum, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');
    query = query.gte('date', `${filters.month}-01`).lte('date', `${filters.month}-${lastDayStr}`);
  }
  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId);
  }
  const prof = filters.professionalId || filters.professional;
  if (prof && prof !== 'all') {
    query = query.or(`professional_id.eq.${prof},professional_name.eq.${prof}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAppointmentFromSupabase);
}

export async function sbSaveAppointment(appointmentData) {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no está configurado');

  if (appointmentData.id) {
    // Si es actualización, fusionamos con el turno existente para soportar PATCH parcial
    const { data: existing } = await sb.from('appointments').select('*').eq('id', appointmentData.id).maybeSingle();
    const existingMapped = existing ? mapAppointmentFromSupabase(existing) : {};

    // Si se envía un nuevo horario, fecha o duración, limpiar los campos de tiempo viejos para que se recalculen
    if (appointmentData.time || appointmentData.start_time || appointmentData.date || appointmentData.duration) {
      delete existingMapped.start_time;
      delete existingMapped.end_time;
      delete existingMapped.time;
    }

    const merged = { ...existingMapped, ...appointmentData };

    const row = mapAppointmentToSupabase(merged);
    delete row.id; // No modificar clave primaria

    const { data, error } = await sb.from('appointments').update(row).eq('id', appointmentData.id).select().single();
    if (error) throw error;
    return mapAppointmentFromSupabase(data);
  } else {
    const row = mapAppointmentToSupabase(appointmentData);
    row.id = `apt-${Math.random().toString(36).substring(2, 12)}`;
    const { data, error } = await sb.from('appointments').insert(row).select().single();
    if (error) throw error;
    return mapAppointmentFromSupabase(data);
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
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase no está configurado');

    if (method === 'GET') {
      const profs = await sbGetProfessionals();
      return { success: true, professionals: profs };
    }

    if (method === 'POST') {
      const body = getBody();
      const row = { ...body, id: body.id || `prof-${Math.random().toString(36).substring(2, 12)}` };
      const { data, error } = await sb.from('professionals').insert(row).select().single();
      if (error) throw error;
      return { success: true, professional: data };
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = getBody();
      const targetId = body.id || searchParams.get('id');
      const updates = { ...body };
      delete updates.id;
      const { data, error } = await sb.from('professionals').update(updates).eq('id', targetId).select().single();
      if (error) throw error;
      return { success: true, professional: data };
    }

    if (method === 'DELETE') {
      const targetId = searchParams.get('id') || getBody().id;
      const { error } = await sb.from('professionals').delete().eq('id', targetId);
      if (error) throw error;
      return { success: true };
    }
  }

  // 3. TURNOS Y CITAS (api/appointments.php o api/agenda.php)
  if (pathname.includes('appointments.php') || pathname.includes('agenda.php')) {
    if (method === 'GET') {
      const month = searchParams.get('month');
      const date = searchParams.get('date');
      const patientId = searchParams.get('patientId') || searchParams.get('patient_id');
      const professionalId = searchParams.get('professionalId') || searchParams.get('professional') || searchParams.get('professional_id');
      const apts = await sbGetAppointments({ month, date, patientId, professionalId });
      return { success: true, appointments: apts };
    }

    if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
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

  // 4. DÍAS BLOQUEADOS Y FERIADOS (api/blocked-days.php)
  if (pathname.includes('blocked-days.php')) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase no está configurado');

    if (method === 'GET') {
      const { data, error } = await sb.from('blocked_days').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, blocked_days: data || [] };
    }

    if (method === 'POST') {
      const body = getBody();
      const row = { ...body, id: body.id || `blk-${Math.random().toString(36).substring(2, 12)}` };
      const { data, error } = await sb.from('blocked_days').insert(row).select().single();
      if (error) throw error;
      return { success: true, blocked_day: data };
    }

    if (method === 'DELETE') {
      const blkId = searchParams.get('id') || getBody().id;
      const { error } = await sb.from('blocked_days').delete().eq('id', blkId);
      if (error) throw error;
      return { success: true };
    }
  }

  // 5. INVENTARIO (api/inventory.php)
  if (pathname.includes('inventory.php')) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase no está configurado');

    if (method === 'GET') {
      const { data, error } = await sb.from('inventory').select('*').order('name');
      if (error) throw error;
      const items = data || [];
      const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
      return { success: true, items, categories };
    }

    if (method === 'POST') {
      const body = getBody();
      const row = { ...body, id: body.id || `inv-${Math.random().toString(36).substring(2, 12)}` };
      const { data, error } = await sb.from('inventory').insert(row).select().single();
      if (error) throw error;
      return { success: true, item: data };
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = getBody();
      const targetId = body.id || searchParams.get('id');
      const updates = { ...body };
      delete updates.id;
      const { data, error } = await sb.from('inventory').update(updates).eq('id', targetId).select().single();
      if (error) throw error;
      return { success: true, item: data };
    }

    if (method === 'DELETE') {
      const targetId = searchParams.get('id') || getBody().id;
      const { error } = await sb.from('inventory').delete().eq('id', targetId);
      if (error) throw error;
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


