# Informe de Avances - Doctor2 Pro

## Índice
1. [Estructura del Proyecto](#estructura-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Tecnologías Utilizadas](#tecnologías-utilizadas)
4. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
5. [Actualizaciones y Commits Recientes](#actualizaciones-y-commits-recientes)
6. [Próximos Pasos](#próximos-pasos)

---

## Estructura del Proyecto

```
Doctor2_Pro/
├── index.html                     # Página principal con Razor CSS/ESM
├── package.json                   # Dependencias npm (Whatsapp Baileys, Express, CORS, Pino)
│
├── api/                          # PHP Backend API
│   ├── appointments.php           # CRUD de turnos
│   ├── blocked-days.php          # Gestión de bloqueos/feriados
│   ├── patients.php              # CRUD de pacientes
│   ├── professionals.php         # CRUD de profesionales
│   ├── db.php                   # Conexión TiDB Cloud (SSL)
│   └── auth.php                 # Autenticación JWT
│
├── js/                           # Frontend JavaScript (ESM)
│   ├── app.js                   # Punto de entrada - bootstrapping
│   ├── modules/                 # Módulos especializados
│   │   ├── app-state.js         # Estado global reactivo
│   │   ├── app-utils.js         # Helpers (el, formatDate, showToast, resolvePatientPhone)
│   │   ├── app-modal.js         # Modales de turnos
│   │   ├── app-calendar.js      # Agenda mensual/semanas/día
│   │   ├── app-block-alert.js   # Detección bloques + toast aviso
│   │   ├── app-blocked-days.js  # Gestión de bloqueos vía API
│   │   ├── whatsapp-manager.js  # Integración WhatsApp (sendWhatsAppReport, sendWhatsAppReminder)
│   │   ├── app-reminders.js     # Recordatorios automáticos 24h
│   │   └── ... (25+ módulos)
│   └── ...
│
├── css/                          # Estilos CSS nativos (sin Tailwind)
│   ├── styles.css              # Variables, utilidades, badges
│   ├── themes.css              # Modo claro/oscuro
│   ├── components/
│   │   ├── agenda.css          # Componentes de agenda (slot chips, timeline, modal)
│   │   ├── block-alert.css     # Toast avisos bloqueo
│   │   └── ...
│   └── liquid-glass.css
│
├── wa-server.js                 # Servidor Node.js Baileys para WhatsApp
│
└── ... (patients, odontogram, inventory, etc.)
```

---

## Arquitectura

### Frontend
- **Framework**: Vanilla JavaScript puro con ES Modules
- **UI Framework**: Razor CSS (custom, sin Tailwind/Flex) → `styles.css`, `themes.css`, componentes en `css/components/`
- **Componentes clave**:
  - Modal de Turno (Radix-inspired): formulario compacto con slots de horario interactivos
  - Agenda Mensual/Semanal: vista tipo calendario con drag & drop
  - Timeline Diario: lista de turnos con botones Iniciar/Completar/Editar

### Backend
- **API**: PHP 8.x con JSON
- **Base de Datos**: TiDB Cloud (MySQL compatible, SSL)
- **Autenticación**: JWT vía `api/auth.php`
- **Endpoints principales**:
  - `/api/appointments.php` - Turnos
  - `/api/blocked-days.php` - Bloqueos
  - `/api/patients.php` - Pacientes
  - `/api/professionals.php` - Profesionales

### WhatsApp Integration
- **Servidor**: Node.js + Baileys (`wa-server.js`)
- **Mensajes**: Click-to-chat vía `wa.me` + envío directo cuando está conectado
- **Recordatorios**: Modal de recordatorios con botón "Enviar Recordatorio"

---

## Tecnologías Utilizadas

| Categoría | Tecnología | Uso |
|-----------|------------|-----|
| Frontend | JavaScript ES Modules | Módulos con import/export |
| Estilos | CSS puro (sin frameworks) | Razón CSS, flex/grid |
| Backend | PHP 8.x | API REST JSON |
| Base de Datos | TiDB Cloud | MySQL compatible con SSL |
| WhatsApp | Baileys (Node.js) | API WhatsApp Business |
| Autenticación | JWT | Autenticación stateless |
| Estado | Reactive State | Objeto `state` observable |

---

## Estado Actual del Proyecto

### Funcionalidades Implementadas
- ✅ Agenda médica con vista mensual/semanal/día
- ✅ Gestión de turnos (crear, editar, cancelar, reprogramar)
- ✅ Bloqueos de horario (día completo, por profesional, por horario)
- ✅ Recordatorios automáticos 24h
- ✅ Notificaciones WhatsApp (click-to-chat + directo)
- ✅ Slots de horario con duración (30/45/60/90 min)
- ✅ Timeline diario con botones Iniciar/Completar
- ✅ Validación de bloqueos al iniciar citas
- ✅ Avisos de bloqueo con envío WhatsApp editable

### Componentes Clave Desarrollados
1. **Selector de Duración** (`slotDurationSelector`): Botones 30/45/60/90 min con resaltado teal
2. **Celdas de Slot** (`slot-chip-btn`): Grid de 6 columnas, colores dependiendo estado (disponible/ocupado/past/selected/selected-range)
3. **Badge de Rango** (`selectedTimeBadge`): Muestra `19:30 – 20:15 hs` según duración
4. **Toast de Bloqueo** (`block-alert.css`): Panel emergente con mensaje editable y botón WhatsApp Directo
5. **Tarjetas Bloqueadas** (`.slot--blocked`): Visualización de citas dentro de rango bloqueado

### Módulos Principales
| Módulo | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `app-state.js` | ~70 | Estado global compartido |
| `app-modal.js` | ~1350 | Formulario y lógica de turnos |
| `app-calendar.js` | ~577 | Agenda y renderizado timeline |
| `app-block-alert.js` | ~115 | Detección de conflicto y toast |
| `whatsapp-manager.js` | ~310 | Normalización y envío WhatsApp |
| `app-utils.js` | ~250 | Helpers (resolvePatientPhone, showToast, etc.) |

---

## Actualizaciones y Commits Recientes

### Commit `d773511` (Actual)
```
feat: autocompletar observaciones desde notes del paciente
```
- Al seleccionar un paciente en el modal, el campo de observaciones se completa automáticamente con el campo `notes` de la ficha del paciente

### Commit `f67bf9d`
- Agregado `resolvePatientPhone()` en app-utils.js - resuelve teléfono de cita → ficha paciente
- `normalizeWhatsAppPhone()` maneja Ecuador (+593): cel 9 dígitos, fijo 8 dígitos, prefijo 0/00
- Backfill teléfono paciente al guardar cita
- Recordatorios usan resolver y comparison `['confirmed','confirmado']`

### Commit `a2cd082`
```
feat(whatsapp): sendWhatsAppReminder click-to-chat, toast con envio directo y campos faltantes del modal (tel/email/costo/estado/obs)
```
- Nuevos campos modal: `#formPhone`, `#formEmail`, `#formCost`, `#formStatus`, `#formObservation`
- `sendWhatsAppReminder()` - click-to-chat con mensaje editable
- CSS `.radix-form-row` y `.radix-textarea` para layout 2-columnas responsive

### Commit `cacbd68`
```
feat(block): validacion de bloqueo en startApt, tarjetas Cancelado x Cierre en timeline y toast WhatsApp editable
```
- `checkIsTimeBlocked()` en `window.startApt()` - valida bloqueo al iniciar
- Tarjetas bloqueadas con badge "Cancelado x Cierre" y botón "Avisar"
- Eliminado listener duplicado `#saveBlockedBtn`

### Commit `ec43b80`
```
feat(slots): rango contiguo por duracion, badge inicio-fin, control de duracion con CSS nativo
```
- Rango contiguo de horarios según duración elegida (30/45/60/90 min)
- Badge `#selectedTimeBadge` muestra rango `19:30 – 20:15 hs`
- CSS nativo sin Tailwind para duración select

---

## Próximos Pasos

1. **Mejorar loading states**: spinner en llamadas API
2. **Cache de citas**: IndexedDB para offline
3. **Notificaciones push**: Service Workers + Web Push
4. **Optimizar images**: WebP + lazy loading
5. **Tests automatizados**: Jest para lógica de negocio
6. **Documentar API**: OpenAPI/Swagger
7. **Mejorar accesibilidad**: ARIA live regions, teclado

---

*Documento generado: Noviembre 2026*
*Versión: v4.5*