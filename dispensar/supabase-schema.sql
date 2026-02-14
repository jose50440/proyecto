-- ============================================================
-- IHSS - Esquema Supabase (PostgreSQL)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Extensión UUID (por si se usa gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------
-- 1. prod_patients
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni TEXT,
    "nAfiliacion" TEXT,
    nombre TEXT,
    telefono TEXT,
    familiar TEXT,
    "telefonoFamiliar" TEXT,
    direccion TEXT,
    "descripcionMunicipio" TEXT,
    "tipoAfiliado" TEXT,
    "agenteContactCenter" TEXT,
    "usuarioRevisionAsignacion" TEXT,
    "creationSource" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prod_patients_dni ON prod_patients(dni);
CREATE INDEX IF NOT EXISTS idx_prod_patients_created_at ON prod_patients("createdAt");

-- ----------------------------------------
-- 2. prod_kits (payload JSONB para todos los campos del kit)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patientId" UUID REFERENCES prod_patients(id) ON DELETE SET NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_kits_patient ON prod_kits("patientId");
CREATE INDEX IF NOT EXISTS idx_prod_kits_fecha_armado ON prod_kits((payload->>'fechaArmado'));

-- ----------------------------------------
-- 3. prod_users
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT,
    role TEXT DEFAULT 'digitador',
    departamento TEXT,
    "rolesDepartamento" JSONB DEFAULT '[]',
    "restriccionHorario" BOOLEAN DEFAULT false,
    "diasPermitidos" JSONB DEFAULT '{}',
    "horaInicio" TEXT,
    "horaFin" TEXT,
    telefono TEXT
);

CREATE INDEX IF NOT EXISTS idx_prod_users_username ON prod_users(username);

-- ----------------------------------------
-- 4. prod_medicines
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    codigo TEXT DEFAULT '',
    tipo TEXT DEFAULT 'no cronico'
);

-- ----------------------------------------
-- 5. prod_contacts
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT
);

-- ----------------------------------------
-- 6. prod_patient_reports (manual + excel_batch)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_patient_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    added JSONB,
    "addedCount" INT,
    "updatedCount" INT,
    at TIMESTAMPTZ DEFAULT now(),
    by TEXT,
    "patientId" UUID,
    dni TEXT,
    nombre TEXT,
    telefono TEXT,
    direccion TEXT,
    "descripcionMunicipio" TEXT,
    "tipoAfiliado" TEXT
);

CREATE INDEX IF NOT EXISTS idx_prod_patient_reports_type ON prod_patient_reports(type);
CREATE INDEX IF NOT EXISTS idx_prod_patient_reports_at ON prod_patient_reports(at);

-- ----------------------------------------
-- 7. prod_templates
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ
);

-- ----------------------------------------
-- 8. prod_templates_ruta (id = 'current' o version)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS prod_templates_ruta (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL DEFAULT '{}',
    "savedAt" TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------
-- 9. _health (ping)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS _health (
    id TEXT PRIMARY KEY,
    ping TIMESTAMPTZ DEFAULT now()
);
INSERT INTO _health (id) VALUES ('ping') ON CONFLICT (id) DO UPDATE SET ping = now();

-- ----------------------------------------
-- RLS: permitir todo para servicio anon (ajustar con auth después)
-- En producción deberías restringir por auth.uid() o API key.
-- ----------------------------------------
ALTER TABLE prod_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod_patient_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod_templates_ruta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all prod_patients" ON prod_patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all prod_kits" ON prod_kits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all prod_users" ON prod_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all prod_medicines" ON prod_medicines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all prod_contacts" ON prod_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all prod_patient_reports" ON prod_patient_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all prod_templates" ON prod_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all prod_templates_ruta" ON prod_templates_ruta FOR ALL USING (true) WITH CHECK (true);

-- Realtime: en Dashboard → Database → Replication → añade tablas si necesitas suscripciones en vivo.
