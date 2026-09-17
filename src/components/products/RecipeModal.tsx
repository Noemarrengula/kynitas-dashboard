import { useState, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { Product, RecipeItem } from '@/types';
import { Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RecipeModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const RecipeModal = memo(function RecipeModal({ product, open, onClose }: RecipeModalProps) {
  const { ingredients, updateProduct } = useStore();
  const [recipe, setRecipe] = useState<RecipeItem[]>(product?.recipe || []);

  const handleAddIngredient = () => {
    setRecipe([...recipe, { ingredientId: '', quantity: 0, unit: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipe(recipe.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (index: number, field: keyof RecipeItem, value: any) => {
    const newRecipe = [...recipe];
    newRecipe[index] = { ...newRecipe[index], [field]: value };
    
    if (field === 'ingredientId') {
      const ingredient = ingredients.find(i => i.id === value);
      if (ingredient) {
        newRecipe[index].unit = ingredient.unit;
      }
    }
    
    setRecipe(newRecipe);
  };

  const handleSave = () => {
    if (!product) return;

    const validRecipe = recipe.filter(r => r.ingredientId && r.quantity > 0);
    
    updateProduct(product.id, { recipe: validRecipe });
    
    toast({
      title: 'Receita atualizada!',
      description: `${product.name} agora tem ${validRecipe.length} ingrediente(s)`,
    });
    
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receita: {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {recipe.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              Nenhum ingrediente adicionado
            </p>
          ) : (
            <div className="space-y-3">
              {recipe.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Ingrediente</Label>
                    <Select
                      value={item.ingredientId}
                      onValueChange={(value) => handleUpdateIngredient(index, 'ingredientId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity || ''}
                      onChange={(e) => handleUpdateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div className="w-20">
                    <Label>Unidade</Label>
                    <Input value={item.unit} disabled className="bg-muted" />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveIngredient(index)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" onClick={handleAddIngredient} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ingrediente
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Receita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
export { RecipeModal };
