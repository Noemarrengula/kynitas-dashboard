-- Migração: Adicionar campos de fracionamento e custo à tabela products
-- Executar no SQL Editor do Supabase Dashboard (https://supabase.com/dashboard/project/fqnelrzqvtovwegvimgj/sql/new)

-- 1. Adicionar colunas novas à tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fracionavel BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS preco_dose NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS doses_por_garrafa INTEGER DEFAULT 0;

-- 2. Garantir que colunas existentes estejam presentes
ALTER TABLE products ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS daily_stock NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS internal_id TEXT;

-- 3. Remover categorias guardadas para forçar o uso das novas defaults
--    (as novas categorias incluem: Cidras, Gins, Whiskys, Rum, Licores, Coolers, Energéticos, Refrigerantes, Sumos, Águas)
DELETE FROM business_settings WHERE setting_key = 'categories';

-- 4. Verificar resultados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
