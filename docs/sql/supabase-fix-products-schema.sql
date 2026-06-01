-- =====================================================
-- SCRIPT DE CORREÇÃO: Tabela Products
-- Adição de colunas faltantes
-- =====================================================

-- 1. Renomear ou garantir que internal_id exista
ALTER TABLE products
ADD COLUMN IF NOT EXISTS internal_id TEXT;

-- 2. Fazer cost_price aceitar NULL (removemos do frontend)
ALTER TABLE products
ALTER COLUMN cost_price DROP NOT NULL;

-- 3. Adicionar coluna business_id para suporte multi-tenant
ALTER TABLE products
ADD COLUMN IF NOT EXISTS business_id UUID;

-- 4. Adicionar coluna estimated_cost para refeições
ALTER TABLE products
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC;

-- 5. Adicionar coluna daily_stock para controle de refeições
ALTER TABLE products
ADD COLUMN IF NOT EXISTS daily_stock NUMERIC;

-- 6. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_internal_id ON products(internal_id);

-- 7. Atualizar comentários das colunas para clareza
COMMENT ON COLUMN products.internal_id IS 'ID interno do produto (ex: BEB001, REF001)';
COMMENT ON COLUMN products.estimated_cost IS 'Custo estimado para refeições/pratos';
COMMENT ON COLUMN products.daily_stock IS 'Stock diário disponível (usado para refeições)';
COMMENT ON COLUMN products.business_id IS 'ID do negócio/empresa (para suporte multi-tenant)';

-- 8. Atualizar a constraints (opcional - adicionar validação)
-- Constraint já existe, não precisa adicionar novamente
-- ALTER TABLE products
-- ADD CONSTRAINT check_product_type CHECK (type IN ('drink', 'meal', 'cigarette'));

-- 9. Log de execução
-- Este script corrigiu a tabela products com as colunas faltantes
-- Data de execução: 2025-12-30
