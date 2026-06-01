import { useState } from 'react';
import { Truck, Plus, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Supplier } from '@/types';
import { PurchaseOrdersTab } from '@/components/suppliers/PurchaseOrdersTab';

export default function Suppliers() {
  const { suppliers, purchaseOrders, addSupplier, updateSupplier, loading } = useSuppliers();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    nuit: '',
    payment_terms: 30,
    credit_limit: 0,
    notes: '',
  });

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        nuit: supplier.nuit || '',
        payment_terms: supplier.payment_terms,
        credit_limit: supplier.credit_limit,
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        nuit: '',
        payment_terms: 30,
        credit_limit: 0,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, formData);
      toast({ title: 'Fornecedor atualizado!' });
    } else {
      await addSupplier({ ...formData, active: true });
      toast({ title: 'Fornecedor criado!' });
    }

    setDialogOpen(false);
  };

  const getSupplierStats = (supplierId: string) => {
    const orders = purchaseOrders.filter(po => po.supplier_id === supplierId);
    const totalOrders = orders.length;
    const totalPurchased = orders.reduce((sum, po) => sum + po.total, 0);
    return { totalOrders, totalPurchased };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Fornecedores
          </h1>
          <p className="text-muted-foreground">Gerir fornecedores e ordens de compra</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="orders">Ordens de Compra</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          {!loading && suppliers.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Execute o arquivo <code>supabase-fornecedores.sql</code> no Supabase para ativar este módulo.
              </p>
            </div>
          )}
          <Input
            placeholder="Pesquisar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => {
              const stats = getSupplierStats(supplier.id);
              return (
                <div
                  key={supplier.id}
                  className="bg-card border rounded-xl p-4 space-y-3 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleOpenDialog(supplier)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{supplier.name}</h3>
                      {supplier.contact_person && (
                        <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
                      )}
                    </div>
                    <Badge variant={supplier.active ? 'default' : 'secondary'}>
                      {supplier.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {supplier.address}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de Ordens</span>
                      <span className="font-semibold">{stats.totalOrders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Comprado</span>
                      <span className="font-semibold">{formatCurrency(stats.totalPurchased)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prazo de Pagamento</span>
                      <span className="font-semibold">{supplier.payment_terms} dias</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <PurchaseOrdersTab />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nome do Fornecedor *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Distribuidora ABC"
              />
            </div>

            <div className="space-y-2">
              <Label>Pessoa de Contacto</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Nome do contacto"
              />
            </div>

            <div className="space-y-2">
              <Label>NUIT</Label>
              <Input
                value={formData.nuit}
                onChange={(e) => setFormData({ ...formData, nuit: e.target.value })}
                placeholder="Número de identificação"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+258 84 000 0000"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@fornecedor.com"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo de Pagamento (dias)</Label>
              <Input
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Limite de Crédito (MT)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Notas</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
