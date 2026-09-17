import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ChefHat, Check, Play, Clock, RefreshCw, UtensilsCrossed, PackageOpen } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { cn, getErrorMessage } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Order, Table } from '@/types';

type OrderStatus = Order['status'];

const COLUMNS: { status: OrderStatus; title: string; accent: string }[] = [
  { status: 'pending', title: 'Por preparar', accent: 'border-yellow-400/60' },
  { status: 'preparing', title: 'Em preparação', accent: 'border-blue-400/60' },
  { status: 'ready', title: 'Prontos', accent: 'border-green-400/60' },
];

export default function KDS() {
  const { currentBusiness } = useBusiness();
  const { orders, updateOrder, setOrders, tables } = useStore();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      if (data) {
        setOrders(data.map(dbOrderToOrder));
      }
    } catch (err: unknown) {
      toast({
        title: 'Erro ao carregar pedidos',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, setOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const setStatus = useCallback(async (order: Order, status: OrderStatus) => {
    const previous = order.status;
    updateOrder(order.id, { status });

    if (!currentBusiness?.id) return;
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order.id)
      .eq('business_id', currentBusiness.id);

    if (error) {
      updateOrder(order.id, { status: previous });
      toast({
        title: 'Erro ao atualizar pedido',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return;
    }

    const transitions: Partial<Record<OrderStatus, string>> = {
      preparing: 'preparação iniciada',
      ready: 'marcado como pronto',
      delivered: 'marcado como entregue',
    };
    toast({
      title: 'Pedido atualizado',
      description: transitions[status] || status,
    });
  }, [currentBusiness?.id, updateOrder]);

  const grouped = useMemo(() => {
    const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'paid');
    const byStatus: Record<OrderStatus, Order[]> = {
      pending: [],
      preparing: [],
      ready: [],
      delivered: [],
      paid: [],
    };
    for (const order of active) {
      if (byStatus[order.status]) byStatus[order.status].push(order);
    }
    // mais antigos primeiro
    (Object.keys(byStatus) as OrderStatus[]).forEach(status => {
      byStatus[status].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
    return byStatus;
  }, [orders]);

  const totalActive = grouped.pending.length + grouped.preparing.length + grouped.ready.length;

  const oldestAge = useMemo(() => {
    const all = [...grouped.pending, ...grouped.preparing];
    if (all.length === 0) return 0;
    return Math.max(0, ...all.map(o => differenceInMinutes(new Date(), new Date(o.createdAt))));
  }, [grouped]);

  const tableById = useMemo(() => {
    return new Map<string, Table>(tables.map(t => [t.id, t]));
  }, [tables]);

  const tableLabel = useCallback((order: Order) => {
    const table = tableById.get(order.tableId);
    if (order.tableName) return order.tableName;
    if (table?.name) return table.name;
    if (order.table_number) return `Mesa ${order.table_number}`;
    if (table) return `Mesa ${table.number}`;
    return 'Mesa';
  }, [tableById]);

  const formatClock = (date: Date) => format(new Date(date), 'HH:mm', { locale: pt });

  const renderItems = (order: Order) => (
    <ul className="space-y-1.5">
      {order.items.map((item, idx) => {
        const legacyName = (item as Partial<typeof item> & { name?: string }).name;
        return (
          <li key={idx} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-foreground text-base">{item.quantity}×</span>
              <span className="truncate">{item.product?.name || legacyName || item.productId}</span>
            </span>
            {item.product?.name?.includes('(Dose)') && (
              <span className="text-[10px] text-muted-foreground shrink-0">dose</span>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<ChefHat className="h-5 w-5" />}
        title={t('nav.kds')}
        description={
          totalActive === 0
            ? 'Sem pedidos por preparar'
            : `${totalActive} pedido${totalActive !== 1 ? 's' : ''} ativo${totalActive !== 1 ? 's' : ''} · mais antigo há ${oldestAge} min`
        }
      >
        <Button variant="outline" size="sm" onClick={loadOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : totalActive === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <PackageOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">Nenhum pedido em espera.</p>
          <p className="text-xs">Os pedidos das mesas aparecem aqui em tempo real.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const items = grouped[col.status];
            if (items.length === 0) return null;
            return (
              <div key={col.status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-muted-foreground">{col.title}</h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                {items.map(order => (
                  <KitchenCard
                    key={order.id}
                    order={order}
                    tableLabel={tableLabel(order)}
                    accent={col.accent}
                    formatClock={formatClock}
                    onStatus={setStatus}
                    renderItems={renderItems}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KitchenCard({
  order,
  tableLabel,
  accent,
  formatClock,
  onStatus,
  renderItems,
}: {
  order: Order;
  tableLabel: string;
  accent: string;
  formatClock: (d: Date) => string;
  onStatus: (order: Order, status: OrderStatus) => void;
  renderItems: (order: Order) => ReactNode;
}) {
  const elapsed = Math.max(0, differenceInMinutes(new Date(), new Date(order.createdAt)));
  const isNew = elapsed <= 1;

  return (
    <Card className={cn('overflow-hidden border-l-4', accent)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-sm truncate">
              {tableLabel}
            </CardTitle>
            {isNew && <Badge className="bg-yellow-500/20 text-yellow-700 animate-pulse">NOVO</Badge>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatClock(new Date(order.createdAt))}</span>
            {elapsed > 0 && (
              <span className={cn('font-semibold', elapsed >= 15 ? 'text-destructive' : '')}>
                ({elapsed}′)
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {renderItems(order)}
      </CardContent>
      <CardFooter className="pt-0">
        {order.status === 'pending' && (
          <Button className="w-full" onClick={() => onStatus(order, 'preparing')}>
            <Play className="h-4 w-4 mr-2" /> Iniciar preparação
          </Button>
        )}
        {order.status === 'preparing' && (
          <Button className="w-full" onClick={() => onStatus(order, 'ready')}>
            <Check className="h-4 w-4 mr-2" /> Pronto
          </Button>
        )}
        {order.status === 'ready' && (
          <Button variant="outline" className="w-full" onClick={() => onStatus(order, 'delivered')}>
            <UtensilsCrossed className="h-4 w-4 mr-2" /> Entregue
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function dbOrderToOrder(db: any): Order {
  return {
    id: db.id,
    tableId: db.table_id,
    tableName: db.table_name || undefined,
    table_number: db.table_number || undefined,
    items: db.items || [],
    status: db.status || 'pending',
    total: db.total || 0,
    paymentMethod: db.payment_method,
    createdAt: db.created_at ? new Date(db.created_at) : new Date(),
  };
}