-- =====================================================
-- ALINHAMENTO DE SCHEMA DESCOBERTO NA AUDITORIA
-- (ver docs/AUDITORIA-API-PAYLOADS.md)
-- Garante as colunas que a app escreve e que estão em
-- falta na DB (verificar-schema-vs-app.sql). Idempotente.
-- Tipos copiados dos SQLs originais (supabase-tables-enhanced,
-- supabase-printer-config, multitenant-complete-schema).
-- =====================================================

-- CustomerModal.tsx grava metadata (gender) ao criar cliente
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS metadata JSONB;

-- supabase-tables-enhanced.sql (mesas avancadas): campos em falta
ALTER TABLE public.sales  ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE public.sales  ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE public.sales  ADD COLUMN IF NOT EXISTS table_customer_name TEXT;

-- multitenant schema: mesa referencia a ordem activa
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS current_order_id UUID;

-- supabase-printer-config.sql: print_jobs campos em falta
ALTER TABLE public.print_jobs      ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE public.print_jobs      ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.print_jobs      ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP;

-- supabase-printer-config.sql: printer_settings campos em falta
-- (sem NOT NULL para insercoes futuras; a app envia sempre valores)
ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS printer_name TEXT;
ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS printer_type TEXT;
ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS char_width INTEGER;
ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMP;

-- Indices de apoio (idempotentes)
CREATE INDEX IF NOT EXISTS idx_sales_table_number ON public.sales(table_number);
CREATE INDEX IF NOT EXISTS idx_sales_table_customer ON public.sales(table_customer_name);
CREATE INDEX IF NOT EXISTS idx_printer_settings_default ON public.printer_settings(business_id, is_default) WHERE is_default = true;