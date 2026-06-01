-- ============================================================================
-- SISTEMA APRIMORADO DE GESTÃO DE MESAS
-- ============================================================================

-- Adicionar campos para controle de proprietário e histórico
ALTER TABLE tables ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

-- Adicionar campos na tabela sales para rastreamento
ALTER TABLE sales ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS table_customer_name TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sales_table_number ON sales(table_number);
CREATE INDEX IF NOT EXISTS idx_sales_table_customer ON sales(table_customer_name);
CREATE INDEX IF NOT EXISTS idx_tables_customer_name ON tables(customer_name);

-- Comentários explicativos
COMMENT ON COLUMN tables.customer_name IS 'Nome do cliente/proprietário da mesa';
COMMENT ON COLUMN tables.opened_at IS 'Data/hora de abertura da mesa';
COMMENT ON COLUMN tables.closed_at IS 'Data/hora de fechamento da mesa';
COMMENT ON COLUMN sales.table_customer_name IS 'Nome do cliente que estava na mesa no momento da venda';
