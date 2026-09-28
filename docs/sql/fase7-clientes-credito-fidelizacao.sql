-- ============================================================================
-- FASE 07 — CLIENTES + CRÉDITO + FIDELIZAÇÃO + COBRANÇAS
-- Idempotente. Executar no Supabase SQL Editor (após fase6-compras-perdas.sql).
-- Consolida o domínio de clientes/crédito/fidelização SEM criar um sistema
-- paralelo: reutiliza as tabelas em uso (customers, credit_transactions,
-- loyalty_transactions, sales.customer_id) e os RPCs que o app já chama.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) CAMPOS ADICIONAIS
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS nuit TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_nuit ON public.customers(nuit);

DO $$ BEGIN
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Referência externa em transações de crédito (ex.: ref. de transferência/nota)
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS reference TEXT;

-- ---------------------------------------------------------------------------
-- 2) CASH MOVEMENTS — MOVIMENTOS FINANCEIROS EXTRA-VENDA
-- ---------------------------------------------------------------------------
-- Não existia qualquer registo de "movimento financeiro" para pagamentos de
-- dívida. Esta tabela é o diário que liga um pagamento de crédito à caixa,
-- permitindo à reconciliação de turno esperar o valor por método.
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('credit_payment', 'income', 'expense', 'adjustment')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'emola', 'card', 'transfer')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_business ON public.cash_movements(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_reference ON public.cash_movements(reference_id);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view business cash movements" ON public.cash_movements;
CREATE POLICY "User can view business cash movements" ON public.cash_movements
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "User can create business cash movements" ON public.cash_movements;
CREATE POLICY "User can create business cash movements" ON public.cash_movements
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3) RPC: REGISTAR PAGAMENTO DE DÍVIDA
--    - valida valor/método
--    - regista credit_transactions (payment) + atualiza saldo
--    - regista cash_movements (INTEGRAÇÃO COM CAIXA)
--    - audita
--    Assinatura original preservada (novos parâmetros com DEFAULT).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_credit_payment(
  p_business_id UUID,
  p_customer_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_payment_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer RECORD;
  v_transaction_id UUID;
  v_new_balance DECIMAL;
  v_ts TIMESTAMPTZ;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Valor inválido');
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cash', 'mpesa', 'emola', 'card', 'transfer') THEN
    RETURN json_build_object('success', false, 'error', 'Método de pagamento inválido');
  END IF;

  SELECT * INTO v_customer FROM public.customers
  WHERE id = p_customer_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  IF p_amount > v_customer.current_balance THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Valor excede dívida atual',
      'current_balance', v_customer.current_balance
    );
  END IF;

  v_new_balance := v_customer.current_balance - p_amount;
  v_ts := COALESCE(p_payment_date, NOW());

  INSERT INTO public.credit_transactions (
    business_id,
    customer_id,
    type,
    amount,
    balance_before,
    balance_after,
    payment_method,
    description,
    reference,
    created_by,
    created_at
  )
  VALUES (
    p_business_id,
    p_customer_id,
    'payment',
    p_amount,
    v_customer.current_balance,
    v_new_balance,
    p_payment_method,
    COALESCE(p_description, 'Pagamento de dívida'),
    p_reference,
    auth.uid(),
    v_ts
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.customers
  SET current_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_customer_id;

  -- INTEGRAÇÃO COM CAIXA: movimento financeiro por método
  INSERT INTO public.cash_movements (
    business_id,
    user_id,
    user_name,
    type,
    payment_method,
    amount,
    reference_type,
    reference_id,
    description,
    created_at
  )
  VALUES (
    p_business_id,
    auth.uid(),
    COALESCE(NULLIF(auth.jwt() ->> 'name', ''), auth.jwt() ->> 'email', 'Utilizador'),
    'credit_payment',
    p_payment_method,
    p_amount,
    'credit_transaction',
    v_transaction_id,
    COALESCE(p_description, 'Pagamento de dívida'),
    v_ts
  );

  -- Auditoria (nunca pode bloquear o pagamento)
  BEGIN
    INSERT INTO public.audit_logs (
      business_id, user_id, user_name, action, entity, entity_id, details
    ) VALUES (
      p_business_id,
      auth.uid(),
      COALESCE(NULLIF(auth.jwt() ->> 'name', ''), auth.jwt() ->> 'email', 'Utilizador'),
      'payment', 'credits', v_transaction_id::TEXT,
      jsonb_build_object(
        'customer_id', p_customer_id,
        'amount', p_amount,
        'payment_method', p_payment_method,
        'reference', p_reference,
        'new_balance', v_new_balance
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'paid_amount', p_amount,
    'reference', p_reference
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC: VENDA A CRÉDITO
--    Valida total, mantém regra de limite existente e audita a operação.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_credit_sale(
  p_business_id UUID,
  p_customer_id UUID,
  p_items JSONB,
  p_total DECIMAL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_customer RECORD;
  v_sale_id TEXT;
  v_transaction_id UUID;
  v_new_balance DECIMAL;
BEGIN
  IF p_total IS NULL OR p_total <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Valor inválido');
  END IF;

  SELECT * INTO v_customer FROM public.customers
  WHERE id = p_customer_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  IF v_customer.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Cliente bloqueado ou inativo');
  END IF;

  v_new_balance := v_customer.current_balance + p_total;
  IF v_new_balance > v_customer.credit_limit THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Limite de crédito excedido',
      'current_balance', v_customer.current_balance,
      'credit_limit', v_customer.credit_limit,
      'available', GREATEST(v_customer.credit_limit - v_customer.current_balance, 0)
    );
  END IF;

  INSERT INTO public.sales (business_id, customer_id, items, total, payment_details)
  VALUES (
    p_business_id,
    p_customer_id,
    p_items,
    p_total,
    jsonb_build_object('method', 'credit', 'status', 'pending')
  )
  RETURNING id INTO v_sale_id;

  INSERT INTO public.credit_transactions (
    business_id,
    customer_id,
    type,
    amount,
    balance_before,
    balance_after,
    sale_id,
    description,
    created_by
  )
  VALUES (
    p_business_id,
    p_customer_id,
    'charge',
    p_total,
    v_customer.current_balance,
    v_new_balance,
    v_sale_id,
    COALESCE(p_description, 'Venda a crédito'),
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.customers
  SET current_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_customer_id;

  -- Auditoria (nunca pode bloquear a venda)
  BEGIN
    INSERT INTO public.audit_logs (
      business_id, user_id, user_name, action, entity, entity_id, details
    ) VALUES (
      p_business_id,
      auth.uid(),
      COALESCE(NULLIF(auth.jwt() ->> 'name', ''), auth.jwt() ->> 'email', 'Utilizador'),
      'create', 'credits', v_transaction_id::TEXT,
      jsonb_build_object(
        'customer_id', p_customer_id,
        'sale_id', v_sale_id,
        'total', p_total,
        'new_balance', v_new_balance
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 5) IDEMPOTÊNCIA DE PONTOS DE FIDELIZAÇÃO
--    O trigger de vendas regista pontos; um índice único parcial garante que
--    a mesma venda (mesmo tipo) NUNCA duplica pontos — protege re-inserts,
--    re-sincronizações offline e duplos cliques.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_tx_sale_type
  ON public.loyalty_transactions(sale_id, type)
  WHERE sale_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  points_earned INTEGER;
  cust_exists BOOLEAN;
  inserted INTEGER;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = NEW.customer_id
        AND business_id = NEW.business_id
    ) INTO cust_exists;

    IF cust_exists THEN
      points_earned := FLOOR(NEW.total / 10);

      IF points_earned > 0 THEN
        BEGIN
          INSERT INTO public.loyalty_transactions (customer_id, sale_id, points, type, description)
          VALUES (NEW.customer_id, NEW.id, points_earned, 'earn',
                  'Compra de ' || NEW.total || ' MT')
          ON CONFLICT (sale_id, type) WHERE sale_id IS NOT NULL DO NOTHING;

          GET DIAGNOSTICS inserted = ROW_COUNT;

          IF inserted > 0 THEN
            UPDATE public.customers
            SET loyalty_points  = loyalty_points + points_earned,
                total_spent    = total_spent + NEW.total,
                visit_count    = visit_count + 1,
                last_visit_at  = NEW.created_at,
                updated_at     = NOW()
            WHERE id = NEW.customer_id;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL; -- nunca bloquear a venda por causa da fidelização
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_customer_stats ON public.sales;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_stats();

-- ---------------------------------------------------------------------------
-- 6) SEGURANÇA: RESGATE/BÓNUS DE PONTOS
--    Versões anteriores eram SECURITY DEFINER sem validação de inquilino:
--    qualquer utilizador autenticado podia mexer em pontos de QUALQUER negócio.
--    Agora exige-se adesão ao negócio do cliente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_customer UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'Resgate de pontos'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business_id UUID;
  v_current_pts INTEGER;
  v_new_pts INTEGER;
  v_has_access BOOLEAN;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN json_build_object('ok', false, 'msg', 'Pontos inválidos');
  END IF;

  SELECT business_id INTO v_business_id FROM public.customers WHERE id = p_customer;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'msg', 'Cliente não encontrado');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.business_id = v_business_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN json_build_object('ok', false, 'msg', 'Sem permissão para este cliente');
  END IF;

  SELECT loyalty_points INTO v_current_pts FROM public.customers WHERE id = p_customer;
  IF v_current_pts < p_points THEN
    RETURN json_build_object('ok', false, 'msg', 'Pontos insuficientes (tem ' || v_current_pts || ')');
  END IF;

  v_new_pts := v_current_pts - p_points;

  UPDATE public.customers
  SET loyalty_points = v_new_pts, updated_at = NOW()
  WHERE id = p_customer;

  INSERT INTO public.loyalty_transactions (customer_id, points, type, description)
  VALUES (p_customer, -p_points, 'redeem', COALESCE(p_reason, 'Resgate de pontos'));

  BEGIN
    INSERT INTO public.audit_logs (
      business_id, user_id, user_name, action, entity, entity_id, details
    ) VALUES (
      v_business_id,
      auth.uid(),
      COALESCE(NULLIF(auth.jwt() ->> 'name', ''), auth.jwt() ->> 'email', 'Utilizador'),
      'redeem', 'customers', p_customer::TEXT,
      jsonb_build_object('points', p_points, 'remaining', v_new_pts)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN json_build_object('ok', true, 'discount', p_points, 'remaining', v_new_pts);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_bonus_points(
  p_customer UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'Bónus especial'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business_id UUID;
  v_has_access BOOLEAN;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Pontos inválidos';
  END IF;

  SELECT business_id INTO v_business_id FROM public.customers WHERE id = p_customer;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.business_id = v_business_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Sem permissão para este cliente';
  END IF;

  UPDATE public.customers
  SET loyalty_points = loyalty_points + p_points, updated_at = NOW()
  WHERE id = p_customer;

  INSERT INTO public.loyalty_transactions (customer_id, points, type, description)
  VALUES (p_customer, p_points, 'bonus', COALESCE(p_reason, 'Bónus especial'));

  BEGIN
    INSERT INTO public.audit_logs (
      business_id, user_id, user_name, action, entity, entity_id, details
    ) VALUES (
      v_business_id,
      auth.uid(),
      COALESCE(NULLIF(auth.jwt() ->> 'name', ''), auth.jwt() ->> 'email', 'Utilizador'),
      'bonus', 'customers', p_customer::TEXT,
      jsonb_build_object('points', p_points)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) VIEW: RESUMO DE DÍVIDA POR CLIENTE (fonte-verdade para cobranças)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.customer_debt_summary AS
SELECT
  c.id,
  c.business_id,
  c.name,
  c.phone,
  c.email,
  c.nuit,
  c.status,
  c.credit_limit,
  c.current_balance,
  (c.credit_limit - c.current_balance) AS available_credit,
  c.loyalty_points,
  COUNT(ct.id) FILTER (WHERE ct.type = 'charge')      AS total_charges,
  COUNT(ct.id) FILTER (WHERE ct.type = 'payment')     AS total_payments,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.type = 'charge'), 0)  AS total_charged,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.type = 'payment'), 0) AS total_paid,
  MAX(ct.created_at) FILTER (WHERE ct.type = 'charge')  AS last_charge_at,
  MAX(ct.created_at) FILTER (WHERE ct.type = 'payment') AS last_payment_at,
  (CURRENT_DATE - (MAX(ct.created_at) FILTER (WHERE ct.type = 'charge'))::date) AS days_since_last_charge
FROM public.customers c
LEFT JOIN public.credit_transactions ct ON ct.customer_id = c.id
GROUP BY c.id;