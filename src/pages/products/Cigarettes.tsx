import { useState } from 'react';
import { Cigarette, Plus, Edit, Trash2, Search } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { useDatabase } from '@/hooks/useDatabase';
import { toast } from '@/hooks/use-toast';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

export default function Cigarettes() {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useDatabase();
  const cigarettes = products.filter(p => p.type === 'cigarette');
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    internal_id: '',
    costPrice: '',
  });

  const safeSearch = sanitizeSearchQuery(search);
  const filteredCigarettes = cigarettes.filter(c =>
    c.name.toLowerCase().includes(safeSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(safeSearch.toLowerCase())
  );

  const openDialog = (cigarette?: typeof cigarettes[0]) => {
    if (cigarette) {
      setEditingId(cigarette.id);
      setFormData({
        name: cigarette.name,
        category: cigarette.category,
        price: cigarette.price.toString(),
        stock: cigarette.stock.toString(),
        internal_id: cigarette.internal_id,
        costPrice: cigarette.costPrice?.toString() || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        category: '',
        price: '',
        stock: '',
        internal_id: `CIG${Date.now().toString().slice(-6)}`,
        costPrice: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const productData = {
      name: formData.name,
      category: formData.category || 'Cigarros',
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      internal_id: formData.internal_id,
      type: 'cigarette' as const,
      costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
    };

    if (editingId) {
      await updateProduct(editingId, productData);
      toast({ title: 'Cigarro atualizado!' });
    } else {
      await addProduct(productData);
      toast({ title: 'Cigarro cadastrado!' });
    }

    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cigarro?')) {
      await deleteProduct(id);
      toast({ title: 'Cigarro excluído!' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cigarette className="h-6 w-6 text-primary" />
            Cigarros
          </h1>
          <p className="text-muted-foreground">Gerir produtos de tabaco</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cigarro
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar cigarros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço Venda</TableHead>
              <TableHead className="text-right">Preço Custo</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredCigarettes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Cigarette className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                  <p className="font-medium">Nenhum cigarro cadastrado</p>
                  <p className="text-sm text-muted-foreground">Clique em "Novo Cigarro" para começar</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCigarettes.map((cigarette) => (
                <TableRow key={cigarette.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cigarette.name}</p>
                      <p className="text-xs text-muted-foreground">{cigarette.internal_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{cigarette.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {cigarette.price.toLocaleString('pt-MZ')} MT
                  </TableCell>
                  <TableCell className="text-right">
                    {cigarette.costPrice ? `${cigarette.costPrice.toLocaleString('pt-MZ')} MT` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn(
                      cigarette.stock <= 5 ? 'bg-destructive/10 text-destructive' :
                      cigarette.stock <= 15 ? 'bg-warning/10 text-warning' :
                      'bg-success/10 text-success'
                    )}>
                      {cigarette.stock} un.
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDialog(cigarette)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(cigarette.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Cigarro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Marlboro Red"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Cigarros, Charutos"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Venda (MT) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Custo (MT)</Label>
                <Input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stock Inicial</Label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Código Interno</Label>
              <Input
                value={formData.internal_id}
                onChange={(e) => setFormData({ ...formData, internal_id: e.target.value })}
                placeholder="CIG001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
