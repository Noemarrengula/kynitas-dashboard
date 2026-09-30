-- =====================================================
-- ALINHAMENTO DE SCHEMA DESCOBERTO NA AUDITORIA
-- (ver docs/AUDITORIA-API-PAYLOADS.md)
-- Garante as colunas que a app escreve e que não estão
-- definidas nos ficheiros de schema. Idempotente.
-- =====================================================

-- CustomerModal.tsx grava metadata (gender) ao criar cliente
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS metadata JSONB;