import { useState } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, ShoppingCart, Package, Banknote, CreditCard, Smartphone, Eye, Printer, Trash2, FileSpreadsheet, Check, Users } from 'lucide-react';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { SaleDetailsModal } from '@/components/sales/SaleDetailsModal';
import { Sale, Credit } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '@/store/useStore';
import { useDatabase } from '@/hooks/useDatabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { format, subDays, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateSalesReport, printToThermal } from '@/lib/thermalPrinter';
import { exportSalesToPDF } from '@/lib/pdfExport';
import { exportProfitToPDF, exportProfitToExcel } from '@/lib/profitExport';
import { exportTopProductsToPDF, exportTopProductsToExcel, exportOutOfStockToPDF, exportOutOfStockToExcel, exportStockEvolutionToPDF } from '@/lib/productReports';

const COLORS = ['hsl(330, 100%, 50%)', 'hsl(330, 80%, 40%)', 'hsl(330, 60%, 60%)', 'hsl(330, 40%, 70%)'];

export default function Reports() {
  const { loading, loadAllSales } = useDatabase();
  const { products, sales, credits } = useStore();
  const { business } = useBusiness();
  const { t } = useI18n();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'mpesa' | 'emola' | 'card'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'day':
        return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
      case 'week':
        return { start: startOfWeek(now, { locale: pt }), end: new Date() };
      case 'month':
        return { start: startOfMonth(now), end: new Date() };
    }
  };

  const range = getDateRange();
  let filteredSales = sales.filter(s => 
    isWithinInterval(new Date(s.createdAt), range)
  );

  if (paymentFilter !== 'all') {
    filteredSales = filteredSales.filter(s => s.paymentDetails[paymentFilter] > 0);
  }

  // Filter credits by date range
  const filteredCredits = credits.filter(c =>
    isWithinInterval(new Date(c.createdAt), range)
  );

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalOrders = filteredSales.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const totalCost = filteredSales.reduce((acc, s) => {
    return acc + s.items.reduce((itemAcc, item) => {
      return itemAcc + ((item.product?.costPrice ?? 0) * item.quantity);
    }, 0);
  }, 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Credits metrics
  const totalCreditsAmount = filteredCredits.reduce((acc, c) => acc + c.total, 0);
  const totalCreditsPaid = filteredCredits.reduce((acc, c) => acc + c.amountPaid, 0);
  const totalCreditsRemaining = filteredCredits.reduce((acc, c) => acc + c.remainingBalance, 0);
  const pendingCredits = filteredCredits.filter(c => c.status === 'pending').length;
  const partialCredits = filteredCredits.filter(c => c.status === 'partial').length;
  const paidCredits = filteredCredits.filter(c => c.status === 'paid').length;

  // Sales by payment method
  const paymentTotals = filteredSales.reduce((acc, s) => {
    acc.cash += s.paymentDetails.cash;
    acc.mpesa += s.paymentDetails.mpesa;
    acc.emola += s.paymentDetails.emola;
    acc.card += s.paymentDetails.card;
    return acc;
  }, { cash: 0, mpesa: 0, emola: 0, card: 0 });

  const salesByMethod = [
    { name: 'Dinheiro', value: paymentTotals.cash, icon: Banknote },
    { name: 'M-Pesa', value: paymentTotals.mpesa, icon: Smartphone },
    { name: 'E-Mola', value: paymentTotals.emola, icon: Smartphone },
    { name: 'Cartão', value: paymentTotals.card, icon: CreditCard },
  ].filter(m => m.value > 0);

  // Daily sales for the chart
  const dailySales = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayName = format(date, 'EEE', { locale: pt });
    const daySales = filteredSales
      .filter(s => format(new Date(s.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .reduce((acc, s) => acc + s.total, 0);
    
    return {
      day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      vendas: daySales,
    };
  });

  // Products by type
  const drinkProducts = products.filter(p => p.type === 'drink');
  const mealProducts = products.filter(p => p.type === 'meal');

  const handleExport = (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
      const headers = ['Data', 'Total', 'Dinheiro', 'M-Pesa', 'E-Mola', 'Cartão', 'Troco'];
      const rows = filteredSales.map(s => [
        format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm', { locale: pt }),
        s.total,
        s.paymentDetails.cash,
        s.paymentDetails.mpesa,
        s.paymentDetails.emola,
        s.paymentDetails.card,
        s.paymentDetails.change,
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      
      toast({ title: 'Relatório CSV exportado!' });
    } else {
      window.print();
      toast({ title: 'Abrindo impressão...' });
    }
  };

  const handleThermalPrint = async () => {
    try {
      const periodLabel = period === 'day' ? 'Hoje' : period === 'week' ? 'Esta Semana' : 'Este Mês';
      const report = generateSalesReport(filteredSales, periodLabel);
      await printToThermal(report);
      toast({ title: 'Imprimindo relatório...' });
    } catch (error) {
      toast({ 
        title: 'Erro ao imprimir', 
        description: 'Verifique se a impressora está conectada',
        variant: 'destructive' 
      });
    }
  };

  const handleResetSales = async () => {
    if (resetCode === '2025') {
      // Resetar vendas no Supabase
      if (business?.id) {
        const { error } = await supabase
          .from('sales')
          .delete()
          .eq('business_id', business.id);
        
        if (error) {
          toast({ 
            title: 'Erro ao resetar', 
            description: error.message,
            variant: 'destructive' 
          });
          return;
        }
      }
      
      setShowResetDialog(false);
      setResetCode('');
      toast({ title: 'Vendas resetadas com sucesso!' });
      window.location.reload(); // Recarregar para atualizar dados
    } else {
      toast({ 
        title: 'Código incorreto', 
        description: 'Verifique o código e tente novamente',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {t('nav.reports')}
          </h1>
          <p className="text-muted-foreground">Análise de desempenho do estabelecimento</p>
          {sales.length === 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Nenhuma venda encontrada. Clique em "Carregar Histórico" para ver todas as vendas.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={paymentFilter} onValueChange={(v: typeof paymentFilter) => setPaymentFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="mpesa">M-Pesa</SelectItem>
              <SelectItem value="emola">E-Mola</SelectItem>
              <SelectItem value="card">Cartão</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v: typeof period) => setPeriod(v)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoje</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { loadAllSales().catch(console.error); }} className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
            📊 Carregar Histórico
          </Button>
          <Button variant="outline" onClick={handleThermalPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Térmica
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => { exportSalesToPDF(filteredSales, `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.pdf`); toast({ title: 'PDF exportado!' }); }}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => { exportProfitToPDF(filteredSales, `relatorio-lucros-${format(new Date(), 'yyyy-MM-dd')}.pdf`); toast({ title: 'Relatório de Lucros PDF exportado!' }); }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Lucros PDF
          </Button>
          <Button variant="outline" onClick={() => { exportProfitToExcel(filteredSales, `relatorio-lucros-${format(new Date(), 'yyyy-MM-dd')}.xlsx`); toast({ title: 'Relatório de Lucros Excel exportado!' }); }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Lucros Excel
          </Button>
          <Button variant="outline" onClick={() => { exportTopProductsToPDF(filteredSales, `produtos-mais-vendidos-${format(new Date(), 'yyyy-MM-dd')}.pdf`); toast({ title: 'Lista de produtos mais vendidos exportada!' }); }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Top PDF
          </Button>
          <Button variant="outline" onClick={() => { exportTopProductsToExcel(filteredSales, `produtos-mais-vendidos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`); toast({ title: 'Lista de produtos mais vendidos exportada!' }); }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Top Excel
          </Button>
          <Button variant="outline" onClick={() => { try { exportStockEvolutionToPDF(products, sales, range.start, range.end, business?.name || 'Relatório', `evolucao-stock-${format(new Date(), 'yyyy-MM-dd')}.pdf`); toast({ title: 'Evolução de Stock PDF exportada!' }); } catch (e: unknown) { toast({ title: 'Erro ao exportar', description: getErrorMessage(e), variant: 'destructive' }); } }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Evolução Stock PDF
          </Button>
          <Button variant="outline" onClick={() => { exportOutOfStockToPDF(products, `produtos-fora-stock-${format(new Date(), 'yyyy-MM-dd')}.pdf`); toast({ title: 'Relatório de stock exportado!' }); }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Stock PDF
          </Button>
          <Button variant="outline" onClick={() => { exportOutOfStockToExcel(products, `produtos-fora-stock-${format(new Date(), 'yyyy-MM-dd')}.xlsx`); toast({ title: 'Relatório de stock exportado!' }); }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Stock Excel
          </Button>
          <Button variant="destructive" onClick={() => setShowResetDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      {/* Payment Method Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Dinheiro', value: paymentTotals.cash, icon: Banknote, color: 'bg-green-500/10 text-green-600' },
          { label: 'M-Pesa', value: paymentTotals.mpesa, icon: Smartphone, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'E-Mola', value: paymentTotals.emola, icon: Smartphone, color: 'bg-purple-500/10 text-purple-600' },
          { label: 'Cartão', value: paymentTotals.card, icon: CreditCard, color: 'bg-orange-500/10 text-orange-600' },
        ].map((method, i) => (
          <div key={method.label} className="bg-card border rounded-xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", method.color)}>
                <method.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{method.label}</p>
                <p className="text-lg font-bold">{formatCurrency(method.value)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Vendas</p>
              <p className="text-2xl font-bold mt-1">{totalOrders}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <ShoppingCart className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalProfit)}</p>
              <p className="text-xs text-muted-foreground mt-1">{profitMargin.toFixed(1)}% margem</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(averageTicket)}</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Produtos Activos</p>
              <p className="text-2xl font-bold mt-1">{products.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-xl">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Credits Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-blue-200 dark:border-blue-900 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Créditos</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{formatCurrency(totalCreditsAmount)}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Banknote className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-green-200 dark:border-green-900 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Créditos Pagos</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalCreditsPaid)}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-orange-200 dark:border-orange-900 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Créditos Pendentes</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(totalCreditsRemaining)}</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-purple-200 dark:border-purple-900 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes a Crédito</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">{filteredCredits.length}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Credits Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-red-200 dark:border-red-900 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{pendingCredits}</p>
            </div>
            <Badge className="bg-red-500/20 text-red-700 hover:bg-red-500/30">Não Iniciado</Badge>
          </div>
        </div>

        <div className="bg-card border border-yellow-200 dark:border-yellow-900 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Parcialmente Pagos</p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">{partialCredits}</p>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30">Em Andamento</Badge>
          </div>
        </div>

        <div className="bg-card border border-green-200 dark:border-green-900 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Créditos Finalizados</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{paidCredits}</p>
            </div>
            <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/30">Completo</Badge>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-card border rounded-xl p-6 animate-slide-up">
          <h3 className="text-lg font-semibold mb-4">Vendas por Dia</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(330, 10%, 90%)" />
                <XAxis dataKey="day" stroke="hsl(330, 15%, 45%)" fontSize={12} />
                <YAxis stroke="hsl(330, 15%, 45%)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(330, 10%, 90%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                />
                <Bar dataKey="vendas" fill="hsl(330, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-card border rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-lg font-semibold mb-4">Métodos de Pagamento</h3>
          {salesByMethod.length > 0 ? (
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByMethod}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salesByMethod.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(330, 10%, 90%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {salesByMethod.map((method, index) => (
                  <div key={method.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{method.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {formatCurrency(method.value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados para o período selecionado
            </div>
          )}
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-card border rounded-xl p-6 animate-slide-up">
        <h3 className="text-lg font-semibold mb-4">Histórico de Vendas</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Data</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Dinheiro</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">M-Pesa</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">E-Mola</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Cartão</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Troco</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma venda no período selecionado
                  </td>
                </tr>
              ) : (
                filteredSales.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 text-sm">
                      {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: pt })}
                    </td>
                    <td className="py-3 px-2 text-sm font-medium">{formatCurrency(sale.total)}</td>
                    <td className="py-3 px-2 text-sm">
                      {sale.paymentDetails.cash > 0 ? formatCurrency(sale.paymentDetails.cash) : '-'}
                    </td>
                    <td className="py-3 px-2 text-sm">
                      {sale.paymentDetails.mpesa > 0 ? formatCurrency(sale.paymentDetails.mpesa) : '-'}
                    </td>
                    <td className="py-3 px-2 text-sm">
                      {sale.paymentDetails.emola > 0 ? formatCurrency(sale.paymentDetails.emola) : '-'}
                    </td>
                    <td className="py-3 px-2 text-sm">
                      {sale.paymentDetails.card > 0 ? formatCurrency(sale.paymentDetails.card) : '-'}
                    </td>
                    <td className="py-3 px-2 text-sm text-green-600">
                      {sale.paymentDetails.change > 0 ? formatCurrency(sale.paymentDetails.change) : '-'}
                    </td>
                    <td className="py-3 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSale(sale)}
                        className="h-8 w-8 p-0"
                        aria-label="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredSales.length > 10 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Mostrando 10 de {filteredSales.length} vendas
          </p>
        )}
      </div>

      {/* Product Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6 animate-slide-up">
          <h3 className="text-lg font-semibold mb-4">Resumo de Bebidas</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Total de Bebidas</span>
              <span className="font-semibold">{drinkProducts.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Stock Total</span>
              <span className="font-semibold">{drinkProducts.reduce((a, p) => a + p.stock, 0)} un.</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Valor em Stock</span>
              <span className="font-semibold">
                {formatCurrency(drinkProducts.reduce((a, p) => a + (p.stock * p.costPrice), 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-lg font-semibold mb-4">Resumo de Refeições</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Total de Refeições</span>
              <span className="font-semibold">{mealProducts.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Stock Total</span>
              <span className="font-semibold">{mealProducts.reduce((a, p) => a + p.stock, 0)} un.</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Valor em Stock</span>
              <span className="font-semibold">
                {formatCurrency(mealProducts.reduce((a, p) => a + (p.stock * p.costPrice), 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Credits History Table */}
      <div className="bg-card border rounded-xl p-6 animate-slide-up">
        <h3 className="text-lg font-semibold mb-4">Histórico de Créditos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Telefone</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Pago</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Pendente</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum crédito no período selecionado
                  </td>
                </tr>
              ) : (
                filteredCredits.slice(0, 10).map((credit) => (
                  <tr key={credit.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 text-sm font-medium">{credit.customerName}</td>
                    <td className="py-3 px-2 text-sm">{credit.customerPhone || '-'}</td>
                    <td className="py-3 px-2 text-sm font-medium">{formatCurrency(credit.total)}</td>
                    <td className="py-3 px-2 text-sm text-green-600">{formatCurrency(credit.amountPaid)}</td>
                    <td className="py-3 px-2 text-sm text-orange-600">{formatCurrency(credit.remainingBalance)}</td>
                    <td className="py-3 px-2">
                      <Badge
                        className={cn(
                          credit.status === 'pending' && 'bg-red-500/20 text-red-700 hover:bg-red-500/30',
                          credit.status === 'partial' && 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30',
                          credit.status === 'paid' && 'bg-green-500/20 text-green-700 hover:bg-green-500/30'
                        )}
                      >
                        {credit.status === 'pending' ? 'Pendente' : credit.status === 'partial' ? 'Parcial' : 'Pago'}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-sm">
                      {format(new Date(credit.createdAt), 'dd/MM/yyyy HH:mm', { locale: pt })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={selectedSale}
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Vendas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta ação irá apagar todas as vendas registadas. Esta operação não pode ser desfeita.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Código de Confirmação</Label>
              <Input
                id="reset-code"
                type="password"
                placeholder="Digite o código"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResetDialog(false); setResetCode(''); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleResetSales}>
              Confirmar Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
