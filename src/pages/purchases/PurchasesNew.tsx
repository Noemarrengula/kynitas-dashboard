import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, ReceiptText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useDatabase } from '@/hooks/useDatabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

export const DEFAULT_IVA_RATE = 16;

interface PrefillItem {
  id: string;
  type: 'product' | 'ingredient';
  suggestedQty?: number;
}

interface NewPurchasePrefill {
  supplierId?: string;
  items?: PrefillItem[];
}

type ItemKind = 'product' | 'ingredient';

interface OrderRow {
  key: string;
  kind: ItemKind;
  itemId: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
  discountPercent: number;
}

const nextKey = (() => {
  let n = 0;
  return () => `row-${Date.now()}-${n++}`;
})();

export default function PurchasesNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { can } = usePermissions();
  const { suppliers, createPurchaseOrder } = useSuppliers();
  const { products, ingredients } = useDatabase();
  const { log } = useAuditLog();

  const prefill = (location.state as NewPurchasePrefill | null) ?? null;

  const [supplierId, setSupplierId] = useState(prefill?.supplierId ?? '');
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<OrderRow[]>(() => {
    if (!prefill?.items || prefill.items.length === 0) return [];
    return prefill.items.map((it) => {
      const isProduct = it.type === 'product';
      const product = products.find((p) => p.id === it.id);
      const ingredient = ingredients.find((i) => i.id === it.id);
      return {
        key: nextKey(),
        kind: it.type,
        itemId: it.id,
        quantity: it.suggestedQty && it.suggestedQty > 0 ? it.suggestedQty : 1,
        unitPrice: isProduct ? (product?.costPrice ?? 0) : (ingredient?.costPerUnit ?? 0),
        ivaRate: isProduct ? (product?.ivaRate ?? DEFAULT_IVA_RATE) : DEFAULT_IVA_RATE,
        discountPercent: 0,
      };
    });
  });

  const setRow = (key: string, patch: Partial<OrderRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = (kind: ItemKind) => {
    setRows((prev) => [...prev, {
      key: nextKey(),
      kind,
      itemId: '',
      quantity: 1,
      unitPrice: 0,
      ivaRate: DEFAULT_IVA_RATE,
      discountPercent: 0,
    }]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const onSelectItem = (key: string, kind: ItemKind, itemId: string) => {
    const product = products.find((p) => p.id === itemId);
    const ingredient = ingredients.find((i) => i.id === itemId);
    setRow(key, {
      kind,
      itemId,
      unitPrice: kind === 'product' ? (product?.costPrice ?? 0) : (ingredient?.costPerUnit ?? 0),
      ivaRate: kind === 'product' ? (product?.ivaRate ?? DEFAULT_IVA_RATE) : DEFAULT_IVA_RATE,
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let total = 0;
    rows.forEach((r) => {
      const lineSubtotal = (r.quantity || 0) * (r.unitPrice || 0);
      const discounted = lineSubtotal * (1 - (r.discountPercent || 0) / 100);
      const lineTax = discounted * ((r.ivaRate ?? DEFAULT_IVA_RATE) / 100);
      subtotal += lineSubtotal;
      tax += lineTax;
      total += discounted + lineTax;
    });
    return { subtotal: Number(subtotal.toFixed(2)), tax: Number(tax.toFixed(2)), total: Number(total.toFixed(2)) };
  }, [rows]);

  const itemName = (r: OrderRow) => {
    if (r.kind === 'product') {
      return products.find((p) => p.id === r.itemId)?.name;
    }
    return ingredients.find((i) => i.id === r.itemId)?.name;
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      toast({ title: 'Selecione o fornecedor', variant: 'destructive' });
      return;
    }
    if (rows.length === 0) {
      toast({ title: 'Adicione pelo menos um item', variant: 'destructive' });
      return;
    }
    if (rows.some((r) => !r.itemId)) {
      toast({ title: 'Há linhas sem item selecionado', variant: 'destructive' });
      return;
    }
    if (rows.some((r) => !r.quantity || r.quantity <= 0)) {
      toast({ title: 'Quantidade inválida em alguma linha', variant: 'destructive' });
      return;
    }

    const { data, error } = await createPurchaseOrder({
      supplier_id: supplierId,
      order_date: orderDate,
      expected_delivery: expectedDelivery || undefined,
      status: 'confirmed',
      items: rows.map((r) => ({
        product_id: r.kind === 'product' ? r.itemId : undefined,
        product_name: r.kind === 'product' ? itemName(r) : undefined,
        ingredient_id: r.kind === 'ingredient' ? r.itemId : undefined,
        ingredient_name: r.kind === 'ingredient' ? itemName(r) : undefined,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        iva_rate: r.ivaRate,
        discount_percent: r.discountPercent,
        total: r.quantity * r.unitPrice * (1 - r.discountPercent / 100) * (1 + r.ivaRate / 100),
      })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      notes: notes || undefined,
    });

    if (error) {
      toast({ title: 'Erro ao criar compra', description: error.message, variant: 'destructive' });
      return;
    }

    if (data) {
      log('create', 'purchase_orders', data.id, { order_number: data.order_number, total: data.total });
      toast({ title: 'Compra criada!', description: data.order_number });
      navigate(`/compras/${data.id}`);
    }
  };

  if (!can('inventario_editar')) {
    return (
      <div className="bg-card border rounded-xl text-center py-16 text-muted-foreground">
        <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Sem permissão para criar compras.</p>
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
        title={t('page.purchasesNew')}
        description="Criar uma ordem de compra para repor stock"
      >
        <Button variant="outline" onClick={() => navigate('/compras')}>
          Voltar
        </Button>
        <Button variant="gradient" onClick={handleSubmit}>
          Criar Compra
        </Button>
      </PageHeader>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-1">
            <Label>Fornecedor *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.filter((s) => s.active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data da Ordem</Label>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Entrega Prevista</Label>
            <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} placeholder="Observações" />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Itens da Compra</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addRow('product')}>
              <Plus className="h-4 w-4 mr-1" />
              Produto
            </Button>
            <Button size="sm" variant="outline" onClick={() => addRow('ingredient')}>
              <Plus className="h-4 w-4 mr-1" />
              Ingrediente
            </Button>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <ReceiptText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Adicione produtos ou ingredientes a comprar</p>
            <p className="text-sm text-muted-foreground">
              Dica: use "Comprar agora" na página de Stock ou nas Necessidades de reposição.
            </p>
          </div>
        )}

        <div className="space-y-2 p-4">
          {rows.map((r, idx) => (
            <div key={r.key} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3 bg-background">
              <div className="col-span-12 md:col-span-3 space-y-1">
                <Label className="text-xs">Item</Label>
                <Select value={r.itemId} onValueChange={(v) => onSelectItem(r.key, r.kind, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={r.kind === 'product' ? 'Selecione produto' : 'Selecione ingrediente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {r.kind === 'product'
                      ? products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                      : ingredients.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 md:col-span-2 space-y-1">
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={r.quantity || ''}
                  onChange={(e) => setRow(r.key, { quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-4 md:col-span-2 space-y-1">
                <Label className="text-xs">Preço Unit. (MT)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.unitPrice || ''}
                  onChange={(e) => setRow(r.key, { unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2 md:col-span-1 space-y-1">
                <Label className="text-xs">IVA %</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={r.ivaRate ?? ''}
                  onChange={(e) => setRow(r.key, { ivaRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2 md:col-span-1 space-y-1">
                <Label className="text-xs">Desc %</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={r.discountPercent ?? ''}
                  onChange={(e) => setRow(r.key, { discountPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="hidden md:flex col-span-1 justify-end">
                <Button size="sm" variant="ghost" onClick={() => removeRow(r.key)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="col-span-12 md:col-span-2 text-right text-sm">
                <span className="text-muted-foreground md:hidden">Total: </span>
                <span className="font-semibold">
                  {formatCurrency(r.quantity * r.unitPrice * (1 - r.discountPercent / 100) * (1 + r.ivaRate / 100))}
                </span>
                <span className="block text-[10px] text-muted-foreground">linha {idx + 1}</span>
              </div>
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/30 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span className="font-medium">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}