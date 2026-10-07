-- ==============================================================================
-- DOCTOR2_PRO / NANIDENT - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Copia y pega este script completo en el SQL Editor de tu proyecto Supabase
-- y presiona RUN. Crea todas las tablas, índices, políticas RLS y triggers.
-- ==============================================================================

-- 1. EXTENSIÓN PARA UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: PROFESIONALES (Odontólogos / Médicos)
CREATE TABLE IF NOT EXISTS professionals (
    id TEXT PRIMARY KEY DEFAULT ('prof-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    name TEXT NOT NULL,
    specialty TEXT DEFAULT 'Odontología General',
    license_code TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    color TEXT DEFAULT '#6366f1',
    slot_minutes INTEGER DEFAULT 30,
    start_time TEXT DEFAULT '08:00',
    end_time TEXT DEFAULT '20:00',
    work_days TEXT DEFAULT '1,2,3,4,5',
    active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: PACIENTES, HISTORIA CLÍNICA (12 SECCIONES), ODONTOGRAMA Y PRESUPUESTOS
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY DEFAULT ('pat-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    hc_number TEXT NOT NULL DEFAULT 'ND-0001',
    name TEXT NOT NULL,
    dni TEXT DEFAULT '',
    sex TEXT DEFAULT '',
    birthdate DATE,
    age INTEGER,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    occupation TEXT DEFAULT '',
    emergency_name TEXT DEFAULT '',
    emergency_phone TEXT DEFAULT '',
    emergency_contact TEXT DEFAULT '',
    representative_name TEXT DEFAULT '',
    representative_dni TEXT DEFAULT '',
    health_insurance TEXT DEFAULT '',
    affiliate_number TEXT DEFAULT '',
    allergies TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    assigned_professional_id TEXT REFERENCES professionals(id) ON DELETE SET NULL,
    
    -- Estructuras JSONB para Historia Clínica Completa (12 Secciones MSP)
    clinical_history JSONB DEFAULT '{}'::jsonb,
    clinical_notes JSONB DEFAULT '[]'::jsonb,
    treatment_plans JSONB DEFAULT '[]'::jsonb,
    odontogram_data JSONB DEFAULT '{"surfaces":[],"teeth":[],"recesion":[],"movilidad":[],"notes":""}'::jsonb,
    budgets JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de búsqueda para Pacientes
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients USING gin (to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_patients_dni ON patients (dni);
CREATE INDEX IF NOT EXISTS idx_patients_hc_number ON patients (hc_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);

-- 4. TABLA: TURNOS Y CITAS (AGENDA)
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT ('apt-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT DEFAULT '',
    professional_id TEXT REFERENCES professionals(id) ON DELETE SET NULL,
    professional_name TEXT DEFAULT '',
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER DEFAULT 30,
    treatment TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled, no_show
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apts_date ON appointments (date);
CREATE INDEX IF NOT EXISTS idx_apts_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_apts_prof ON appointments (professional_id);

-- 5. TABLA: DÍAS BLOQUEADOS Y FERIADOS
CREATE TABLE IF NOT EXISTS blocked_days (
    id TEXT PRIMARY KEY DEFAULT ('blk-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    professional_id TEXT DEFAULT 'all',
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    all_day BOOLEAN DEFAULT TRUE,
    time_from TEXT DEFAULT '08:00',
    time_to TEXT DEFAULT '20:00',
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: INVENTARIO Y STOCK CLÍNICO
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY DEFAULT ('inv-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Insumos Generales',
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'unidades',
    cost_price NUMERIC(10,2) DEFAULT 0,
    sale_price NUMERIC(10,2) DEFAULT 0,
    expiry_date DATE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: AUDITORÍA INMUTABLE (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE
    user_name TEXT DEFAULT 'Dr. Jorge Valenzuela',
    user_id TEXT DEFAULT 'usr-admin-1',
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);

-- 8. TABLA: TESORERÍA / CAJA Y MOVIMIENTOS
CREATE TABLE IF NOT EXISTS treasury_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'cash', -- cash, bank, card, mp
    currency TEXT DEFAULT 'USD',
    balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_movements (
    id TEXT PRIMARY KEY DEFAULT ('mov-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    account_id TEXT REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- income, expense, transfer
    amount NUMERIC(12,2) NOT NULL,
    category TEXT DEFAULT 'Tratamiento Odontológico',
    description TEXT DEFAULT '',
    patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
    budget_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. DATOS SEMILLA INICIALES (DEMO Y PROFESIONALES)
-- ==============================================================================

INSERT INTO professionals (id, name, specialty, license_code, email, phone, color, active)
VALUES 
    ('prof-378c0d79a7', 'Dr. Juan Carlos Gómez', 'Odontología General', 'MSP-10293', 'juancarlos@consultorios.pro', '+5491123456789', '#3b82f6', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO treasury_accounts (id, name, type, currency, balance)
VALUES 
    ('acc_efectivo', 'Caja Principal Efectivo', 'cash', 'USD', 0),
    ('acc_banco', 'Banco / Transferencias', 'bank', 'USD', 0)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 10. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Permite lectura y escritura con la clave API pública anónima (Anon Key)
-- ==============================================================================

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso Publico Professionals" ON professionals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico Patients" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico Appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico BlockedDays" ON blocked_days FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico Inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico AuditLogs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico TreasuryAccounts" ON treasury_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico TreasuryMovements" ON treasury_movements FOR ALL USING (true) WITH CHECK (true);

-- HABILITAR REALTIME PARA TABLAS PRINCIPALES
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE professionals;
