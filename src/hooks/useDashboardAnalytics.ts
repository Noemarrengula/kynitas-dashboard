import { useMemo } from 'react';
import { useDatabase } from './useDatabase';
import { startOfDay, startOfWeek, startOfMonth, subDays, format, eachHourOfInterval, startOfHour } from 'date-fns';

export function useDashboardAnalytics() {
  const { sales, products, ingredients } = useDatabase();

  const analytics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const thisWeek = startOfWeek(now);
    const thisMonth = startOfMonth(now);
    const last7Days = subDays(now, 7);

    // Vendas de hoje
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

    // Vendas da semana
    const weekSales = sales.filter(s => new Date(s.createdAt) >= thisWeek);
    const weekRevenue = weekSales.reduce((sum, s) => sum + s.total, 0);

    // Vendas do mês
    const monthSales = sales.filter(s => new Date(s.createdAt) >= thisMonth);
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);

    // Ticket médio
    const avgTicket = sales.length > 0 ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length : 0;

    // Vendas por hora (últimas 24h)
    const last24h = subDays(now, 1);
    const hourlyData = eachHourOfInterval({ start: last24h, end: now }).map(hour => {
      const hourStart = startOfHour(hour);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const hourSales = sales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= hourStart && saleDate < hourEnd;
      });
      return {
        hour: format(hour, 'HH:mm'),
        sales: hourSales.length,
        revenue: hourSales.reduce((sum, s) => sum + s.total, 0),
      };
    });

    // Top 10 produtos mais vendidos
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!item.product) return; // Pular se produto não existe
        
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productSales.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }
      });
    });
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Mesas mais rentáveis (últimos 7 dias)
    const recentSales = sales.filter(s => new Date(s.createdAt) >= last7Days);
    const tableRevenue = new Map<number, { name?: string; revenue: number; count: number }>();
    recentSales.forEach(sale => {
      if (sale.table_number) {
        const existing = tableRevenue.get(sale.table_number);
        if (existing) {
          existing.revenue += sale.total;
          existing.count += 1;
        } else {
          tableRevenue.set(sale.table_number, {
            name: sale.table_name,
            revenue: sale.total,
            count: 1,
          });
        }
      }
    });
    const topTables = Array.from(tableRevenue.entries())
      .map(([number, data]) => ({ number, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Vendas por dia (últimos 7 dias)
    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const daySales = sales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= dayStart && saleDate < dayEnd;
      });
      return {
        date: format(date, 'dd/MM'),
        sales: daySales.length,
        revenue: daySales.reduce((sum, s) => sum + s.total, 0),
      };
    });

    return {
      today: { sales: todaySales.length, revenue: todayRevenue },
      week: { sales: weekSales.length, revenue: weekRevenue },
      month: { sales: monthSales.length, revenue: monthRevenue },
      avgTicket,
      hourlyData,
      topProducts,
      topTables,
      dailyData,
    };
  }, [sales, products]);

  return analytics;
}
