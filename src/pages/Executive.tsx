import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Target, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/utils';
import { subDays, format, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export default function Executive() {
  const { sales, products } = useStore();

  const analysis = useMemo(() => {
    const today = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i));

    const dailyRevenue = last30Days.map(day => {
      const daySales = sales.filter(s =>
        new Date(s.createdAt).toDateString() === day.toDateString()
      );
      return daySales.reduce((sum, s) => sum + s.total, 0);
    });

    const avg30 = dailyRevenue.reduce((a, b) => a + b, 0) / 30;
    const ma7 = movingAverage(dailyRevenue, 7);

    const recentMA = ma7[ma7.length - 1] || avg30;
    const olderMA = ma7[ma7.length - 8] || avg30;
    const trend = recentMA > olderMA ? 'up' : 'down';
    const trendPct = olderMA > 0 ? ((recentMA - olderMA) / olderMA) * 100 : 0;

    const forecastNext7 = ma7.length > 0
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
      todayRevenue,
      yesterdayRevenue,
    };
  }, [sales]);

  const chartData = useMemo(() => {
    return analysis.last30Days.map((day, i) => ({
      day: format(day, 'dd/MM', { locale: pt }),
      receita: analysis.dailyRevenue[i],
      media: analysis.ma7[i] || null,
    }));
  }, [analysis]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Executivo</h1>
        <p className="text-muted-foreground">Previsões, tendências e indicadores</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Previsão Próximos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {formatCurrency(analysis.forecastNext7.reduce((s, d) => s + d.forecast, 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média 30 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(analysis.avg30)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tendência (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {analysis.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-2xl font-bold ${analysis.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.trendPct.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoje vs Ontem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {analysis.yesterdayRevenue > 0
                  ? (((analysis.todayRevenue - analysis.yesterdayRevenue) / analysis.yesterdayRevenue) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receita Diária (30 dias) + Média Móvel 7 dias</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fill="url(#colorRev)" strokeWidth={2} name="Receita" />
              <Line type="monotone" dataKey="media" stroke="#f59e0b" strokeWidth={2} dot={false} name="Média 7 dias" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previsão Próximos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysis.forecastNext7}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={v => formatCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="forecast" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Previsão" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
