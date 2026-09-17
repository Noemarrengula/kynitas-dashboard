-- =============================================================================
-- CORRIGIR TRIGGER DE FIDELIZAÇÃO (vendas a falhar / reverter)
-- =============================================================================
-- O trigger update_customer_stats corria como o utilizador da app (sem
-- SECURITY DEFINER). Se a RLS de customers/loyalty_transactions barrava o
-- UPDATE/INSERT interno, a EXCEPÇÃO rebentava DENTRO da transação do
-- INSERT na sales e revertia a venda inteira ("ação sem efeito").
-- Esta versão é SECURITY DEFINER (contorna RLS, regando os pontos) e
-- guarda toda a lógica com EXCEPTION, garantindo que a venda NUNCA falha.
-- Idempotente. Executar no Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  points_earned INTEGER;
  cust_exists BOOLEAN;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    -- Verifica se realmente existe (e pertencente à mesa do negócio)
    SELECT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = NEW.customer_id
        AND business_id = NEW.business_id
    ) INTO cust_exists;

    IF cust_exists THEN
      points_earned := FLOOR(NEW.total / 10);

      BEGIN
        UPDATE public.customers
        SET loyalty_points = loyalty_points + points_earned,
            total_spent   = total_spent + NEW.total,
            visit_count   = visit_count + 1,
            last_visit_at = NEW.created_at,
            updated_at    = NOW()
        WHERE id = NEW.customer_id;

        INSERT INTO public.loyalty_transactions
          (customer_id, sale_id, points, type, description)
        VALUES (NEW.customer_id, NEW.id, points_earned, 'earn',
                'Compra de ' || NEW.total || ' MT');
      EXCEPTION WHEN OTHERS THEN
        NULL; -- nunca bloquear a venda por causa da fidelização
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Garante o trigger apontado à função corrigida
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON public.sales;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_stats();

-- Verificação
SELECT tgname, pg_get_triggerdef(oid) AS definicao
FROM pg_trigger
WHERE tgrelid = 'sales'::regclass AND NOT tgisinternal
ORDER BY tgname;