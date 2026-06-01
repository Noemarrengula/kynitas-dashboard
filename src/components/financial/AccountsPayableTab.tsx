import { useState } from 'react';
import { Plus, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { formatCurrency } from '@/lib/utils';
import { exportAccountsPayableToPDF } from '@/lib/pdfExport';
import { exportToExcel } from '@/lib/export';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AccountsPayableTab() {
  const { accounts, categories, loading } = useAccountsPayable();

  const pending = accounts.filter(a => a.status === 'pending');
  const overdue = accounts.filter(a => a.status === 'overdue');
  const paid = accounts.filter(a => a.status === 'paid');

  const totalPending = pending.reduce((sum, a) => sum + a.amount, 0);
  const totalOverdue = overdue.reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = paid.reduce((sum, a) => sum + a.amount, 0);

  const handleExportPDF = () => {
    const accountsWithCategory = accounts.map(acc => ({
      ...acc,
      category_name: categories.find(c => c.id === acc.category_id)?.name,
    }));
    exportAccountsPayableToPDF(accountsWithCategory, `contas-a-pagar-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportExcel = () => {
    const data = accounts.map(acc => ({
      'Vencimento': format(new Date(acc.due_date), 'dd/MM/yyyy'),
      'Descrição': acc.description,
      'Categoria': categories.find(c => c.id === acc.category_id)?.name || '-',
      'Valor': acc.amount,
      'Status': acc.status === 'paid' ? 'Pago' : acc.status === 'overdue' ? 'Vencido' : 'Pendente',
    }));
    exportToExcel(data, `contas-a-pagar-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contas a Pagar</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPending + totalOverdue + totalPaid)}</p>
        </Card>
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-muted-foreground">Pendente</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-muted-foreground">{pending.length} conta(s)</p>
        </Card>
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-muted-foreground">Vencido</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
          <p className="text-xs text-muted-foreground">{overdue.length} conta(s)</p>
        </Card>
        <Card className="p-4 border-green-200 bg-green-50">
          <p className="text-sm text-muted-foreground">Pago</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground">{paid.length} conta(s)</p>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-center py-8 text-muted-foreground">
          Lista de contas em desenvolvimento...
        </p>
      </Card>
    </div>
  );
}
