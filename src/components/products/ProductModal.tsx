import { useState, useEffect, memo } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Product } from '@/types';
import { useDatabase } from '@/hooks/useDatabase';
import { toast } from '@/hooks/use-toast';
import { generateUUID } from '@/lib/uuid';

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  type: 'drink' | 'meal';
}

const drinkCategories = ['Cervejas', 'Vinhos', 'Destilados', 'Cocktails', 'Não Alcoólicas', 'Cidras', 'Gins', 'Whiskys', 'Rum', 'Licores', 'Coolers', 'Energéticos', 'Refrigerantes', 'Sumos', 'Águas'];
const mealCategories = ['Entradas', 'Frutos do Mar', 'Carnes', 'Tradicionais', 'Sobremesas'];

const ProductModal = memo(function ProductModal({ open, onClose, product, type }: ProductModalProps) {
  const { addProduct, updateProduct } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    internalId: '',
    image: '',
    estimatedCost: '',
    dailyStock: '',
    fracionavel: false,
    precoDose: '',
    dosesPorGarrafa: '',
    costPrice: '',
    ivaRate: '16',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = type === 'drink' ? drinkCategories : mealCategories;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        internalId: product.internalId ?? product.internal_id ?? '',
        image: product.image || '',
        estimatedCost: product.estimatedCost?.toString() || '',
        dailyStock: product.dailyStock?.toString() || '',
        fracionavel: product.fracionavel || false,
        precoDose: product.precoDose?.toString() || '',
        dosesPorGarrafa: product.dosesPorGarrafa?.toString() || '',
        costPrice: product.costPrice?.toString() || '',
        ivaRate: product.ivaRate?.toString() || '16',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        price: '',
        stock: '',
        internalId: type === 'drink' ? `BEB${Date.now().toString().slice(-4)}` : `REF${Date.now().toString().slice(-4)}`,
        image: '',
        estimatedCost: '',
        dailyStock: '',
        fracionavel: false,
        precoDose: '',
        dosesPorGarrafa: '',
        costPrice: '',
        ivaRate: '16',
      });
    }
    setErrors({});
  }, [product, type, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.internalId.trim()) newErrors.internalId = 'ID Interno é obrigatório';
    if (!formData.category) newErrors.category = 'Categoria é obrigatória';
    if (!formData.price || isNaN(Number(formData.price))) newErrors.price = 'Preço inválido';
    if (!formData.stock || isNaN(Number(formData.stock))) newErrors.stock = 'Stock inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const productData: Omit<Product, 'id'> & { id: string } = {
      id: product?.id || generateUUID(),
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      stock: Number(formData.stock),
      internal_id: formData.internalId,
      image: formData.image || undefined,
      type,
      costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
      ivaRate: Number(formData.ivaRate),
      ...(type === 'meal' && {
        recipe: [],
        estimatedCost: Number(formData.estimatedCost) || undefined,
        dailyStock: Number(formData.dailyStock) || undefined,
      }),
      ...(formData.fracionavel && {
        fracionavel: true,
        precoDose: Number(formData.precoDose) || undefined,
        dosesPorGarrafa: Number(formData.dosesPorGarrafa) || undefined,
      }),
    };

    try {
      if (product) {
        const result = await updateProduct(product.id, productData);
        if (result.error) {
          console.error('Erro ao atualizar:', result.error);
          toast({ title: 'Erro ao atualizar produto', description: result.error?.message || 'Tente novamente', variant: 'destructive' });
        } else {
          onClose();
        }
      } else {
        const result = await addProduct(productData);
        if (result.error) {
          console.error('Erro ao criar:', result.error);
          toast({ title: 'Erro ao criar produto', description: result.error?.message || 'Tente novamente', variant: 'destructive' });
        } else {
          onClose();
        }
      }
      setLoading(false);
    } catch (err: unknown) {
      console.error('Erro inesperado:', err);
      toast({ title: 'Erro ao salvar produto', description: String(err), variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="product-dialog-description">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar' : 'Adicionar'} {type === 'drink' ? 'Bebida' : 'Refeição'}
          </DialogTitle>
          <p id="product-dialog-description" className="text-sm text-muted-foreground">
            Preencha os dados do {type === 'drink' ? 'bebida' : 'refeição'} para {product ? 'atualizar' : 'criar'} um novo produto no sistema.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_id">ID Interno</Label>
              <Input
                id="internal_id"
                value={formData.internalId}
                onChange={(e) => setFormData({ ...formData, internalId: e.target.value })}
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço de Venda (MT)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Preço de Custo (MT)</Label>
              <Input
                id="costPrice"
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>IVA</Label>
              <Select value={formData.ivaRate} onValueChange={(v) => setFormData({ ...formData, ivaRate: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16">16% (Standard)</SelectItem>
                  <SelectItem value="10">10% (Reduzido)</SelectItem>
                  <SelectItem value="5">5% (Taxa mínima)</SelectItem>
                  <SelectItem value="0">0% (Isento)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">

              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className={errors.stock ? 'border-destructive' : ''}
              />
              {errors.stock && <p className="text-xs text-destructive">{errors.stock}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">URL da Imagem</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {type === 'drink' && (
              <div className="col-span-2 space-y-3 pt-2 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.fracionavel}
                    onChange={(e) => setFormData({ ...formData, fracionavel: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Vendido em doses (shot/meia)</span>
                </label>
                {formData.fracionavel && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="precoDose">Preço da Dose (MT)</Label>
                      <Input
                        id="precoDose"
                        type="number"
                        value={formData.precoDose}
                        onChange={(e) => setFormData({ ...formData, precoDose: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dosesPorGarrafa">Doses por Garrafa</Label>
                      <Input
                        id="dosesPorGarrafa"
                        type="number"
                        value={formData.dosesPorGarrafa}
                        onChange={(e) => setFormData({ ...formData, dosesPorGarrafa: e.target.value })}
                        placeholder="Ex: 15"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === 'meal' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="estimatedCost">Custo Estimado (MT)</Label>
                  <Input
                    id="estimatedCost"
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyStock">Stock Diário</Label>
                  <Input
                    id="dailyStock"
                    type="number"
                    value={formData.dailyStock}
                    onChange={(e) => setFormData({ ...formData, dailyStock: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? 'A guardar...' : product ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export { ProductModal };
