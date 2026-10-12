# 🏥 Doctor2_Pro | Nani Dent

> **Sistema Integral de Gestión Clínica, Odontológica, Agenda Médica, Historia Clínica MSP (12 Secciones), Odontograma Interactivo, Presupuestos, Inventario y Centro Asistido de Recordatorios 24h por WhatsApp.**

Diseñado con una arquitectura moderna en **Vanilla JavaScript Modular (ESM)**, **Liquid Glass UI System (Vision OS)**, persistencia en la nube en tiempo real mediante **Supabase (PostgreSQL)** y respaldo transaccional local en **PHP 8.x**.

---

## ✨ Características Principales

### 🩺 1. Historia Clínica Oficial MSP (Normativa 12 Secciones)
Cumple con los estándares del Ministerio de Salud Pública del Ecuador (MSP) y el Formulario de Atención Odontológica:
- **Sec. 1 - 2:** Motivo de consulta y Enfermedad actual con escala visual análoga del dolor (**EVA 0-10**).
- **Sec. 3:** Antecedentes personales y patológicos con alertas críticas de bioseguridad (**Bifosfonatos**, Alergia a Penicilina, Anestésicos, Hemorragias, Diabetes, Hipertensión, etc.).
- **Sec. 4:** Signos vitales con semaforización clínica en vivo (Presión Arterial, FC, FR, Temperatura, SpO2, Talla, Peso e IMC).
- **Sec. 5:** Examen estomatognático interactivo de 10 regiones anatómicas (Normal / Patológico con observaciones).
- **Sec. 6:** Odontograma MSP inicial interactivo embebido.
- **Sec. 7 - 8:** Indicadores de salud bucal: Placa bacteriana, Cálculo, Gingivitis (**IHOS simplificado** con cálculo matemático automático) y evaluación de oclusión, periodonto y fluorosis.
- **Sec. 9:** Índices epidemiológicos **CPO-D** y **ceo-d** con sumatoria en vivo.
- **Sec. 10:** Planes de diagnóstico (Laboratorio, Biometría, Rayos X, Tomografía Cone Beam CBCT 3D, Interconsultas y Plan Educativo de Técnica de Cepillado).
- **Sec. 11:** Diagnósticos **CIE-10 OMS** con buscador predictivo, badges y clasificación Presuntivo (PRE) / Definitivo (DEF).
- **Sec. 12:** Historial de sesiones y evolución de tratamiento con prescripción farmacológica (receta médica) y firma digital con matrícula/código MSP del profesional tratante.
- **Galería Multimedia:** Carga de radiografías panorámicas, periapicales y fotos clínicas con visor **Lightbox** integrado.

### 🦷 2. Odontograma Vectorial Interactivo SVG
- Esquema dental anatómico de 32 piezas permanentes y 20 piezas temporales (deciduas).
- Simbología oficial: Caries (rojo), Obturación resina/amalgama (azul), Sellantes, Endodoncia / Tratamiento de conducto (línea central), Coronas/Prótesis, Exodoncia (cruz roja), e **Implantes osteointegrados** (insignia circular y tornillo reforzado).
- Control de superficies individuales (Vestibular, Lingual/Palatino, Mesial, Distal, Oclusal).
- Marcación de recesión gingival y movilidad dental (Grados I, II, III).
- Persistencia estructurada en JSONB en la nube.

### 📖 3. Catálogo Oficial CIE-10 OMS
- Base de datos integrada con más de 120 diagnósticos odontológicos de patología oral, endodoncia, periodoncia, cirugía maxilofacial y anomalías dentofaciales (K00 a K14 y Z01.2).
- Modal interactivo con filtrado por categorías y buscador predictivo instantáneo por código y descripción.
- Permite memorizar e integrar diagnósticos personalizados dinámicamente.

### 📜 4. Certificados Médicos Oficiales MSP / NaniDent
- Generación de certificados membretados con unicódigo MSP, matrícula profesional Senescyt y datos de filiación.
- 3 modalidades: Certificado de Atención/Asistencia, Certificado de Reposo Médico Absoluto y Justificativo Laboral/Académico.
- Algoritmo de conversión automática de números y años a letras en español (ej: `2 (DOS) días`, fechas Desde/Hasta).
- Vista previa e impresión limpia con formato oficial listo para exportar a PDF.

### 📅 5. Agenda de Turnos & Calendario Inteligente
- **Vistas dinámicas**: Semana y Mes con panel divisor (Splitter) redimensionable en tiempo real.
- **Filtro por profesional** y estados del turno: *Reservado, Confirmado, En Atención, Atendido, Cancelado y Ausente*.
- **Gestión de feriados y bloqueos de agenda** generales o por rangos horarios.
- **Bloqueo por Emergencia:** Permite al especialista bloquear su agenda por imprevistos médicos cancelando/reprogramando los turnos afectados.
- **Impresión de planillas membretadas** de turnos diarios.

### 📲 6. Centro de Recordatorios 24h & Chat WhatsApp Asistido
- **Bandeja de Recordatorios 24h:** Botón inteligente en la barra de la Agenda con contador en vivo que lista todos los pacientes citados para el día siguiente.
- **Envío con 1 clic:** Redacta automáticamente el mensaje personalizado con fecha, hora, doctor y clínica, abriendo WhatsApp Web o la App oficial sin riesgo de baneo por parte de Meta.
- **Actualización automática de estado:** Al enviar el recordatorio, el turno pasa de `Pendiente` a `Confirmado` en la base de datos.
- **Chat WhatsApp vinculado a Pacientes Reales:** Conectado directamente a la base de datos en Supabase con plantillas clínicas rápidas (Confirmación de cita, Recordatorio, Indicaciones post-operatorias, Ubicación y Datos de pago).

### 💰 7. Presupuestos y Planes de Tratamiento
- Elaboración de presupuestos con múltiples prestaciones y piezas asociadas.
- Descuentos porcentuales o en monto fijo con recálculo financiero en tiempo real.
- Estados de presupuesto (Borrador, Presentado, Aprobado, Facturado).
- Impresión en formato comprobante profesional para entrega al paciente.

### 📦 8. Control de Stock e Inventario
- Catálogo de insumos médicos/odontológicos con stock actual y stock mínimo.
- Alertas visuales de **Stock Bajo / Crítico** y productos por vencer.
- Valoración total del inventario de la clínica y categorización dinámica.

### 🎨 9. Interfaz Visual Liquid Glass (Vision OS)
- Efecto de vidrio esmerilado translúcido (`backdrop-filter: blur(24px)`).
- 3 temas seleccionables: *Liquid Glass (Luz / Frost)*, *Cyber Glass (Nocturno Deep)* y *Emerald Glass (Clínico Vital)*.
- Adaptabilidad 100% responsiva para pantallas de escritorio, tablets y celulares.
- Compatibilidad **PWA (Progressive Web App)** con instalación nativa en PC, Android e iOS mediante Service Worker.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES Modules nativos), HTML5 Semántico, CSS3 Modular (`styles.css`, `liquid-glass.css`, `patient-components.css`) |
| **Base de Datos Cloud** | **Supabase Cloud (PostgreSQL)** con almacenamiento JSONB, índices GIN de texto y soporte Realtime |
| **Backend Local Fallback** | PHP 8.x REST API con motor transaccional ACID (`api/db.php`) y almacenamiento JSON Data Store |
| **PWA / Offline** | Service Worker (`sw.js`) con almacenamiento en caché inteligente |
| **Comunicaciones** | WhatsApp Protocol Universal (`wa.me` Deep Linking asistido) y microservicio Baileys opcional |
| **Iconografía** | FontAwesome 6.x |

---

## 🚀 Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/JorgeMinda/Doctor2_Pro.git
cd Doctor2_Pro
```

### 2. Configuración de Base de Datos (Supabase Cloud)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En el menú **SQL Editor** de Supabase, copia y pega el contenido del archivo [`supabase_schema.sql`](supabase_schema.sql) y presiona **RUN**.
3. En la aplicación Doctor2, ve al menú lateral &rarr; **Base de Datos**, ingresa tu **Project URL** y tu **anon public key**, y haz clic en **"Guardar y Conectar"**.

*(Las credenciales predeterminadas para el proyecto oficial ya vienen configuradas en `js/modules/supabase-config.js`).*

### 3. Ejecutar localmente con PHP (Opcional para modo local)

Puedes iniciar el servidor local con:
```bash
iniciar.bat
```
O manualmente con PHP:
```bash
php -S localhost:8000
```
Abre en tu navegador: [http://localhost:8000](http://localhost:8000)

**Credenciales iniciales:**
- **Usuario:** `admin`
- **Contraseña:** `admin123`

---

## 📂 Estructura del Código

```text
├── index.html                    # Dashboard principal y contenedor de vistas
├── manifest.json                 # Manifiesto PWA para instalación móvil y PC
├── sw.js                         # Service Worker para caché offline
├── supabase_schema.sql           # Esquema completo de tablas, índices y RLS para Supabase
├── iniciar.bat                   # Script de inicio rápido del servidor local
│
├── css/
│   ├── styles.css                # Estilos base y layout
│   ├── themes.css                # Variables de color y temas visuales
│   ├── liquid-glass.css          # Motor visual Liquid Glass / Vision OS
│   ├── patient-components.css    # Estilos de componentes de historia clínica
│   └── components/               # CSS modular (agenda, patients, inventory, login, etc.)
│
├── js/
│   ├── app.js                    # Orquestador principal de la aplicación
│   └── modules/
│       ├── app-state.js          # Estado centralizado reactivo
│       ├── app-utils.js          # Utilidades, cálculo de edad y enrutador apiFetch
│       ├── supabase-config.js    # Configuración de credenciales de Supabase
│       ├── supabase-client.js    # Conector universal y adaptador CRUD para Supabase
│       ├── supabase-ui.js        # Controlador del modal de configuración de base de datos
│       ├── app-patients.js       # Padrón y gestión de pacientes
│       ├── patient-ficha.js      # Ficha médica y datos demográficos
│       ├── historia-clinica.js   # Historia Clínica Oficial MSP (12 Secciones)
│       ├── cie10-catalogue.js     # Catálogo oficial odontológico CIE-10 OMS
│       ├── app-odontogram.js     # Odontograma vectorial interactivo SVG
│       ├── patient-certificate.js# Generador oficial de certificados médicos y de reposo
│       ├── patient-charts.js     # Dashboard y estadísticas clínicas del paciente
│       ├── app-calendar.js       # Agenda semanal y mensual
│       ├── app-appointments.js   # Gestión y modal de turnos
│       ├── app-reminders.js      # Centro de recordatorios 24h por WhatsApp
│       ├── app-blocked-days.js   # Gestión de feriados y bloqueos de emergencia
│       ├── app-professionals.js  # Gestión de médicos y especialistas
│       ├── app-budget.js         # Presupuestos odontológicos
│       ├── app-treasury.js       # Control de tesorería y caja
│       ├── app-inventory.js      # Control de stock e insumos
│       ├── app-chat.js           # Chat de WhatsApp conectado a pacientes reales
│       ├── whatsapp-manager.js   # Gestor de conexiones y formateo telefónico
│       ├── app-ai-copilot.js     # Copiloto clínico inteligente
│       └── drug-interactions.js  # Verificador de interacciones farmacológicas
│
└── api/
    ├── db.php                    # Capa de datos transaccional ACID local (PHP/JSON)
    ├── patients.php              # Endpoint REST de pacientes
    ├── appointments.php          # Endpoint REST de turnos
    ├── professionals.php         # Endpoint REST de profesionales
    ├── inventory.php             # Endpoint REST de inventario
    ├── treasury.php              # Endpoint REST de tesorería
    └── blocked-days.php          # Endpoint REST de bloqueos de agenda
```

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
