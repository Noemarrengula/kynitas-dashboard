import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Wine, ChefHat } from 'lucide-react';
import { RecipeModal } from '@/components/products/RecipeModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ProductModal } from '@/components/products/ProductModal';
import { SearchInput } from '@/components/SearchInput';
import { ExportButton } from '@/components/ExportButton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDatabase } from '@/hooks/useDatabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatProductsForExport } from '@/lib/export';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 8;

export default function Drinks() {
  const { products, deleteProduct, loading, profitByProduct } = useDatabase();
  const { can } = usePermissions();
  const { t } = useI18n();
  const canEdit = can('produtos_editar');
  const canSeeCost = can('precos_margens');
  const drinks = products.filter(p => p && p.type === 'drink' && p.name && p.internal_id);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);

  const categories: string[] = [...new Set(drinks.map(p => p.category))];

  const filteredDrinks = useMemo(() => {
    return drinks.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.internal_id || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [drinks, search, category]);

  const paginatedDrinks = filteredDrinks.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Add real cost and profit data (apenas para quem tem precos_margens)
  const drinksWithProfit = paginatedDrinks.map(drink => {
    const profit = profitByProduct[drink.id];
    return {
      ...drink,
      realUnitCost: profit?.realUnitCost ?? 0,
      marginPct: profit?.marginPct ?? 0,
    };
  });

  const totalPages = Math.ceil(filteredDrinks.length / ITEMS_PER_PAGE);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      toast({ title: 'Produto apagado com sucesso!' });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const handleEditRecipe = (product: Product) => {
    setRecipeProduct(product);
    setRecipeModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Carregando bebidas..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wine className="h-6 w-6 text-primary" />
            {t('nav.drinks')}
          </h1>
          <p className="text-muted-foreground">Gerir o catálogo de bebidas</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={filteredDrinks}
            filename={`bebidas-${format(new Date(), 'yyyy-MM-dd')}`}
            formatData={formatProductsForExport}
          />
          {canEdit && (
            <Button variant="gradient" onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Bebida
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={(value) => { setSearch(value); setPage(1); }}
          placeholder="Pesquisar por nome ou ID..."
          className="flex-1"
        />
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="list-panel border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              {canSeeCost && (
                <>
                  <TableHead className="text-right">Custo Real</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </>
              )}
              <TableHead className="text-right">Dose</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              {canEdit && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDrinks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + (canSeeCost ? 2 : 0) + (canEdit ? 1 : 0)} className="text-center py-10 text-muted-foreground">
                  Nenhuma bebida encontrada
                </TableCell>
              </TableRow>
            ) : (
              drinksWithProfit.map((product) => (
                <TableRow key={product.id} className="animate-fade-in">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Wine className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{product.name || 'Sem nome'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.internal_id || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {product.price.toLocaleString('pt-MZ')} MT
                  </TableCell>
                  {canSeeCost && (
                    <>
                      <TableCell className="text-right text-muted-foreground">
                        {product.realUnitCost > 0
                          ? `${product.realUnitCost.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT${product.fracionavel ? ' /dose' : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.realUnitCost > 0 && product.price > 0 ? (
                          <Badge className={cn(
                            product.marginPct >= 30 ? 'bg-success/10 text-success hover:bg-success/20' :
                            product.marginPct >= 10 ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                            'bg-destructive/10 text-destructive hover:bg-destructive/20'
                          )}>
                            {product.marginPct.toFixed(0)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    {product.fracionavel && product.precoDose ? (
                      <span className="text-xs text-muted-foreground">
                        {product.precoDose.toLocaleString('pt-MZ')} MT
                        <br />
                        <span className="text-[10px] text-primary">/dose</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn(
                      product.stock <= 5 ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' :
                      product.stock <= 15 ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                      'bg-success/10 text-success hover:bg-success/20'
                    )}>
                      {product.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEditRecipe(product)} title="Editar Receita">
                            <ChefHat className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(product)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              {filteredDrinks.length} produtos encontrados
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedProduct(null); }}
        product={selectedProduct}
        type="drink"
      />

      {/* Recipe Modal */}
      <RecipeModal
        product={recipeProduct}
        open={recipeModalOpen}
        onClose={() => { setRecipeModalOpen(false); setRecipeProduct(null); }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto "{productToDelete?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
