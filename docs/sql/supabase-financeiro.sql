-- ============================================================================
-- MÓDULO FINANCEIRO - CONTAS A PAGAR E DRE
-- ============================================================================

-- Tabela: Categorias de Despesas
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_business ON expense_categories(business_id);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage expense categories" ON expense_categories;
CREATE POLICY "Users can manage expense categories" ON expense_categories
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Inserir categorias padrão
INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Aluguel', 'Aluguel do estabelecimento'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Aluguel');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Água', 'Conta de água'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Água');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Luz', 'Conta de energia elétrica'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Luz');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Salários', 'Folha de pagamento'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Salários');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Fornecedores', 'Compra de produtos e ingredientes'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Fornecedores');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Manutenção', 'Reparos e manutenção'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Manutenção');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Marketing', 'Publicidade e marketing'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Marketing');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Impostos', 'Impostos e taxas'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Impostos');

INSERT INTO expense_categories (business_id, name, description)
SELECT b.id, 'Outros', 'Outras despesas'
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE business_id = b.id AND name = 'Outros');

-- Tabela: Contas a Pagar
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_business ON accounts_payable(business_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_category ON accounts_payable(category_id);

ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accounts payable" ON accounts_payable;
CREATE POLICY "Users can view accounts payable" ON accounts_payable
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage accounts payable" ON accounts_payable;
CREATE POLICY "Users can manage accounts payable" ON accounts_payable
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Trigger: Atualizar updated_at
DROP TRIGGER IF EXISTS update_accounts_payable_updated_at ON accounts_payable;
CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON accounts_payable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Atualizar status para overdue automaticamente
CREATE OR REPLACE FUNCTION update_overdue_status()
RETURNS void AS $$
BEGIN
  UPDATE accounts_payable
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- View: DRE (Demonstração do Resultado do Exercício)
CREATE OR REPLACE VIEW dre_report AS
WITH monthly_sales AS (
  SELECT 
    business_id,
    DATE_TRUNC('month', created_at) as period,
    SUM(total) as total_revenue
  FROM sales
  GROUP BY business_id, DATE_TRUNC('month', created_at)
),
monthly_expenses AS (
  SELECT 
    business_id,
    DATE_TRUNC('month', payment_date) as period,
    SUM(amount) as total_expenses
  FROM accounts_payable
  WHERE status = 'paid'
  GROUP BY business_id, DATE_TRUNC('month', payment_date)
)
SELECT 
  ms.business_id,
  ms.period,
  ms.total_revenue,
  0::DECIMAL as total_costs,
  COALESCE(me.total_expenses, 0) as total_expenses,
  ms.total_revenue as gross_profit,
  ms.total_revenue - COALESCE(me.total_expenses, 0) as net_profit
FROM monthly_sales ms
LEFT JOIN monthly_expenses me ON ms.business_id = me.business_id AND ms.period = me.period
ORDER BY ms.period DESC;

-- View: Contas a Vencer (próximos 30 dias)
CREATE OR REPLACE VIEW upcoming_payments AS
SELECT 
  ap.*,
  ec.name as category_name,
  CURRENT_DATE - ap.due_date as days_overdue
FROM accounts_payable ap
LEFT JOIN expense_categories ec ON ap.category_id = ec.id
WHERE ap.status = 'pending'
  AND ap.due_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ap.due_date ASC;

-- View: Despesas por Categoria
CREATE OR REPLACE VIEW expenses_by_category AS
SELECT 
  ap.business_id,
  ec.name as category,
  DATE_TRUNC('month', ap.payment_date) as period,
  COUNT(*) as count,
  SUM(ap.amount) as total_amount
FROM accounts_payable ap
JOIN expense_categories ec ON ap.category_id = ec.id
WHERE ap.status = 'paid'
GROUP BY ap.business_id, ec.name, DATE_TRUNC('month', ap.payment_date)
ORDER BY period DESC, total_amount DESC;

COMMENT ON TABLE accounts_payable IS 'Contas a pagar - despesas do negócio';
COMMENT ON TABLE expense_categories IS 'Categorias de despesas';
COMMENT ON VIEW dre_report IS 'Demonstração do Resultado do Exercício - Receitas, Custos, Despesas e Lucro';
