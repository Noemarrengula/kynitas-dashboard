-- =============================================================================
-- SCHEMA AUXILIAR TABLE ORDERS (KDS)
-- =============================================================================
-- Colunas opcionais usadas pelo ecrã de cozinha (nome/nº da mesa) e pelo
-- fluxo de pagamento (payment_method, status 'paid').
-- Idempotente. Pode correr sem as colunas atuais existirem.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Expandir CHECK de status para aceitar 'paid' (usado pelas Mesas)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'paid', 'cancelled'));

-- Verificação
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;