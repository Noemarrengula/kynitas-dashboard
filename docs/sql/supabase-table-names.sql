-- ============================================================================
-- ADICIONAR NOMES PERSONALIZADOS ÀS MESAS
-- ============================================================================

-- Adicionar coluna 'name' à tabela tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS name TEXT;

-- Atualizar mesas existentes com nomes padrão baseados no número
UPDATE tables SET name = 'Mesa ' || number WHERE name IS NULL;

-- Criar índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_tables_name ON tables(name);

-- Comentário explicativo
COMMENT ON COLUMN tables.name IS 'Nome personalizado da mesa (ex: "Varanda", "Sala VIP", "Mesa 1")';
