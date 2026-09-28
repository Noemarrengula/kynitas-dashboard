import { useState, useMemo } from 'react';
import { BookOpen, ChefHat, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RecipeModal } from '@/components/products/RecipeModal';
import { useDatabase } from '@/hooks/useDatabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { Product } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

export default function InventoryRecipes() {
  const navigate = useNavigate();
  const { products, ingredients, loading, profitByProduct, stockByMeal } = useDatabase();
  const { can } = usePermissions();
  const { t } = useI18n();
  const canEdit = can('produtos_editar');
  const canSeeCost = can('precos_margens');

  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'drink' | 'meal'>('all');
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);

  const all = useMemo(() => {
    return products
      .filter(p => (p.type === 'drink' || p.type === 'meal'))
      .filter(p => {
        const q = search.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(q) || p.internal_id.toLowerCase().includes(q);
        const matchesType = type === 'all' || p.type === type;
        return matchesSearch && matchesType;
      })
      .map(p => {
        const profit = profitByProduct[p.id];
        const recipeRows = (p.recipe || []).map(item => ({
          ingredient: ingredients.find(i => i.id === item.ingredientId),
          quantity: item.quantity,
          unit: item.unit || '',
          lineCost: ingredients.find(i => i.id === item.ingredientId)
            ? ((ingredients.find(i => i.id === item.ingredientId)?.costPerUnit || 0) * item.quantity)
            : 0,
        }));
        const hasRecipe = recipeRows.length > 0 && recipeRows.every(r => r.ingredient);
        const stock = p.type === 'meal'
          ? (stockByMeal[p.id] ?? 0)
          : (p.stock ?? 0);
        return {
          ...p,
          recipeRows,
          hasRecipe,
          unitCost: profit?.realUnitCost ?? 0,
          marginPct: profit?.marginPct ?? 0,
          foodCostPct: profit?.foodCostPct ?? 0,
          stock,
        };
      });
  }, [products, ingredients, profitByProduct, stockByMeal, search, type]);

  const withRecipe = all.filter(p => p.hasRecipe);
  const withoutRecipe = all.filter(p => !p.hasRecipe);

  const totalFoodCost = useMemo(() => {
    const scoped = all.map(p => profitByProduct[p.id]);
    const tot = scoped.reduce((acc, p) => ({
      totalRevenue: acc.totalRevenue + (p?.totalRevenue ?? 0),
      totalCost: acc.totalCost + (p?.totalCost ?? 0),
    }), { totalRevenue: 0, totalCost: 0 });
    return {
      revenue: tot.totalRevenue,
      cost: tot.totalCost,
      pct: tot.totalRevenue > 0 ? (tot.totalCost / tot.totalRevenue) * 100 : null,
    };
  }, [all, profitByProduct]);

  const openEdit = (product: Product) => {
    setRecipeProduct(product);
    setRecipeModalOpen(true);
  };

  if (loading && products.length === 0) {
    return <LoadingSpinner size="lg" text="Carregando receitas..." className="py-20" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookOpen className="h-6 w-6 text-primary" />}
        title={t('nav.recipes')}
        description="Fichas técnicas dos produtos e o seu custo real"
      >
        <Button variant="outline" onClick={() => navigate('/products/meals')}>
          <Plus className="h-4 w-4 mr-2" />
          Gerir Refeições
        </Button>
      </PageHeader>

      {/* Resumo de food cost */}
      {canSeeCost && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Receita (produtos com ficha)</p>
            <p className="text-2xl font-bold">{totalFoodCost.revenue.toLocaleString('pt-MZ')} MT</p>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Custo Real (ingredientes)</p>
            <p className="text-2xl font-bold text-destructive">{totalFoodCost.cost.toLocaleString('pt-MZ')} MT</p>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Food Cost</p>
            <p className="text-2xl font-bold">
              {totalFoodCost.pct !== null ? `${totalFoodCost.pct.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">custo / receita (30 dias de vendas)</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Pesquisar produto ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="drink">Bebidas</SelectItem>
            <SelectItem value="meal">Refeições</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Com ficha técnica */}
      <div className="list-panel border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-primary" />
            Com ficha técnica ({withRecipe.length})
          </h2>
          {withRecipe.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum produto com receita definida
            </p>
          )}
        </div>

        {withRecipe.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Ingredientes</TableHead>
                {canSeeCost && (<>
                  <TableHead className="text-right">Custo Real/Un</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Food Cost</TableHead>
                </>)}
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withRecipe.map((product) => (
                <TableRow key={product.id} className="animate-fade-in">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <p className="text-xs text-muted-foreground">{product.internal_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[320px]">
                      {product.recipeRows.slice(0, 3).map((row, i) => (
                        <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                          {row.ingredient?.name || '—'} × {row.quantity} {row.unit}
                        </Badge>
                      ))}
                      {product.recipeRows.length > 3 && (
                        <Badge variant="secondary" className="text-[11px]">+{product.recipeRows.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  {canSeeCost && (<>
                    <TableCell className="text-right text-muted-foreground">
                      {product.unitCost > 0 ? formatCurrency(product.unitCost) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.unitCost > 0 && product.price > 0 ? (
                        <Badge className={cn(
                          product.marginPct >= 30 ? 'bg-success/10 text-success hover:bg-success/20' :
                          product.marginPct >= 10 ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                          'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        )}>
                          {product.marginPct.toFixed(0)}%
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.foodCostPct > 0 ? `${product.foodCostPct.toFixed(0)}%` : '—'}
                    </TableCell>
                  </>)}
                  <TableCell className="text-right">
                    <Badge className={cn(
                      'font-semibold',
                      product.stock <= 5 ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' :
                      product.stock <= 15 ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                      'bg-success/10 text-success hover:bg-success/20'
                    )}>
                      {product.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(product)} title="Editar Receita">
                        <ChefHat className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sem ficha técnica */}
      {withoutRecipe.length > 0 && (
        <div className="list-panel border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="font-semibold">Sem ficha técnica ({withoutRecipe.length})</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione ingredientes para calcular o custo real (food cost).
            </p>
          </div>
          <div className="divide-y">
            {withoutRecipe.map((product) => (
              <div key={product.id} className="flex items-center justify-between px-4 py-3 gap-2 hover:bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{product.name}</span>
                  <Badge variant="secondary" className="text-[11px] shrink-0">
                    {product.type === 'drink' ? 'Bebida' : 'Refeição'}
                  </Badge>
                </div>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                    <ChefHat className="h-4 w-4 mr-1.5" />
                    Definir Receita
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <RecipeModal
        product={recipeProduct}
        open={recipeModalOpen}
        onClose={() => { setRecipeModalOpen(false); setRecipeProduct(null); }}
      />
    </div>
  );
}