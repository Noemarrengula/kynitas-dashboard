# Checklist — Propagação de dados entre Admin / Supervisor / Caixa

Verifica que alterações de dados partilhados do negócio se propagam entre os três papéis
(admin, supervisor, caixa) no mesmo negócio.

> **Regra de base (arquitectura):** as policies RLS são **por negócio**, não por papel
> (ex.: `multitenant-rls-policies.sql`). Admin, supervisor e caixa do **mesmo** negócio
> lêem exactamente as mesmas linhas. A separação entre papéis é apenas de **UI/permissões**
> (`FEATURE_ROLES` em `src/hooks/usePermissions.ts`) e de **escrita** (quem pode alterar).

---

## ⚠️ Cuidado com o cache do front

React Query usa `staleTime: 5min` e `refetchOnWindowFocus: false` (`src/App.tsx`).

⇒ Depois de cada alteração, faz **F5** (ou remonta a página) na janela de quem observa.
Sem F5, a alteração pode não aparecer de imediato — isso **não é** um bug de RLS.

---

## Contas de teste (Kynitas Bar)

| Papel    | Email                          |
|----------|--------------------------------|
| Admin    | `noemarrengula1@gmail.com`     |
| Supervisor | `massiquinejocordasse@gmail.com` |
| Caixa    | `esmenia@gmail.com`            |

Abre **duas janelas** com contas diferentes e executa os cenários.

---

## Cenários (UI)

| # | Acção do admin                                   | Esperado no supervisor                                      | Esperado no caixa                                                  |
|---|--------------------------------------------------|-------------------------------------------------------------|---------------------------------------------------------------------|
| 1 | Criar produto **ou** editar preço                | Vê produto e preço novo (F5)                               | Vê produto e preço novo (F5)                                       |
| 2 | Ajuste de stock                                  | Vê quantidade actualizada (F5)                             | Vê quantidade actualizada (F5) — mas **não** pode ajustar          |
| 3 | Criar cliente                                    | Vê cliente novo (F5)                                       | Vê cliente novo (F5)                                               |
| 4 | Abrir crédito                                    | Vê crédito + saldo (F5)                                    | Vê crédito + saldo (F5)                                            |
| 5 | Registar pagamento de crédito                    | Vê saldo a descer (F5)                                     | Vê saldo a descer (F5)                                             |
| 6 | Supervisor faz uma venda                         | Admin vê no histórico geral (`vendas_historico_geral`)     | Caixa **não** vê — histórico do caixa é "próprio" (`vendas_historico_proprio`), by design |

---

## Verificação SQL (backend, por conta)

Simula o JWT de cada utilizador e confirma que todos vêm o **mesmo número de linhas**.

> Executa no SQL Editor (ligado como `postgres`). Substitui os emails se necessário.

```sql
DO $$
DECLARE
  v_emails   text[] := ARRAY[
    'noemarrengula1@gmail.com',          -- admin
    'massiquinejocordasse@gmail.com',    -- supervisor
    'esmenia@gmail.com'                  -- caixa
  ];
  v_email    text;
  v_uid      uuid;
  v_products bigint;
  v_customers bigint;
  v_credits  bigint;
  v_sales    bigint;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(v_email);

    -- simula o JWT da sessão (auth.uid())
    PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);

    SELECT count(*) INTO v_products  FROM public.products;
    SELECT count(*) INTO v_customers FROM public.customers;
    SELECT count(*) INTO v_credits   FROM public.credits;
    SELECT count(*) INTO v_sales     FROM public.sales;

    RAISE NOTICE '%-%, produtos=%, clientes=%, créditos=%, vendas=%',
      v_email, v_uid, v_products, v_customers, v_credits, v_sales;
  END LOOP;
END $$;
```

**Resultado esperado:** os 3 utilizadores devolvem exactamente os mesmos contadores.
Se um devolver 0 (ou menos), existe uma policy RLS que não o inclui → debug nessa policy.

> ⚠️ `RAISE NOTICE` pode não aparecer no client SQL do Supabase. Se não aparecer,
> usa o `select` abaixo (uma linha por papel) ou verifica no Logs do Supabase.