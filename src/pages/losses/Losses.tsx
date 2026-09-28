import { useMemo, useState } from 'react';
import { PackageX, Plus, CheckCircle2, XCircle, Package } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useDatabase } from '@/hooks/useDatabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { toast } from '@/hooks/use-toast';
import { LossStatusBadge, LoadingRow } from '@/components/purchases/status-badges';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Loss, LossReason } from '@/types';

const REASONS: { value: LossReason; label: string }[] = [
  { value: 'deterioração', label: 'Deterioração' },
  { value: 'quebra', label: 'Quebra' },
  { value: 'validade', label: 'Validade (fora de prazo)' },
  { value: 'danificado', label: 'Danificado' },
  { value: 'outro', label: 'Outro' },
];

const ITEM_NOT_FOUND_MSG = 'Item não encontrado.';
const EXCEEDS_STOCK_MSG = 'A quantidade indicada excede o stock disponível.';

type LossFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

export default function Losses() {
  const { t } = useI18n();
  const { can } = usePermissions();
  const canEdit = can('inventario_editar');
  const { losses, addLoss, confirmLoss, cancelLoss, loading } = useSuppliers();
  const { products, ingredients, updateProduct, updateIngredient, recordStockMovement } = useDatabase();
  const { log } = useAuditLog();

  const [filter, setFilter] = useState<LossFilter>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemType, setItemType] = useState<'product' | 'ingredient'>('product');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<LossReason>('deterioração');
  const [lossDate, setLossDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return losses.filter((l) => {
      if (filter !== 'all' && l.status !== filter) return false;
      if (!q) return true;
      const name = l.product_id
        ? products.find((p) => p.id === l.product_id)?.name ?? ''
        : ingredients.find((i) => i.id === l.ingredient_id)?.name ?? '';
      return name.toLowerCase().includes(q);
    });
  }, [losses, filter, search, products, ingredients]);

  const selectedProduct = itemType === 'product' ? products.find((p) => p.id === itemId) : undefined;
  const selectedIngredient = itemType === 'ingredient' ? ingredients.find((i) => i.id === itemId) : undefined;
  const selectedStock = selectedProduct?.stock ?? selectedIngredient?.stock;
  const selectedUnit = selectedProduct ? (selectedProduct.type === 'drink' && selectedProduct.fracionavel ? 'garrafa' : 'un') : selectedIngredient?.unit;

  const itemName = (loss: Loss) => {
    if (loss.product_id) return products.find((p) => p.id === loss.product_id)?.name ?? 'Item';
    return ingredients.find((i) => i.id === loss.ingredient_id)?.name ?? 'Item';
  };

  const handleRegister = async () => {
    if (!itemId || !quantity || parseFloat(quantity) <= 0) {
      toast({ title: 'Indique um item e uma quantidade válida', variant: 'destructive' });
      return;
    }
    if (selectedStock != null && parseFloat(quantity) > selectedStock) {
      toast({ title: ITEM_NOT_FOUND_MSG, description: EXCEEDS_STOCK_MSG, variant: 'destructive' });
      return;
    }

    const { data, error } = await addLoss({
      product_id: itemType === 'product' ? itemId : undefined,
      ingredient_id: itemType === 'ingredient' ? itemId : undefined,
      quantity: parseFloat(quantity),
      reason,
      loss_date: lossDate,
      notes: notes || undefined,
    });

    if (error) {
      toast({ title: 'Erro ao registar perda', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) {
      log('create', 'losses', data.id, { quantity: data.quantity, reason: data.reason });
      toast({ title: 'Perda registada', description: 'Aguarda confirmação para sair do stock.' });
      setDialogOpen(false);
      setItemId('');
      setQuantity('');
      setNotes('');
    }
  };

  const handleConfirm = async (loss: Loss) => {
    const qty = loss.quantity;
    if (loss.product_id) {
      const product = products.find((p) => p.id === loss.product_id);
      if (!product) {
        toast({ title: ITEM_NOT_FOUND_MSG, variant: 'destructive' });
        return;
      }
      if (qty > product.stock) {
        toast({ title: EXCEEDS_STOCK_MSG, variant: 'destructive' });
        return;
      }
      await updateProduct(loss.product_id, { stock: Number((product.stock - qty).toFixed(2)) });
      await recordStockMovement({ productId: loss.product_id, type: 'exit', quantity: qty, reason: `Perda: ${loss.reason}` });
    } else if (loss.ingredient_id) {
      const ingredient = ingredients.find((i) => i.id === loss.ingredient_id);
      if (!ingredient) {
        toast({ title: ITEM_NOT_FOUND_MSG, variant: 'destructive' });
        return;
      }
      if (qty > ingredient.stock) {
        toast({ title: EXCEEDS_STOCK_MSG, variant: 'destructive' });
        return;
      }
      await updateIngredient(loss.ingredient_id, { stock: Number((ingredient.stock - qty).toFixed(2)) });
      await recordStockMovement({ ingredientId: loss.ingredient_id, type: 'exit', quantity: qty, reason: `Perda: ${loss.reason}` });
    }

    const { error } = await confirmLoss(loss.id);
    if (error) {
      toast({ title: 'Erro ao confirmar perda', description: error.message, variant: 'destructive' });
      return;
    }
    log('confirm', 'losses', loss.id, { quantity: qty, reason: loss.reason });
    toast({ title: 'Perda confirmada', description: 'Saída de stock registada.' });
  };

  const handleCancel = async (loss: Loss) => {
    const { error } = await cancelLoss(loss.id);
    if (error) {
      toast({ title: 'Erro ao cancelar perda', description: error.message, variant: 'destructive' });
      return;
    }
    log('cancel', 'losses', loss.id);
    toast({ title: 'Perda cancelada' });
  };

  const kpi = {
    pending: losses.filter((l) => l.status === 'pending').length,
    confirmed: losses.filter((l) => l.status === 'confirmed').reduce((s, l) => s + l.quantity, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<PackageX className="h-6 w-6" />}
        title={t('page.losses')}
        description="Registar e confirmar perdas de stock (quebra, deterioração, validade)"
      >
        {canEdit && (
          <Button variant="gradient" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registar Perda
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Perdas pendentes</p>
          <p className="text-2xl font-bold text-warning">{kpi.pending}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Quantidade confirmada</p>
          <p className="text-2xl font-bold text-destructive">{kpi.confirmed}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total registado</p>
          <p className="text-2xl font-bold">{losses.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Pesquisar por item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {([
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'confirmed', label: 'Confirmadas' },
            { value: 'cancelled', label: 'Canceladas' },
          ] as { value: LossFilter; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={
                (filter === opt.value ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground") +
                " px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-card border rounded-xl">
          <LoadingRow />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-xl text-center py-16 text-muted-foreground">
          <PackageX className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhuma perda encontrada</p>
        </div>
      ) : (
        <div className="list-panel border rounded-xl overflow-hidden">
          <div className="divide-y">
            {filtered.map((loss) => (
              <div key={loss.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{itemName(loss)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(loss.loss_date), "dd 'de' MMMM yyyy", { locale: pt })}
                    {loss.notes ? ` · ${loss.notes}` : ''}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">{loss.reason}</Badge>
                <p className="font-semibold text-sm text-destructive">{loss.quantity} {loss.unit || selectedUnitKey(loss, ingredients)}</p>
                <LossStatusBadge status={loss.status} />
                {loss.status === 'pending' && canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="success" onClick={() => handleConfirm(loss)} title="Confirmar (sai do stock)">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-muted-foreground" onClick={() => handleCancel(loss)} title="Cancelar">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registar Perda</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Item</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setItemType('product'); setItemId(''); }}
                  className={itemType === 'product' ? "p-2 rounded-lg border-2 border-primary bg-primary/10 text-left" : "p-2 rounded-lg border-2 border-border hover:border-primary/50 text-left"}
                >
                  <p className="font-medium text-sm">Produto</p>
                  <p className="text-xs text-muted-foreground">Bebidas e refeições</p>
                </button>
                <button
                  onClick={() => { setItemType('ingredient'); setItemId(''); }}
                  className={itemType === 'ingredient' ? "p-2 rounded-lg border-2 border-primary bg-primary/10 text-left" : "p-2 rounded-lg border-2 border-border hover:border-primary/50 text-left"}
                >
                  <p className="font-medium text-sm">Ingrediente</p>
                  <p className="text-xs text-muted-foreground">Matérias-primas</p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {itemType === 'product'
                    ? products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (stock: {p.stock} {p.type === 'drink' && p.fracionavel ? 'garrafa' : 'un'})
                        </SelectItem>
                      ))
                    : ingredients.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} (stock: {i.stock} {i.unit})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
              {selectedStock != null && (
                <p className="text-xs text-muted-foreground">
                  Stock disponível: {selectedStock} {selectedUnit}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={lossDate} onChange={(e) => setLossDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as LossReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observações" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegister}>
              Registar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function selectedUnitKey(loss: Loss, ingredients: Array<{ id: string; unit: string }>) {
  if (loss.ingredient_id) {
    return ingredients.find((i) => i.id === loss.ingredient_id)?.unit ?? 'un';
  }
  return 'un';
}