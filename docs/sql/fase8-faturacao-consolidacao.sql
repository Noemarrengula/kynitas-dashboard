-- ============================================================================
-- FASE 08: FACTURAÇÃO + DOCUMENTOS FISCAIS + SÉRIES + IVA + QR CODE
-- Consolidação do módulo existente (supabase-fase3-faturacao.sql).
--
-- O que muda:
--   1. invoices.original_invoice_id           -> relaciona Nota de Crédito à factura original
--   2. Índices únicos parciais                -> idempotência (1 factura por venda; 1 NC por original)
--   3. issue_invoice(p_business_id, ...) RPC  -> numeração ATÓMICA (row-lock na série),
--                                                IVA por produto, hash chain, ATCUD, QR code,
--                                                auditoria, idempotente
--   4. issue_credit_note(...) RPC             -> Nota de Crédito relacionada ao documento original
--   5. create_default_invoice_series()        -> novos negócios ganham também série NC
--   6. Seed de série NC para negócios existentes sem ela
--
-- Não apaga nem altera o modelo financeiro existente. Executar no SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Coluna original_invoice_id (ligação factura <-> nota de crédito)
-- ---------------------------------------------------------------------------
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_original ON invoices(original_invoice_id);

-- ---------------------------------------------------------------------------
-- 2) Idempotência:
--    - uma venda só pode gerar UMA factura (escrita anteriormente no frontend
--      causava duplicados / UNIQUE error em duplo clique ou retry);
--    - uma factura só pode ter UMA nota de crédito.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_sale_id
  ON invoices(business_id, sale_id)
  WHERE sale_id IS NOT NULL AND original_invoice_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_only_one_credit_note
  ON invoices(business_id, original_invoice_id)
  WHERE original_invoice_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) RPC issue_invoice
--    Numeração segura: a linha da série é bloqueada (FOR UPDATE) dentro da
--    transacção, garantindo que duas emissões simultâneas obtêm números
--    diferentes (FT 000001 / FT 000002, nunca ambas 000001).
--    O IVA é calculado POR PRODUTO (products.iva_rate), a mesma regra já usada
--    pelas compras (total * (1 + taxa/100)), e o total da factura mantém a
--    fórmula existente do frontend: subtotal + IVA.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_invoice(
  p_business_id UUID,
  p_sale_id UUID,
  p_document_type TEXT,
  p_client_name TEXT DEFAULT NULL,
  p_client_nuit TEXT DEFAULT NULL,
  p_client_address TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale        public.sales%ROWTYPE;
  v_series      public.invoice_series%ROWTYPE;
  v_number      INTEGER;
  v_item        JSONB;
  v_line        JSONB;
  v_items       JSONB := '[]'::jsonb;
  v_qty         NUMERIC;
  v_unit_price  NUMERIC;
  v_rate        NUMERIC;
  v_line_iva    NUMERIC;
  v_line_total  NUMERIC;
  v_subtotal    NUMERIC := 0;
  v_iva         NUMERIC := 0;
  v_total       NUMERIC := 0;
  v_hash_prev   TEXT;
  v_hash        TEXT;
  v_atcud       TEXT;
  v_qr          TEXT;
  v_invoice_id  UUID;
  v_created_at  TIMESTAMP := NOW();
  v_user_name   TEXT := COALESCE(NULLIF(auth.jwt() ->> 'name', ''), auth.jwt() ->> 'email', 'Utilizador');
  v_result      JSONB;
BEGIN
  -- Permissão multi-tenant (obrigatório com SECURITY DEFINER)
  IF NOT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;

  IF p_document_type NOT IN ('FT', 'FS', 'FC', 'NC') THEN
    RAISE EXCEPTION 'Tipo de documento inválido';
  END IF;

  IF p_document_type = 'NC' THEN
    RAISE EXCEPTION 'Use issue_credit_note para notas de crédito';
  END IF;

  -- Idempotência: já existe factura para esta venda? Devolve-a.
  SELECT i.id INTO v_invoice_id
  FROM public.invoices i
  WHERE i.business_id = p_business_id
    AND i.sale_id = p_sale_id
    AND i.original_invoice_id IS NULL
  ORDER BY i.created_at ASC
  LIMIT 1;

  IF v_invoice_id IS NOT NULL THEN
    SELECT row_to_jsonb(i) INTO v_result FROM public.invoices i WHERE i.id = v_invoice_id;
    RETURN jsonb_build_object('invoice', v_result, 'existing', true);
  END IF;

  -- Venda pertence à empresa?
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;

  -- Bloqueia a linha da série para numeração atómica
  SELECT * INTO v_series
  FROM public.invoice_series
  WHERE business_id = p_business_id
    AND document_type = p_document_type
    AND active = true
  ORDER BY is_default DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma série ativa para %', p_document_type;
  END IF;

  v_number := v_series.current_number + 1;

  -- Linhas com IVA por produto (regra existente das compras / produtos.iva_rate)
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_sale.items, '[]'::jsonb))
  LOOP
    v_qty        := COALESCE((v_item->>'quantity')::numeric, 0);
    v_unit_price := COALESCE((v_item->'product'->>'price')::numeric,
                             (v_item->>'unitPrice')::numeric, 0);
    IF v_qty <= 0 OR v_unit_price < 0 THEN CONTINUE; END IF;

    v_rate := COALESCE(
      (CASE WHEN (v_item->'product'->>'ivaRate') IS NOT NULL AND (v_item->'product'->>'ivaRate') <> '' THEN (v_item->'product'->>'ivaRate')::numeric END),
      (CASE WHEN (v_item->'product'->>'iva_rate') IS NOT NULL AND (v_item->'product'->>'iva_rate') <> '' THEN (v_item->'product'->>'iva_rate')::numeric END),
      (CASE WHEN (v_item->>'ivaRate') IS NOT NULL AND (v_item->>'ivaRate') <> '' THEN (v_item->>'ivaRate')::numeric END),
      16
    );

    v_line_total := ROUND(v_qty * v_unit_price, 2);
    v_line_iva   := ROUND(v_line_total * v_rate / 100, 2);
    v_subtotal   := v_subtotal + v_line_total;
    v_iva        := v_iva + v_line_iva;

    v_line := jsonb_build_object(
      'productId',   COALESCE(v_item->>'productId', v_item->>'product_id'),
      'productName', COALESCE(v_item->'product'->>'name', v_item->>'productName', 'Produto'),
      'quantity',    v_qty,
      'unitPrice',   v_unit_price,
      'ivaRate',     v_rate,
      'ivaAmount',   v_line_iva,
      'total',       v_line_total
    );
    v_items := v_items || jsonb_build_array(v_line);
  END LOOP;

  IF v_items = '[]'::jsonb THEN
    RAISE EXCEPTION 'Venda sem itens válidos para facturar';
  END IF;

  v_total := ROUND(v_subtotal + v_iva, 2);

  -- Hash chain (integridade documental: cada documento assina o anterior)
  SELECT hash INTO v_hash_prev
  FROM public.invoices
  WHERE business_id = p_business_id AND hash IS NOT NULL
  ORDER BY created_at DESC, number DESC
  LIMIT 1;

  v_hash := encode(
    digest(
      concat_ws('|',
        COALESCE(v_hash_prev, ''),
        p_business_id::text,
        p_document_type,
        v_series.prefix,
        v_number::text,
        v_total::text,
        v_iva::text,
        to_char(v_created_at, 'YYYY-MM-DD HH24:MI:SS')
      ),
      'sha256'
    ),
    'hex'
  );

  v_atcud := v_series.prefix || '-' || LPAD(v_number::text, 7, '0') || '-' || left(v_hash, 8);

  -- Conteúdo canónico do QR Code (mesmo formato do buildQRUrl do frontend)
  v_qr := p_document_type || '|'
       || v_series.prefix || '-' || LPAD(v_number::text, 4, '0') || '|'
       || v_total::text || '|' || v_iva::text || '|'
       || v_atcud || '|' || v_hash || '|'
       || to_char(v_created_at, 'YYYY-MM-DD');

  INSERT INTO public.invoices (
    business_id, sale_id, document_type, series, number,
    client_name, client_nuit, client_address,
    items, subtotal, iva_rate, iva_amount, withholding_tax, total,
    atcud, hash, hash_prev, qr_code_data,
    status, printed_count, created_by, created_at, issued_at
  ) VALUES (
    p_business_id, p_sale_id, p_document_type, v_series.prefix, v_number,
    p_client_name, p_client_nuit, p_client_address,
    v_items, v_subtotal,
    16, v_iva, 0, v_total,
    v_atcud, v_hash, v_hash_prev, v_qr,
    'issued', 0, auth.uid(), v_created_at, v_created_at
  )
  RETURNING id INTO v_invoice_id;

  -- Avança a série dentro da mesma transacção (o trigger AFTER INSERT repete o valor)
  UPDATE public.invoice_series
  SET current_number = v_number, updated_at = NOW()
  WHERE id = v_series.id;

  -- Auditoria (nunca pode bloquear a emissão)
  BEGIN
    INSERT INTO public.audit_logs (
      business_id, user_id, user_name, action, entity, entity_id, details
    ) VALUES (
      p_business_id, auth.uid(), v_user_name, 'issue', 'invoices', v_invoice_id::text,
      jsonb_build_object(
        'document_type', p_document_type,
        'series', v_series.prefix,
        'number', v_number,
        'total', v_total,
        'iva', v_iva
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  SELECT row_to_jsonb(i) INTO v_result FROM public.invoices i WHERE i.id = v_invoice_id;
  RETURN jsonb_build_object('invoice', v_result, 'existing', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC issue_credit_note
--    Cria uma Nota de Crédito relacionada com o documento original (valores
--    revertidos). A factura original NÃO é apagada — permanece rastreável.
--    Não cria pagamento nem movimenta dívida/stock (regra das fases 06/07:
--    o documento fiscal não é uma segunda transacção).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_credit_note(
  p_business_id UUID,
  p_original_invoice_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original    public.invoices%ROWTYPE;
  v_series      public.invoice_series%ROWTYPE;
  v_number      INTEGER;
  v_item        JSONB;
  v_line        JSONB;
  v_items       JSONB := '[]'::jsonb;
  v_subtotal    NUMERIC := 0;
  v_iva         NUMERIC := 0;
  v_total       NUMERIC := 0;
  v_hash_prev   TEXT;
  v_hash        TEXT;
  v_atcud       TEXT;
  v_qr          TEXT;
  v_nc_id       UUID;
  v_created_at  TIMESTAMP := NOW();
  v_user_name   TEXT := COALESCE(NULLIF(auth.jwt() ->> 'name', ''), auth.jwt() ->> 'email', 'Utilizador');
  v_result      JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;

  SELECT * INTO v_original
  FROM public.invoices
  WHERE id = p_original_invoice_id AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento original não encontrado';
  END IF;

  IF v_original.status <> 'issued' THEN
    RAISE EXCEPTION 'Apenas documentos emitidos podem ser corrigidos';
  END IF;

  IF v_original.document_type = 'NC' THEN
    RAISE EXCEPTION 'Não é possível creditar uma nota de crédito';
  END IF;

  -- Idempotência: esta factura já tem nota de crédito?
  SELECT i.id INTO v_nc_id
  FROM public.invoices i
  WHERE i.business_id = p_business_id
    AND i.original_invoice_id = p_original_invoice_id
  LIMIT 1;

  IF v_nc_id IS NOT NULL THEN
    SELECT row_to_jsonb(i) INTO v_result FROM public.invoices i WHERE i.id = v_nc_id;
    RETURN jsonb_build_object('invoice', v_result, 'existing', true);
  END IF;

  SELECT * INTO v_series
  FROM public.invoice_series
  WHERE business_id = p_business_id
    AND document_type = 'NC'
    AND active = true
  ORDER BY is_default DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma série ativa para NC';
  END IF;

  v_number := v_series.current_number + 1;

  -- Linhas revertidas (mesmas linhas, valores negativos)
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_original.items, '[]'::jsonb))
  LOOP
    v_line := v_item ||
      jsonb_build_object(
        'ivaAmount', ROUND(-(COALESCE((v_item->>'ivaAmount')::numeric, 0)), 2),
        'total',     ROUND(-(COALESCE((v_item->>'total')::numeric, 0)), 2)
      );
    v_items   := v_items || jsonb_build_array(v_line);
    v_subtotal := v_subtotal + ROUND(COALESCE((v_item->>'total')::numeric, 0), 2);
    v_iva     := v_iva + ROUND(COALESCE((v_item->>'ivaAmount')::numeric, 0), 2);
  END LOOP;

  v_subtotal := ROUND(-v_subtotal, 2);
  v_iva      := ROUND(-v_iva, 2);
  v_total    := ROUND(v_subtotal + v_iva, 2);

  SELECT hash INTO v_hash_prev
  FROM public.invoices
  WHERE business_id = p_business_id AND hash IS NOT NULL
  ORDER BY created_at DESC, number DESC
  LIMIT 1;

  v_hash := encode(
    digest(
      concat_ws('|',
        COALESCE(v_hash_prev, ''),
        p_business_id::text,
        'NC',
        v_series.prefix,
        v_number::text,
        v_total::text,
        v_iva::text,
        to_char(v_created_at, 'YYYY-MM-DD HH24:MI:SS')
      ),
      'sha256'
    ),
    'hex'
  );

  v_atcud := v_series.prefix || '-' || LPAD(v_number::text, 7, '0') || '-' || left(v_hash, 8);

  v_qr := 'NC|'
       || v_series.prefix || '-' || LPAD(v_number::text, 4, '0') || '|'
       || v_total::text || '|' || v_iva::text || '|'
       || v_atcud || '|' || v_hash || '|'
       || to_char(v_created_at, 'YYYY-MM-DD');

  INSERT INTO public.invoices (
    business_id, original_invoice_id, document_type, series, number,
    client_name, client_nuit, client_address,
    items, subtotal, iva_rate, iva_amount, withholding_tax, total,
    atcud, hash, hash_prev, qr_code_data,
    status, reason, printed_count, created_by, created_at, issued_at
  ) VALUES (
    p_business_id, p_original_invoice_id, 'NC', v_series.prefix, v_number,
    v_original.client_name, v_original.client_nuit, v_original.client_address,
    v_items, v_subtotal, v_original.iva_rate, v_iva, 0, v_total,
    v_atcud, v_hash, v_hash_prev, v_qr,
    'issued', p_reason, 0, auth.uid(), v_created_at, v_created_at
  )
  RETURNING id INTO v_nc_id;

  UPDATE public.invoice_series
  SET current_number = v_number, updated_at = NOW()
  WHERE id = v_series.id;

  BEGIN
    INSERT INTO public.audit_logs (
      business_id, user_id, user_name, action, entity, entity_id, details
    ) VALUES (
      p_business_id, auth.uid(), v_user_name, 'credit_note', 'invoices', v_nc_id::text,
      jsonb_build_object(
        'original_invoice', p_original_invoice_id,
        'series', v_series.prefix,
        'number', v_number,
        'total', v_total,
        'reason', p_reason
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  SELECT row_to_jsonb(i) INTO v_result FROM public.invoices i WHERE i.id = v_nc_id;
  RETURN jsonb_build_object('invoice', v_result, 'existing', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Novos negócios também ganham série NC (o trigger atual só cria FT/FS/FC)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_default_invoice_series()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.invoice_series (business_id, code, prefix, document_type, is_default, current_number, start_number)
  VALUES
    (NEW.id, 'FT', 'FT', 'FT', false, 0, 1),
    (NEW.id, 'FS', 'FS', 'FS', true,  0, 1),
    (NEW.id, 'FC', 'FC', 'FC', false, 0, 1),
    (NEW.id, 'NC', 'NC', 'NC', false, 0, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_invoice_series ON public.businesses;
CREATE TRIGGER trigger_create_invoice_series
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_invoice_series();

-- ---------------------------------------------------------------------------
-- 6) Seed: série NC para negócios existentes sem ela (idempotente)
-- ---------------------------------------------------------------------------
INSERT INTO invoice_series (business_id, code, prefix, document_type, is_default, current_number, start_number)
SELECT
  b.id,
  'NC',
  'NC',
  'NC',
  false,
  0,
  1
FROM public.businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM public.invoice_series i
  WHERE i.business_id = b.id AND i.document_type = 'NC'
);

-- ---------------------------------------------------------------------------
-- Verificação
-- ---------------------------------------------------------------------------
SELECT business_id, COUNT(*) AS series_count,
       string_agg(document_type, ', ' ORDER BY document_type) AS tipos
FROM public.invoice_series
GROUP BY business_id
ORDER BY series_count;