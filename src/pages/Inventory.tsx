import { useMemo, useState } from 'react';
import { LayoutDashboard, Package, ChefHat, Boxes, AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ForecastSection } from '@/components/stock/ForecastSection';
import { useDatabase } from '@/hooks/useDatabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { formatCurrency, cn } from '@/lib/utils';

interface OverviewRow {
  key: string;
  name: string;
  code?: string;
  kind: 'Bebida' | 'Refeição' | 'Ingrediente';
  unit: string;
  stock: number;
  value: number | null;
  critical: boolean;
  low: boolean;
  daysUntilEmpty: number | null;
  needsRestock: boolean;
  navigateTo: string;
}

export default function Inventory() {
  const navigate = useNavigate();
  const {
    products, ingredients, loading,
    ingredientForecast, productForecast, profitByProduct, stockByMeal,
  } = useDatabase();
  const { can } = usePermissions();
  const canSeeCost = can('precos_margens');
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'critical' | 'low' | 'ok'>('all');

  const rows = useMemo<OverviewRow[]>(() => {
    const productRows: OverviewRow[] = products
      .filter(p => p.type === 'drink' || p.type === 'meal')
      .map(p => {
        const stock = p.type === 'meal' ? (stockByMeal[p.id] ?? p.stock ?? 0) : (p.stock ?? 0);
        const f = productForecast[p.id];
        return {
          key: `p-${p.id}`,
          name: p.name,
          code: p.internal_id,
          kind: p.type === 'drink' ? 'Bebida' as const : 'Refeição' as const,
          unit: p.type === 'drink' && p.fracionavel ? 'garrafa' : 'un',
          stock,
          value: canSeeCost ? stock * (p.price ?? 0) : null,
          critical: stock <= 5,
          low: stock > 5 && stock <= 15,
          daysUntilEmpty: f?.daysUntilEmpty ?? null,
          needsRestock: f?.needsRestock ?? false,
          navigateTo: '/stock',
        };
      });

    const ingredientRows: OverviewRow[] = ingredients.map(i => ({
      key: `i-${i.id}`,
      name: i.name,
      unit: i.unit || 'un',
      kind: 'Ingrediente' as const,
      stock: i.stock ?? 0,
      value: canSeeCost ? (i.stock ?? 0) * i.costPerUnit : null,
      critical: i.stock <= i.minStock,
      low: false,
      daysUntilEmpty: ingredientForecast[i.id]?.daysUntilEmpty ?? null,
      needsRestock: ingredientForecast[i.id]?.needsRestock ?? false,
      navigateTo: '/inventory/ingredients',
    }));

    return [...productRows, ...ingredientRows];
  }, [products, ingredients, stockByMeal, productForecast, ingredientForecast, canSeeCost]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(q) || (r.code || '').toLowerCase().includes(q);
      let matchesStatus = true;
      if (status === 'critical') matchesStatus = r.critical;
      else if (status === 'low') matchesStatus = r.low;
      else if (status === 'ok') matchesStatus = !r.critical && !r.low;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status]);

  const critical = rows.filter(r => r.critical);
  const low = rows.filter(r => r.low);
  const attention = [
    ...critical,
    ...rows.filter(r => !r.critical && (r.needsRestock || (r.daysUntilEmpty !== null && r.daysUntilEmpty < 7))),
  ].filter((row, idx, arr) => arr.findIndex(r => r.key === row.key) === idx);

  const totalIngredientValue = ingredients.reduce((acc, i) => acc + (i.stock ?? 0) * i.costPerUnit, 0);

  const foodCostSummary = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    products.forEach(p => {
      revenue += profitByProduct[p.id]?.totalRevenue ?? 0;
      cost += profitByProduct[p.id]?.totalCost ?? 0;
    });
    return { revenue, cost, pct: revenue > 0 ? (cost / revenue) * 100 : null };
  }, [products, profitByProduct]);

  if (loading && products.length === 0 && ingredients.length === 0) {
    return <LoadingSpinner size="lg" text="Carregando inventário..." className="py-20" />;
  }

  const statusBadge = (r: OverviewRow) => {
    if (r.critical) return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Crítico</Badge>;
    if (r.low) return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Baixo</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<LayoutDashboard className="h-6 w-6 text-primary" />}
        title={t('nav.inventoryOverview')}
        description="Visão geral do stock: produtos, ingredientes, custos e previsão"
      >
        <Button variant="outline" onClick={() => navigate('/inventory/ingredients')}>
          <Boxes className="h-4 w-4 mr-2" />
          Ingredientes
        </Button>
        <Button variant="outline" onClick={() => navigate('/inventory/recipes')}>
          <ChefHat className="h-4 w-4 mr-2" />
          Receitas
        </Button>
        <Button variant="outline" onClick={() => navigate('/stock/movements')}>
          <ArrowRight className="h-4 w-4 mr-2" />
          Movimentações
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Package className="h-3.5 w-3.5" /> Produtos
          </p>
          <p className="text-2xl font-bold">{products.length}</p>
          <p className="text-xs text-muted-foreground">{ingredients.length} ingredientes</p>
        </div>
        <div className="bg-card border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Itens críticos
          </p>
          <p className="text-2xl font-bold text-destructive">{critical.length}</p>
          <p className="text-xs text-muted-foreground">{low.length} com stock baixo</p>
        </div>
        <div className="bg-card border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Valor em Stock (Ingredientes)</p>
          <p className="text-2xl font-bold">{formatCurrency(totalIngredientValue)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" /> Food Cost real
          </p>
          <p className="text-2xl font-bold">
            {canSeeCost ? (foodCostSummary.pct !== null ? `${foodCostSummary.pct.toFixed(1)}%` : '—') : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {canSeeCost ? 'custo / receita · 30 dias' : 'sem permissão'}
          </p>
        </div>
      </div>

      {/* Requer atenção */}
      {attention.length > 0 && (
        <div className="bg-card border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-4 w-4", critical.length > 0 ? "text-destructive" : "text-warning")} />
              <h2 className="font-semibold">Requer atenção ({attention.length})</h2>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/ingredients')}>Ingredientes</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/stock')}>Produtos</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {attention.slice(0, 12).map(r => (
              <Badge
                key={r.key}
                variant="secondary"
                className={cn(
                  "py-1.5 px-3 text-xs font-normal cursor-pointer hover:bg-muted",
                  r.critical && "bg-destructive/10 text-destructive hover:bg-destructive/20"
                )}
                onClick={() => navigate(r.navigateTo)}
              >
                <span className="mr-1.5 opacity-60">{r.kind}</span>
                {r.name}
                <span className="ml-1.5 opacity-70">{r.stock} {r.unit}</span>
              </Badge>
            ))}
            {attention.length > 12 && (
              <span className="text-xs text-muted-foreground self-center">+{attention.length - 12} itens…</span>
            )}
          </div>
        </div>
      )}

      {/* Tabela panorâmica */}
      <div className="list-panel border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold">Panorama de Stock ({filtered.length}/{rows.length})</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              placeholder="Pesquisar item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-64 h-9"
            />
            <div className="flex gap-1 bg-background rounded-lg p-1 border w-fit">
              {(
                [
                  { value: 'all', label: 'Todos', count: rows.length },
                  { value: 'critical', label: 'Crítico', count: critical.length },
                  { value: 'low', label: 'Baixo', count: low.length },
                  { value: 'ok', label: 'Normal', count: rows.length - critical.length - low.length },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatus(option.value as typeof status)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    status === option.value
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label} {option.count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Estado</TableHead>
              {canSeeCost && <TableHead className="text-right">Valor em Stock</TableHead>}
              <TableHead className="text-right">Previsão</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canSeeCost ? 7 : 6} className="text-center py-10 text-muted-foreground">
                  Nenhum item encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map(r => (
              <TableRow key={r.key} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(r.navigateTo)}>
                <TableCell>
                  <span className="font-medium">{r.name}</span>
                  {r.code && <span className="text-xs text-muted-foreground ml-2">{r.code}</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[11px]">{r.kind}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {r.stock} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>
                </TableCell>
                <TableCell className="text-right">{statusBadge(r)}</TableCell>
                {canSeeCost && (
                  <TableCell className="text-right text-muted-foreground">
                    {r.value !== null ? formatCurrency(r.value) : '—'}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {r.daysUntilEmpty !== null ? (
                    <Badge className={cn(
                      r.daysUntilEmpty <= 0 ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' :
                      r.daysUntilEmpty < 7 ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                      'bg-success/10 text-success hover:bg-success/20'
                    )}>
                      {r.daysUntilEmpty} dia(s)
                    </Badge>
                  ) : r.needsRestock ? (
                    <Badge variant="secondary">a repor</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">sem histórico</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <ArrowRight className="h-4 w-4 text-muted-foreground inline-block" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Previsões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ForecastSection
          title="Previsão de Ingredientes"
          subtitle="Dias restantes ao consumo real das refeições vendidas (últimos 30 dias)"
          entries={ingredients.map(ingredient => {
            const f = ingredientForecast[ingredient.id];
            return {
              id: ingredient.id,
              name: ingredient.name,
              unit: ingredient.unit || 'un',
              stock: ingredient.stock ?? 0,
              avgDailyQty: f?.avgDailyQty ?? 0,
              daysUntilEmpty: f?.daysUntilEmpty ?? null,
              needsRestock: f?.needsRestock ?? false,
              suggestedRestockQty: f?.suggestedRestockQty ?? 0,
            };
          })}
        />
        <ForecastSection
          title="Previsão de Produtos"
          subtitle="Dias restantes ao ritmo de vendas dos últimos 30 dias"
          entries={products.map(product => {
            const f = productForecast[product.id];
            return {
              id: product.id,
              name: product.name,
              unit: product.type === 'drink' && product.fracionavel ? 'garrafa' : 'un',
              stock: product.stock ?? 0,
              avgDailyQty: f?.avgDailyQty ?? 0,
              daysUntilEmpty: f?.daysUntilEmpty ?? null,
              needsRestock: f?.needsRestock ?? false,
              suggestedRestockQty: f?.suggestedRestockQty ?? 0,
            };
          })}
        />
      </div>
    </div>
  );
}