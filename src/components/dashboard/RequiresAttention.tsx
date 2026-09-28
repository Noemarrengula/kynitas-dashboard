import { useMemo, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronRight, ChevronDown, Package, CheckCircle2 } from 'lucide-react';
import { Alert, useAlerts } from '@/hooks/useAlerts';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionHeader } from '@/components/ui/section-header';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const PRIORITY: Record<Alert['type'], number> = { error: 0, warning: 1, info: 2 };

const TYPE_CONFIG = {
  error: {
    icon: AlertCircle,
    badge: 'destructive' as const,
    bar: 'border-l-destructive',
    chip: 'bg-destructive/10 text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    badge: 'warning' as const,
    bar: 'border-l-warning',
    chip: 'bg-warning/10 text-warning',
  },
  info: {
    icon: Info,
    badge: 'info' as const,
    bar: 'border-l-info',
    chip: 'bg-info/10 text-info',
  },
};

const ACTION_TARGET: Record<Alert['category'], string> = {
  stock: '/inventory',
  credit: '/credits',
  table: '/tables',
  product: '/products/drinks',
};

export function RequiresAttention() {
  const { alerts, criticalAlerts, warningAlerts } = useAlerts();
  const navigate = useNavigate();
  const { products, ingredients } = useStore();
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () => [...alerts].sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]).slice(0, 6),
    [alerts],
  );

  const criticalProducts = useMemo(
    () => products.filter((p) => p.stock <= 5),
    [products],
  );
  const criticalIngredients = useMemo(
    () => ingredients.filter((i) => i.stock <= i.minStock),
    [ingredients],
  );

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <span className="text-sm font-medium">Tudo em ordem</span>
            <span className="text-sm text-muted-foreground">
              Nenhuma situação requer atenção neste momento.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stockAlert = alerts.find((a) => a.category === 'stock');
  const showStockDetail = Boolean(stockAlert) && (criticalProducts.length > 0 || criticalIngredients.length > 0);

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Requer atenção"
        description="Situações que precisam de acção"
        action={
          <div className="flex items-center gap-2">
            {criticalAlerts > 0 && (
              <StatusBadge variant="destructive" dot>
                {criticalAlerts} crítico{criticalAlerts > 1 ? 's' : ''}
              </StatusBadge>
            )}
            {warningAlerts > 0 && (
              <StatusBadge variant="warning" dot>
                {warningAlerts} atenção
              </StatusBadge>
            )}
          </div>
        }
      />

      <div className="space-y-2">
        {sorted.map((alert) => {
          const config = TYPE_CONFIG[alert.type];
          const Icon = config.icon;
          const stockCount =
            alert.category === 'stock'
              ? (alert.data as unknown[])?.length ?? 0
              : undefined;

          return (
            <Card key={alert.id} className={cn("overflow-hidden", config.bar)}>
              <CardContent className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 p-2 rounded-lg shrink-0", config.chip)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{alert.title}</p>
                      {stockCount !== undefined && (
                        <StatusBadge variant={alert.type === 'error' ? 'destructive' : 'warning'}>
                          {stockCount} item{(stockCount as number) > 1 ? 's' : ''}
                        </StatusBadge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>

                    {alert.category === 'stock' && showStockDetail && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setExpanded((v) => !v)}
                        >
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 mr-1" />
                          )}
                          {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </Button>
                        {expanded && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {criticalIngredients.map((ing) => (
                              <div key={ing.id} className="rounded-lg border border-warning/20 bg-warning/5 p-2">
                                <p className="text-xs font-medium truncate">{ing.name}</p>
                                <p className="text-xs text-warning font-semibold">
                                  {ing.stock} {ing.unit} · mín. {ing.minStock} {ing.unit}
                                </p>
                              </div>
                            ))}
                            {criticalProducts.map((p) => (
                              <div key={p.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 flex items-center gap-2">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="h-8 w-8 rounded object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-destructive shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{p.name}</p>
                                  <p className="text-xs text-destructive font-semibold">{p.stock} em stock</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {alert.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => navigate(ACTION_TARGET[alert.category] || '/dashboard')}
                    >
                      {alert.action}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}