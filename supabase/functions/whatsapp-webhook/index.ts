/**
 * supabase/functions/whatsapp-webhook/index.ts
 * ==============================================================================
 * Webhook Oficial de Meta WhatsApp Cloud API + Inteligencia Artificial (Gemini)
 * para Doctor2_Pro / Nani Dent
 * ==============================================================================
 * Funcionalidades:
 * 1. Verificación automática del Webhook de Meta (GET challenge)
 * 2. Recepción de mensajes de WhatsApp de pacientes reales en tiempo real (POST)
 * 3. Consulta de doctores y citas disponibles en la base de datos de Supabase
 * 4. Procesamiento con Google Gemini 1.5 Flash (100% Gratuito en Google AI Studio)
 * 5. Detección y agendamiento automático de citas en la tabla 'appointments'
 * 6. Envío de respuesta oficial de vuelta a WhatsApp vía Meta Graph API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Variables de Entorno (Configuradas en Supabase Secrets)
const META_VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") || "nanident_token_seguro_2026";
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN") || "";
const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. VERIFICACIÓN DEL WEBHOOK DE META (Método GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
      console.log("✅ Webhook verificado exitosamente por Meta!");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Token de verificación inválido", { status: 403 });
  }

  // 2. RECEPCIÓN DE MENSAJES DE WHATSAPP (Método POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();

      // Validar si el webhook contiene un mensaje real (descartar eventos de entrega/leído)
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];

      if (!message || message.type !== "text") {
        return new Response(JSON.stringify({ status: "ignored" }), { status: 200 });
      }

      const fromPhone = message.from; // Número del paciente (Ej: 593991234567)
      const userText = message.text?.body || "";
      const profileName = change?.contacts?.[0]?.profile?.name || "Paciente";

      console.log(`📩 Mensaje recibido de ${profileName} (+${fromPhone}): "${userText}"`);

      // Marcar mensaje como leído en WhatsApp (opcional pero profesional)
      markMessageAsRead(message.id).catch(() => {});

      // 3. CONSULTAR BASE DE DATOS (Doctores y Disponibilidad de Citas)
      const clinicContext = await getClinicContext(fromPhone, profileName);

      // 4. GENERAR RESPUESTA CON IA (Google Gemini 1.5 Flash)
      const aiResponse = await generateAIResponse(userText, profileName, clinicContext);

      // 5. SI LA IA DETERMINÓ AGENDAR UN TURNO, INSERTARLO EN SUPABASE
      await handleBookingIfRequested(aiResponse.bookingData, fromPhone, profileName);

      // 6. ENVIAR RESPUESTA DE VUELTA A WHATSAPP
      await sendWhatsAppTextMessage(fromPhone, aiResponse.cleanReply);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      console.error("❌ Error procesando mensaje de WhatsApp:", err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Método no permitido", { status: 405 });
});

// ==============================================================================
// FUNCIONES AUXILIARES DE IA Y BASE DE DATOS
// ==============================================================================

async function getClinicContext(phone: string, name: string) {
  // Buscar o crear paciente
  let { data: patient } = await supabase
    .from("patients")
    .select("id, name, hc_number")
    .eq("phone", phone)
    .single();

  if (!patient) {
    const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
    const nextSeq = (count || 0) + 1;
    const hcNumber = `ND-${String(nextSeq).padStart(4, "0")}`;

    const { data: newPatient } = await supabase
      .from("patients")
      .insert({
        name: name,
        phone: phone,
        hc_number: hcNumber,
        notes: "Registrado automáticamente por el Asistente IA de WhatsApp"
      })
      .select()
      .single();

    patient = newPatient;
  }

  // Obtener profesionales activos
  const { data: professionals } = await supabase
    .from("professionals")
    .select("id, name, specialty, start_time, end_time, work_days")
    .eq("active", 1);

  // Obtener citas de los próximos 3 días para saber qué está ocupado
  const todayStr = new Date().toISOString().slice(0, 10);
  const futureStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: bookedAppointments } = await supabase
    .from("appointments")
    .select("date, start_time, professional_name, status")
    .gte("date", todayStr)
    .lte("date", futureStr)
    .neq("status", "cancelled");

  return {
    patient,
    professionals: professionals || [],
    bookedAppointments: bookedAppointments || [],
    todayDate: todayStr
  };
}

async function generateAIResponse(userText: string, patientName: string, context: any) {
  const profsList = context.professionals
    .map((p: any) => `- *${p.name}* (${p.specialty || "Odontología General"}), Horario: ${p.start_time || "08:00"} a ${p.end_time || "20:00"}`)
    .join("\n");

  const bookedList = context.bookedAppointments
    .map((a: any) => `- ${a.date} a las ${a.start_time} con ${a.professional_name}`)
    .join("\n");

  const systemPrompt = `Eres el asistente virtual con Inteligencia Artificial de la clínica odontológica *Nani Dent*.
Tu misión es atender a los pacientes de forma cordial, empática, clara y profesional por WhatsApp.

FECHA DE HOY: ${context.todayDate}
PACIENTE CON EL QUE HABLAS: ${patientName}

DOCTORES DISPONIBLES:
${profsList || "- Dr. Juan Carlos Gómez (Odontología General)"}

TURNOS YA OCUPADOS (NO OFRECER ESTOS HORARIOS):
${bookedList || "Ninguno en los próximos días, disponibilidad abierta"}

INSTRUCCIONES Y REGLAS:
1. Responde de forma concisa y adecuada para WhatsApp (usa emojis moderados como 🦷, 📅, ✨).
2. Si el paciente pregunta por horarios o desea una cita, ofrécele 2 opciones de horarios disponibles con uno de los doctores.
3. Si el paciente confirma claramente una fecha, hora y doctor específico (ej: "Sí, me queda bien mañana a las 10:00"), confirma su cita con entusiasmo e INCLUYE AL FINAL DE TU RESPUESTA la siguiente etiqueta oculta para que el sistema cree la cita en la base de datos:
   [BOOKING: date=YYYY-MM-DD, time=HH:MM, doctor=Nombre del Doctor]
4. NUNCA des diagnósticos médicos complejos ni recetes fármacos.
5. Ante dolores agudos o emergencias, indícales acudir de urgencia al consultorio.`;

  // Llamada a Google Gemini 1.5 Flash (API Oficial de Google)
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const geminiBody = {
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\nMENSAJE DEL PACIENTE: "${userText}"` }] }
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 500
    }
  };

  const res = await fetch(geminiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody)
  });

  const data = await res.json();
  const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "¡Hola! Gracias por comunicarte con Nani Dent. Con mucho gusto te ayudamos con turnos y consultas. ¿En qué podemos servirte hoy?";

  // Detectar si la IA incluyó una etiqueta de reserva [BOOKING: date=..., time=..., doctor=...]
  let bookingData: any = null;
  const bookingMatch = rawReply.match(/\[BOOKING:\s*date=([^,]+),\s*time=([^,]+),\s*doctor=([^\]]+)\]/i);

  if (bookingMatch) {
    bookingData = {
      date: bookingMatch[1].trim(),
      time: bookingMatch[2].trim(),
      doctor: bookingMatch[3].trim()
    };
  }

  // Limpiar la etiqueta de la respuesta visible al paciente
  const cleanReply = rawReply.replace(/\[BOOKING:[^\]]+\]/gi, "").trim();

  return { cleanReply, bookingData };
}

async function handleBookingIfRequested(bookingData: any, patientPhone: string, patientName: string) {
  if (!bookingData) return;

  try {
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("phone", patientPhone)
      .single();

    await supabase.from("appointments").insert({
      id: `apt-ia-${Math.random().toString(36).substring(2, 10)}`,
      patient_id: patient?.id || null,
      patient_name: patientName,
      patient_phone: patientPhone,
      professional_name: bookingData.doctor,
      date: bookingData.date,
      start_time: bookingData.time,
      end_time: calculateEndTime(bookingData.time),
      treatment: "Cita agendada por Asistente IA WhatsApp",
      status: "scheduled"
    });

    console.log(`🎉 ¡Cita agendada automáticamente por IA para ${patientName} el ${bookingData.date} a las ${bookingData.time}!`);
  } catch (e) {
    console.error("Error al registrar cita automática:", e);
  }
}

function calculateEndTime(startTime: string) {
  const [h, m] = startTime.split(":").map(Number);
  const totalM = h * 60 + m + 30; // +30 minutos por defecto
  const endH = String(Math.floor(totalM / 60)).padStart(2, "0");
  const endM = String(totalM % 60).padStart(2, "0");
  return `${endH}:${endM}`;
}

async function sendWhatsAppTextMessage(toPhone: string, text: string) {
  const url = `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhone.replace(/\D/g, ""),
    type: "text",
    text: { body: text }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json();
    console.error("❌ Error enviando mensaje por Meta API:", errData);
  } else {
    console.log(`📤 Respuesta enviada por WhatsApp a +${toPhone}`);
  }
}

async function markMessageAsRead(messageId: string) {
  const url = `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId
    })
  });
}
