import { format, isWithinInterval, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Product, Sale } from '@/types';

export interface HourPoint {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
}

export interface WeekdayPoint {
  day: number;
  label: string;
  orders: number;
  revenue: number;
}

export interface PaymentPoint {
  key: string;
  label: string;
  value: number;
}

export interface DailyPoint {
  day: string;
  date: Date;
  orders: number;
  revenue: number;
  ticket: number;
}

export interface TopProductPoint {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface PeriodComparison {
  current: { revenue: number; orders: number };
  previous: { revenue: number; orders: number };
  deltaRevenuePct: number;
  deltaOrdersPct: number;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function salesByHour(sales: Sale[]): HourPoint[] {
  const buckets: HourPoint[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}h`,
    orders: 0,
    revenue: 0,
  }));

  sales.forEach((sale) => {
    const ts = new Date(sale.createdAt);
    if (Number.isNaN(ts.getTime())) return;
    const hour = ts.getHours();
    buckets[hour].orders += 1;
    buckets[hour].revenue += sale.total;
  });

  return buckets;
}

export function salesByWeekday(sales: Sale[]): WeekdayPoint[] {
  const buckets: WeekdayPoint[] = WEEKDAY_LABELS.map((label, day) => ({
    day,
    label,
    orders: 0,
    revenue: 0,
  }));

  sales.forEach((sale) => {
    const ts = new Date(sale.createdAt);
    if (Number.isNaN(ts.getTime())) return;
    const day = ts.getDay();
    buckets[day].orders += 1;
    buckets[day].revenue += sale.total;
  });

  return buckets;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  card: 'Cartão',
};

const PAYMENT_KEYS = ['cash', 'mpesa', 'emola', 'card'] as const;

export function paymentBreakdown(sales: Sale[]): PaymentPoint[] {
  const totals: Record<string, number> = { cash: 0, mpesa: 0, emola: 0, card: 0 };

  sales.forEach((sale) => {
    Object.entries(sale.paymentDetails).forEach(([key, value]) => {
      if (key in totals) totals[key] += value;
    });
  });

  return PAYMENT_KEYS.map((key) => ({
    key,
    label: PAYMENT_LABELS[key],
    value: totals[key],
  })).filter((p) => p.value > 0);
}

export function dailyPerformance(sales: Sale[], days: number): DailyPoint[] {
  const today = new Date();
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(subDays(today, i));
  }

  const byKey = new Map<string, { orders: number; revenue: number }>();
  dates.forEach((d) => byKey.set(format(d, 'yyyy-MM-dd'), { orders: 0, revenue: 0 }));

  sales.forEach((sale) => {
    const ts = new Date(sale.createdAt);
    if (Number.isNaN(ts.getTime())) return;
    const point = byKey.get(format(ts, 'yyyy-MM-dd'));
    if (!point) return;
    point.orders += 1;
    point.revenue += sale.total;
  });

  return dates.map((date) => {
    const point = byKey.get(format(date, 'yyyy-MM-dd'))!;
    return {
      day: format(date, 'dd/MM', { locale: pt }),
      date,
      orders: point.orders,
      revenue: point.revenue,
      ticket: point.orders > 0 ? point.revenue / point.orders : 0,
    };
  });
}

export function topProducts(sales: Sale[], products: Product[]): TopProductPoint[] {
  const totals: Record<string, { quantity: number; revenue: number }> = {};

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const entry = totals[item.productId] || { quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.subtotal;
      totals[item.productId] = entry;
    });
  });

  return Object.entries(totals)
    .map(([id, value]) => ({
      id,
      name: products.find((p) => p.id === id)?.name ?? 'Item',
      ...value,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function comparePeriods(sales: Sale[], days: number): PeriodComparison {
  const today = new Date();
  const currentStart = subDays(today, days - 1);
  const prevStart = subDays(currentStart, days);

  const sum = (from: Date, to: Date) =>
    sales.reduce(
      (acc, sale) => {
        const ts = new Date(sale.createdAt);
        if (Number.isNaN(ts.getTime())) return acc;
        if (!isWithinInterval(ts, { start: from, end: to })) return acc;
        return { revenue: acc.revenue + sale.total, orders: acc.orders + 1 };
      },
      { revenue: 0, orders: 0 }
    );

  const current = sum(currentStart, today);
  const previous = sum(prevStart, subDays(currentStart, 1));

  return {
    current,
    previous,
    deltaRevenuePct: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
    deltaOrdersPct: previous.orders > 0 ? ((current.orders - previous.orders) / previous.orders) * 100 : 0,
  };
}