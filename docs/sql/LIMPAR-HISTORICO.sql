-- ============================================================================
-- LIMPAR HISTÓRICO DE VENDAS
-- ============================================================================

-- ⚠️ ATENÇÃO: Este script APAGA TODAS AS VENDAS!
-- Use com cuidado!

-- 1. Ver quantas vendas serão apagadas
SELECT 
  COUNT(*) as total_vendas_a_apagar,
  SUM(total) as valor_total
FROM sales;

-- 2. APAGAR TODAS AS VENDAS (descomente para executar)
/*
DELETE FROM sales;
*/

-- 3. Resetar contador de vendas (descomente para executar)
/*
ALTER SEQUENCE sales_sale_number_seq RESTART WITH 1;
*/

-- 4. Verificar se foi limpo
SELECT 
  COUNT(*) as vendas_restantes
FROM sales;

SELECT '✅ Histórico limpo!' as status;
