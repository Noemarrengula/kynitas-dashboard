import { useMemo, useState, type ComponentType } from 'react';
import { ShoppingCart, AlertTriangle, Banknote, CreditCard, Smartphone, Package, Calendar, Receipt, RefreshCw, Target } from 'lucide-react';
import { QuickStat } from '@/components/dashboard/QuickStat';
import { DateFilter, type DateRange } from '@/components/dashboard/DateFilter';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopProducts } from '@/components/dashboard/TopProducts';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { HealthCheckPanel } from '@/components/dashboard/HealthCheckPanel';
import { HourlySalesChart } from '@/components/dashboard/HourlySalesChart';
import { TopTablesCard } from '@/components/dashboard/TopTablesCard';
import { useDatabase } from '@/hooks/useDatabase';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { startOfDay, addDays, subDays, differenceInDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { useBusinessGoals } from '@/hooks/useBusinessGoals';
import { useI18n } from '@/contexts/I18nContext';

interface PaymentMethodCardProps {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tint: 'green' | 'blue' | 'purple' | 'orange';
}

const paymentTints = {
  green: { icon: 'text-green-500', chip: 'bg-green-500/10' },
  blue: { icon: 'text-blue-500', chip: 'bg-blue-500/10' },
  purple: { icon: 'text-purple-500', chip: 'bg-purple-500/10' },
  orange: { icon: 'text-orange-500', chip: 'bg-orange-500/10' },
};

function PaymentMethodCard({ label, value, icon: Icon, tint }: PaymentMethodCardProps) {
  const tintClasses = paymentTints[tint];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-2 rounded-lg shrink-0 ${tintClasses.chip}`}>
            <Icon className={`h-5 w-5 ${tintClasses.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold truncate">{formatCurrency(value)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TrendData {
  value: number;
  type: 'increase' | 'decrease' | 'neutral';
  period: string;
}

function getTrend(current: number, previous: number): TrendData | undefined {
  if (previous === 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(pct)),
    type: pct > 0 ? 'increase' : pct < 0 ? 'decrease' : 'neutral',
    period: 'vs período anterior',
  };
}

const initialRange: DateRange = {
  from: new Date(),
  to: new Date(),
  label: 'Hoje',
};

export default function Dashboard() {
  const { loading, loadAllSales } = useDatabase();
  const { orders, products, sales, ingredients } = useStore();
  const { goals } = useBusinessGoals();
  const [range, setRange] = useState<DateRange>(initialRange);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useI18n();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const todaySales = sales
    .filter(s => new Date(s.createdAt).toDateString() === now.toDateString())
    .reduce((acc, s) => acc + s.total, 0);

  const weekSales = sales
    .filter(s => {
      const date = new Date(s.createdAt);
      return date >= weekStart && date <= weekEnd;
    })
    .reduce((acc, s) => acc + s.total, 0);

  const monthSales = sales
    .filter(s => {
      const date = new Date(s.createdAt);
      return date >= monthStart && date <= monthEnd;
    })
    .reduce((acc, s) => acc + s.total, 0);

  const criticalStockProducts = products.filter(p => p.stock <= 5);
  const criticalIngredients = ingredients.filter(i => i.stock <= i.minStock);
  const activeOrders = orders.filter(o => o.status !== 'paid');

  // Vendas do período selecionado + período anterior equivalente
  const filteredSales = useMemo(() => {
    const from = startOfDay(range.from);
    const toEnd = addDays(startOfDay(range.to), 1);
    return sales.filter(s => {
      const d = new Date(s.createdAt);
      return d >= from && d < toEnd;
    });
  }, [sales, range]);

  const previousSales = useMemo(() => {
    const from = startOfDay(range.from);
    const duration = Math.max(1, differenceInDays(range.to, range.from) + 1);
    const prevFrom = subDays(from, duration);
    return sales.filter(s => {
      const d = new Date(s.createdAt);
      return d >= prevFrom && d < from;
    });
  }, [sales, range]);

  const metrics = useMemo(() => {
    const revenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const count = filteredSales.length;
    const productsSold = filteredSales.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0), 0);
    const avgTicket = count > 0 ? revenue / count : 0;

    const prevRevenue = previousSales.reduce((acc, s) => acc + s.total, 0);
    const prevCount = previousSales.length;
    const prevProductsSold = previousSales.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0), 0);
    const prevAvgTicket = prevCount > 0 ? prevRevenue / prevCount : 0;

    return { revenue, count, productsSold, avgTicket, prevRevenue, prevCount, prevProductsSold, prevAvgTicket };
  }, [filteredSales, previousSales]);

  const periodPayments = useMemo(() => {
    return filteredSales.reduce<{ cash: number; mpesa: number; emola: number; card: number }>(
      (acc, s) => {
        acc.cash += s.paymentDetails?.cash ?? 0;
        acc.mpesa += s.paymentDetails?.mpesa ?? 0;
        acc.emola += s.paymentDetails?.emola ?? 0;
        acc.card += s.paymentDetails?.card ?? 0;
        return acc;
      },
      { cash: 0, mpesa: 0, emola: 0, card: 0 },
    );
  }, [filteredSales]);

  const paymentChartData = [
    { name: 'Dinheiro', value: periodPayments.cash, color: '#10b981' },
    { name: 'M-Pesa', value: periodPayments.mpesa, color: '#3b82f6' },
    { name: 'E-Mola', value: periodPayments.emola, color: '#8b5cf6' },
    { name: 'Cartão', value: periodPayments.card, color: '#f59e0b' },
  ].filter(m => m.value > 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllSales();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('nav.dashboard')}
        description="Visão geral do seu estabelecimento"
      >
        <Badge variant="outline" className="text-xs">
          {range.label}
        </Badge>
        <DateFilter value={range} onChange={setRange} />
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Carregar histórico completo"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {/* Alertas e Health Check */}
      <AlertsPanel />
      <HealthCheckPanel showDetails={true} />

      {/* Métricas do período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <QuickStat
          title="Receita do Período"
          value={metrics.revenue}
          format="currency"
          change={getTrend(metrics.revenue, metrics.prevRevenue)}
        />
        <QuickStat
          title="Vendas no Período"
          value={metrics.count}
          change={getTrend(metrics.count, metrics.prevCount)}
        />
        <QuickStat
          title="Ticket Médio"
          value={metrics.avgTicket}
          format="currency"
          change={getTrend(metrics.avgTicket, metrics.prevAvgTicket)}
        />
        <QuickStat
          title="Produtos Vendidos"
          value={metrics.productsSold}
          change={getTrend(metrics.productsSold, metrics.prevProductsSold)}
        />
      </div>

      {/* Payment Methods Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PaymentMethodCard label="Dinheiro" value={periodPayments.cash} icon={Banknote} tint="green" />
        <PaymentMethodCard label="M-Pesa" value={periodPayments.mpesa} icon={Smartphone} tint="blue" />
        <PaymentMethodCard label="E-Mola" value={periodPayments.emola} icon={Smartphone} tint="purple" />
        <PaymentMethodCard label="Cartão" value={periodPayments.card} icon={CreditCard} tint="orange" />
      </div>

      {/* Sales Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumo de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">{range.label}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.revenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{metrics.count} vendas</p>
            </div>
            <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <p className="text-sm text-muted-foreground mb-1">Esta Semana</p>
              <p className="text-2xl font-bold text-blue-500">{formatCurrency(weekSales)}</p>
              <p className="text-xs text-muted-foreground mt-1">Média: {formatCurrency(weekSales / 7)}/dia</p>
            </div>
            <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
              <p className="text-sm text-muted-foreground mb-1">Este Mês</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(monthSales)}</p>
              <p className="text-xs text-muted-foreground mt-1">Média: {formatCurrency(monthSales / now.getDate())}/dia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <HourlySalesChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopProducts />
        <TopTablesCard />
        <RecentSales />
      </div>

      {/* Payment Methods Chart */}
      {paymentChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pagamento ({range.label})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentChartData}
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Alerts */}
      {(criticalIngredients.length > 0 || criticalStockProducts.length > 0) && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Stock Baixo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {criticalIngredients.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Ingredientes ({criticalIngredients.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {criticalIngredients.map((ingredient) => (
                    <div key={ingredient.id} className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                      <p className="text-sm font-medium">{ingredient.name}</p>
                      <p className="text-xs text-warning font-semibold">
                        {ingredient.stock} {ingredient.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">Mínimo: {ingredient.minStock} {ingredient.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {criticalStockProducts.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Produtos ({criticalStockProducts.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {criticalStockProducts.map((product) => (
                    <div key={product.id} className="bg-destructive/10 rounded-lg p-3 border border-destructive/20 flex items-center gap-3">
                      {product.image && (
                        <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-destructive font-semibold">{product.stock} em stock</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Metas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.slice(0, 6).map(goal => (
                <div key={goal.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{goal.category === 'revenue' ? 'Receita' : goal.category === 'sales_count' ? 'Vendas' : 'Ticket Médio'}</span>
                    <span className="text-muted-foreground">{goal.progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${goal.status === 'achieved' || goal.status === 'overachieved' ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{goal.current.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}</span>
                    <span>Meta: {goal.target.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          {metrics.count} venda(s) no período selecionado
        </span>
        <span>
          Período anterior: {formatCurrency(metrics.prevRevenue)}
        </span>
      </div>
    </div>
  );
}