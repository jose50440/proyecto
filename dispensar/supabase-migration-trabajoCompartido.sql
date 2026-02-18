-- Migración: añadir columna trabajoCompartido a prod_users
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

ALTER TABLE prod_users
ADD COLUMN IF NOT EXISTS "trabajoCompartido" BOOLEAN DEFAULT false;
