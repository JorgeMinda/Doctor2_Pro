# 🚀 Guía de Puesta en Producción: Asistente WhatsApp con IA (Doctor2_Pro)

Esta guía te permite activar el **Asistente de WhatsApp con Inteligencia Artificial y Agendamiento 24/7** en tu proyecto de Supabase (`aihecmyzzchwfobquhky`) con **$0.00 de costo mensual**.

---

## 📋 Arquitectura
- **Motor Webhook:** Supabase Edge Function (`whatsapp-webhook`)
- **API WhatsApp:** Meta WhatsApp Cloud API Oficial (1.000 conversaciones/mes gratis)
- **Cerebro IA:** Google Gemini 1.5 Flash (Gratuito en Google AI Studio hasta 1.500 consultas/día)
- **Base de Datos:** PostgreSQL en Supabase (Doctores, Pacientes y Turnos)

---

## Paso 1: Obtener tu API Key Gratuita de Google Gemini (1 Minuto)

1. Ingresa a: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) con tu cuenta de Google.
2. Haz clic en **"Create API Key"** (Crear clave de API).
3. Copia tu clave (empieza con `AIzaSy...`).

---

## Paso 2: Crear tu Aplicación de WhatsApp en Meta for Developers

1. Ingresa a: [https://developers.facebook.com](https://developers.facebook.com) e inicia sesión con tu cuenta de Facebook.
2. Haz clic en **Mis Apps** &rarr; **Crear App**.
3. Selecciona el tipo de app: **Otro** &rarr; **Negocio** (Business).
4. Asígnale un nombre a tu app (ej: `NaniDent Asistente`).
5. En el panel de productos de la app, busca **WhatsApp** y haz clic en **Configurar** (Set up).
6. En la pestaña **Inicio rápido (API Setup)** verás:
   - **Identificador de número de teléfono (Phone number ID)**: (Copia este número).
   - **Token de acceso temporal**: (Para pruebas). Luego puedes generar el token permanente del sistema.

---

## Paso 3: Configurar las Variables Secretas en Supabase

En tu panel de Supabase:
👉 **[https://supabase.com/dashboard/project/aihecmyzzchwfobquhky/settings/vault](https://supabase.com/dashboard/project/aihecmyzzchwfobquhky/settings/vault)**  
(O en **Project Settings** &rarr; **Edge Functions** / **Secrets**):

Agrega estos 4 secretos:

| Nombre del Secreto | Valor |
| :--- | :--- |
| `META_VERIFY_TOKEN` | `nanident_token_seguro_2026` *(o el texto que tú elijas)* |
| `META_ACCESS_TOKEN` | Tu Token de acceso de Meta |
| `META_PHONE_NUMBER_ID` | Tu Phone number ID de Meta |
| `GEMINI_API_KEY` | Tu clave de Google Gemini (`AIzaSy...`) |

---

## Paso 4: Desplegar la Edge Function en Supabase

Puedes desplegar la función directamente con la CLI de Supabase:

```bash
# Iniciar sesión en Supabase CLI
npx supabase login

# Vincular tu proyecto
npx supabase link --project-ref aihecmyzzchwfobquhky

# Desplegar la función a la nube
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

---

## Paso 5: Conectar el Webhook en Meta for Developers

1. En tu panel de Meta for Developers &rarr; **WhatsApp** &rarr; **Configuración (Configuration)**.
2. En la sección **Webhook**, haz clic en **Editar (Edit)**:
   - **URL de devolución de llamada (Callback URL):**
     ```text
     https://aihecmyzzchwfobquhky.supabase.co/functions/v1/whatsapp-webhook
     ```
   - **Token de verificación:**
     ```text
     nanident_token_seguro_2026
     ```
3. Haz clic en **Verificar y Guardar**.
4. En **Campos del Webhook**, haz clic en **Administrar** y activa la casilla **`messages`**.

---

## 🎉 ¡Listo para recibir pacientes!

Ahora cualquier paciente que envíe un mensaje a tu número de WhatsApp será atendido en tiempo real por la Inteligencia Artificial, consultará a los doctores de tu consultorio y agendará citas directamente en tu agenda de Doctor2_Pro.
