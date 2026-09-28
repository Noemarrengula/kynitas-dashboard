import { useState, useMemo } from 'react';
import { History, TrendingUp, TrendingDown, ShoppingCart, Package, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDatabase } from '@/hooks/useDatabase';
import { useI18n } from '@/contexts/I18nContext';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type MovementKind = 'entry' | 'exit' | 'sale';

function movementKind(type: string, reason: string): MovementKind {
  if (type === 'sale' || /^venda\s#/i.test(reason)) return 'sale';
  return type === 'entry' ? 'entry' : 'exit';
}

export default function StockMovements() {
  const { stockMovements, products, ingredients, loading } = useDatabase();
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | MovementKind>('all');
  const [search, setSearch] = useState('');

  const resolved = useMemo(() => {
    return stockMovements.map(movement => {
      const product = products.find(p => p.id === movement.productId);
      const ingredient = ingredients.find(i => i.id === movement.ingredientId);

      let name: string;
      let unit: string;
      let entity: 'product' | 'ingredient' | 'unknown';
      if (product) {
        name = product.name;
        unit = product.type === 'drink' && product.fracionavel ? 'garrafa' : 'un';
        entity = 'product';
      } else if (ingredient) {
        name = ingredient.name;
        unit = ingredient.unit || 'un';
        entity = 'ingredient';
      } else {
        name = movement.productId || movement.ingredientId || 'Desconhecido';
        unit = 'un';
        entity = 'unknown';
      }

      const kind = movementKind(movement.type, movement.reason);
      const nameQuery = name.toLowerCase();
      const reasonQuery = movement.reason.toLowerCase();
      const matchesSearch = search.trim() === '' ||
        nameQuery.includes(search.toLowerCase()) ||
        reasonQuery.includes(search.toLowerCase());

      return { movement, name, unit, entity, kind, matchesSearch };
    });
  }, [stockMovements, products, ingredients, search]);

  const filtered = resolved
    .filter(r => r.matchesSearch && (filter === 'all' || r.kind === filter))
    .sort((a, b) => new Date(b.movement.createdAt).getTime() - new Date(a.movement.createdAt).getTime());

  const totalEntries = resolved.filter(r => r.kind === 'entry').reduce((acc, r) => acc + r.movement.quantity, 0);
  const totalExits = resolved.filter(r => r.kind === 'exit').reduce((acc, r) => acc + r.movement.quantity, 0);
  const totalSales = resolved.filter(r => r.kind === 'sale').reduce((acc, r) => acc + r.movement.quantity, 0);

  const counts = {
    all: resolved.length,
    entry: resolved.filter(r => r.kind === 'entry').length,
    exit: resolved.filter(r => r.kind === 'exit').length,
    sale: resolved.filter(r => r.kind === 'sale').length,
  };

  const kindStyles: Record<MovementKind, { label: string; sign: string; badge: string; text: string }> = {
    entry: { label: 'Entrada', sign: '+', badge: 'bg-success/10 text-success hover:bg-success/20', text: 'text-success' },
    exit: { label: 'Saída', sign: '−', badge: 'bg-destructive/10 text-destructive hover:bg-destructive/20', text: 'text-destructive' },
    sale: { label: 'Venda', sign: '−', badge: 'bg-primary/10 text-primary hover:bg-primary/20', text: 'text-primary' },
  };

  const kindLabel = (kind: MovementKind) => kindStyles[kind].label;

  const statCard = (
    label: string,
    value: string,
    icon: React.ReactNode,
    className?: string
  ) => (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<History className="h-6 w-6 text-primary" />}
        title={t('page.stockMovements')}
        description="Histórico persistido de entradas, saídas e vendas (produtos e ingredientes)"
      />

      {loading && stockMovements.length === 0 ? (
        <LoadingSpinner size="lg" text="Carregando movimentações..." className="py-20" />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCard('Total Movimentos', String(resolved.length), <Package className="h-5 w-5 text-primary" />)}
            {statCard('Entradas', String(totalEntries), <TrendingUp className="h-5 w-5 text-success" />, 'border-green-200 bg-green-50/50')}
            {statCard('Saídas manuais', String(totalExits), <TrendingDown className="h-5 w-5 text-destructive" />, 'border-red-200 bg-red-50/50')}
            {statCard('Vendas (automático)', String(totalSales), <ShoppingCart className="h-5 w-5 text-primary" />)}
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por item ou motivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
              {([
                { value: 'all', label: 'Todos' },
                { value: 'entry', label: 'Entradas' },
                { value: 'exit', label: 'Saídas' },
                { value: 'sale', label: 'Vendas' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as typeof filter)}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1",
                    filter === option.value
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                  <Badge variant="secondary" className="h-5 text-xs">{counts[option.value]}</Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Movements List */}
          <div className="list-panel border rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhuma movimentação encontrada</p>
                {resolved.length === 0 && (
                  <p className="text-sm mt-1">
                    Ainda não há movimentações. As vendas registam saídas automaticamente.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(({ movement, name, unit, entity, kind }) => {
                  const styles = kindStyles[kind];
                  return (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-4 gap-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                          {entity === 'ingredient' ? (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          ) : entity === 'product' ? (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {movement.reason || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(movement.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            {kindLabel(kind)}
                          </Badge>
                        </div>
                        <div className={cn("text-2xl font-bold min-w-[90px] text-right", styles.text)}>
                          {styles.sign}{movement.quantity} {unit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}