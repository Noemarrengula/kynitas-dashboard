import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { addDays, differenceInDays, format, startOfDay, eachHourOfInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { DateRange } from './DateFilter';

interface SalesPerformanceChartProps {
  sales: Sale[];
  range: DateRange;
  revenue: number;
  prevRevenue: number;
  count: number;
  prevCount: number;
}

type Metric = 'revenue' | 'sales';

export function SalesPerformanceChart({
  sales,
  range,
  revenue,
  prevRevenue,
  count,
  prevCount,
}: SalesPerformanceChartProps) {
  const [metric, setMetric] = useState<Metric>('revenue');

  const isSingleDay = differenceInDays(range.to, range.from) === 0;

  const data = useMemo(() => {
    const start = startOfDay(range.from);

    if (isSingleDay) {
      const end = addDays(startOfDay(range.to), 1);
      return eachHourOfInterval({ start, end }).map((hour) => {
        const hourStart = hour.getTime();
        const hourEnd = hourStart + 3600 * 1000;
        const inRange = sales.filter((s) => {
          const t = new Date(s.createdAt).getTime();
          return t >= hourStart && t < hourEnd;
        });
        return {
          label: format(hour, 'HH:00'),
          revenue: inRange.reduce((acc, s) => acc + s.total, 0),
          sales: inRange.length,
        };
      });
    }

    const days = differenceInDays(range.to, range.from) + 1;
    return Array.from({ length: days }, (_, i) => {
      const day = addDays(start, i);
      const dayStart = day.getTime();
      const dayEnd = dayStart + 24 * 3600 * 1000;
      const inRange = sales.filter((s) => {
        const t = new Date(s.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      });
      return {
        label: format(day, 'dd/MM', { locale: pt }),
        revenue: inRange.reduce((acc, s) => acc + s.total, 0),
        sales: inRange.length,
      };
    });
  }, [sales, range, isSingleDay]);

  const current = metric === 'revenue' ? revenue : count;
  const previous = metric === 'revenue' ? prevRevenue : prevCount;

  const delta =
    previous > 0
      ? ((current - previous) / previous) * 100
      : current > 0
        ? undefined
        : 0;

  const stroke =
    metric === 'revenue' ? 'hsl(var(--primary))' : 'hsl(var(--info))';
  const gradientId = metric === 'revenue' ? 'revGradient' : 'cntGradient';

  const TrendIcon = delta == null ? undefined : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta == null ? 'text-muted-foreground' : delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle>Desempenho de vendas</CardTitle>
            {delta != null && (
              <span className={cn("inline-flex items-center gap-1 text-xs font-medium", trendColor)}>
                {TrendIcon && <TrendIcon className="h-3.5 w-3.5" />}
                <span>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                </span>
                <span className="text-muted-foreground font-normal">vs {range.label}</span>
              </span>
            )}
          </div>
          <div className="flex rounded-md border p-0.5" role="tablist" aria-label="Métrica do gráfico">
            <Button
              size="sm"
              variant={metric === 'revenue' ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setMetric('revenue')}
            >
              Receita
            </Button>
            <Button
              size="sm"
              variant={metric === 'sales' ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setMetric('sales')}
            >
              Vendas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-[260px] lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stroke} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  interval={Math.max(0, Math.ceil(data.length / 8) - 1)}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(value: number) =>
                    metric === 'revenue' ? String(Math.round(value / 1000)) + 'k' : String(value)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) =>
                    metric === 'revenue' ? [formatCurrency(value), 'Receita'] : [value, 'Vendas']
                  }
                  labelFormatter={(label) => `${range.label} · ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={stroke}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                {metric === 'revenue' ? 'Receita no período' : 'Vendas no período'}
              </p>
              <p className="kpi-value mt-1">
                {metric === 'revenue' ? formatCurrency(revenue) : count.toLocaleString('pt-MZ')}
              </p>
              {delta != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Período anterior: {metric === 'revenue' ? formatCurrency(prevRevenue) : prevCount.toLocaleString('pt-MZ')}
                </p>
              )}
            </div>
            {delta != null && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Diferença</p>
                <p className={cn("kpi-value mt-1", trendColor)}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}