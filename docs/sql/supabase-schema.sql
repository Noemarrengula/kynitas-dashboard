-- Tabela de Ingredientes
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stock NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  min_stock NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  packages JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL,
  stock NUMERIC DEFAULT 0,
  internal_id TEXT,
  type TEXT NOT NULL,
  recipe JSONB,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Vendas
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  items JSONB NOT NULL,
  total NUMERIC NOT NULL,
  payment_details JSONB NOT NULL,
  table_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Movimentações de Stock
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT,
  product_id TEXT,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_products_name ON products(name);

-- Enable Row Level Security (RLS)
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir tudo por enquanto - ajustar depois)
CREATE POLICY "Enable all for authenticated users" ON ingredients FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON sales FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON stock_movements FOR ALL USING (true);
