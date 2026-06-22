import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { exportDREToPDF } from '@/lib/pdfExport';
import { exportToExcel } from '@/lib/export';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

export function DRETab() {
  const { sales } = useDatabase();
  const { accounts } = useAccountsPayable();

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  // Custo dos produtos vendidos (soma de costPrice * quantidade de cada item)
  const totalCosts = sales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => {
      return itemSum + ((item.product?.costPrice ?? 0) * item.quantity);
    }, 0);
  }, 0);

  // Despesas reais (contas pagas)
  const totalExpenses = accounts
    .filter(a => a.status === 'paid')
    .reduce((sum, a) => sum + a.amount, 0);

  const grossProfit = totalRevenue - totalCosts;
  const netProfit = grossProfit - totalExpenses;

  const dreData = {
    period: new Date(),
    total_revenue: totalRevenue,
    total_costs: totalCosts,
    total_expenses: totalExpenses,
    gross_profit: grossProfit,
    net_profit: netProfit,
  };

  const handleExportPDF = () => {
    try {
      exportDREToPDF(dreData, `dre-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'DRE PDF exportado!' });
    } catch (e: unknown) {
      toast({ title: 'Erro ao exportar DRE', description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  const handleExportExcel = () => {
    try {
      const data = [
        { 'Descrição': 'RECEITAS', 'Valor': totalRevenue },
        { 'Descrição': '(-) CUSTOS', 'Valor': totalCosts },
        { 'Descrição': '(=) LUCRO BRUTO', 'Valor': grossProfit },
        { 'Descrição': '(-) DESPESAS', 'Valor': totalExpenses },
        { 'Descrição': '(=) LUCRO LÍQUIDO', 'Valor': netProfit },
      ];
      exportToExcel(data, `dre-${format(new Date(), 'yyyy-MM-dd')}`);
      toast({ title: 'DRE Excel exportado!' });
    } catch (e: unknown) {
      toast({ title: 'Erro ao exportar DRE', description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">DRE - Demonstração do Resultado</h2>
          <p className="text-sm text-muted-foreground">
            Período: {format(new Date(), 'MMMM/yyyy', { locale: pt })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileText className="h-4 w-4 mr-2" />
              Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
            <span className="font-bold text-lg">RECEITAS</span>
            <span className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
            <span className="font-bold text-lg">(-) CUSTOS</span>
            <span className="text-xl font-bold text-red-600">{formatCurrency(totalCosts)}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <span className="font-bold text-lg">(=) LUCRO BRUTO</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(grossProfit)}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
            <span className="font-bold text-lg">(-) DESPESAS</span>
            <span className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
            <span className="font-bold text-xl">(=) LUCRO LÍQUIDO</span>
            <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Margem Bruta</p>
          <p className="text-2xl font-bold">
            {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Margem Líquida</p>
          <p className="text-2xl font-bold">
            {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0}%
          </p>
        </Card>
      </div>
    </div>
  );
}
