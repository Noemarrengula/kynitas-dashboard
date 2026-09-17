-- =============================================================================
-- SEMEAR SÉRIES DE FACTURAÇÃO PARA NEGÓCIOS EXISTENTES
-- =============================================================================
-- O trigger create_default_invoice_series só cria séries (FT/FS/FC) quando um
-- negócio é criado. Negócios pré-existentes ficam SEM séries, o que faz a
-- emissão de factura falhar ("Nenhuma série ativa para FT") sem aviso.
-- Este script semeia as séries padrão em todos os negócios que não as têm.
-- Idempotente. Executar no Supabase SQL Editor.

INSERT INTO invoice_series (business_id, code, prefix, document_type, is_default, current_number, start_number)
SELECT
  b.id,
  s.code,
  s.prefix,
  s.document_type,
  s.is_default,
  0,
  1
FROM businesses b
CROSS JOIN (
  VALUES
    ('FT', 'FT', 'FT', false),
    ('FS', 'FS', 'FS', true),
    ('FC', 'FC', 'FC', false),
    ('NC', 'NC', 'NC', false)
) AS s(code, prefix, document_type, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_series i
  WHERE i.business_id = b.id
    AND i.document_type = s.document_type
);

-- Verificação: quantas séries por negócio
SELECT business_id, COUNT(*) AS series_count,
       string_agg(document_type, ', ' ORDER BY document_type) AS tipos
FROM invoice_series
GROUP BY business_id
ORDER BY series_count;