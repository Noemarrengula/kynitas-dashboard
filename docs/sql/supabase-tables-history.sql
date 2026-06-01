-- ============================================================================
-- HISTÓRICO COMPLETO DE MESAS PARA GESTÃO E CONTABILIDADE
-- ============================================================================

-- Tabela: Histórico de Mesas (nunca deletar, apenas arquivar)
CREATE TABLE IF NOT EXISTS tables_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  table_name TEXT,
  customer_name TEXT,
  status TEXT NOT NULL,
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  total_amount DECIMAL(10,2),
  sale_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tables_history_business ON tables_history(business_id);
CREATE INDEX IF NOT EXISTS idx_tables_history_table_number ON tables_history(table_number);
CREATE INDEX IF NOT EXISTS idx_tables_history_customer ON tables_history(customer_name);
CREATE INDEX IF NOT EXISTS idx_tables_history_dates ON tables_history(opened_at, closed_at);
CREATE INDEX IF NOT EXISTS idx_tables_history_sale ON tables_history(sale_id);

ALTER TABLE tables_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tables history" ON tables_history;
CREATE POLICY "Users can view tables history" ON tables_history
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert tables history" ON tables_history;
CREATE POLICY "Users can insert tables history" ON tables_history
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- View: Relatório de Mesas por Período
CREATE OR REPLACE VIEW tables_report AS
SELECT 
  th.business_id,
  th.table_number,
  th.table_name,
  th.customer_name,
  th.opened_at,
  th.closed_at,
  th.total_amount,
  th.sale_id,
  EXTRACT(EPOCH FROM (th.closed_at - th.opened_at))/60 as duration_minutes,
  DATE(th.closed_at) as sale_date
FROM tables_history th
WHERE th.closed_at IS NOT NULL
ORDER BY th.closed_at DESC;

-- View: Estatísticas de Mesas
CREATE OR REPLACE VIEW tables_statistics AS
SELECT 
  business_id,
  table_number,
  table_name,
  COUNT(*) as total_uses,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_ticket,
  AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))/60) as avg_duration_minutes,
  MAX(closed_at) as last_use
FROM tables_history
WHERE closed_at IS NOT NULL
GROUP BY business_id, table_number, table_name;

-- View: Relatório Diário de Mesas
CREATE OR REPLACE VIEW daily_tables_report AS
SELECT 
  business_id,
  DATE(closed_at) as report_date,
  COUNT(DISTINCT table_number) as tables_used,
  COUNT(*) as total_services,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_ticket,
  AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))/60) as avg_duration_minutes
FROM tables_history
WHERE closed_at IS NOT NULL
GROUP BY business_id, DATE(closed_at)
ORDER BY report_date DESC;

COMMENT ON TABLE tables_history IS 'Histórico completo de todas as mesas para gestão e contabilidade - NUNCA DELETAR';
COMMENT ON COLUMN tables_history.opened_at IS 'Data/hora que a mesa foi aberta/ocupada';
COMMENT ON COLUMN tables_history.closed_at IS 'Data/hora que a mesa foi fechada/paga';
COMMENT ON COLUMN tables_history.total_amount IS 'Valor total da conta da mesa';
COMMENT ON COLUMN tables_history.sale_id IS 'ID da venda associada';
