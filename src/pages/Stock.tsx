import { useState } from 'react';
import { Package, AlertTriangle, Plus, Minus, History, Edit, DollarSign, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProductModal } from '@/components/products/ProductModal';
import { useDatabase } from '@/hooks/useDatabase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { exportStockStatusToPDF } from '@/lib/productReports';

export default function Stock() {
  const navigate = useNavigate();
  const { products, ingredients, updateProduct, loading } = useDatabase();
  const stockMovements: any[] = [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'ok'>('all');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [newProductType, setNewProductType] = useState<'drink' | 'meal' | 'cigarette'>('drink');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'entry' | 'exit' | 'adjust'>('entry');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newType, setNewType] = useState<'drink' | 'meal' | 'cigarette'>('drink');

  const safeSearch = sanitizeSearchQuery(search);
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(safeSearch.toLowerCase());
    let matchesFilter = true;
    
    if (filter === 'critical') matchesFilter = p.stock <= 5;
    else if (filter === 'low') matchesFilter = p.stock > 5 && p.stock <= 15;
    else if (filter === 'ok') matchesFilter = p.stock > 15;
    
    return matchesSearch && matchesFilter;
  });

  const criticalCount = products.filter(p => p.stock <= 5).length;
  const lowCount = products.filter(p => p.stock > 5 && p.stock <= 15).length;

  const openAdjustDialog = (productId: string, type: 'entry' | 'exit' | 'adjust') => {
    setSelectedProductId(productId);
    setAdjustmentType(type);
    if (type === 'adjust') {
      const product = products.find(p => p.id === productId);
      setAdjustmentQuantity(product?.stock.toString() || '');
    } else {
      setAdjustmentQuantity('');
    }
    setAdjustmentReason('');
    setAdjustDialogOpen(true);
  };

  const openPriceDialog = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProductId(productId);
      setNewPrice((product.price || 0).toString());
      setNewCostPrice(product.costPrice != null ? product.costPrice.toString() : '');
      setPriceDialogOpen(true);
    }
  };

  const openTypeDialog = (productId?: string) => {
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProductId(productId);
        setSelectedProducts([]);
        setNewType(product.type);
        setTypeDialogOpen(true);
      }
    } else if (selectedProducts.length > 0) {
      setSelectedProductId(null);
      setNewType('drink');
      setTypeDialogOpen(true);
    }
  };

  const handlePriceUpdate = () => {
    const price = parseFloat(newPrice);
    const costPrice = newCostPrice ? parseFloat(newCostPrice) : undefined;
    
    if (!selectedProductId || isNaN(price) || price < 0) {
      toast({ title: 'Preço de venda inválido', variant: 'destructive' });
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const updates: Partial<Product> = { price };
    if (costPrice !== undefined && !isNaN(costPrice)) {
      updates.costPrice = costPrice;
    }

    updateProduct(selectedProductId, updates);

    toast({
      title: 'Preços atualizados',
      description: `${product.name}: Venda ${price.toLocaleString('pt-MZ')} MT${costPrice !== undefined && !isNaN(costPrice) ? ` | Custo ${costPrice.toLocaleString('pt-MZ')} MT` : ''}`,
    });

    setPriceDialogOpen(false);
  };

  const handleTypeUpdate = async () => {
    const idsToUpdate = selectedProductId ? [selectedProductId] : selectedProducts;
    
    console.log('Atualizando produtos:', idsToUpdate);
    console.log('Novo tipo:', newType);
    
    if (idsToUpdate.length === 0) {
      toast({ title: 'Nenhum produto selecionado', variant: 'destructive' });
      return;
    }

    const typeLabel = newType === 'drink' ? 'Bebida' : newType === 'meal' ? 'Refeição' : 'Cigarro';

    try {
      for (const id of idsToUpdate) {
        await updateProduct(id, { type: newType });
      }

      toast({
        title: 'Tipo atualizado',
        description: `${idsToUpdate.length} produto(s) alterado(s) para: ${typeLabel}`,
      });

      setTypeDialogOpen(false);
      setSelectedProducts([]);
      setSelectedProductId(null);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({ 
        title: 'Erro ao atualizar', 
        description: 'Tente novamente',
        variant: 'destructive' 
      });
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleAdjustment = () => {
    const quantity = parseInt(adjustmentQuantity);
    if (!selectedProductId || isNaN(quantity) || quantity < 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    let newStock: number;
    let message: string;
    
    if (adjustmentType === 'adjust') {
      newStock = quantity;
      message = `Stock ajustado para ${quantity} unidades`;
    } else if (adjustmentType === 'entry') {
      newStock = product.stock + quantity;
      message = `+${quantity} unidades adicionadas`;
    } else {
      newStock = Math.max(0, product.stock - quantity);
      message = `-${quantity} unidades removidas`;
    }

    updateProduct(selectedProductId, { stock: newStock });

    toast({
      title: 'Stock atualizado',
      description: `${product.name}: ${message}`,
    });

    setAdjustDialogOpen(false);
  };

  const productMovements = selectedProductId
    ? stockMovements.filter(m => m.productId === selectedProductId).slice(-10).reverse()
    : [];

  if (!products || !ingredients) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Gestão de Stock
          </h1>
          <p className="text-muted-foreground">Controlar inventário de produtos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="gradient" onClick={() => setProductModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
          {selectedProducts.length > 0 && (
            <Button onClick={() => openTypeDialog()}>
              <Tag className="h-4 w-4 mr-2" />
              Alterar Tipo ({selectedProducts.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => { exportStockStatusToPDF(products, 'Stock', `stock-${format(new Date(), 'yyyy-MM-dd')}.pdf`); toast({ title: 'Relatório de Stock PDF exportado!' }); }}>
            <History className="h-4 w-4 mr-2" />
            Stock PDF
          </Button>
          <Button variant="outline" onClick={() => navigate('/stock/movements')}>
            <History className="h-4 w-4 mr-2" />
            Ver Movimentações
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {criticalCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              {criticalCount} produto(s) com stock crítico
            </p>
            <p className="text-sm text-muted-foreground">
              Repor stock o mais rápido possível
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Pesquisar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { value: 'all', label: 'Todos', count: products.length },
            { value: 'critical', label: 'Crítico', count: criticalCount },
            { value: 'low', label: 'Baixo', count: lowCount },
            { value: 'ok', label: 'OK', count: products.length - criticalCount - lowCount },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as typeof filter)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1",
                filter === option.value
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
              <Badge variant="secondary" className="h-5 text-xs">
                {option.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleAllProducts}
                />
              </TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Preço Venda</TableHead>
              <TableHead className="text-right">Preço Custo</TableHead>
              <TableHead className="text-right">Stock Atual</TableHead>
              <TableHead className="text-right">Valor Venda</TableHead>
              <TableHead className="text-right">Valor Custo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Carregando produtos...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  {products.length === 0 ? (
                    <div className="space-y-3">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                      <div>
                        <p className="font-medium">Nenhum produto cadastrado</p>
                        <p className="text-sm text-muted-foreground">Cadastre produtos em Bebidas ou Refeições para gerir o stock</p>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => navigate('/products/drinks')}>
                          Cadastrar Bebidas
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/products/meals')}>
                          Cadastrar Refeições
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum produto encontrado com os filtros aplicados</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className={cn(
                  "animate-fade-in",
                  product.stock <= 5 && "bg-destructive/5",
                  selectedProducts.includes(product.id) && "bg-primary/5"
                )}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                  </TableCell>
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
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <p className="text-xs text-muted-foreground">{product.internal_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {product.type === 'drink' ? 'Bebida' : 'Refeição'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {product.price.toLocaleString('pt-MZ')} MT
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {product.costPrice != null ? `${product.costPrice.toLocaleString('pt-MZ')} MT` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn(
                      "font-semibold",
                      product.stock <= 5 ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' :
                      product.stock <= 15 ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                      'bg-success/10 text-success hover:bg-success/20'
                    )}>
                      {product.stock} un.
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {(product.stock * product.price).toLocaleString('pt-MZ')} MT
                  </TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {product.costPrice != null ? `${(product.stock * product.costPrice).toLocaleString('pt-MZ')} MT` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTypeDialog(product.id)}
                        title="Alterar Tipo"
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPriceDialog(product.id)}
                        title="Ajustar Preços"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustDialog(product.id, 'adjust')}
                        title="Ajustar Stock"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustDialog(product.id, 'entry')}
                        className="text-success hover:text-success"
                        title="Entrada"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustDialog(product.id, 'exit')}
                        className="text-destructive hover:text-destructive"
                        title="Saída"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'adjust' ? 'Ajustar Stock' : adjustmentType === 'entry' ? 'Entrada de Stock' : 'Saída de Stock'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{adjustmentType === 'adjust' ? 'Nova Quantidade' : 'Quantidade'}</Label>
              <Input
                type="number"
                min="0"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                placeholder={adjustmentType === 'adjust' ? 'Digite a quantidade total...' : 'Digite a quantidade...'}
              />
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Ex: Reposição de stock, Quebra, etc."
                rows={2}
              />
            </div>

            {productMovements.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Últimos Movimentos
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {productMovements.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                      <span className="text-muted-foreground">
                        {format(new Date(mov.createdAt), "dd/MM HH:mm", { locale: pt })}
                      </span>
                      <span className={mov.type === 'entry' ? 'text-success' : 'text-destructive'}>
                        {mov.type === 'entry' ? '+' : '-'}{mov.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdjustDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant={adjustmentType === 'adjust' ? 'default' : adjustmentType === 'entry' ? 'success' : 'destructive'}
                className="flex-1"
                onClick={handleAdjustment}
              >
                Confirmar {adjustmentType === 'adjust' ? 'Ajuste' : adjustmentType === 'entry' ? 'Entrada' : 'Saída'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Adjustment Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Preços</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preço de Venda (MT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Digite o preço de venda..."
              />
            </div>

            <div className="space-y-2">
              <Label>Preço de Custo (MT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newCostPrice}
                onChange={(e) => setNewCostPrice(e.target.value)}
                placeholder="Digite o preço de custo..."
              />
            </div>

            {(newPrice || newCostPrice) && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm text-muted-foreground">Resumo</p>
                {newPrice && (
                  <p className="text-lg font-semibold">
                    Venda: {parseFloat(newPrice).toLocaleString('pt-MZ')} MT
                  </p>
                )}
                {newCostPrice && (
                  <p className="text-sm text-muted-foreground">
                    Custo: {parseFloat(newCostPrice).toLocaleString('pt-MZ')} MT
                    {newPrice && parseFloat(newPrice) > 0 && (
                      <span className="ml-2">
                        Margem: {((parseFloat(newPrice) - parseFloat(newCostPrice)) / parseFloat(newPrice) * 100).toFixed(0)}%
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPriceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handlePriceUpdate}>
                Confirmar Preços
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Type Change Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Tipo de Produto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo do Produto</Label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setNewType('drink')}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    newType === 'drink' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="font-medium">Bebida</p>
                  <p className="text-xs text-muted-foreground">Cervejas, refrigerantes, sucos, etc.</p>
                </button>
                <button
                  onClick={() => setNewType('meal')}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    newType === 'meal' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="font-medium">Refeição</p>
                  <p className="text-xs text-muted-foreground">Comidas, pratos, lanches, etc.</p>
                </button>
                <button
                  onClick={() => setNewType('cigarette')}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    newType === 'cigarette' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="font-medium">Cigarro</p>
                  <p className="text-xs text-muted-foreground">Cigarros, charutos, tabaco, etc.</p>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleTypeUpdate}>
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para selecionar tipo de produto a criar */}
      <Dialog open={productModalOpen && !newProductType} onOpenChange={(open) => {
        if (!open) {
          setProductModalOpen(false);
          setNewProductType('drink');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione o tipo de produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <button
              onClick={() => setNewProductType('drink')}
              className="w-full p-4 rounded-lg border-2 border-border hover:border-primary/50 text-left transition-all"
            >
              <p className="font-medium">🍺 Bebida</p>
              <p className="text-sm text-muted-foreground">Cervejas, refrigerantes, sucos, etc.</p>
            </button>
            <button
              onClick={() => setNewProductType('meal')}
              className="w-full p-4 rounded-lg border-2 border-border hover:border-primary/50 text-left transition-all"
            >
              <p className="font-medium">🍽️ Refeição</p>
              <p className="text-sm text-muted-foreground">Comidas, pratos, lanches, etc.</p>
            </button>
            <button
              onClick={() => setNewProductType('cigarette')}
              className="w-full p-4 rounded-lg border-2 border-border hover:border-primary/50 text-left transition-all"
            >
              <p className="font-medium">🚬 Cigarro</p>
              <p className="text-sm text-muted-foreground">Cigarros, charutos, tabaco, etc.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Modal para criar novo produto */}
      {productModalOpen && newProductType && (
        <ProductModal
          open={productModalOpen}
          onClose={() => {
            setProductModalOpen(false);
            setNewProductType('drink');
          }}
          product={null}
          type={newProductType as 'drink' | 'meal'}
        />
      )}
    </div>
  );
}
