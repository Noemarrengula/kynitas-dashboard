# Sistema de Gestão de Dados - Kynitas Dashboard

## 📊 Princípio Fundamental: NUNCA DELETAR DADOS

Para garantir gestão e contabilidade adequadas, o sistema segue o princípio de **NUNCA DELETAR**, apenas **ARQUIVAR**.

## 🗄️ Estrutura de Dados Permanentes

### 1. **Vendas (sales)**
✅ **Permanente** - Nunca deletado
- Todos os itens vendidos
- Métodos de pagamento
- Data/hora da venda
- Dados da mesa (número, nome, cliente)
- Total e troco

### 2. **Histórico de Mesas (tables_history)**
✅ **Permanente** - Nunca deletado
- Número e nome da mesa
- Nome do cliente
- Data/hora de abertura
- Data/hora de fechamento
- Valor total
- ID da venda associada
- Duração do atendimento

### 3. **Transações de Crédito (credit_transactions)**
✅ **Permanente** - Nunca deletado
- Todas as vendas a crédito
- Todos os pagamentos recebidos
- Saldo antes e depois
- Histórico completo por cliente

### 4. **Clientes (customers)**
✅ **Permanente** - Soft delete (status: inactive)
- Nunca deletado fisicamente
- Apenas marcado como inativo
- Histórico preservado

### 5. **Produtos e Ingredientes**
✅ **Permanente** - Soft delete
- Histórico de preços preservado nas vendas
- Receitas preservadas
- Movimentações de estoque registradas

## 📈 Relatórios Disponíveis

### Relatórios de Mesas
```sql
-- Todas as mesas usadas em um período
SELECT * FROM tables_report 
WHERE sale_date BETWEEN '2024-01-01' AND '2024-01-31';

-- Estatísticas por mesa
SELECT * FROM tables_statistics 
ORDER BY total_revenue DESC;

-- Relatório diário
SELECT * FROM daily_tables_report 
WHERE report_date = CURRENT_DATE;
```

### Relatórios de Vendas
```sql
-- Vendas por mesa
SELECT 
  table_number,
  table_name,
  table_customer_name,
  total,
  created_at
FROM sales
WHERE table_number IS NOT NULL
ORDER BY created_at DESC;

-- Vendas por período
SELECT 
  DATE(created_at) as data,
  COUNT(*) as total_vendas,
  SUM(total) as receita_total
FROM sales
GROUP BY DATE(created_at)
ORDER BY data DESC;
```

### Relatórios de Crédito
```sql
-- Clientes com dívida
SELECT * FROM customers_with_debt;

-- Histórico de transações
SELECT * FROM credit_transactions
WHERE customer_id = 'uuid-do-cliente'
ORDER BY created_at DESC;
```

## 🔒 Garantias de Integridade

### 1. **Backup Automático**
- Supabase faz backup automático diário
- Dados nunca são perdidos

### 2. **Auditoria Completa**
- Todas as tabelas têm `created_at`
- Transações têm `created_by` (quem fez)
- Histórico completo de mudanças

### 3. **Rastreabilidade**
- Cada venda vinculada à mesa
- Cada transação vinculada ao cliente
- Cada movimento de estoque registrado

## 📋 Checklist de Dados Salvos

### Ao Criar Mesa:
- ✅ Número da mesa
- ✅ Nome da mesa (opcional)
- ✅ Nome do cliente (opcional)
- ✅ Data/hora de abertura
- ✅ Status inicial

### Ao Adicionar Pedido:
- ✅ Todos os itens
- ✅ Quantidades
- ✅ Preços no momento da venda
- ✅ Subtotais

### Ao Finalizar Pagamento:
- ✅ Venda completa salva em `sales`
- ✅ Histórico da mesa salvo em `tables_history`
- ✅ Dados da mesa copiados para a venda
- ✅ Métodos de pagamento detalhados
- ✅ Troco calculado e salvo
- ✅ Data/hora exata
- ✅ Mesa removida da visualização (mas dados preservados)

### Relatórios Incluem:
- ✅ Número da mesa
- ✅ Nome da mesa
- ✅ Nome do cliente
- ✅ Todos os itens vendidos
- ✅ Valores detalhados
- ✅ Métodos de pagamento
- ✅ Duração do atendimento
- ✅ Data/hora completa

## 🎯 Benefícios para Gestão

1. **Contabilidade Precisa**
   - Todos os valores registrados
   - Rastreamento completo de receitas
   - Auditoria facilitada

2. **Análise de Performance**
   - Mesas mais rentáveis
   - Tempo médio de atendimento
   - Produtos mais vendidos por mesa

3. **Gestão de Clientes**
   - Histórico de consumo
   - Preferências identificadas
   - Crédito controlado

4. **Conformidade Legal**
   - Dados preservados para fiscalização
   - Histórico completo disponível
   - Rastreabilidade total

## 🚀 Próximos Passos

1. Execute `supabase-tables-history.sql` no Supabase
2. Sistema começará a arquivar automaticamente
3. Acesse relatórios via SQL ou crie dashboards
4. Dados sempre disponíveis para contabilidade

---

**IMPORTANTE**: Este sistema garante que NENHUM dado seja perdido. Tudo é arquivado e disponível para relatórios, auditoria e contabilidade.
