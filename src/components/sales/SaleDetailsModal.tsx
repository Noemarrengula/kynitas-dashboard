import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Sale } from '@/types';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Banknote, CreditCard, Smartphone, ShoppingBag, Printer } from 'lucide-react';
import { ReceiptPrint } from './ReceiptPrint';
import { useRef, memo } from 'react';
import { generateReceipt, printToThermal } from '@/lib/thermalPrinter';
import { toast } from '@/hooks/use-toast';

interface SaleDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

const SaleDetailsModal = memo(function SaleDetailsModal({ sale, open, onClose }: SaleDetailsModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!sale) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          <p className="text-center py-8 text-muted-foreground">Nenhuma venda selecionada</p>
        </DialogContent>
      </Dialog>
    );
  }

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo - ${sale.id.slice(0, 8)}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: monospace; }
            @media print {
              body { margin: 0; padding: 0; }
              .receipt-print { max-width: 80mm; margin: 0 auto; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleThermalPrint = async () => {
    try {
      const receipt = generateReceipt(sale);
      await printToThermal(receipt);
      toast({ title: 'Imprimindo recibo...' });
    } catch (error) {
      toast({ 
        title: 'Erro ao imprimir', 
        description: 'Verifique se a impressora está conectada',
        variant: 'destructive' 
      });
    }
  };

  const paymentMethods = [
    { label: 'Numerário', value: sale.paymentDetails.cash, icon: Banknote },
    { label: 'M-Pesa', value: sale.paymentDetails.mpesa, icon: Smartphone },
    { label: 'E-Mola', value: sale.paymentDetails.emola, icon: Smartphone },
    { label: 'Cartão', value: sale.paymentDetails.card, icon: CreditCard },
  ].filter(m => m.value > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Data e Hora</p>
              <p className="font-medium">
                {format(new Date(sale.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
              </p>
            </div>
            {sale.table_number && (
              <div className="text-right">
                <Badge variant="outline" className="mb-1">Mesa {sale.table_number}</Badge>
                {sale.table_name && <p className="text-xs text-muted-foreground">{sale.table_name}</p>}
                {sale.table_customer_name && <p className="text-xs font-medium">{sale.table_customer_name}</p>}
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Produtos</h3>
            </div>
            {sale.items.length > 0 ? (
              <div className="space-y-2">
                {sale.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.product?.image && (
                        <img src={item.product.image} alt={item.product?.name ?? 'Produto'} className="h-10 w-10 rounded object-cover" />
                      )}
                      <div>
                        <p className="font-medium">{item.product?.name ?? 'Produto'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.product?.price ?? 0)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem itens registrados</p>
            )}
          </div>

          <Separator />

          {/* Payment Details */}
          <div>
            <h3 className="font-semibold mb-3">Pagamento</h3>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div key={method.label} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <method.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{method.label}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(method.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Recebido</span>
              <span>{formatCurrency(sale.paymentDetails.total)}</span>
            </div>
            {sale.paymentDetails.change > 0 && (
              <div className="flex justify-between text-sm font-semibold text-green-600">
                <span>Troco</span>
                <span>{formatCurrency(sale.paymentDetails.change)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleThermalPrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Impressora Térmica
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Impressora Normal
          </Button>
        </DialogFooter>

        {/* Hidden print content */}
        <div className="hidden">
          <div ref={printRef}>
            <ReceiptPrint sale={sale} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export { SaleDetailsModal };
