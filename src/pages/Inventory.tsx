import { useState, useRef } from 'react';
import { Package, Plus, Minus, AlertTriangle, Save, Download, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useStore } from '@/store/useStore';
import { useDatabase } from '@/hooks/useDatabase';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { exportInventoryToPDF, exportInventoryToExcel } from '@/lib/pdfExport';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Inventory() {
  const { ingredients, updateIngredient, addIngredient, loading } = useDatabase();
  const { addStockMovement } = useStore();
  const [search, setSearch] = useState('');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [deductDialogOpen, setDeductDialogOpen] = useState(false);
  const [deductIngredientId, setDeductIngredientId] = useState<string | null>(null);
  const [deductQuantity, setDeductQuantity] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'un',
    minStock: 0,
    costPerUnit: 0,
    packageName: '',
    packageQuantity: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPDF = () => {
    exportInventoryToPDF(ingredients);
    toast({ title: 'PDF exportado!', description: 'Relatório de inventário gerado com sucesso' });
  };

  const handleExportExcel = () => {
    exportInventoryToExcel(ingredients);
    toast({ title: 'Excel exportado!', description: 'Ficheiro Excel gerado com sucesso' });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        data.forEach((item: any) => {
          updateIngredient(item.id, { stock: item.stock });
        });
        toast({ title: 'Inventário importado!', description: 'Stock atualizado com sucesso' });
      } catch (error) {
        toast({ title: 'Erro ao importar', description: 'Ficheiro inválido', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const criticalIngredients = ingredients.filter(i => i.stock <= i.minStock);

  const openAdjustDialog = (ingredientId: string) => {
    setSelectedIngredientId(ingredientId);
    setAdjustmentQuantity('');
    setSelectedPackage('');
    setAdjustDialogOpen(true);
  };

  const openDeductDialog = (ingredientId: string) => {
    setDeductIngredientId(ingredientId);
    setDeductQuantity('');
    setDeductDialogOpen(true);
  };

  const handleDeduction = () => {
    const amount = parseFloat(deductQuantity);
    if (!deductIngredientId || isNaN(amount) || amount <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }

    const ingredient = ingredients.find(i => i.id === deductIngredientId);
    if (!ingredient) return;

    const newStock = Math.max(0, ingredient.stock - amount);
    updateIngredient(deductIngredientId, { stock: newStock });
    addStockMovement({
      id: `mov-${Date.now()}`,
      ingredientId: deductIngredientId,
      type: 'exit',
      quantity: amount,
      reason: 'Ajuste manual - Falha/Quebra',
      createdAt: new Date(),
    });
    toast({ title: 'Stock reduzido', description: `${ingredient.name}: -${amount} ${ingredient.unit}` });
    setDeductDialogOpen(false);
  };

  const handleCreateIngredient = () => {
    if (!newIngredient.name || !newIngredient.packageName || newIngredient.packageQuantity <= 0) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    const ingredient = {
      id: `ing-${Date.now()}`,
      name: newIngredient.name,
      stock: 0,
      unit: newIngredient.unit,
      minStock: newIngredient.minStock,
      costPerUnit: newIngredient.costPerUnit,
      packages: [
        {
          id: `pkg-${Date.now()}`,
          name: newIngredient.packageName,
          quantity: newIngredient.packageQuantity,
          costPerPackage: newIngredient.costPerUnit * newIngredient.packageQuantity,
        },
        {
          id: `pkg-${Date.now()}-1`,
          name: 'Unidade',
          quantity: 1,
          costPerPackage: newIngredient.costPerUnit,
        },
      ],
    };

    addIngredient(ingredient);

    toast({
      title: 'Ingrediente criado!',
      description: `${ingredient.name} adicionado ao inventário`,
    });

    setNewIngredient({
      name: '',
      unit: 'un',
      minStock: 0,
      costPerUnit: 0,
      packageName: '',
      packageQuantity: 0,
    });
    setCreateDialogOpen(false);
  };

  const handleAdjustment = () => {
    const quantity = parseFloat(adjustmentQuantity);
    if (!selectedIngredientId || isNaN(quantity) || quantity <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }

    const ingredient = ingredients.find(i => i.id === selectedIngredientId);
    if (!ingredient) return;

    let totalUnits = quantity;
    let reason = 'Entrada de inventário';

    if (selectedPackage && ingredient.packages) {
      const pkg = ingredient.packages.find(p => p.id === selectedPackage);
      if (pkg) {
        totalUnits = quantity * pkg.quantity;
        reason = `Entrada: ${quantity} ${pkg.name} (${totalUnits} ${ingredient.unit})`;
      }
    }

    updateIngredient(selectedIngredientId, { stock: ingredient.stock + totalUnits });

    addStockMovement({
      id: `mov-${Date.now()}`,
      ingredientId: selectedIngredientId,
      type: 'entry',
      quantity: totalUnits,
      reason,
      createdAt: new Date(),
    });

    toast({
      title: 'Stock atualizado',
      description: `${ingredient.name}: +${totalUnits} ${ingredient.unit}`,
    });

    setAdjustDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Inventário de Ingredientes
          </h1>
          <p className="text-muted-foreground">Gerir stock de ingredientes para receitas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ingrediente
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <LoadingSpinner size="lg" text="Carregando ingredientes..." className="py-20" />
      ) : ingredients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum ingrediente cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo Ingrediente" para começar</p>
        </div>
      ) : (
        <>

      {/* Alert */}
      {criticalIngredients.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              {criticalIngredients.length} ingrediente(s) abaixo do stock mínimo
            </p>
            <p className="text-sm text-muted-foreground">
              Repor stock urgentemente
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Pesquisar ingrediente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIngredients.map((ingredient) => {
          const isCritical = ingredient.stock <= ingredient.minStock;
          const percentage = (ingredient.stock / (ingredient.minStock * 2)) * 100;

          return (
            <div
              key={ingredient.id}
              className={cn(
                "bg-card border rounded-xl p-4 space-y-3",
                isCritical && "border-destructive/50 bg-destructive/5"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{ingredient.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(ingredient.costPerUnit)}/{ingredient.unit}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeductDialog(ingredient.id)}
                    aria-label="Reduzir stock"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAdjustDialog(ingredient.id)}
                    aria-label="Adicionar stock"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock Atual</span>
                  <span className={cn("font-semibold", isCritical && "text-destructive")}>
                    {ingredient.stock} {ingredient.unit}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      isCritical ? "bg-destructive" : "bg-success"
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mínimo: {ingredient.minStock} {ingredient.unit}</span>
                  <Badge variant={isCritical ? "destructive" : "secondary"} className="text-xs">
                    {isCritical ? "Crítico" : "OK"}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Valor em Stock</p>
                <p className="font-semibold">
                  {formatCurrency(ingredient.stock * ingredient.costPerUnit)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      </>
      )}

      {/* Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedIngredientId && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Ingrediente</p>
                <p className="font-semibold">
                  {ingredients.find(i => i.id === selectedIngredientId)?.name}
                </p>
              </div>
            )}

            {selectedIngredientId && ingredients.find(i => i.id === selectedIngredientId)?.packages && (
              <div className="space-y-2">
                <Label>Tipo de Embalagem</Label>
                <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a embalagem..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.find(i => i.id === selectedIngredientId)?.packages?.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.quantity} {ingredients.find(i => i.id === selectedIngredientId)?.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantidade {selectedPackage ? 'de Embalagens' : `(${ingredients.find(i => i.id === selectedIngredientId)?.unit})`}</Label>
              <Input
                type="number"
                step="1"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                placeholder="0"
              />
              {selectedPackage && (
                <p className="text-xs text-muted-foreground">
                  Total: {(parseFloat(adjustmentQuantity) || 0) * (ingredients.find(i => i.id === selectedIngredientId)?.packages?.find(p => p.id === selectedPackage)?.quantity || 0)} {ingredients.find(i => i.id === selectedIngredientId)?.unit}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustment}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ingredient Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Ingrediente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Ingrediente</Label>
              <Input
                placeholder="Ex: Cerveja 2M Média"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={newIngredient.unit} onValueChange={(v) => setNewIngredient({ ...newIngredient, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade</SelectItem>
                    <SelectItem value="g">Gramas</SelectItem>
                    <SelectItem value="ml">Mililitros</SelectItem>
                    <SelectItem value="kg">Quilos</SelectItem>
                    <SelectItem value="l">Litros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={newIngredient.minStock}
                  onChange={(e) => setNewIngredient({ ...newIngredient, minStock: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Embalagem de Compra</h4>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome da Embalagem</Label>
                  <Input
                    placeholder="Ex: Caixa 12un"
                    value={newIngredient.packageName}
                    onChange={(e) => setNewIngredient({ ...newIngredient, packageName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Custo por Unidade (MT)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="80"
                    value={newIngredient.costPerUnit || ''}
                    onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantidade na Embalagem</Label>
                  <Input
                    type="number"
                    placeholder="12"
                    value={newIngredient.packageQuantity || ''}
                    onChange={(e) => setNewIngredient({ ...newIngredient, packageQuantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {newIngredient.packageQuantity > 0 && newIngredient.costPerUnit > 0 && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium">Custo da {newIngredient.packageName || 'Embalagem'}:</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(newIngredient.costPerUnit * newIngredient.packageQuantity)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateIngredient}>
              Criar Ingrediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deduct Dialog */}
      <Dialog open={deductDialogOpen} onOpenChange={setDeductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reduzir Stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {deductIngredientId && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Ingrediente</p>
                <p className="font-semibold">
                  {ingredients.find(i => i.id === deductIngredientId)?.name}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantidade a reduzir ({ingredients.find(i => i.id === deductIngredientId)?.unit})</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={deductQuantity}
                onChange={(e) => setDeductQuantity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleDeduction(); }}
              />
            </div>

            {deductIngredientId && parseFloat(deductQuantity) > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Novo stock após redução:</p>
                <p className="font-semibold">
                  {Math.max(0, (ingredients.find(i => i.id === deductIngredientId)?.stock || 0) - parseFloat(deductQuantity))} {ingredients.find(i => i.id === deductIngredientId)?.unit}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeduction}>
              Reduzir Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
