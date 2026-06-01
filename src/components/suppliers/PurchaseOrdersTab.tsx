import { useState } from 'react';
import { Plus, FileText, Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useDatabase } from '@/hooks/useDatabase';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export function PurchaseOrdersTab() {
  const { suppliers, purchaseOrders, createPurchaseOrder, receivePurchaseOrder } = useSuppliers();
  const { ingredients } = useDatabase();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<Array<{
    ingredient_id: string;
    ingredient_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const addItem = () => {
    setOrderItems([...orderItems, {
      ingredient_id: '',
      ingredient_name: '',
      quantity: 0,
      unit_price: 0,
      total: 0,
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];
    if (field === 'ingredient_id') {
      const ing = ingredients.find(i => i.id === value);
      newItems[index].ingredient_id = value;
      newItems[index].ingredient_name = ing?.name || '';
      newItems[index].unit_price = ing?.costPerUnit || 0;
    } else {
      newItems[index][field] = value;
    }
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleCreateOrder = async () => {
    if (!formData.supplier_id || orderItems.length === 0) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    const subtotal = calculateTotal();
    await createPurchaseOrder({
      supplier_id: formData.supplier_id,
      order_date: formData.order_date,
      expected_delivery: formData.expected_delivery || undefined,
      status: 'confirmed',
      items: orderItems,
      subtotal,
      tax: 0,
      total: subtotal,
      notes: formData.notes || undefined,
    });

    toast({ title: 'Ordem de compra criada!' });
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleReceiveOrder = async () => {
    if (!selectedPO) return;

    const items = selectedPO.items.map((item: any) => ({
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      quantity: item.quantity,
    }));

    await receivePurchaseOrder(selectedPO.id, items, invoiceNumber || undefined);
    toast({ title: 'Ordem recebida!', description: 'Stock atualizado com sucesso' });
    setReceiveDialogOpen(false);
    setSelectedPO(null);
    setInvoiceNumber('');
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery: '',
      notes: '',
    });
    setOrderItems([]);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      draft: { variant: 'secondary', icon: FileText, label: 'Rascunho' },
      sent: { variant: 'default', icon: Clock, label: 'Enviado' },
      confirmed: { variant: 'default', icon: CheckCircle, label: 'Confirmado' },
      received: { variant: 'default', icon: Package, label: 'Recebido' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelado' },
    };
    const config = variants[status] || variants.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ordem de Compra
        </Button>
      </div>

      <div className="space-y-3">
        {purchaseOrders.map((po) => {
          const supplier = suppliers.find(s => s.id === po.supplier_id);
          return (
            <div key={po.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{po.order_number}</h3>
                    {getStatusBadge(po.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{supplier?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(po.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(po.order_date), "dd 'de' MMMM, yyyy", { locale: pt })}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {po.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.ingredient_name} x {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              {po.status === 'confirmed' && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedPO(po);
                    setReceiveDialogOpen(true);
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Receber Mercadoria
                </Button>
              )}
            </div>
          );
        })}

        {purchaseOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma ordem de compra criada</p>
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Compra</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor *</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s => s.active).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data da Ordem</Label>
                <Input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Entrega Prevista</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery}
                  onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Itens da Ordem</h4>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Ingrediente</Label>
                      <Select
                        value={item.ingredient_id}
                        onValueChange={(v) => updateItem(idx, 'ingredient_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map(ing => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Preço Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Total</Label>
                      <Input value={formatCurrency(item.total)} disabled />
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(idx)}
                      className="col-span-1"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {orderItems.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total da Ordem:</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrder}>
              Criar Ordem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber Mercadoria</DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Ordem de Compra</p>
                <p className="font-semibold">{selectedPO.order_number}</p>
                <p className="text-sm">{suppliers.find(s => s.id === selectedPO.supplier_id)?.name}</p>
              </div>

              <div className="space-y-2">
                <Label>Número da Fatura (opcional)</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ex: FAT-2024-001"
                />
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">Itens a Receber:</p>
                {selectedPO.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.ingredient_name}</span>
                    <span className="font-medium">{item.quantity} unidades</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                O stock dos ingredientes será atualizado automaticamente.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReceiveOrder}>
              <Package className="h-4 w-4 mr-2" />
              Confirmar Recepção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
