-- =============================================================================
-- TURNOS / FECHO DE CAIXA (Ponto 3)
-- =============================================================================
-- Tabela shifts: abertura e fecho de turno por caixa, com contagem por método
-- de pagamento (numerário, M-Pesa, e-Mola, cartão) e reconciliação.
-- Idempotente. Executar no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL,
  cashier_name TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(12,2) DEFAULT 0,
  counted_cash NUMERIC(12,2) DEFAULT 0,
  expected_mpesa NUMERIC(12,2) DEFAULT 0,
  counted_mpesa NUMERIC(12,2) DEFAULT 0,
  expected_emola NUMERIC(12,2) DEFAULT 0,
  counted_emola NUMERIC(12,2) DEFAULT 0,
  expected_card NUMERIC(12,2) DEFAULT 0,
  counted_card NUMERIC(12,2) DEFAULT 0,
  expected_total NUMERIC(12,2) DEFAULT 0,
  counted_total NUMERIC(12,2) DEFAULT 0,
  difference NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_business ON public.shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier ON public.shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON public.shifts(opened_at DESC);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business shifts" ON public.shifts;
CREATE POLICY "Users can view their business shifts" ON public.shifts
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business shifts" ON public.shifts;
CREATE POLICY "Users can manage their business shifts" ON public.shifts
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.touch_shifts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_touch_shifts_updated_at ON public.shifts;
CREATE TRIGGER trigger_touch_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_shifts_updated_at();

-- Verificação
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'shifts'
ORDER BY ordinal_position;