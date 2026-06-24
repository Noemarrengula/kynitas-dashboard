import { DollarSign, ShoppingCart, AlertTriangle, TrendingUp, Banknote, CreditCard, Smartphone, Package, Calendar, Loader2 } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';

export default function Dashboard() {
  const { loading, loadAllSales } = useDatabase();
  const { orders, products, sales, ingredients } = useStore();
  
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
  
  const todaySalesCount = sales.filter(s => new Date(s.createdAt).toDateString() === now.toDateString()).length;
  
  const criticalStockProducts = products.filter(p => p.stock <= 5);
  const criticalIngredients = ingredients.filter(i => i.stock <= i.minStock);
  const activeOrders = orders.filter(o => o.status !== 'paid');

  // Payment method totals (today)
  const todayPayments = sales
    .filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString())
    .reduce((acc, s) => {
      acc.cash += s.paymentDetails.cash;
      acc.mpesa += s.paymentDetails.mpesa;
      acc.emola += s.paymentDetails.emola;
      acc.card += s.paymentDetails.card;
      return acc;
    }, { cash: 0, mpesa: 0, emola: 0, card: 0 });

  const paymentChartData = [
    { name: 'Dinheiro', value: todayPayments.cash, color: '#10b981' },
    { name: 'M-Pesa', value: todayPayments.mpesa, color: '#3b82f6' },
    { name: 'E-Mola', value: todayPayments.emola, color: '#8b5cf6' },
    { name: 'Cartão', value: todayPayments.card, color: '#f59e0b' },
  ].filter(m => m.value > 0);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu estabelecimento</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadAllSales().catch(console.error); }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            📊 Carregar Histórico Completo
          </button>
        </div>
      </div>

      {/* Alertas e Health Check */}
      <AlertsPanel />
      <HealthCheckPanel showDetails={true} />

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vendas do Dia"
          value={formatCurrency(todaySales)}
          icon={DollarSign}
          variant="primary"
          trend={{ value: 12.5, positive: true }}
        />
        <MetricCard
          title="Pedidos Ativos"
          value={activeOrders.length}
          icon={ShoppingCart}
          trend={{ value: 8, positive: true }}
        />
        <MetricCard
          title="Stock Crítico"
          value={criticalStockProducts.length}
          icon={AlertTriangle}
          variant={criticalStockProducts.length > 0 ? 'destructive' : 'default'}
        />
        <MetricCard
          title="Produtos Vendidos"
          value={orders.reduce((acc, o) => acc + o.items.reduce((a, i) => a + i.quantity, 0), 0)}
          icon={TrendingUp}
          variant="success"
          trend={{ value: 5.2, positive: true }}
        />
      </div>

      {/* Payment Methods Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dinheiro</p>
                <p className="text-lg font-bold">{formatCurrency(todayPayments.cash)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">M-Pesa</p>
                <p className="text-lg font-bold">{formatCurrency(todayPayments.mpesa)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Smartphone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-Mola</p>
                <p className="text-lg font-bold">{formatCurrency(todayPayments.emola)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cartão</p>
                <p className="text-lg font-bold">{formatCurrency(todayPayments.card)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <p className="text-sm text-muted-foreground mb-1">Hoje</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(todaySales)}</p>
              <p className="text-xs text-muted-foreground mt-1">{todaySalesCount} vendas</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-muted-foreground mb-1">Esta Semana</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(weekSales)}</p>
              <p className="text-xs text-muted-foreground mt-1">Média: {formatCurrency(weekSales / 7)}/dia</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-muted-foreground mb-1">Este Mês</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(monthSales)}</p>
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
            <CardTitle>Métodos de Pagamento (Hoje)</CardTitle>
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
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(330, 10%, 90%)',
                      borderRadius: '8px',
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
        <Card className="border-warning">
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


    </div>
  );
}
