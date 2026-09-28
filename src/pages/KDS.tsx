import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  ChefHat,
  Check,
  Play,
  Maximize,
  Minimize,
  RefreshCw,
  UtensilsCrossed,
  PackageOpen,
  WifiOff,
  AlertTriangle,
  Boxes,
  Flame,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { useStore } from '@/store/useStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/hooks/use-toast';
import { cn, getErrorMessage } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Order, Table, OrderItem } from '@/types';

type OrderStatus = Order['status'];

interface OrderWithItemNotes extends Order {
  items: Array<OrderItem & { note?: string }>;
}

const COLUMNS: { status: Extract<OrderStatus, 'pending' | 'preparing' | 'ready'>; title: string; accent: string; icon: typeof Boxes }[] = [
  { status: 'pending', title: 'Novos', accent: 'border-warning/60', icon: Flame },
  { status: 'preparing', title: 'Em preparação', accent: 'border-blue-500/60', icon: ChefHat },
  { status: 'ready', title: 'Prontos', accent: 'border-success/60', icon: Check },
];

export default function KDS() {
  const { currentBusiness } = useBusiness();
  const { orders, updateOrder, setOrders, tables } = useStore();
  const { online, pendingCount } = useOfflineSync();
  const { log: auditLog } = useAuditLog();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Actualizar tempo a cada 30s — sem re-render caro nem polling de dados
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      document.documentElement.requestFullscreen().catch(() => toast({
        title: 'Não foi possível entrar em tela cheia',
        description: 'Verifique as permissões do navegador.',
        variant: 'destructive',
      }));
    }
  };

  const loadOrders = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
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
      setLoadError(getErrorMessage(err, 'Não foi possível carregar os pedidos.'));
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

    auditLog('order_status', 'orders', order.id, { from: previous, to: status });
    const transitions: Partial<Record<OrderStatus, string>> = {
      pending: 'colocado na fila',
      preparing: 'preparação iniciada',
      ready: 'marcado como pronto',
      delivered: 'marcado como entregue',
    };
    toast({
      title: 'Pedido atualizado',
      description: transitions[status] || status,
    });
  }, [currentBusiness?.id, updateOrder, auditLog]);

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
    return Math.max(0, ...all.map(o => differenceInMinutes(now, new Date(o.createdAt))));
  }, [grouped, now]);

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
    <ul className="space-y-2">
      {(order as OrderWithItemNotes).items.map((item, idx) => {
        const legacyName = (item as Partial<typeof item> & { name?: string }).name;
        const note = (item as Partial<typeof item> & { note?: string }).note;
        return (
          <li key={idx} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="text-xl font-black tabular-nums leading-none">{item.quantity}×</span>
                <span className="truncate text-base font-medium">
                  {item.product?.name || legacyName || item.productId}
                </span>
              </span>
              {item.product?.name?.includes('(Dose)') && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">dose</span>
              )}
            </div>
            {note && (
              <p className="rounded-md bg-warning/15 px-2 py-1 text-sm font-medium text-warning">
                ⚠ {note}
              </p>
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
        <div className="flex flex-wrap items-center gap-2">
          {!online && (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" /> Offline — dados podem estar atrasados
            </Badge>
          )}
          {online && pendingCount > 0 && (
            <Badge variant="outline" className="gap-1 text-warning border-warning/40 bg-warning/10">
              <AlertTriangle className="h-3 w-3" /> {pendingCount} venda{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
            {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <KdsSkeleton />
      ) : loadError ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Não foi possível carregar os dados"
              description={loadError}
              action={<Button variant="outline" onClick={() => loadOrders()}>Tentar novamente</Button>}
            />
          </CardContent>
        </Card>
      ) : totalActive === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={PackageOpen}
            title="Nenhum pedido pendente"
            description="Os pedidos das mesas aparecem aqui em tempo real."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const items = grouped[col.status];
            if (items.length === 0) return null;
            return (
              <div key={col.status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <col.icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">{col.title}</h2>
                  <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
                </div>
                {items.map(order => (
                  <KitchenCard
                    key={order.id}
                    order={order}
                    now={now}
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
  now,
  tableLabel,
  accent,
  formatClock,
  onStatus,
  renderItems,
}: {
  order: Order;
  now: number;
  tableLabel: string;
  accent: string;
  formatClock: (d: Date) => string;
  onStatus: (order: Order, status: OrderStatus) => void;
  renderItems: (order: Order) => ReactNode;
}) {
  const elapsed = Math.max(0, differenceInMinutes(now, new Date(order.createdAt)));
  const isNew = elapsed <= 1;
  const orderRef = order.id.startsWith('order-') ? order.id.slice(6).slice(-4).toUpperCase() : order.id.slice(0, 4).toUpperCase();

  return (
    <Card className={cn('overflow-hidden border-l-8', accent)}>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Pedido #{orderRef}
            </p>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-xl font-bold leading-tight">{tableLabel}</span>
              {isNew && (
                <Badge className="animate-pulse bg-warning/20 text-warning border-warning/40">NOVO</Badge>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground tabular-nums">{formatClock(new Date(order.createdAt))}</p>
            <p className="text-sm font-bold tabular-nums">{elapsed} min</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {renderItems(order)}
      </CardContent>
      <div className="p-3 pt-0">
        {order.status === 'pending' && (
          <Button size="lg" className="w-full" onClick={() => onStatus(order, 'preparing')}>
            <Play className="h-5 w-5 mr-2" /> Aceitar pedido
          </Button>
        )}
        {order.status === 'preparing' && (
          <Button variant="gradient" size="lg" className="w-full" onClick={() => onStatus(order, 'ready')}>
            <Check className="h-5 w-5 mr-2" /> Marcar pronto
          </Button>
        )}
        {order.status === 'ready' && (
          <Button variant="outline" size="lg" className="w-full" onClick={() => onStatus(order, 'delivered')}>
            <UtensilsCrossed className="h-5 w-5 mr-2" /> Entregar
          </Button>
        )}
      </div>
    </Card>
  );
}

function KdsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, c) => (
        <div key={c} className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ))}
    </div>
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