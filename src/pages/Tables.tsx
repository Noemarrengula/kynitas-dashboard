import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Check,
  Settings2,
  PlusCircle,
  Receipt,
  Armchair,
  Clock,
  CheckCircle2,
  CircleDot,
  ChevronRight,
  HandCoins,
  Square,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { PaymentModal } from '@/components/sales/PaymentModal';
import { useDatabase } from '@/hooks/useDatabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useStore } from '@/store/useStore';
import { Table, Order } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { cn, getErrorMessage, formatCurrency } from '@/lib/utils';
import { TableManagementModal } from '@/components/tables/TableManagementModal';
import { NewTableModal } from '@/components/tables/NewTableModal';
import { useTablesPersistence } from '@/hooks/useTablesPersistence';
import { useCredits } from '@/hooks/useCredits';
import { printReceipt, printPreBill } from '@/lib/receipt';

const STATUS_META: Record<Table['status'], { label: string; dot: string; accent: string; badge: string }> = {
  free: {
    label: 'Livre',
    dot: 'bg-success',
    accent: 'border-success/30',
    badge: 'bg-success/10 text-success border-success/20',
  },
  occupied: {
    label: 'Ocupada',
    dot: 'bg-warning',
    accent: 'border-warning/40',
    badge: 'bg-warning/10 text-warning border-warning/20',
  },
  awaiting_payment: {
    label: 'Aguardando pagamento',
    dot: 'bg-blue-500',
    accent: 'border-blue-500/40',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
};

const STATUS_FILTERS: { key: 'all' | Table['status']; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'free', label: 'Livres' },
  { key: 'occupied', label: 'Ocupadas' },
  { key: 'awaiting_payment', label: 'Aguardando pagamento' },
];

function formatElapsed(start: Date | undefined, now: number): string {
  if (!start) return '—';
  const ms = now - start.getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function Tables() {
  const { tables, orders } = useStore();
  const { products, ingredients, addSale } = useDatabase();
  const { business } = useBusiness();
  const { addTable, updateTable, updateOrder } = useTablesPersistence();
  const { registerCreditCharge } = useCredits();
  const { log: auditLog } = useAuditLog();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<'all' | Table['status']>('all');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [managingTable, setManagingTable] = useState<Table | null>(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [closeConfirm, setCloseConfirm] = useState(false);

  // Actualizar o tempo de ocupação a cada 30s (sem redesenhar a página inteira)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const selectedOrder = useMemo(() => {
    if (!selectedTable?.currentOrderId) return undefined;
    return orders.find(o => o.id === selectedTable.currentOrderId);
  }, [selectedTable, orders]);

  const filteredTables = useMemo(() => {
    if (statusFilter === 'all') return tables;
    return tables.filter(t => t.status === statusFilter);
  }, [tables, statusFilter]);

  const allFree = tables.length > 0 && tables.every(t => t.status === 'free');

  const orderOf = useCallback((table: Table) => {
    if (!table.currentOrderId) return undefined;
    return orders.find(o => o.id === table.currentOrderId);
  }, [orders]);

  const openTableDialog = useCallback((table: Table, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.manage-btn')) return;
    setSelectedTable(table);
  }, []);

  const handleManageTable = useCallback((table: Table) => {
    setManagingTable(table);
    setShowManagementModal(true);
  }, []);

  const handleSaveTableManagement = useCallback((data: { customer_name?: string; status: 'free' | 'occupied' | 'awaiting_payment' }) => {
    if (!managingTable) return;
    const updated = {
      ...data,
      opened_at: data.status !== 'free' && !managingTable.opened_at ? new Date() : managingTable.opened_at,
      closed_at: data.status === 'free' ? new Date() : undefined,
    };
    updateTable(managingTable.id, updated);
    toast({ title: 'Mesa atualizada!' });
  }, [managingTable, updateTable]);

  const handleCreateTable = useCallback((data: { number: number; name?: string; customer_name?: string }) => {
    const newTable: Table = {
      id: `table-${Date.now()}`,
      number: data.number,
      name: data.name,
      customer_name: data.customer_name,
      status: data.customer_name ? 'occupied' : 'free',
      opened_at: data.customer_name ? new Date() : undefined,
    };
    addTable(newTable);
    toast({ title: 'Mesa criada!' });
  }, [addTable]);

  const goToPos = useCallback((table: Table) => {
    navigate(`/sales?mesa=${encodeURIComponent(table.id)}`);
  }, [navigate]);

  const printPreBillForOrder = useCallback(() => {
    if (!selectedTable || !selectedOrder || selectedOrder.items.length === 0) {
      toast({
        title: 'Pedido vazio',
        description: 'Não existem itens na mesa para imprimir.',
        variant: 'destructive',
      });
      return;
    }
    try {
      printPreBill(
        selectedOrder.items,
        selectedTable.name || `Mesa ${selectedTable.number}`,
        business
      );
    } catch (error) {
      console.error('Erro ao imprimir pré-conta:', error);
      toast({
        title: 'Erro ao imprimir',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  }, [selectedTable, selectedOrder, business]);

  const handlePaymentConfirm = useCallback(async (payment: { cash: number; mpesa: number; emola: number; card: number; customerId?: string }) => {
    if (!selectedTable || !selectedOrder) return;

    try {
      const totalReceived = payment.cash + payment.mpesa + payment.emola + payment.card;
      const change = totalReceived - selectedOrder.total;

      const saleData = {
        items: selectedOrder.items,
        total: selectedOrder.total,
        paymentDetails: {
          cash: payment.cash,
          mpesa: payment.mpesa,
          emola: payment.emola,
          card: payment.card,
          total: totalReceived,
          change: Math.max(0, change),
        },
        customerId: payment.customerId,
        createdAt: new Date(),
        tableId: selectedTable.id,
        table_number: selectedTable.number,
        table_name: selectedTable.name,
        table_customer_name: selectedTable.customer_name,
      };

      const saleResult = await addSale(saleData);
      if (saleResult.error) throw saleResult.error;

      if (selectedTable.currentOrderId) {
        await updateOrder(selectedTable.currentOrderId, { status: 'paid' });
      }

      try {
        await supabase.from('tables_history').insert({
          business_id: business?.id,
          table_id: selectedTable.id,
          table_number: selectedTable.number,
          table_name: selectedTable.name,
          customer_name: selectedTable.customer_name,
          status: 'closed',
          opened_at: selectedTable.opened_at?.toISOString(),
          closed_at: new Date().toISOString(),
          total_amount: selectedOrder.total,
          sale_id: saleResult.data?.id,
        });
      } catch (histErr) {
        console.warn('Erro ao arquivar histórico da mesa:', histErr);
      }

      auditLog('table_close', 'tables', selectedTable.id, { payment: true, total: selectedOrder.total });
      useStore.getState().setTables(tables.map(t => t.id === selectedTable.id
        ? { ...t, status: 'free' as const, currentOrderId: undefined, customer_name: undefined, closed_at: new Date() }
        : t));
      setShowPaymentModal(false);
      setSelectedTable(null);

      // Check for low stock
      const lowStockItems = selectedOrder.items.filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product && (product.stock - item.quantity) <= 5;
      });

      // Check for low ingredients
      const lowIngredients: string[] = [];
      selectedOrder.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product?.recipe) {
          product.recipe.forEach(recipeItem => {
            const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
            if (ingredient) {
              const newStock = ingredient.stock - (recipeItem.quantity * item.quantity);
              if (newStock <= ingredient.minStock && !lowIngredients.includes(ingredient.name)) {
                lowIngredients.push(ingredient.name);
              }
            }
          });
        }
      });

      toast({
        title: 'Pagamento realizado com sucesso!',
        description: change > 0 ? `Troco: ${change.toFixed(2)} MT` : 'Pagamento completo',
      });

      // Imprimir recibo diretamente
      printReceipt(saleData, 'merchant', business);

      if (lowStockItems.length > 0 || lowIngredients.length > 0) {
        setTimeout(() => {
          const messages = [];
          if (lowStockItems.length > 0) messages.push(`${lowStockItems.length} produto(s)`);
          if (lowIngredients.length > 0) messages.push(`${lowIngredients.length} ingrediente(s)`);
          toast({
            title: 'Alerta de Stock!',
            description: `${messages.join(' e ')} com stock crítico`,
            variant: 'destructive',
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  }, [selectedTable, selectedOrder, tables, products, ingredients, addSale, business, updateOrder, auditLog]);

  const handleCreditConfirm = useCallback(async () => {
    if (!selectedTable || !selectedOrder || !creditCustomerName.trim()) {
      toast({
        title: 'Nome do cliente obrigatório',
        description: 'Por favor, insira o nome do cliente',
        variant: 'destructive',
      });
      return;
    }

    try {
      const customerName = creditCustomerName.trim();
      const itemCount = selectedOrder.items.length;

      const result = await registerCreditCharge(
        customerName,
        selectedOrder.items,
        selectedOrder.total
      );

      if (!result.success) {
        throw new Error(result.error || 'Erro ao registar crédito');
      }

      updateTable(selectedTable.id, { status: 'awaiting_payment' });
      auditLog('table_credit', 'tables', selectedTable.id, { total: selectedOrder.total });

      setShowCreditDialog(false);
      setCreditCustomerName('');
      setSelectedTable(null);

      toast({
        title: 'Crédito registado com sucesso!',
        description: `${customerName} levará ${itemCount} produto(s)`,
      });
    } catch (error: unknown) {
      console.error('Erro ao registar crédito:', error);
      toast({
        title: 'Erro ao registar crédito',
        description: getErrorMessage(error, 'Tente novamente'),
        variant: 'destructive',
      });
    }
  }, [selectedTable, selectedOrder, creditCustomerName, registerCreditCharge, updateTable, auditLog]);

  const handleFecharMesa = useCallback(async () => {
    if (!selectedTable) return;
    await updateTable(selectedTable.id, {
      status: 'free',
      currentOrderId: undefined,
      customer_name: undefined,
      closed_at: new Date(),
    });
    auditLog('table_close', 'tables', selectedTable.id, { payment: false });
    setCloseConfirm(false);
    setSelectedTable(null);
    toast({ title: 'Mesa fechada' });
  }, [selectedTable, updateTable, auditLog]);

  const hasItems = Boolean(selectedOrder && selectedOrder.items.length > 0);
  const totalValue = selectedOrder?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('nav.tables')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Mapa operacional das mesas do estabelecimento</p>
        </div>
        <Button onClick={() => setShowNewTableModal(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Mesa
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === f.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Mapa de mesas */}
      {tables.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Users}
            title="Nenhuma mesa cadastrada"
            description="Adicione as mesas do estabelecimento para começar a operar."
            action={<Button onClick={() => setShowNewTableModal(true)}>Nova Mesa</Button>}
          />
        </div>
      ) : allFree && statusFilter === 'all' ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={CheckCircle2}
            title="Todas as mesas estão livres"
            description="Toque numa mesa para abrir um pedido no POS."
          />
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={CheckCircle2}
            title="Sem mesas neste filtro"
            description="Não existem mesas com este estado."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filteredTables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              order={orderOf(table)}
              now={now}
              onOpen={openTableDialog}
              onManage={handleManageTable}
            />
          ))}
        </div>
      )}

      {/* Diálogo da mesa */}
      <Dialog open={Boolean(selectedTable)} onOpenChange={open => !open && setSelectedTable(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="h-5 w-5 text-primary" />
              {selectedTable?.name || `Mesa ${String(selectedTable?.number ?? '').padStart(2, '0')}`}
              {selectedTable && (
                <Badge variant="outline" className={STATUS_META[selectedTable.status].badge}>
                  {STATUS_META[selectedTable.status].label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTable && (
                <>
                  {selectedTable.customer_name && (
                    <span className="mr-3">Cliente: {selectedTable.customer_name}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatElapsed(selectedTable.opened_at, now)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedTable && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-2">
                <InfoCell label="Estado" value={STATUS_META[selectedTable.status].label} />
                <InfoCell label="Itens" value={selectedOrder ? String(selectedOrder.items.length) : '0'} />
                <InfoCell label="Total" value={formatCurrency(totalValue)} strong />
              </div>

              {/* Itens do pedido */}
              {selectedOrder ? (
                <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                  {selectedOrder.items.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">Sem itens no pedido.</p>
                  ) : (
                    selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 px-1 text-sm">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="font-semibold tabular-nums">{item.quantity}×</span>
                          <span className="truncate">{item.product?.name ?? 'Produto'}</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                  Mesa sem pedido activo.
                </p>
              )}

              {/* Acções */}
              <div className="space-y-2">
                {selectedTable.status === 'free' ? (
                  <Button variant="gradient" size="lg" className="w-full" onClick={() => goToPos(selectedTable)}>
                    <Check className="h-4 w-4 mr-2" /> Abrir pedido
                  </Button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="lg" onClick={() => goToPos(selectedTable)}>
                        <ChevronRight className="h-4 w-4 mr-1.5" />
                        {selectedTable.status === 'awaiting_payment' ? 'Adicionar itens' : 'Continuar pedido'}
                      </Button>
                      <Button variant="outline" size="lg" onClick={printPreBillForOrder} disabled={!hasItems}>
                        <Receipt className="h-4 w-4 mr-1.5" /> Imprimir conta
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedTable.status === 'awaiting_payment' ? (
                        <Button variant="gradient" size="lg" className="col-span-2" onClick={() => setShowPaymentModal(true)} disabled={!hasItems}>
                          <Check className="h-4 w-4 mr-2" /> Finalizar pagamento
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="lg" onClick={() => setShowCreditDialog(true)} disabled={!hasItems}>
                            <HandCoins className="h-4 w-4 mr-1.5" /> Pedir conta
                          </Button>
                          <Button variant="gradient" size="lg" onClick={() => setShowPaymentModal(true)} disabled={!hasItems}>
                            <Check className="h-4 w-4 mr-1.5" /> Pagar
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full text-destructive hover:bg-destructive/10"
                      onClick={() => setCloseConfirm(true)}
                    >
                      <Square className="h-4 w-4 mr-2" /> Fechar mesa
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => handleManageTable(selectedTable)}
                >
                  <Settings2 className="h-4 w-4 mr-1.5" /> Gerir mesa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagamento */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={totalValue}
        onConfirm={handlePaymentConfirm}
      />

      {/* Crédito */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar Crédito</DialogTitle>
            <DialogDescription>
              O cliente levará os produtos agora e pagará depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="table-customer-name">Nome do Cliente *</Label>
              <Input
                id="table-customer-name"
                type="text"
                placeholder="Ex: João Silva"
                value={creditCustomerName}
                onChange={(e) => setCreditCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreditConfirm();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreditDialog(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleCreditConfirm}>
              Registar Crédito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fechar mesa */}
      <ConfirmDialog
        open={closeConfirm}
        onOpenChange={setCloseConfirm}
        onConfirm={handleFecharMesa}
        title="Fechar mesa"
        description="A mesa será libertada sem registar pagamento. Continuar?"
        confirmText="Fechar mesa"
        variant="destructive"
      />

      {/* Gestão / nova mesa */}
      <TableManagementModal
        open={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        table={managingTable}
        onSave={handleSaveTableManagement}
      />
      <NewTableModal
        open={showNewTableModal}
        onClose={() => setShowNewTableModal(false)}
        onSave={handleCreateTable}
        existingNumbers={tables.map(t => t.number)}
      />
    </div>
  );
}

function InfoCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 truncate tabular-nums', strong ? 'text-base font-semibold text-primary' : 'text-sm font-medium')}>
        {value}
      </p>
    </div>
  );
}

function TableCard({
  table,
  order,
  now,
  onOpen,
  onManage,
}: {
  table: Table;
  order: Order | undefined;
  now: number;
  onOpen: (table: Table, e: React.MouseEvent) => void;
  onManage: (table: Table) => void;
}) {
  const meta = STATUS_META[table.status] ?? STATUS_META.free;
  const itemCount = order ? order.items.length : 0;
  const total = order?.total ?? 0;
  const free = table.status === 'free';

  return (
    <div className="relative">
      <button
        onClick={(e) => onOpen(table, e)}
        className={cn(
          'flex w-full flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border-l-4',
          meta.accent
        )}
        aria-label={`Mesa ${table.number}, ${meta.label}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-lg font-bold tabular-nums">{table.name || `Mesa ${table.number}`}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <Settings2
              className="manage-btn h-4 w-4 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onManage(table);
              }}
              aria-label="Gerir mesa"
            />
            <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
          </div>
        </div>

        <div>
          <Badge variant="outline" className={cn('gap-1', meta.badge)}>
            <CircleDot className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>

        {free ? (
          <p className="text-xs text-muted-foreground">Disponível para pedido</p>
        ) : (
          <div className="space-y-1.5 border-t pt-2">
            {table.customer_name && (
              <p className="truncate text-xs text-muted-foreground">{table.customer_name}</p>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{itemCount}</span> itens
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatElapsed(table.opened_at, now)}
              </span>
            </div>
            <p className="text-base font-bold tabular-nums text-primary">{formatCurrency(total)}</p>
          </div>
        )}
      </button>
    </div>
  );
}