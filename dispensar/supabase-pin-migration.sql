-- Migración: Recordar usuario con PIN de 4 dígitos
-- Ejecutar en Supabase SQL Editor para agregar la columna pin_hash a prod_users
-- Fecha: 2025

-- Agregar columna pin_hash (hash SHA-256 del PIN + username, nunca texto plano)
ALTER TABLE prod_users 
ADD COLUMN IF NOT EXISTS pin_hash TEXT;

COMMENT ON COLUMN prod_users.pin_hash IS 'Hash del PIN de 4 dígitos para inicio rápido (SHA-256 con username como salt). Null = usuario sin PIN configurado.';
