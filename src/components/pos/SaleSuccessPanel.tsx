import { CircleCheckBig, Printer, Store, FileText, PlusCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export interface CompletedSaleInfo {
  id: string;
  saleNumber?: number;
  total: number;
  itemsCount: number;
  methodLabel: string;
  isOffline?: boolean;
}

interface SaleSuccessPanelProps {
  sale: CompletedSaleInfo;
  showInvoice: boolean;
  onPrint: (copy: 'client' | 'merchant') => void;
  onNewSale: () => void;
  onEmitInvoice: () => void;
}

export function SaleSuccessPanel({
  sale,
  showInvoice,
  onPrint,
  onNewSale,
  onEmitInvoice,
}: SaleSuccessPanelProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-card rounded-xl border p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CircleCheckBig className="h-9 w-9" />
      </div>

      <div>
        <h2 className="text-lg font-semibold">Venda registada!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {sale.saleNumber ? `Venda nº ${sale.saleNumber}` : 'Venda concluída'}
          {' · '}{sale.itemsCount} {sale.itemsCount === 1 ? 'item' : 'itens'}
        </p>
        {sale.isOffline && (
          <Badge variant="outline" className="mt-2 gap-1 text-warning">
            <WifiOff className="h-3 w-3" /> Entrará na fila de sincronização
          </Badge>
        )}
      </div>

      <div className="w-full rounded-lg bg-primary/10 px-4 py-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total · {sale.methodLabel}</p>
        <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(sale.total)}</p>
      </div>

      <div className="w-full space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onPrint('client')}>
            <Printer className="h-4 w-4" /> Recibo cliente
          </Button>
          <Button variant="outline" onClick={() => onPrint('merchant')}>
            <Store className="h-4 w-4" /> Cópia loja
          </Button>
        </div>
        {showInvoice && (
          <Button variant="secondary" className="w-full" onClick={onEmitInvoice}>
            <FileText className="h-4 w-4" /> Emitir factura
          </Button>
        )}
        <Button variant="gradient" className="w-full" onClick={onNewSale}>
          <PlusCircle className="h-4 w-4" /> Nova venda (F1)
        </Button>
      </div>
    </div>
  );
}