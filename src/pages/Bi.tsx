import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  Ticket,
  PackageX,
  FileDown,
  FileSpreadsheet,
  Clock4,
  CalendarDays,
  CreditCard,
  Trophy,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { format, isSameDay, startOfDay, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/store/useStore';
import { useDatabase } from '@/hooks/useDatabase';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { useI18n } from '@/contexts/I18nContext';
import { formatCurrency } from '@/lib/utils';
import {
  salesByHour,
  salesByWeekday,
  paymentBreakdown,
  dailyPerformance,
  topProducts,
  comparePeriods,
  type PaymentPoint,
} from '@/lib/analytics';
import { computeSalesForecast } from '@/lib/forecast';
import type { SalesForecast } from '@/lib/forecast';
import {
  exportExecutiveReportToPDF,
  exportExecutiveReportToExcel,
  exportStockForecastToPDF,
  exportStockForecastToExcel,
  type StockForecastRow,
} from '@/lib/biExport';
import { RevenueTrendChart, ForecastBarChart } from '@/components/bi/ForecastCharts';

const RANGE_OPTIONS = [
  { key: '7', label: '7 dias' },
  { key: '14', label: '14 dias' },
  { key: '30', label: '30 dias' },
] as const;

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PIE_COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#8b5cf6'];

function BiKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  delta?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-2xl font-bold truncate">{value}</p>
        {delta !== undefined ? (
          <div className={`flex items-center gap-1 text-xs ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="font-semibold">{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</span>
            <span className="text-muted-foreground">vs período anterior</span>
          </div>
        ) : sub ? (
          <p className="text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RankedProductRow({ name, quantity, revenue, maxRevenue }: { name: string; quantity: number; revenue: number; maxRevenue: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate font-medium">{name}</span>
        <span className="text-muted-foreground shrink-0 ml-2">
          {quantity} un · {formatCurrency(revenue)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: maxRevenue > 0 ? `${(revenue / maxRevenue) * 100}%` : '0%' }}
        />
      </div>
    </div>
  );
}

export default function Bi() {
  const { t } = useI18n();
  const { sales } = useStore();
  const { products, ingredients, productForecast, ingredientForecast } = useDatabase();
  const realtime = useRealtimeDashboard();
  const advancedApi = useAdvancedReports();

  const [range, setRange] = useState<'7' | '14' | '30'>('30');
  const N = Number(range);

  const [advanced, setAdvanced] = useState<{ hour: unknown[]; weekday: unknown[]; payments: unknown; daily: unknown[] }>({
    hour: [],
    weekday: [],
    payments: null,
    daily: [],
  });
  const [advancedLoaded, setAdvancedLoaded] = useState(false);

  const advancedRef = useRef(advancedApi);
  advancedRef.current = advancedApi;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hour, weekday, payments, daily] = await Promise.all([
        advancedRef.current.getSalesByHour(),
        advancedRef.current.getSalesByWeekday(),
        advancedRef.current.getPaymentMethodsSummary(),
        advancedRef.current.getDailyPerformance(30),
      ]);
      if (cancelled) return;
      setAdvanced({ hour, weekday, payments, daily });
      setAdvancedLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rangeSales = useMemo(() => {
    const cutoff = startOfDay(subDays(new Date(), N - 1));
    return sales.filter((s) => new Date(s.createdAt) >= cutoff);
  }, [sales, N]);

  const todaySales = useMemo(() => sales.filter((s) => isSameDay(new Date(s.createdAt), new Date())), [sales]);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayAvgTicket = todaySales.length > 0 ? todayRevenue / todaySales.length : 0;
  const criticalIngredients = useMemo(() => ingredients.filter((i) => i.stock <= i.minStock).length, [ingredients]);

  const rt = realtime.data;
  const kpiTodayRevenue = rt ? Number(rt.today_revenue) : todayRevenue;
  const kpiTodaySales = rt ? Number(rt.today_sales) : todaySales.length;
  const kpiAvgTicket = rt ? Number(rt.avg_ticket) : todayAvgTicket;
  const kpiCritical = rt ? Number(rt.critical_ingredients) : criticalIngredients;

  const hourData = useMemo(() => {
    if (advancedLoaded && advanced.hour.length > 0) {
      return (advanced.hour as Record<string, unknown>[])
        .map((r) => ({
          label: `${String(Math.round(Number(r.hour))).padStart(2, '0')}h`,
          orders: Number(r.total_sales ?? 0),
          revenue: Number(r.total_revenue ?? 0),
        }));
    }
    return salesByHour(rangeSales);
  }, [advanced, advancedLoaded, rangeSales]);

  const weekdayData = useMemo(() => {
    if (advancedLoaded && advanced.weekday.length > 0) {
      return (advanced.weekday as Record<string, unknown>[])
        .map((r) => {
          const num = Math.round(Number(r.day_of_week));
          return {
            label: WEEKDAY_LABELS[((num % 7) + 7) % 7],
            orders: Number(r.total_sales ?? 0),
            revenue: Number(r.total_revenue ?? 0),
          };
        });
    }
    return salesByWeekday(rangeSales);
  }, [advanced, advancedLoaded, rangeSales]);

  const paymentData = useMemo<PaymentPoint[]>(() => {
    if (advancedLoaded && advanced.payments) {
      const p = advanced.payments as Record<string, unknown>;
      const entries: [string, string, unknown][] = [
        ['cash', 'Dinheiro', p.cash_total],
        ['mpesa', 'M-Pesa', p.mpesa_total],
        ['emola', 'E-Mola', p.emola_total],
        ['card', 'Cartão', p.card_total],
      ];
      return entries
        .map(([key, label, value]) => ({ key, label, value: Number(value ?? 0) }))
        .filter((x) => x.value > 0);
    }
    return paymentBreakdown(rangeSales);
  }, [advanced, advancedLoaded, rangeSales]);

  const dailyData = useMemo(() => {
    if (advancedLoaded && advanced.daily.length > 0) {
      const asc = [...advanced.daily].reverse();
      const rows = asc.slice(-N).map((r) => {
        const row = r as Record<string, unknown>;
        return {
          day: format(new Date(String(row.date)), 'dd/MM', { locale: pt }),
          date: new Date(String(row.date)),
          orders: Number(row.total_sales ?? 0),
          revenue: Number(row.revenue ?? 0),
          ticket: Number(row.avg_ticket ?? 0),
        };
      });
      return rows;
    }
    return dailyPerformance(rangeSales, N);
  }, [advanced, advancedLoaded, N, rangeSales]);

  const topData = useMemo(() => topProducts(rangeSales, products).slice(0, 8), [rangeSales, products]);
  const maxTopRevenue = topData.length > 0 ? topData[0].revenue : 0;

  const comparison = useMemo(() => comparePeriods(rangeSales, N), [rangeSales, N]);
  const forecast = useMemo<SalesForecast>(() => computeSalesForecast(sales), [sales]);

  const periodRevenue = rangeSales.reduce((sum, s) => sum + s.total, 0);
  const periodOrders = rangeSales.length;
  const periodTicket = periodOrders > 0 ? periodRevenue / periodOrders : 0;

  const kpis: { label: string; value: string }[] = [
    { label: 'Receita (período)', value: formatCurrency(periodRevenue) },
    { label: 'Vendas (período)', value: String(periodOrders) },
    { label: 'Ticket médio', value: formatCurrency(periodTicket) },
    { label: 'Previsão 7 dias', value: formatCurrency(forecast.totalForecast7) },
    { label: 'Ingredientes críticos', value: String(kpiCritical) },
  ];

  const rangeLabel = `Últimos ${N} dias`;

  const handleExportPDF = () => {
    exportExecutiveReportToPDF({
      rangeLabel,
      kpis,
      byHour: hourData,
      byWeekday: weekdayData,
      payments: paymentData,
      topProducts: topData,
      daily: dailyData,
      forecast,
    });
  };

  const handleExportExcel = () => {
    exportExecutiveReportToExcel({
      rangeLabel,
      kpis,
      byHour: hourData,
      byWeekday: weekdayData,
      payments: paymentData,
      topProducts: topData,
      daily: dailyData,
      forecast,
    });
  };

  const stockRows = useMemo<StockForecastRow[]>(() => {
    const productRows: StockForecastRow[] = products.map((p) => {
      const f = productForecast[p.id];
      return {
        name: p.name,
        type: 'product',
        unit: p.type === 'drink' && p.fracionavel ? 'garrafa' : 'un',
        stock: p.stock ?? 0,
        minStock: 0,
        avgDailyQty: f?.avgDailyQty ?? 0,
        daysUntilEmpty: f?.daysUntilEmpty ?? null,
        suggestedRestockQty: f?.suggestedRestockQty ?? 0,
        needsRestock: f?.needsRestock ?? false,
      };
    });
    const ingredientRows: StockForecastRow[] = ingredients.map((i) => {
      const f = ingredientForecast[i.id];
      return {
        name: i.name,
        type: 'ingredient',
        unit: i.unit,
        stock: i.stock ?? 0,
        minStock: i.minStock ?? 0,
        avgDailyQty: f?.avgDailyQty ?? 0,
        daysUntilEmpty: f?.daysUntilEmpty ?? null,
        suggestedRestockQty: f?.suggestedRestockQty ?? 0,
        needsRestock: f?.needsRestock ?? false,
      };
    });
    return [...productRows, ...ingredientRows]
      .filter((r) => r.needsRestock)
      .sort((a, b) => (a.daysUntilEmpty ?? 999) - (b.daysUntilEmpty ?? 999));
  }, [products, ingredients, productForecast, ingredientForecast]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BrainCircuit className="h-6 w-6" />}
        title={t('nav.bi')}
        description="Análises avançadas, previsões e indicadores do negócio"
      >
        <Button variant="outline" onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="gradient" onClick={handleExportPDF}>
          <FileDown className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </PageHeader>

      <Tabs defaultValue="exec">
        <TabsList>
          <TabsTrigger value="exec">Visão Executiva</TabsTrigger>
          <TabsTrigger value="forecast">Previsões</TabsTrigger>
        </TabsList>

        <TabsContent value="exec" className="space-y-6 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Período de análise:</span>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setRange(opt.key)}
                    className={
                      (range === opt.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground") +
                      " px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={rt ? 'default' : 'secondary'}>
                {rt ? 'Dados ao vivo' : 'Dados locais (offline)'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <BiKpiCard icon={Wallet} label="Receita Hoje" value={formatCurrency(kpiTodayRevenue)} />
            <BiKpiCard icon={ShoppingCart} label="Vendas Hoje" value={String(kpiTodaySales)} />
            <BiKpiCard icon={Ticket} label="Ticket Médio Hoje" value={formatCurrency(kpiAvgTicket)} />
            <BiKpiCard icon={AlertTriangle} label="Ingredientes Críticos" value={String(kpiCritical)} />
            <BiKpiCard
              icon={Wallet}
              label={`Receita ${rangeLabel.toLowerCase()}`}
              value={formatCurrency(periodRevenue)}
              delta={comparison.deltaRevenuePct}
            />
            <BiKpiCard
              icon={ShoppingCart}
              label={`Vendas ${rangeLabel.toLowerCase()}`}
              value={String(periodOrders)}
              delta={comparison.deltaOrdersPct}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock4 className="h-4 w-4 text-primary" />
                  Vendas por Hora do Dia
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={1} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCurrency(v)} width={70} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Vendas por Dia da Semana
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCurrency(v)} width={70} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Métodos de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="hsl(var(--background))"
                      >
                        {paymentData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {paymentData.map((p, i) => (
                    <div key={p.key} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1">{p.label}</span>
                      <span className="font-semibold">{formatCurrency(p.value)}</span>
                    </div>
                  ))}
                  {paymentData.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Top Produtos (receita)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topData.map((p) => (
                  <RankedProductRow
                    key={p.id}
                    name={p.name}
                    quantity={p.quantity}
                    revenue={p.revenue}
                    maxRevenue={maxTopRevenue}
                  />
                ))}
                {topData.length === 0 && <p className="text-sm text-muted-foreground">Sem vendas no período.</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Diária</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCurrency(v)} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} name="Receita" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Previsão Próximos 7 Dias</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(forecast.totalForecast7)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Média 30 Dias</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(forecast.avg30)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tendência (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {forecast.trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                  <span className={forecast.trend === 'up' ? 'text-success' : 'text-destructive'}>
                    {forecast.trendPct.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hoje vs Ontem</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {forecast.yesterdayRevenue > 0
                    ? (((forecast.todayRevenue - forecast.yesterdayRevenue) / forecast.yesterdayRevenue) * 100).toFixed(1)
                    : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          <RevenueTrendChart
            data={forecast.last30Days.map((day, i) => ({
              day: format(day, 'dd/MM', { locale: pt }),
              receita: forecast.dailyRevenue[i],
              media: forecast.ma7[i] || null,
            }))}
          />

          <ForecastBarChart data={forecast.forecastNext7} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <PackageX className="h-4 w-4 text-warning" />
                Previsão de Stock (reposição)
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportStockForecastToExcel(stockRows)}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportStockForecastToPDF(stockRows)}>
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="bg-warning/10 text-warning">{stockRows.length} item(ns) em risco</Badge>
                <span className="text-muted-foreground">
                  Baseado no consumo dos últimos 30 dias — repor antes do esgotamento.
                </span>
              </div>

              {stockRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item precisa de reposição neste momento.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="py-2 pr-3 font-medium">Item</th>
                        <th className="py-2 pr-3 font-medium">Tipo</th>
                        <th className="py-2 pr-3 font-medium text-right">Stock</th>
                        <th className="py-2 pr-3 font-medium text-right">Mín.</th>
                        <th className="py-2 pr-3 font-medium text-right">Consumo/dia</th>
                        <th className="py-2 pr-3 font-medium">Esgota em</th>
                        <th className="py-2 pr-3 font-medium text-right">Sugestão repor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockRows.map((r) => (
                        <tr key={`${r.type}-${r.name}`} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{r.name}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{r.type === 'product' ? 'Produto' : 'Ingrediente'}</td>
                          <td className="py-2 pr-3 text-right">{r.stock} {r.unit}</td>
                          <td className="py-2 pr-3 text-right">{r.minStock} {r.unit}</td>
                          <td className="py-2 pr-3 text-right">{r.avgDailyQty > 0 ? r.avgDailyQty.toFixed(1) : '—'}</td>
                          <td className="py-2 pr-3">
                            {r.daysUntilEmpty !== null ? (
                              <span className="text-warning font-medium">{r.daysUntilEmpty} dia(s)</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right font-semibold text-primary">{Math.max(0, r.suggestedRestockQty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}