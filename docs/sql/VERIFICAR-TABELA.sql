-- Verificar se tabela sales existe
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'sales';

-- Ver estrutura da tabela
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales'
ORDER BY ordinal_position;

-- Ver políticas RLS
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'sales';

-- Teste de inserção manual
INSERT INTO sales (
  business_id,
  items,
  total,
  payment_details
) VALUES (
  (SELECT id FROM businesses LIMIT 1),
  '[{"productId": "test", "quantity": 1, "subtotal": 100}]'::jsonb,
  100,
  '{"cash": 100, "total": 100, "change": 0}'::jsonb
);

-- Ver se inseriu
SELECT * FROM sales ORDER BY created_at DESC LIMIT 1;
