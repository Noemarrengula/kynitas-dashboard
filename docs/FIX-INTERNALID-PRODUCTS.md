# 🔧 FIX: Erro "Could not find the internalld column" 

## Problema
Ao criar um novo produto (Novo Producto), o sistema retorna o erro:
```
Could not find the "internalld" column of "products" in the schema cache
```

## Causa
O código React utiliza `internalId` (camelCase), mas a coluna no Supabase estava nomeada como `internal_id` (snake_case). Além disso, faltavam outras colunas necessárias para o funcionamento completo:

- `cost_price` - preço de custo
- `estimated_cost` - custo estimado (para refeições)
- `daily_stock` - stock diário
- `business_id` - para suporte multi-tenant

## Solução

### Passo 1: Executar o Script SQL
1. Acesse o Supabase Dashboard: https://supabase.com
2. Vá para **SQL Editor**
3. Cole o conteúdo do arquivo: `supabase-fix-products-schema.sql`
4. Clique em **Run** para executar

### Passo 2: Verificar as Alterações
Execute este comando SQL para verificar se as colunas foram criadas:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY column_name;
```

### Passo 3: Confirmar no Frontend
O sistema agora conseguirá:
- ✅ Criar novos produtos com ID Interno
- ✅ Armazenar preços de custo
- ✅ Registrar custos estimados de refeições
- ✅ Controlar stock diário

## Colunas Adicionadas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `internal_id` | TEXT | ID interno do produto (BEB001, REF001) |
| `cost_price` | NUMERIC | Preço de custo do produto |
| `estimated_cost` | NUMERIC | Custo estimado para refeições/pratos |
| `daily_stock` | NUMERIC | Stock diário disponível |
| `business_id` | UUID | ID do negócio/empresa |

## Índices Criados
- `idx_products_business_id` - Performance de filtros por negócio
- `idx_products_type` - Performance de filtros por tipo
- `idx_products_category` - Performance de filtros por categoria
- `idx_products_internal_id` - Busca rápida por ID interno

## Resultado Esperado
Após executar o script, você poderá:
1. Criar novos produtos sem erro
2. Atribuir IDs internos únicos
3. Registrar custos de forma adequada
4. Gerenciar stock diário para refeições

---
**Status**: ✅ Script criado e pronto para usar
**Data**: 2025-12-30
**Arquivo**: `supabase-fix-products-schema.sql`
