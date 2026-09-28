import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReceiptText, PackageCheck, ArrowLeft, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAuditLog } from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { PurchaseOrderStatusBadge, LoadingRow } from '@/components/purchases/status-badges';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { PurchaseOrder } from '@/types';

interface ReceiveRow {
  idx: number;
  accepted: number;
  damaged: number;
}

function receiveableStatus(status: PurchaseOrder['status']) {
  return status === 'confirmed' || status === 'sent' || status === 'partial' || status === 'draft';
}

export default function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { suppliers, purchaseOrders, purchaseReceipts, receivePurchaseOrder, cancelPurchaseOrder, loading } = useSuppliers();
  const { log } = useAuditLog();
  const { can } = usePermissions();
  const canEdit = can('inventario_editar');

  const po = purchaseOrders.find((o) => o.id === id);
  const supplier = po ? suppliers.find((s) => s.id === po.supplier_id) : undefined;
  const poReceipts = purchaseReceipts.filter((r) => r.purchase_order_id === id);

  const receivedPerItem = useMemo(() => {
    const map: Record<string, number> = {};
    poReceipts.forEach((receipt) => {
      receipt.items.forEach((it) => {
        const key = it.product_id || it.ingredient_id;
        if (!key) return;
        map[key] = (map[key] || 0) + (it.received_quantity ?? it.quantity ?? 0);
      });
    });
    return map;
  }, [poReceipts]);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiveRows, setReceiveRows] = useState<ReceiveRow[]>([]);

  const openReceive = () => {
    if (!po) return;
    setInvoiceNumber('');
    setReceiveRows(po.items.map((item, idx) => {
      const key = item.product_id || item.ingredient_id;
      const pending = key ? Math.max(0, (item.quantity || 0) - (receivedPerItem[key] || 0)) : 0;
      return { idx, accepted: pending, damaged: 0 };
    }));
    setReceiveOpen(true);
  };

  const updateRow = (idx: number, patch: Partial<ReceiveRow>) => {
    setReceiveRows((prev) => prev.map((r) => (r.idx === idx ? { ...r, ...patch } : r)));
  };

  const pendingOf = (item: PurchaseOrder['items'][number]) => {
    const key = item.product_id || item.ingredient_id;
    return key ? Math.max(0, (item.quantity || 0) - (receivedPerItem[key] || 0)) : 0;
  };

  const handleReceive = async () => {
    if (!po) return;

    const exceeds = receiveRows.some((r) => {
      const pending = pendingOf(po.items[r.idx]);
      return r.accepted + r.damaged > pending;
    });

    if (exceeds) {
      toast({ title: 'A quantidade recebida não pode exceder o que está pendente', variant: 'destructive' });
      return;
    }

    const rowsToSend = receiveRows.filter((r) => {
      const pending = pendingOf(po.items[r.idx]);
      return r.accepted + r.damaged > 0 && r.accepted + r.damaged <= pending;
    });

    if (rowsToSend.length === 0) {
      toast({ title: 'Indique quantidades a receber', variant: 'destructive' });
      return;
    }

    const items = rowsToSend.map((r) => {
      const item = po.items[r.idx];
      return {
        product_id: item.product_id || null,
        product_name: item.product_name || null,
        ingredient_id: item.ingredient_id || null,
        ingredient_name: item.ingredient_name || null,
        ordered_quantity: item.quantity || 0,
        received_quantity: r.accepted + r.damaged,
        quantity: r.accepted,
        damaged_quantity: r.damaged,
        unit_price: item.unit_price || 0,
      };
    });

    const { data, error } = await receivePurchaseOrder(po.id, items, invoiceNumber || undefined);
    if (error) {
      toast({ title: 'Erro na receção', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) {
      log('receive', 'purchase_receipts', data.receipt_id, {
        po: po.order_number,
        receipt: data.receipt_number,
        status: data.status,
      });
      toast({
        title: 'Receção registada!',
        description: `${data.receipt_number} · ${data.status === 'received' ? 'Compra totalmente recebida' : 'Receção parcial'}`,
      });
      setReceiveOpen(false);
    }
  };

  const handleCancel = async () => {
    if (!po) return;
    const { error } = await cancelPurchaseOrder(po.id);
    if (error) {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
      return;
    }
    log('cancel', 'purchase_orders', po.id, { order_number: po.order_number });
    toast({ title: 'Compra cancelada' });
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-xl">
        <LoadingRow />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="bg-card border rounded-xl text-center py-16 text-muted-foreground">
        <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Compra não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/compras')}>
          Voltar às Compras
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ReceiptText className="h-6 w-6" />}
        title={po.order_number}
        description={supplier?.name ?? 'Fornecedor'}
      >
        <Button variant="outline" onClick={() => navigate('/compras')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Compras
        </Button>
        {canEdit && receiveableStatus(po.status) && (
          <Button variant="gradient" onClick={openReceive}>
            <PackageCheck className="h-4 w-4 mr-2" />
            Receber Mercadoria
          </Button>
        )}
        {canEdit && (po.status === 'draft' || po.status === 'confirmed' || po.status === 'sent' || po.status === 'partial') && (
          <Button variant="outline" className="text-destructive" onClick={handleCancel}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar Compra
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Estado</p>
          <div className="mt-1"><PurchaseOrderStatusBadge status={po.status} /></div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Data da Ordem</p>
          <p className="font-semibold mt-1">{format(new Date(po.order_date), "dd 'de' MMMM yyyy", { locale: pt })}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Entrega Prevista</p>
          <p className="font-semibold mt-1">
            {po.expected_delivery ? format(new Date(po.expected_delivery), "dd 'de' MMMM yyyy", { locale: pt }) : '—'}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(po.total)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Receções</p>
          <p className="font-semibold mt-1">{poReceipts.length}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Itens ({po.items.length})</h2>
        </div>
        <div className="divide-y">
          {po.items.map((item, idx) => {
            const key = item.product_id || item.ingredient_id;
            const received = key ? receivedPerItem[key] || 0 : 0;
            const pending = Math.max(0, (item.quantity || 0) - received);
            const name = item.product_name || item.ingredient_name || 'Item';
            return (
              <div key={`${key}-${idx}`} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unit_price || 0)}
                    {item.iva_rate && item.iva_rate !== 0 ? ` · IVA ${item.iva_rate}%` : ''}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Recebido: <span className="font-medium text-foreground">{received}</span>
                  {pending > 0 && <span className="text-warning"> · pendente {pending}</span>}
                </div>
                <div className="text-right text-sm font-semibold">
                  {formatCurrency(item.total ?? (item.quantity || 0) * (item.unit_price || 0))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t bg-muted/30 flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{formatCurrency(po.subtotal)}</span></span>
          <span className="text-muted-foreground">IVA: <span className="font-medium text-foreground">{formatCurrency(po.tax)}</span></span>
          <span className="font-bold text-primary text-base">{formatCurrency(po.total)}</span>
        </div>
      </div>

      {po.notes && (
        <div className="bg-muted/40 border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
          <p className="text-sm">{po.notes}</p>
        </div>
      )}

      {poReceipts.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Receções</h2>
            <Badge variant="secondary">{poReceipts.length}</Badge>
          </div>
          <div className="divide-y">
            {poReceipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center gap-3 px-4 py-3">
                <PackageCheck className="h-4 w-4 text-success shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{receipt.receipt_number || 'Receção'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(receipt.receipt_date), "dd 'de' MMMM yyyy", { locale: pt })}
                    {receipt.invoice_number ? ` · Fatura ${receipt.invoice_number}` : ''}
                    {receipt.items.some((i) => i.damaged_quantity) ? ' · com danificados' : ''}
                  </p>
                </div>
                <div className="text-right text-sm font-semibold">{formatCurrency(receipt.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receber Mercadoria</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Número da Fatura (opcional)</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ex: FAT-2024-001"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Os itens danificados são encaminhados para Perdas (confirmadas) sem entrar no stock. O custo é atualizado
            pelo preço de compra e o stock entra pela quantidade aceite.
          </p>

          <div className="space-y-2">
            {receiveRows.map((row) => {
              const item = po.items[row.idx];
              const name = item.product_name || item.ingredient_name || 'Item';
              const pending = pendingOf(item);
              return (
                <div key={row.idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{name}</p>
                    <Badge variant="secondary">pendente {pending}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Recebido (bom estado)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={row.accepted || ''}
                        onChange={(e) => updateRow(row.idx, { accepted: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Danificado</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={row.damaged || ''}
                        onChange={(e) => updateRow(row.idx, { damaged: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  {row.damaged > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {row.damaged} {row.damaged === 1 ? 'unidade enviada' : 'unidades enviadas'} para Perdas.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleReceive}>
              <PackageCheck className="h-4 w-4 mr-2" />
              Confirmar Receção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}