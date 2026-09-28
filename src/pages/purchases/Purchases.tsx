import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReceiptText,
  Plus,
  Truck,
  AlertTriangle,
  ShoppingCart,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useDatabase } from '@/hooks/useDatabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { PurchaseOrderStatusBadge, LoadingRow } from '@/components/purchases/status-badges';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface RestockNeed {
  id: string;
  key: string;
  name: string;
  unit: string;
  type: 'product' | 'ingredient';
  stock: number;
  avgDailyQty: number;
  daysUntilEmpty: number | null;
  suggestedQty: number;
}

export function StockNeedsPanel({ canEdit = true }: { canEdit?: boolean }) {
  const { products, ingredients, productForecast, ingredientForecast } = useDatabase();
  const navigate = useNavigate();

  const needs = useMemo<RestockNeed[]>(() => {
    const productNeeds: RestockNeed[] = products
      .filter((p) => productForecast[p.id]?.needsRestock)
      .map((p) => {
        const f = productForecast[p.id];
        return {
          id: p.id,
          key: `p-${p.id}`,
          name: p.name,
          unit: p.type === 'drink' && p.fracionavel ? 'garrafa' : 'un',
          type: 'product' as const,
          stock: p.stock ?? 0,
          avgDailyQty: f?.avgDailyQty ?? 0,
          daysUntilEmpty: f?.daysUntilEmpty ?? null,
          suggestedQty: f?.suggestedRestockQty ?? 0,
        };
      });

    const ingredientNeeds: RestockNeed[] = ingredients
      .filter((i) => ingredientForecast[i.id]?.needsRestock)
      .map((i) => {
        const f = ingredientForecast[i.id];
        return {
          id: i.id,
          key: `i-${i.id}`,
          name: i.name,
          unit: i.unit,
          type: 'ingredient' as const,
          stock: i.stock ?? 0,
          avgDailyQty: f?.avgDailyQty ?? 0,
          daysUntilEmpty: f?.daysUntilEmpty ?? null,
          suggestedQty: f?.suggestedRestockQty ?? 0,
        };
      });

    return [...productNeeds, ...ingredientNeeds].sort((a, b) => {
      const aEmpty = a.daysUntilEmpty ?? 999;
      const bEmpty = b.daysUntilEmpty ?? 999;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      return b.suggestedQty - a.suggestedQty;
    });
  }, [products, ingredients, productForecast, ingredientForecast]);

  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? needs : needs.slice(0, 15);

  if (needs.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-5 flex items-center gap-3">
        <PackageCheck className="h-5 w-5 text-success" />
        <div>
          <p className="font-medium">Stock equilibrado</p>
          <p className="text-sm text-muted-foreground">Nenhum item precisa de reposição neste momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h2 className="font-semibold">Necessidades de reposição</h2>
          <Badge variant="secondary">{needs.length} item(ns)</Badge>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => navigate('/compras/nova', {
            state: {
              items: needs.map((n) => ({ id: n.id, type: n.type, suggestedQty: Math.max(1, n.suggestedQty) })),
            },
          })}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Comprar tudo
          </Button>
        )}
      </div>

      <div className="divide-y">
        {visible.map((n) => (
          <div key={n.key} className="flex items-center gap-3 px-5 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{n.name}</p>
              <p className="text-xs text-muted-foreground">
                Stock {n.stock} {n.unit}
                {n.avgDailyQty > 0 && <span> · consumo ~{n.avgDailyQty.toFixed(1)}/dia</span>}
                {n.daysUntilEmpty !== null && (
                  <span className="text-warning"> · esgota em {n.daysUntilEmpty} dia(s)</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Repor {Math.max(1, n.suggestedQty)} {n.unit}</p>
            </div>
            {canEdit && (
            <Button size="sm" variant="outline" onClick={() => navigate('/compras/nova', {
              state: { items: [{ id: n.id, type: n.type, suggestedQty: Math.max(1, n.suggestedQty) }] },
            })}>
              <Plus className="h-4 w-4 mr-1" />
              Comprar
            </Button>
          )}
          </div>
        ))}

        {needs.length > 15 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-5 py-2.5 text-sm text-primary flex items-center justify-center gap-1 hover:bg-muted transition-colors"
          >
            {expanded ? (
              <>Mostrar menos <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Mostrar todos ({needs.length}) <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const ACTIVE_STATUSES = ['confirmed', 'sent', 'partial'] as const;

export default function Purchases() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { can } = usePermissions();
  const canEdit = can('inventario_editar');
  const { suppliers, purchaseOrders, loading } = useSuppliers();

  const activeOrders = purchaseOrders.filter((po) => (ACTIVE_STATUSES as readonly string[]).includes(po.status));
  const pendingValue = activeOrders.reduce((sum, po) => sum + po.total, 0);
  const monthKey = format(new Date(), 'yyyy-MM');
  const receivedThisMonth = purchaseOrders
    .filter((po) => po.status === 'received' && (po.order_date || '').startsWith(monthKey))
    .reduce((sum, po) => sum + po.total, 0);
  const activeSuppliers = suppliers.filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ReceiptText className="h-6 w-6" />}
        title={t('page.purchases')}
        description="Gerir compras, receções e reposição de stock"
      >
        <Button variant="outline" onClick={() => navigate('/rececoes')}>
          <PackageCheck className="h-4 w-4 mr-2" />
          Receções
        </Button>
        {canEdit && (
          <Button variant="gradient" onClick={() => navigate('/compras/nova')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Compra
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingCart} label="Pedidos em aberto" value={String(activeOrders.length)} sub="confirmados, enviados ou parciais" />
        <KpiCard icon={ReceiptText} label="Valor pendente" value={formatCurrency(pendingValue)} sub="a aguardar receção/pagamento" />
        <KpiCard icon={PackageCheck} label="Recebido este mês" value={formatCurrency(receivedThisMonth)} sub={format(new Date(), "MMMM yyyy", { locale: pt })} />
        <KpiCard icon={Truck} label="Fornecedores ativos" value={String(activeSuppliers)} sub={`${suppliers.length} no total`} />
      </div>

      <StockNeedsPanel canEdit={canEdit} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ordens de Compra</h2>
          <Badge variant="secondary">{purchaseOrders.length}</Badge>
        </div>

        {loading ? (
          <div className="bg-card border rounded-xl">
            <LoadingRow />
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="bg-card border rounded-xl text-center py-12 text-muted-foreground">
            <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhuma compra registada</p>
            <p className="text-sm">Crie a primeira ordem de compra para começar a repor o stock.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {purchaseOrders.map((po) => {
              const supplier = suppliers.find((s) => s.id === po.supplier_id);
              return (
                <button
                  key={po.id}
                  onClick={() => navigate(`/compras/${po.id}`)}
                  className="bg-card border rounded-xl p-4 text-left hover:border-primary transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{po.order_number}</p>
                      <p className="text-sm text-muted-foreground truncate">{supplier?.name}</p>
                    </div>
                    <PurchaseOrderStatusBadge status={po.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-primary">{formatCurrency(po.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(po.order_date), "dd 'de' MMM", { locale: pt })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{po.items.length} linha(s)</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}