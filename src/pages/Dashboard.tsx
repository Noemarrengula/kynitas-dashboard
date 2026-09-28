import { useMemo, useState, type ComponentType } from 'react';
import {
  ShoppingCart,
  Banknote,
  CreditCard,
  Smartphone,
  Package,
  Receipt,
  RefreshCw,
  Target,
  WifiOff,
  Wifi,
  Calendar,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { DateFilter, type DateRange } from '@/components/dashboard/DateFilter';
import { OperationState } from '@/components/dashboard/OperationState';
import { RequiresAttention } from '@/components/dashboard/RequiresAttention';
import { SecondaryKpis } from '@/components/dashboard/SecondaryKpis';
import { SalesPerformanceChart } from '@/components/dashboard/SalesPerformanceChart';
import { TopProducts } from '@/components/dashboard/TopProducts';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { BusinessInsights } from '@/components/dashboard/BusinessInsights';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TopTablesCard } from '@/components/dashboard/TopTablesCard';
import { HealthCheckPanel } from '@/components/dashboard/HealthCheckPanel';
import { useDatabase } from '@/hooks/useDatabase';
import { useStore } from '@/store/useStore';
import { useOpenShift, type OpenShiftState } from '@/hooks/useOpenShift';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import {
  startOfDay,
  addDays,
  subDays,
  differenceInDays,
  startOfWeek,
  startOfMonth,
  endOfWeek,
  endOfMonth,
} from 'date-fns';
import { useBusinessGoals } from '@/hooks/useBusinessGoals';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useI18n } from '@/contexts/I18nContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';

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
  const navigate = useNavigate();
  const { loading, error, sales, loadAllSales, profitByProduct } = useDatabase();
  const products = useStore(s => s.products);
  const ingredients = useStore(s => s.ingredients);
  const credits = useStore(s => s.credits);
  const tables = useStore(s => s.tables);
  const { goals } = useBusinessGoals();
  const { online, pendingCount, syncPending } = useOfflineSync();
  const openShiftState = useOpenShift();
  const [range, setRange] = useState<DateRange>(initialRange);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useI18n();
  const { isSuperAdmin } = usePermissions();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

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
    const productsSold = filteredSales.reduce(
      (acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0),
      0,
    );
    const avgTicket = count > 0 ? revenue / count : 0;

    const prevRevenue = previousSales.reduce((acc, s) => acc + s.total, 0);
    const prevCount = previousSales.length;
    const prevProductsSold = previousSales.reduce(
      (acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0),
      0,
    );
    const prevAvgTicket = prevCount > 0 ? prevRevenue / prevCount : 0;

    return {
      revenue,
      count,
      productsSold,
      avgTicket,
      prevRevenue,
      prevCount,
      prevProductsSold,
      prevAvgTicket,
    };
  }, [filteredSales, previousSales]);

  const periodProfit = useMemo(() => {
    const estimate = (salesList: typeof filteredSales) => {
      let costAvailable = true;
      let grossProfit = 0;
      let revenue = 0;
      salesList.forEach(s =>
        s.items.forEach(item => {
          const p = profitByProduct[item.productId];
          if (!p || p.realUnitCost <= 0) {
            costAvailable = false;
            return;
          }
          grossProfit += item.subtotal - item.quantity * p.realUnitCost;
          revenue += item.subtotal;
        }),
      );
      return { costAvailable, grossProfit, revenue };
    };

    const current = estimate(filteredSales);
    const previous = estimate(previousSales);
    return {
      available: current.costAvailable && current.revenue > 0,
      grossProfit: current.grossProfit,
      grossMargin: current.revenue > 0 ? (current.grossProfit / current.revenue) * 100 : 0,
      prevGrossProfit: previous.costAvailable && previous.revenue > 0 ? previous.grossProfit : undefined,
    };
  }, [filteredSales, previousSales, profitByProduct]);

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

  const criticalStockCount =
    products.filter(p => p.stock <= 5).length +
    ingredients.filter(i => i.stock <= i.minStock).length;

  const pendingCredits = credits.reduce((acc, c) => acc + (c.remainingBalance || 0), 0);
  const tablesOccupied = tables.filter(t => t.status !== 'free').length;

  const revenuePct =
    metrics.prevRevenue > 0
      ? ((metrics.revenue - metrics.prevRevenue) / metrics.prevRevenue) * 100
      : metrics.revenue > 0
        ? undefined
        : 0;

  const countPct = getTrend(metrics.count, metrics.prevCount)?.value;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllSales();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-52" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-28 mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && sales.length === 0) {
    return (
      <ErrorState
        title="Não foi possível carregar o centro de comando"
        message="Ocorreu um erro ao carregar os dados. Tente novamente."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const profitTrend =
    periodProfit.prevGrossProfit !== undefined
      ? getTrend(periodProfit.grossProfit, periodProfit.prevGrossProfit)
      : undefined;

  const showProfit = periodProfit.available;

  return (
    <div className="space-y-5">
      {/* Identidade + Período + Actualizar */}
      <PageHeader
        title={t('nav.dashboard')}
        description="Visão geral da operação e desempenho do negócio."
      >
        <HealthCheckPanel showDetails={false} />
        <Badge variant="outline" className="text-xs" aria-label={`Período: ${range.label}`}>
          {range.label}
        </Badge>
        <DateFilter value={range} onChange={setRange} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Actualizar dados"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'A actualizar...' : 'Actualizar'}
        </Button>
      </PageHeader>

      {/* Estado offline / sincronização */}
      {!online && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-destructive">
            <WifiOff className="h-4 w-4 shrink-0" />
            Offline — alguns dados podem estar desactualizados.
          </span>
          {pendingCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {pendingCount} venda{pendingCount === 1 ? '' : 's'} aguarda{pendingCount === 1 ? '' : 'm'} sincronização
            </span>
          )}
        </div>
      )}
      {online && pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-warning">
            <Wifi className="h-4 w-4 shrink-0" />
            {pendingCount} venda{pendingCount === 1 ? '' : 's'} aguarda{pendingCount === 1 ? '' : 'm'} sincronização.
          </span>
          <Button variant="outline" size="sm" onClick={() => syncPending()}>
            Sincronizar
          </Button>
        </div>
      )}

      {/* Estado operacional */}
      <OperationState />

      {/* Super Admin — visão global multi-tenant */}
      {isSuperAdmin && (
        <button
          onClick={() => navigate('/administracao')}
          className="w-full flex items-center justify-between gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-left hover:bg-yellow-500/15 transition-colors"
        >
          <span className="flex items-center gap-2 text-yellow-700">
            <Crown className="h-4 w-4 shrink-0" />
            Visão global multi-estabelecimento disponível — Gerir todos os bares e utilizadores.
          </span>
          <span className="text-xs font-medium text-yellow-700 underline underline-offset-2">Abrir Administração Central</span>
        </button>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Receita"
          value={formatCurrency(metrics.revenue)}
          icon={Banknote}
          trend={getTrend(metrics.revenue, metrics.prevRevenue)}
          onClick={() => navigate('/sales/history')}
          className="cursor-pointer"
        />
        <MetricCard
          title="Vendas"
          value={metrics.count.toLocaleString('pt-MZ')}
          icon={Receipt}
          trend={getTrend(metrics.count, metrics.prevCount)}
          onClick={() => navigate('/sales')}
          className="cursor-pointer"
        />
        <MetricCard
          title="Ticket médio"
          value={formatCurrency(metrics.avgTicket)}
          icon={ShoppingCart}
          trend={getTrend(metrics.avgTicket, metrics.prevAvgTicket)}
        />
        {showProfit ? (
          <MetricCard
            title="Lucro estimado"
            value={formatCurrency(periodProfit.grossProfit)}
            subtitle={`${periodProfit.grossMargin.toFixed(1)}% de margem`}
            icon={Package}
            trend={profitTrend}
            className={periodProfit.grossProfit < 0 ? 'border-destructive/40' : ''}
          />
        ) : (
          <MetricCard
            title="Produtos vendidos"
            value={metrics.productsSold.toLocaleString('pt-MZ')}
            icon={Package}
            trend={getTrend(metrics.productsSold, metrics.prevProductsSold)}
          />
        )}
      </div>

      {/* KPIs secundários */}
      <SecondaryKpis shift={openShiftState} />

      {/* Requer atenção */}
      <RequiresAttention />

      {/* Formas de pagamento */}
      <div>
        <SectionHeader title="Formas de pagamento" description={`Período: ${range.label}`} />
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PaymentMethodCard label="Dinheiro" value={periodPayments.cash} icon={Banknote} tint="green" />
          <PaymentMethodCard label="M-Pesa" value={periodPayments.mpesa} icon={Smartphone} tint="blue" />
          <PaymentMethodCard label="E-Mola" value={periodPayments.emola} icon={Smartphone} tint="purple" />
          <PaymentMethodCard label="Cartão" value={periodPayments.card} icon={CreditCard} tint="orange" />
        </div>
      </div>

      {/* Desempenho de vendas */}
      <SalesPerformanceChart
        sales={filteredSales}
        range={range}
        revenue={metrics.revenue}
        prevRevenue={metrics.prevRevenue}
        count={metrics.count}
        prevCount={metrics.prevCount}
      />

      {/* Produtos mais vendidos + categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProducts />
        <CategoryBreakdown sales={filteredSales} />
      </div>

      {/* Resumo de vendas (hoje/semana/mês) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
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

      {/* Vendas recentes + mesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentSales />
        <TopTablesCard />
      </div>

      {/* Insights do negócio */}
      <div className="space-y-3">
        <SectionHeader
          title="Insights do negócio"
          description="Leituras automáticas dos dados actuais"
        />
        <BusinessInsights
          revenuePct={revenuePct}
          countPct={countPct}
          criticalStockCount={criticalStockCount}
          pendingCredits={pendingCredits}
          openShift={openShiftState.open}
          tablesOccupied={tablesOccupied}
        />
      </div>

      {/* Metas */}
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
                    <span className="font-medium">
                      {goal.category === 'revenue'
                        ? 'Receita'
                        : goal.category === 'sales_count'
                          ? 'Vendas'
                          : 'Ticket Médio'}
                    </span>
                    <span className="text-muted-foreground">{goal.progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.status === 'achieved' || goal.status === 'overachieved'
                          ? 'bg-green-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{goal.current.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}</span>
                    <span>
                      Meta: {goal.target.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acções rápidas */}
      <QuickActions />
    </div>
  );
}