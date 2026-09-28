-- ============================================================================
-- FASE 06 — COMPRAS + FORNECEDORES + RECEÇÕES + PERDAS  (Marrengula IT ERP)
-- Melhora o módulo de abastecimento iniciado em supabase-fornecedores.sql
--   1) Estados da compra: adiciona 'partial' (parcialmente recebida)
--   2) Receções: número sequencial GR-... (rastreabilidade)
--   3) Nova tabela losses (perdas) com RLS multi-tenant
--   4) receive_purchase_order reescrita: fonte única da receção
--      (receção + entrada de stock + stock_movements + custo + danificados + estado)
-- Idempotente: pode correr mais do que uma vez no Supabase SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ESTADO 'partial' NAS ORDENS DE COMPRA
-- ---------------------------------------------------------------------------
ALTER TABLE purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'));

-- ---------------------------------------------------------------------------
-- 2) NÚMERO DE RECEÇÃO (rastreabilidade GR-YYYYMM-NNNN)
-- ---------------------------------------------------------------------------
ALTER TABLE purchase_receipts
  ADD COLUMN IF NOT EXISTS receipt_number TEXT;

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_number
  ON purchase_receipts(receipt_number);

CREATE OR REPLACE FUNCTION public.generate_receipt_number(business_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
  gr_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM purchase_receipts
  WHERE business_id = business_uuid
    AND receipt_number IS NOT NULL;

  gr_number := 'GR-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN gr_number;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) TABELA DE PERDAS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS losses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL,
  unit TEXT,
  reason TEXT NOT NULL,
  loss_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (product_id IS NOT NULL OR ingredient_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_losses_business ON losses(business_id);
CREATE INDEX IF NOT EXISTS idx_losses_date ON losses(loss_date DESC);
CREATE INDEX IF NOT EXISTS idx_losses_status ON losses(status);
CREATE INDEX IF NOT EXISTS idx_losses_reason ON losses(reason);
CREATE INDEX IF NOT EXISTS idx_losses_product ON losses(product_id);
CREATE INDEX IF NOT EXISTS idx_losses_ingredient ON losses(ingredient_id);

ALTER TABLE losses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view losses" ON losses;
CREATE POLICY "Users can view losses" ON losses
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage losses" ON losses;
CREATE POLICY "Users can manage losses" ON losses
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

DROP TRIGGER IF EXISTS update_losses_updated_at ON losses;
CREATE TRIGGER update_losses_updated_at
  BEFORE UPDATE ON losses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE losses IS 'Registo de perdas de stock (deterioração, quebra, ...)';
COMMENT ON COLUMN losses.status IS 'pending = registada; confirmed = afectou stock; cancelled = anulada';

-- ---------------------------------------------------------------------------
-- 4) RECEÇÃO DE COMPRA — FONTE ÚNICA (substitui implementação anterior)
-- ---------------------------------------------------------------------------
-- Cada elemento de received_items usa:
--   product_id OU ingredient_id (identidade)
--   product_name / ingredient_name (exibição)
--   ordered_quantity   = quantidade encomendada nessa linha
--   received_quantity  = quantidade recebida fisicamente (aceite + danificada)
--   quantity           = quantidade ACEITE (entra no stock disponível)
--   damaged_quantity   = quantidade danificada (encaminhada para perdas)
--   unit_price, iva_rate, discount_percent
-- A receção é atómica: receita + stock + movimentos + custo + perdas + estado
-- (partial quando ainda houver pendente; received quando tudo chegar).
-- ============================================================================
-- A função anterior (supabase-fornecedores.sql) retorna UUID; o PostgreSQL não
-- permite alterar o tipo de retorno com CREATE OR REPLACE → DROP antes de criar.
DROP FUNCTION IF EXISTS public.receive_purchase_order(uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  po_id UUID,
  received_items JSONB,
  invoice_num TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  po RECORD;
  receipt_id UUID;
  receipt_number TEXT;
  item JSONB;
  po_item JSONB;
  v_pid TEXT;
  v_iid TEXT;
  v_accepted NUMERIC;
  v_damaged NUMERIC;
  v_received NUMERIC;
  v_ordered NUMERIC;
  v_price NUMERIC;
  v_name TEXT;
  v_line_total NUMERIC;
  v_receipt_total NUMERIC := 0;
  movements JSONB := '[]'::JSONB;
  v_mov JSONB;
  v_all_received BOOLEAN := TRUE;
  v_item_key TEXT;
  v_cum_received NUMERIC;
  has_cost_per_unit BOOLEAN;
BEGIN
  SELECT * INTO po FROM public.purchase_orders WHERE id = po_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de compra não encontrada';
  END IF;

  IF po.status = 'cancelled' THEN
    RAISE EXCEPTION 'Ordem de compra cancelada não pode ser recebida';
  END IF;

  -- Deteção da coluna de custo do ingrediente (schemas antigos/novos)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ingredients'
      AND column_name = 'cost_per_unit'
  ) INTO has_cost_per_unit;

  receipt_number := public.generate_receipt_number(po.business_id);

  -- Total da receção = valor pago visto ser pelo que é ACEITE
  FOR item IN SELECT value FROM jsonb_array_elements(received_items)
  LOOP
    v_accepted := COALESCE((item->>'quantity')::NUMERIC, 0);
    v_price := COALESCE((item->>'unit_price')::NUMERIC, 0);
    v_received := COALESCE((item->>'received_quantity')::NUMERIC, COALESCE((item->>'quantity')::NUMERIC, 0));
    v_line_total := v_accepted * v_price;
    v_receipt_total := v_receipt_total + v_line_total;
  END LOOP;

  INSERT INTO public.purchase_receipts (
    business_id,
    purchase_order_id,
    supplier_id,
    receipt_date,
    receipt_number,
    items,
    total,
    invoice_number,
    notes,
    created_by
  ) VALUES (
    po.business_id,
    po_id,
    po.supplier_id,
    CURRENT_DATE,
    receipt_number,
    received_items,
    v_receipt_total,
    invoice_num,
    'Receção da ' || po.order_number,
    auth.uid()
  ) RETURNING id INTO receipt_id;

  FOR item IN SELECT value FROM jsonb_array_elements(received_items)
  LOOP
    v_pid := COALESCE(item->>'product_id', NULLIF(item->>'product_id', ''));
    v_iid := COALESCE(item->>'ingredient_id', NULLIF(item->>'ingredient_id', ''));
    v_accepted := COALESCE((item->>'quantity')::NUMERIC, 0);
    v_damaged := COALESCE((item->>'damaged_quantity')::NUMERIC, 0);
    v_price := COALESCE((item->>'unit_price')::NUMERIC, 0);
    v_name := COALESCE(item->>'product_name', item->>'ingredient_name', '');

    -- 4.1) Entrada de stock (só o ACEITE entra no stock disponível)
    IF v_accepted > 0 THEN
      IF v_pid IS NOT NULL THEN
        UPDATE public.products
        SET stock = COALESCE(stock, 0) + v_accepted,
            cost_price = v_price
        WHERE id::text = v_pid
          AND business_id = po.business_id;
      ELSIF v_iid IS NOT NULL THEN
        IF has_cost_per_unit THEN
          UPDATE public.ingredients
          SET stock = COALESCE(stock, 0) + v_accepted,
              cost_per_unit = v_price
          WHERE id::text = v_iid
            AND business_id = po.business_id;
        ELSE
          UPDATE public.ingredients
          SET stock = COALESCE(stock, 0) + v_accepted,
              costPerUnit = v_price
          WHERE id::text = v_iid
            AND business_id = po.business_id;
        END IF;
      END IF;

      -- 4.2) Movimento de stock (rastreável: Compra · Receção)
      BEGIN
        INSERT INTO public.stock_movements
          (id, business_id, product_id, ingredient_id, type, quantity, reason, created_at)
        VALUES (
          gen_random_uuid()::text,
          po.business_id,
          v_pid,
          v_iid,
          'entry',
          v_accepted,
          'Compra ' || po.order_number || ' · Receção ' || receipt_number,
          NOW()
        ) RETURNING
          id, product_id, ingredient_id, type, quantity, reason, created_at
        INTO v_mov;
        movements := movements || jsonb_build_object(
          'id', v_mov->>'id',
          'product_id', COALESCE(v_mov->>'product_id', ''),
          'ingredient_id', COALESCE(v_mov->>'ingredient_id', ''),
          'type', v_mov->>'type',
          'quantity', v_mov->>'quantity',
          'reason', v_mov->>'reason',
          'created_at', v_mov->>'created_at'
        );
      EXCEPTION WHEN OTHERS THEN
        NULL; -- nunca bloquear a receção por falha do log
      END;
    END IF;

    -- 4.3) Danificados → perdas (nunca entram no stock disponível)
    IF v_damaged > 0 THEN
      BEGIN
        INSERT INTO public.losses (
          business_id,
          product_id,
          ingredient_id,
          quantity,
          unit,
          reason,
          loss_date,
          notes,
          status,
          created_by
        ) VALUES (
          po.business_id,
          v_pid,
          v_iid,
          v_damaged,
          NULL,
          'danificado',
          CURRENT_DATE,
          'Danificado na receção ' || receipt_number || ' · Compra ' || po.order_number,
          'confirmed',
          auth.uid()
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  -- 4.4) Estado: recibido = todas as linhas totalmente recebidas
  FOR po_item IN SELECT value FROM jsonb_array_elements(po.items)
  LOOP
    v_item_key := COALESCE(po_item->>'product_id', po_item->>'ingredient_id');
    v_ordered := COALESCE((po_item->>'quantity')::NUMERIC, 0);
    IF v_item_key IS NULL THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(
      (r.val->>'received_quantity')::NUMERIC
    ), 0)
    INTO v_cum_received
    FROM public.purchase_receipts rw
    CROSS JOIN LATERAL jsonb_array_elements(rw.items) AS r(val)
    WHERE rw.purchase_order_id = po_id
      AND r.val ? 'received_quantity'
      AND COALESCE(r.val->>'product_id', r.val->>'ingredient_id') = v_item_key;

    -- Receções legadas (só 'quantity') também contam como recebidas
    IF v_cum_received = 0 THEN
      SELECT COALESCE(SUM(
        (r.val->>'quantity')::NUMERIC
      ), 0)
      INTO v_cum_received
      FROM public.purchase_receipts rw
      CROSS JOIN LATERAL jsonb_array_elements(rw.items) AS r(val)
      WHERE rw.purchase_order_id = po_id
        AND NOT (r.val ? 'received_quantity')
        AND COALESCE(r.val->>'product_id', r.val->>'ingredient_id') = v_item_key;
    END IF;

    IF v_cum_received < v_ordered THEN
      v_all_received := FALSE;
    END IF;
  END LOOP;

  UPDATE public.purchase_orders
  SET status = CASE WHEN v_all_received THEN 'received' ELSE 'partial' END
  WHERE id = po_id;

  RETURN jsonb_build_object(
    'receipt_id', receipt_id,
    'receipt_number', receipt_number,
    'status', CASE WHEN v_all_received THEN 'received' ELSE 'partial' END,
    'movements', movements
  );
END;
$$;

COMMENT ON FUNCTION public.receive_purchase_order IS
  'Recebe uma compra de forma atómica: receita + stock + movimentos + custo + perdas por danificados + estado (partial/received)';