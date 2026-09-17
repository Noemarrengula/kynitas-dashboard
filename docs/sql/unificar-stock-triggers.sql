-- =============================================================================
-- UNIFICAR TRIGGERS DE STOCK (Ponto 1)
-- =============================================================================
-- Remove todos os triggers/funções concorrentes e cria UMA função canónica:
--   sync_stock_from_sale()
--     - deduz stock do produto (dose-aware: fracionavel/doses_por_garrafa)
--     - deduz ingredientes da receita (recipe JSONB) quando o produto tem ficha
--     - aceita items com 'productId' ou 'product_id'
--     - aceita ingredientes diretos vendidos com id 'ing-...'
--     - garante stock >= 0 (GREATEST(0, ...)), nunca bloqueia venda
--     - regista movimentação de stock ('exit') sem nunca bloquear a venda
-- Executar no Supabase SQL Editor. Idempotente (pode correr mais que uma vez).

-- ---------------------------------------------------------------------------
-- 0) REMOVER TODOS OS TRIGGERS E FUNÇÕES CONCORRENTES
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_stock_after_sale() CASCADE;
DROP FUNCTION IF EXISTS public.update_product_stock_on_sale() CASCADE;
DROP FUNCTION IF EXISTS public.validate_sale_stock() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_product_stock() CASCADE;
DROP FUNCTION IF EXISTS public.log_stock_movement() CASCADE;
DROP FUNCTION IF EXISTS public.sync_stock_from_sale() CASCADE;

-- ---------------------------------------------------------------------------
-- 1) FUNÇÃO CANÓNICA
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_stock_from_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item JSONB;
  recipe_row JSONB;
  rec RECORD;
  v_key TEXT;
  v_qty NUMERIC;
  v_delta NUMERIC;
  v_ing_qty NUMERIC;
  has_fracionavel BOOLEAN;
  has_doses BOOLEAN;
  has_sm_business BOOLEAN;
BEGIN
  -- Deteção de colunas opcionais (corre em schemas antigos e novos)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'fracionavel'
  ) INTO has_fracionavel;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'doses_por_garrafa'
  ) INTO has_doses;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
      AND column_name = 'business_id'
  ) INTO has_sm_business;

  FOR item IN SELECT value FROM jsonb_array_elements(NEW.items)
  LOOP
    v_key := COALESCE(item->>'productId', item->>'product_id');
    IF v_key IS NULL OR v_key = '' THEN
      CONTINUE;
    END IF;

    v_qty := COALESCE((item->>'quantity')::NUMERIC, 0);
    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- 1.1) Ingrediente vendido diretamente (id 'ing-...')
    IF v_key LIKE 'ing-%' THEN
      UPDATE public.ingredients
      SET stock = GREATEST(0, COALESCE(stock, 0) - v_qty)
      WHERE id::text = v_key
        AND business_id = NEW.business_id;

      BEGIN
        IF has_sm_business THEN
          INSERT INTO public.stock_movements
            (ingredient_id, type, quantity, reason, business_id, created_at)
          VALUES (v_key, 'exit', -v_qty, 'Venda #' || NEW.id, NEW.business_id, COALESCE(NEW.created_at, NOW()));
        ELSE
          INSERT INTO public.stock_movements
            (ingredient_id, type, quantity, reason, created_at)
          VALUES (v_key, 'exit', -v_qty, 'Venda #' || NEW.id, COALESCE(NEW.created_at, NOW()));
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- nunca bloquear a venda por causa do log
      END;
      CONTINUE;
    END IF;

    -- 1.2) Produto normal
    SELECT id, stock, recipe,
           CASE WHEN has_fracionavel THEN fracionavel ELSE FALSE END AS fracionavel,
           CASE WHEN has_doses THEN doses_por_garrafa ELSE 0 END   AS doses_por_garrafa
    INTO rec
    FROM public.products
    WHERE id::text = v_key
      AND business_id = NEW.business_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Dose-aware (ex.: garrafa vendida às doses)
    v_delta := v_qty;
    IF rec.fracionavel IS TRUE AND rec.doses_por_garrafa > 0 THEN
      v_delta := ROUND(v_qty / rec.doses_por_garrafa, 2);
    END IF;

    UPDATE public.products
    SET stock = GREATEST(0, COALESCE(stock, 0) - v_delta)
    WHERE id = rec.id
      AND business_id = NEW.business_id;

    -- 1.3) Deduzir ingredientes da ficha técnica (recipe JSONB)
    IF rec.recipe IS NOT NULL AND jsonb_typeof(rec.recipe) = 'array' THEN
      FOR recipe_row IN SELECT value FROM jsonb_array_elements(rec.recipe)
      LOOP
        v_key := COALESCE(recipe_row->>'ingredientId', recipe_row->>'ingredient_id');
        IF v_key IS NULL OR v_key = '' THEN
          CONTINUE;
        END IF;

        v_ing_qty := COALESCE((recipe_row->>'quantity')::NUMERIC, 0);
        IF v_ing_qty <= 0 THEN
          CONTINUE;
        END IF;

        -- por cada unidade do produto vendido
        UPDATE public.ingredients
        SET stock = GREATEST(0, COALESCE(stock, 0) - (v_ing_qty * v_qty))
        WHERE id::text = v_key
          AND business_id = NEW.business_id;
      END LOOP;
    END IF;

    -- 1.4) Registar movimentação do produto
    BEGIN
      IF has_sm_business THEN
        INSERT INTO public.stock_movements
          (product_id, type, quantity, reason, business_id, created_at)
        VALUES (rec.id, 'exit', -v_delta, 'Venda #' || NEW.id, NEW.business_id, COALESCE(NEW.created_at, NOW()));
      ELSE
        INSERT INTO public.stock_movements
          (product_id, type, quantity, reason, created_at)
        VALUES (rec.id, 'exit', -v_delta, 'Venda #' || NEW.id, COALESCE(NEW.created_at, NOW()));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) APLICAR O TRIGGER ÚNICO
-- ---------------------------------------------------------------------------
CREATE TRIGGER sync_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_stock_from_sale();

-- ---------------------------------------------------------------------------
-- 3) VERIFICAÇÃO — listar triggers ativos em sales e funções de stock
-- ---------------------------------------------------------------------------
SELECT tgname, pg_get_triggerdef(oid) AS definicao
FROM pg_trigger
WHERE tgrelid = 'sales'::regclass AND NOT tgisinternal
ORDER BY tgname;

SELECT proname
FROM pg_proc
WHERE proname IN ('sync_stock_from_sale','update_stock_after_sale',
                  'update_product_stock_on_sale','validate_sale_stock',
                  'deduct_product_stock','log_stock_movement')
ORDER BY proname;