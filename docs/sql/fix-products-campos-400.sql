-- =====================================================
-- CORREÇÃO 400 PGRST204 ao criar produto em Stock
--   "Could not find the '<coluna>' column of 'products'"
-- A app cria produtos a enviar: name, category, price, stock,
-- cost_price, internal_id, type, recipe, image, iva_rate,
-- fracionavel, preco_dose, doses_por_garrafa, estimated_cost,
-- daily_stock, business_id.
-- Se alguma destas colunas não existir na tabela, o INSERT
-- devolve HTTP 400. Este script garante todas elas (idempotente).
-- =====================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name            TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category        TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price           NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price      NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock           NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS internal_id     TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type            TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS recipe          JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image           TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS iva_rate        DECIMAL(5,2) DEFAULT 16.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fracionavel     BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preco_dose      NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS doses_por_garrafa INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS estimated_cost  NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS daily_stock     NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id     UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- cost_price não deve bloquear criar sem preço de custo
ALTER TABLE public.products ALTER COLUMN cost_price DROP NOT NULL;

-- Índices (idempotentes)
CREATE INDEX IF NOT EXISTS idx_products_business_id  ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business     ON public.products(business_id, category);
CREATE INDEX IF NOT EXISTS idx_products_type         ON public.products(type);
CREATE INDEX IF NOT EXISTS idx_products_internal_id  ON public.products(business_id, internal_id) WHERE internal_id IS NOT NULL;