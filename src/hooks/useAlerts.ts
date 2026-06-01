import { useMemo } from 'react';
import { useDatabase } from './useDatabase';
import { useStore } from '@/store/useStore';
import { useCredits } from './useCredits';
import { differenceInHours } from 'date-fns';

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  category: 'stock' | 'credit' | 'table' | 'product';
  title: string;
  message: string;
  action?: string;
  data?: any;
}

export function useAlerts() {
  const { ingredients, products } = useDatabase();
  const { tables, orders } = useStore();
  const { customers } = useCredits();

  const alerts = useMemo(() => {
    const alertList: Alert[] = [];

    // 1. Alerta de estoque crítico
    const lowStockIngredients = ingredients.filter(i => i.stock <= i.minStock);
    if (lowStockIngredients.length > 0) {
      alertList.push({
        id: 'low-stock',
        type: 'error',
        category: 'stock',
        title: 'Estoque Crítico',
        message: `${lowStockIngredients.length} ingrediente(s) com estoque baixo`,
        action: 'Ver Ingredientes',
        data: lowStockIngredients,
      });
    }

    // 2. Alerta de clientes próximos do limite de crédito (80%)
    const highCreditCustomers = customers.filter(c => {
      if (c.credit_limit === 0) return false;
      const usage = (c.current_balance / c.credit_limit) * 100;
      return usage >= 80 && usage < 100;
    });
    if (highCreditCustomers.length > 0) {
      alertList.push({
        id: 'high-credit',
        type: 'warning',
        category: 'credit',
        title: 'Crédito Alto',
        message: `${highCreditCustomers.length} cliente(s) próximo(s) do limite`,
        action: 'Ver Clientes',
        data: highCreditCustomers,
      });
    }

    // 3. Alerta de clientes que excederam o limite
    const exceededCreditCustomers = customers.filter(c => {
      if (c.credit_limit === 0) return false;
      return c.current_balance > c.credit_limit;
    });
    if (exceededCreditCustomers.length > 0) {
      alertList.push({
        id: 'exceeded-credit',
        type: 'error',
        category: 'credit',
        title: 'Limite Excedido',
        message: `${exceededCreditCustomers.length} cliente(s) excedeu(ram) o limite`,
        action: 'Ver Clientes',
        data: exceededCreditCustomers,
      });
    }

    // 4. Alerta de mesas abertas há mais de 2 horas
    const longOpenTables = tables.filter(t => {
      if (t.status === 'free' || !t.opened_at) return false;
      const hoursOpen = differenceInHours(new Date(), new Date(t.opened_at));
      return hoursOpen >= 2;
    });
    if (longOpenTables.length > 0) {
      alertList.push({
        id: 'long-open-tables',
        type: 'warning',
        category: 'table',
        title: 'Mesas Abertas Há Muito Tempo',
        message: `${longOpenTables.length} mesa(s) aberta(s) há mais de 2 horas`,
        action: 'Ver Mesas',
        data: longOpenTables,
      });
    }

    // 5. Alerta de produtos sem venda nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Produtos que não foram vendidos
    const unsoldProducts = products.filter(product => {
      // Verifica se o produto foi vendido nos últimos 7 dias
      // (Esta lógica precisa ser implementada com dados reais de vendas)
      return false; // Placeholder
    });

    if (unsoldProducts.length > 0) {
      alertList.push({
        id: 'unsold-products',
        type: 'info',
        category: 'product',
        title: 'Produtos Sem Venda',
        message: `${unsoldProducts.length} produto(s) sem venda há 7 dias`,
        action: 'Ver Produtos',
        data: unsoldProducts,
      });
    }

    return alertList;
  }, [ingredients, customers, tables, products]);

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter(a => a.type === 'error').length,
    warningAlerts: alerts.filter(a => a.type === 'warning').length,
  };
}
