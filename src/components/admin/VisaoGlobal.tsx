import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  HandCoins,
  Percent,
  RefreshCw,
  ShoppingCart,
  Crown,
  Store,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { DateFilter, type DateRange } from '@/components/dashboard/DateFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface GlobalOverview {
  total_revenue: number;
  total_sales: number;
  avg_ticket: number;
  prev_revenue: number;
  prev_sales: number;
  business_count: number;
  total_customers: number;
  open_credit: number;
}

interface BusinessRow {
  business_id: string;
  name: string;
  revenue: number;
  sales_count: number;
  avg_ticket: number;
  share_pct: number;
}

interface SeriesPoint {
  day: string;
  revenue: number;
  sales: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

type TrendType = 'increase' | 'decrease' | 'neutral';

function toDelta(current: number, previous: number): { value: number; type: TrendType } | undefined {
  if (previous <= 0) {
    return current > 0 ? { value: 0, type: 'increase' } : undefined;
  }
  const pct = ((current - previous) / previous) * 100;
  const type: TrendType = pct > 0 ? 'increase' : pct < 0 ? 'decrease' : 'neutral';
  return { value: Math.abs(pct), type };
}

export function VisaoGlobal() {
  const [range, setRange] = useState<DateRange>(() => ({
    from: subDays(new Date(), 6),
    to: new Date(),
    label: 'Últimos 7 dias',
  }));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<GlobalOverview | null>(null);
  const [comparison, setComparison] = useState<BusinessRow[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const p_from = range.from.toISOString();
    const p_to = range.to.toISOString();

    try {
      const [ov, cmp, srs, top] = await Promise.all([
        supabase.rpc('get_global_overview', { p_from, p_to }),
        supabase.rpc('get_business_comparison', { p_from, p_to }),
        supabase.rpc('get_global_revenue_series', { p_from, p_to }),
        supabase.rpc('get_global_top_products', { p_from, p_to, p_limit: 10 }),
      ]);

      if (ov.error) throw ov.error;
      if (cmp.error) throw cmp.error;
      if (srs.error) throw srs.error;
      if (top.error) throw top.error;

      setOverview(ov.data as GlobalOverview);
      setComparison((cmp.data as BusinessRow[]) || []);
      setSeries((srs.data as SeriesPoint[]) || []);
      setTopProducts((top.data as TopProduct[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados globais');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const maxShare = Math.max(...comparison.map((b) => b.share_pct), 0);
  const maxProductRevenue = Math.max(...topProducts.map((p) => p.revenue), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-bold">Visão Global</h2>
          <span className="text-xs text-muted-foreground">
            Consolidação de todos os estabelecimentos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DateFilter value={range} onChange={setRange} />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPIs globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Receita no período"
          value={formatCurrency(overview?.total_revenue ?? 0)}
          icon={Banknote}
          loading={loading}
          trend={overview ? toDelta(overview.total_revenue, overview.prev_revenue) : undefined}
        />
        <MetricCard
          title="Vendas"
          value={(overview?.total_sales ?? 0).toLocaleString('pt-MZ')}
          icon={ShoppingCart}
          loading={loading}
          trend={overview ? toDelta(overview.total_sales, overview.prev_sales) : undefined}
        />
        <MetricCard
          title="Ticket médio"
          value={formatCurrency(overview?.avg_ticket ?? 0)}
          icon={Percent}
          loading={loading}
          hint="Por transação"
        />
        <MetricCard
          title="Crédito em aberto"
          value={formatCurrency(overview?.open_credit ?? 0)}
          icon={HandCoins}
          loading={loading}
          hint={`${overview?.business_count ?? 0} negócios · ${overview?.total_customers ?? 0} clientes`}
        />
      </div>

      {/* Série temporal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Receita por dia (todos os negócios)</CardTitle>
        </CardHeader>
        <CardContent>
          {series.length === 0 && !loading ? (
            <EmptyState
              icon={Banknote}
              title="Sem vendas no período"
              description="Os dados consolidados aparecerão aqui assim que houver vendas."
            />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="globalRevGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(series.length / 8) - 1)}
                    tickFormatter={(value: string) => {
                      const d = new Date(value + 'T00:00:00');
                      return isNaN(d.getTime())
                        ? value
                        : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
                    }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: '13px',
                    }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value: number, name: string) =>
                      name === 'revenue' ? [formatCurrency(value), 'Receita'] : [value, 'Vendas']
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#globalRevGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparativo de estabelecimentos + Top produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Store className="h-4 w-4" />
              Comparativo por Estabelecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparison.length === 0 && !loading ? (
              <EmptyState
                icon={Store}
                title="Sem estabelecimentos ativos"
                description="Os negócios ativos aparecerão aqui."
              />
            ) : (
              <div className="list-panel overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.map((b) => (
                      <TableRow key={b.business_id}>
                        <TableCell>
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(b.avg_ticket)} / venda</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {b.sales_count.toLocaleString('pt-MZ')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(b.revenue)}
                        </TableCell>
                        <TableCell className="text-right" style={{ width: 140 }}>
                          <div className="flex items-center gap-2 justify-end">
                            <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full gradient-primary rounded-full transition-all duration-500"
                                style={{ width: `${(b.share_pct / (maxShare || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-9">{b.share_pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Top Produtos Globais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 && !loading ? (
              <EmptyState
                icon={Crown}
                title="Sem produtos vendidos"
                description="Os produtos mais vendidos em todos os negócios aparecerão aqui."
              />
            ) : (
              <div className="space-y-4">
                {topProducts.map((p, index) => (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        <span className="text-muted-foreground mr-2">{index + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {p.quantity} · {formatCurrency(p.revenue)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all duration-500"
                        style={{ width: `${(p.revenue / (maxProductRevenue || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VisaoGlobal;