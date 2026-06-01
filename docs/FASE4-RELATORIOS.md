# FASE 4: Relatórios Avançados e Dashboard em Tempo Real

## Implementado

✅ Dashboard em tempo real (atualiza a cada 30s)
✅ Vendas por hora do dia
✅ Vendas por dia da semana
✅ Top produtos mais vendidos
✅ Resumo de métodos de pagamento
✅ Performance diária
✅ Comparação mensal
✅ Relatório de lucro com margem
✅ Rotatividade de ingredientes
✅ Sistema de metas e objetivos

## Como usar

### 1. Executar SQL no Supabase
Execute o arquivo `supabase-fase4.sql` no SQL Editor

### 2. Usar hooks nos componentes

**Dashboard em Tempo Real:**
```tsx
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';

function Dashboard() {
  const { data, loading } = useRealtimeDashboard();
  
  return (
    <div>
      <p>Vendas Hoje: {data?.today_sales}</p>
      <p>Receita: {data?.today_revenue} MT</p>
      <p>Ticket Médio: {data?.avg_ticket} MT</p>
    </div>
  );
}
```

**Relatórios Avançados:**
```tsx
import { useAdvancedReports } from '@/hooks/useAdvancedReports';

function Reports() {
  const { getTopProducts, getProfitReport } = useAdvancedReports();
  
  const loadData = async () => {
    const topProducts = await getTopProducts(10);
    const profit = await getProfitReport('2024-01-01', '2024-12-31');
  };
}
```

## Views Disponíveis

📊 **sales_by_hour** - Vendas por hora
📅 **sales_by_weekday** - Vendas por dia da semana
🏆 **top_selling_products** - Produtos mais vendidos
💳 **payment_methods_summary** - Resumo de pagamentos
📈 **daily_performance** - Performance diária
📊 **monthly_comparison** - Comparação mensal
🔄 **ingredient_turnover** - Rotatividade de ingredientes

## Funções Disponíveis

🎯 **realtime_dashboard()** - Dashboard em tempo real
💰 **profit_report()** - Relatório de lucro
📊 **check_goal_progress()** - Progresso de metas
💵 **calculate_sale_profit()** - Lucro de venda específica

## Benefícios

⚡ Dados em tempo real
📊 Análises profundas
💰 Cálculo de lucro automático
🎯 Acompanhamento de metas
📈 Insights de negócio
🔍 Identificar tendências

## Próxima Fase

FASE 5: API REST para Integrações Externas
