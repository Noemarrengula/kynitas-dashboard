import { useMemo } from 'react';
import { PackageX, HandCoins, Wallet, Armchair, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { OpenShiftState } from '@/hooks/useOpenShift';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, cn } from '@/lib/utils';

interface SecondaryKpisProps {
  shift: OpenShiftState;
}

export function SecondaryKpis({ shift }: SecondaryKpisProps) {
  const products = useStore(s => s.products);
  const ingredients = useStore(s => s.ingredients);
  const credits = useStore(s => s.credits);
  const tables = useStore(s => s.tables);
  const navigate = useNavigate();

  const criticalStock = useMemo(
    () =>
      products.filter(p => p.stock <= 5).length +
      ingredients.filter(i => i.stock <= i.minStock).length,
    [products, ingredients],
  );

  const pendingCredits = useMemo(
    () => credits.reduce((acc, c) => acc + (c.remainingBalance || 0), 0),
    [credits],
  );

  const occupiedTables = useMemo(
    () => tables.filter(t => t.status !== 'free').length,
    [tables],
  );

  const items = [
    {
      label: 'Stock crítico',
      value: `${criticalStock} produto${criticalStock === 1 ? '' : 's'}`,
      icon: PackageX,
      tone: criticalStock > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
      route: '/inventory',
    },
    {
      label: 'Créditos pendentes',
      value: formatCurrency(pendingCredits),
      icon: HandCoins,
      tone: pendingCredits > 0 ? 'bg-info/10 text-info' : 'bg-success/10 text-success',
      route: '/credits-vendas',
    },
    {
      label: 'Caixa hoje',
      value:
        shift.expectedTotal != null ? formatCurrency(shift.expectedTotal) : 'Sem turno aberto',
      icon: Wallet,
      tone:
        shift.expectedTotal != null ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
      route: '/cashier',
      loading: shift.loading,
    },
    {
      label: 'Mesas ocupadas',
      value: `${occupiedTables} mesa${occupiedTables === 1 ? '' : 's'}`,
      icon: Armchair,
      tone: occupiedTables > 0 ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground',
      route: '/tables',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          onClick={() => navigate(item.route)}
          className="text-left"
          aria-label={`${item.label}: abrir página`}
        >
          <Card className="transition-shadow hover:shadow-md hover:shadow-primary/5 h-full">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("p-2 rounded-lg shrink-0", item.tone)}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                    {item.loading ? (
                      <Skeleton className="h-5 w-24 mt-0.5" />
                    ) : (
                      <p className="text-sm font-bold truncate">{item.value}</p>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}