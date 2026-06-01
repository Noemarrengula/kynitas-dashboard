import { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, UtensilsCrossed, ChefHat } from 'lucide-react';
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
import { useDatabase } from '@/hooks/useDatabase';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 8;

export default function Meals() {
  const { products, deleteProduct, loading, salesByProduct, stockByMeal } = useDatabase();
  const meals = products.filter(p => p && p.type === 'meal' && p.name && p.internal_id);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);

  const categories: string[] = [...new Set(meals.map(p => p.category))];

  const filteredMeals = useMemo(() => {
    return meals.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.internal_id || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [meals, search, category]);

  // Add sales data to meals
  const mealsWithSales = filteredMeals.map(meal => {
    const salesData = salesByProduct[meal.id] || { totalSales: 0, totalRevenue: 0 };
    return {
      ...meal,
      totalSales: salesData.totalSales,
      totalRevenue: salesData.totalRevenue,
    };
  });

  // Add stock data to meals
  const mealsWithStock = mealsWithSales.map(meal => {
    const stock = stockByMeal[meal.id] || 0;
    return {
      ...meal,
      stock,
    };
  });

  const paginatedMeals = mealsWithStock.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredMeals.length / ITEMS_PER_PAGE);

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
      toast({ title: 'Refeição apagada com sucesso!' });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            Refeições
          </h1>
          <p className="text-muted-foreground">Gerir o cardápio de refeições</p>
        </div>
        <Button variant="gradient" onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Refeição
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
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
      <div className="bg-card border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Refeição</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Custo Est.</TableHead>
              <TableHead className="text-right">Custo Real</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  Nenhuma refeição encontrada
                </TableCell>
              </TableRow>
            ) : (
              paginatedMeals.map((product) => (
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
                          <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <span className="font-medium">{product.name || 'Sem nome'}</span>
                        {product.recipe && product.recipe.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {product.recipe.length} ingredientes
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.internal_id || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {(product.price ?? 0).toLocaleString('pt-MZ')} MT
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {(product.estimatedCost ?? 0).toLocaleString('pt-MZ')} MT
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {product.costPrice != null ? `${product.costPrice.toLocaleString('pt-MZ')} MT` : '—'}
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
                    {product.totalSales}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.totalRevenue.toLocaleString('pt-MZ')} MT
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEditRecipe(product)} title="Editar Receita">
                        <ChefHat className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(product)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              {filteredMeals.length} refeições encontradas
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
        type="meal"
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
            <AlertDialogTitle>Apagar refeição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A refeição "{productToDelete?.name}" será removida permanentemente.
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
