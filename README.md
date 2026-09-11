# 🏥 Consultorios.pro | Doctor2

> **Sistema SaaS Integral de Gestión Médica, Odontológica, Agenda de Turnos, Pacientes, Presupuestos, Inventario y WhatsApp Multicanal con Asistente de IA.**

Diseñado con una arquitectura moderna, rápida y ultra-ligera en **JavaScript ES Modules puro**, **Liquid Glass UI System (Vision OS)** y backend en **PHP 8.x REST API**.

---

## ✨ Características Principales

### 📅 1. Agenda de Turnos Inteligente
- **Vistas dinámicas**: Semana, Mes y vista detallada por día.
- **Panel divisor (Splitter) redimensionable** en tiempo real.
- **Filtrado por profesional** y estado de turno (*Confirmado, Reservado, Atendido, Reprogramado, Cancelado, Ausente*).
- **Gestión de feriados y días bloqueados** para evitar sobreturnos.
- **Impresión de planillas membretadas** por día, semana o mes.

### 👤 2. Ficha del Paciente & Historia Clínica Modular
- 📇 **Ficha Administrativa**: Datos demográficos, DNI, teléfono con enlace directo a WhatsApp, cobertura / obra social y número de afiliado.
- 📊 **Dashboard & KPIs del Paciente**: Histograma de visitas de los últimos 12 meses, promedio entre consultas y gráfico donut de progreso de tratamientos.
- 🩺 **Historia Clínica & Evoluciones**: Registro de motivo, diagnóstico, procedimiento, pieza dental (11-48), caras dentales (O, M, D, V, P, MOD), indicaciones y planes de tratamiento vinculados.
- 📷 **Fotos y Radiografías**: Subida de estudios clínicos con visor **Lightbox** interactivo.
- 🦷 **Odontograma FDI Interactivo**: Esquema para adultos y niños con coloreo por diagnóstico y desglose de intervenciones por pieza.
- 💵 **Presupuestos**: Confección con cálculo de descuentos, exportación a PDF y envío estructurado por WhatsApp.
- 💳 **Cuenta Corriente y Pagos**: Control de saldos, pagos parciales, formas de pago y emisión de comprobantes.

### 📦 3. Control de Stock e Inventario de Insumos
- Catálogo de insumos médicos/odontológicos con stock actual y stock mínimo.
- Alertas visuales de **Stock Bajo / Crítico**.
- Registro de **Entradas** (compras) y **Salidas** (uso en consultorio) con historial auditado.
- Filtro por categorías y cálculo del valor total del inventario.

### 💬 4. WhatsApp Business & Conectividad Multicanal
- **Conector QR (Baileys) & Meta Cloud API Oficial**: Integración directa para envío de recordatorios 24h antes y confirmaciones.
- **Asistente de IA**: Respuestas automáticas con control de pausa/reanudación por chat.
- **Chat Interno**: Comunicación en tiempo real entre médicos, secretaría y recepción.

### 📥 5. Importación / Exportación Masiva
- Importador interactivo **Drag & Drop** para archivos Excel (`.xlsx`, `.xls`) y `.csv` con mapeo automático de columnas y descarga de plantillas de ejemplo.
- Exportador a CSV con **BOM UTF-8** para compatibilidad 100% nativa con Microsoft Excel.

### 🎨 6. Diseño Visual Liquid Glass (Apple Vision Pro UI)
- Efecto de **vidrio esmerilado translúcido** (`backdrop-filter: blur(24px)`).
- Degradados de luz líquida ambiental (mesh orbs).
- 3 temas seleccionables desde **Apariencia**:
  - 🧊 **Liquid Glass (Luz / Frost)**
  - 🌌 **Cyber Glass (Nocturno Deep)**
  - 🌿 **Emerald Glass (Clínico Vital)**

---

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5 Semántico, CSS3 Modular (`liquid-glass.css`, `themes.css`, `styles.css`), Vanilla JavaScript (ES Modules).
- **Backend**: PHP 8.x (REST API sin dependencias pesadas).
- **Almacenamiento**: Motor universal dual (`api/db.php`) compatible con **JSON Data Store** (Zero-Config) y **SQLite**.
- **Iconografía**: FontAwesome 6.x.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/doctor2.git
cd doctor2
```

### 2. Iniciar servidor local (Zero-Config)
No requiere configurar bases de datos externas ni instalar Composer. Ejecutá con el servidor embebido de PHP:

```bash
php -S localhost:8000
```

Abrí tu navegador en: [http://localhost:8000](http://localhost:8000)

### 3. Credenciales de acceso predeterminadas
- **Usuario**: `admin`
- **Contraseña**: `admin123`

---

## 📂 Estructura del Proyecto

```text
├── index.html                    # Dashboard principal y contenedor de vistas
├── .gitignore                    # Reglas de exclusión para Git
├── README.md                     # Documentación general
│
├── css/
│   ├── styles.css                # Estilos base y layout
│   ├── themes.css                # Variables de temas
│   ├── liquid-glass.css          # Motor visual Liquid Glass / Vision OS
│   ├── patient-components.css    # Estilos de componentes clínicos
│   └── components/               # CSS modular (agenda, patients, inventory, etc.)
│
├── js/
│   ├── app.js                    # Coordinador principal de la app
│   └── modules/
│       ├── app-state.js          # Estado global reactivo
│       ├── app-utils.js          # Utilidades y apiFetch
│       ├── app-auth.js           # Sesión y autenticación
│       ├── app-navigation.js     # Control de vistas y sidebar
│       ├── app-calendar.js       # Agenda y vistas de turnos
│       ├── app-patients.js       # Padrón y ficha integral del paciente
│       ├── app-payments.js       # Cuenta corriente y cobros
│       ├── app-budget.js         # Presupuestos odontológicos
│       ├── patient-ficha.js      # Ficha administrativa del paciente
│       ├── historia-clinica.js   # Evoluciones y radiografías
│       ├── patient-charts.js     # Odontograma FDI y gráficos
│       ├── patient-export.js     # Generador de PDF y envíos WhatsApp
│       ├── import-export-manager.js # Importador/Exportador Excel
│       ├── app-inventory.js      # Control de stock
│       ├── app-professionals.js  # Cuerpo médico
│       ├── app-chat.js           # Bandeja de WhatsApp
│       ├── app-internal-chat.js  # Chat interno
│       ├── app-notifications.js  # Avisos del sistema
│       ├── app-analytics.js      # Estadísticas y métricas
│       ├── whatsapp-manager.js   # Conector QR y Meta API
│       └── meta-onboarding.js    # Asistente Meta Cloud API
│
└── api/
    ├── db.php                    # Capa de datos universal (JSON/SQLite)
    ├── auth.php                  # Endpoint de inicio de sesión
    ├── appointments.php          # Endpoint de turnos
    ├── patients.php              # Endpoint de pacientes y evoluciones
    ├── professionals.php         # Endpoint de profesionales
    ├── inventory.php             # Endpoint de insumos
    ├── notifications.php         # Endpoint de alertas
    ├── suscripcion.php           # Control de suscripciones
    └── galicia-nave.php          # Pasarela de pagos
```

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
