import { format, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Sale } from '@/types';

export interface ForecastDay {
  day: string;
  forecast: number;
}

export interface SalesForecast {
  dailyRevenue: number[];
  last30Days: Date[];
  avg30: number;
  ma7: number[];
  trend: 'up' | 'down';
  trendPct: number;
  forecastNext7: ForecastDay[];
  totalForecast7: number;
  todayRevenue: number;
  yesterdayRevenue: number;
}

function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export function computeSalesForecast(sales: Sale[]): SalesForecast {
  const today = new Date();
  const last30Days = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i));

  const dailyRevenue = last30Days.map((day) => {
    const daySales = sales.filter((s) => new Date(s.createdAt).toDateString() === day.toDateString());
    return daySales.reduce((sum, s) => sum + s.total, 0);
  });

  const avg30 = dailyRevenue.reduce((a, b) => a + b, 0) / 30;
  const ma7 = movingAverage(dailyRevenue, 7);

  const recentMA = ma7[ma7.length - 1] || avg30;
  const olderMA = ma7[ma7.length - 8] || avg30;
  const trend: 'up' | 'down' = recentMA > olderMA ? 'up' : 'down';
  const trendPct = olderMA > 0 ? ((recentMA - olderMA) / olderMA) * 100 : 0;

  const forecastNext7: ForecastDay[] =
    ma7.length > 0
      ? Array.from({ length: 7 }, (_, i) => ({
          day: format(subDays(today, -1 - i), 'EEE', { locale: pt }),
          forecast: Math.max(0, recentMA * (1 + (trendPct / 100) / 30 * (i + 1))),
        }))
      : [];

  const todayRevenue = dailyRevenue[dailyRevenue.length - 1] || 0;
  const yesterdayRevenue = dailyRevenue[dailyRevenue.length - 2] || 0;

  return {
    dailyRevenue,
    last30Days,
    avg30,
    ma7,
    trend,
    trendPct,
    forecastNext7,
    totalForecast7: forecastNext7.reduce((sum, d) => sum + d.forecast, 0),
    todayRevenue,
    yesterdayRevenue,
  };
}