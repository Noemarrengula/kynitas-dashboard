import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useI18n } from '@/contexts/I18nContext';
import { LoadingRow } from '@/components/purchases/status-badges';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Receipts() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { suppliers, purchaseOrders, purchaseReceipts, loading } = useSuppliers();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const supplierName = (id?: string) => suppliers.find((s) => s.id === id)?.name ?? '—';
  const poNumber = (poId?: string) => purchaseOrders.find((p) => p.id === poId)?.order_number ?? '—';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<PackageCheck className="h-6 w-6" />}
        title={t('page.receipts')}
        description="Histórico de receções para rastreabilidade das compras"
      >
        <Button variant="outline" onClick={() => navigate('/compras')}>
          Compras
        </Button>
      </PageHeader>

      {loading ? (
        <div className="bg-card border rounded-xl">
          <LoadingRow />
        </div>
      ) : purchaseReceipts.length === 0 ? (
        <div className="bg-card border rounded-xl text-center py-16 text-muted-foreground">
          <PackageCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhuma receção registada</p>
          <p className="text-sm">As receções aparecem aqui depois de receber mercadoria de uma compra.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {purchaseReceipts.map((receipt) => {
            const isOpen = expanded[receipt.id];
            return (
              <div key={receipt.id} className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{receipt.receipt_number || 'Receção'}</p>
                      <p className="text-sm text-muted-foreground">{supplierName(receipt.supplier_id)}</p>
                    </div>
                    <Badge variant="secondary">
                      {format(new Date(receipt.receipt_date), "dd 'de' MMM", { locale: pt })}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-primary">{formatCurrency(receipt.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      Compra {poNumber(receipt.purchase_order_id)}
                    </p>
                  </div>

                  {receipt.invoice_number && (
                    <p className="text-xs text-muted-foreground">Fatura: {receipt.invoice_number}</p>
                  )}
                </div>

                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [receipt.id]: !isOpen }))}
                  className="w-full px-4 py-2 border-t text-xs text-primary flex items-center justify-center gap-1 hover:bg-muted transition-colors"
                >
                  {isOpen ? (
                    <>Ocultar itens <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Ver itens ({receipt.items.length}) <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>

                {isOpen && (
                  <div className="divide-y border-t">
                    {receipt.items.map((item, idx) => {
                      const name = item.product_name || item.ingredient_name || 'Item';
                      const damaged = item.damaged_quantity || 0;
                      return (
                        <div key={`${receipt.id}-${idx}`} className="flex items-center justify-between px-4 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} aceites
                              {(item.received_quantity ?? item.quantity) > item.quantity && (
                                <span> · {item.received_quantity} recebidos</span>
                              )}
                              {damaged > 0 && <span className="text-destructive"> · {damaged} danificados</span>}
                            </p>
                          </div>
                          <span className="font-medium">{formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}