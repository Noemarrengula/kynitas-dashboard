import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Phone, Mail, MapPin, ReceiptText, ChevronRight, Power, Edit } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAuditLog } from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import type { Supplier } from '@/types';
import { LoadingRow } from '@/components/purchases/status-badges';
import { SupplierFormDialog, type SupplierFormValues } from '@/components/suppliers/SupplierFormDialog';

type ActiveFilter = 'all' | 'active' | 'inactive';

export default function Suppliers() {
  const navigate = useNavigate();
  const { suppliers, purchaseOrders, addSupplier, updateSupplier, loading } = useSuppliers();
  const { log } = useAuditLog();
  const { can } = usePermissions();
  const { t } = useI18n();
  const canEdit = can('inventario_editar');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ActiveFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) => {
      if (filter === 'active' && !s.active) return false;
      if (filter === 'inactive' && s.active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contact_person || '').toLowerCase().includes(q) ||
        (s.nuit || '').includes(q)
      );
    });
  }, [suppliers, search, filter]);

  const statsFor = (supplierId: string) => {
    const orders = purchaseOrders.filter((po) => po.supplier_id === supplierId);
    const total = orders.reduce((sum, po) => sum + po.total, 0);
    const open = orders
      .filter((po) => ['confirmed', 'sent', 'partial'].includes(po.status))
      .reduce((sum, po) => sum + po.total, 0);
    return { orders: orders.length, total, open };
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setDialogOpen(true);
  };

  const handleSave = async (values: SupplierFormValues) => {
    if (editing) {
      await updateSupplier(editing.id, values);
      log('update', 'suppliers', editing.id, { name: values.name });
      toast({ title: 'Fornecedor atualizado!' });
    } else {
      const { data, error } = await addSupplier({ ...values, active: true });
      if (error) {
        toast({ title: 'Erro ao criar fornecedor', description: error.message, variant: 'destructive' });
        return;
      }
      if (data) {
        log('create', 'suppliers', data.id, { name: data.name });
        toast({ title: 'Fornecedor criado!' });
      }
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const toggleActive = async (supplier: Supplier) => {
    await updateSupplier(supplier.id, { active: !supplier.active });
    log('update', 'suppliers', supplier.id, { active: !supplier.active });
    toast({ title: supplier.active ? 'Fornecedor desativado' : 'Fornecedor ativado' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Truck className="h-6 w-6" />}
        title={t('page.suppliers')}
        description="Gerir fornecedores e observar o histórico de compras"
      >
        <Button variant="outline" onClick={() => navigate('/compras')}>
          <ReceiptText className="h-4 w-4 mr-2" />
          Compras
        </Button>
        {canEdit && (
          <Button variant="gradient" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Pesquisar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {([
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'inactive', label: 'Inativos' },
          ] as { value: ActiveFilter; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={
                (filter === opt.value ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground") +
                " px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-card border rounded-xl">
          <LoadingRow />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-xl text-center py-16 text-muted-foreground">
          <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">
            {suppliers.length === 0 ? 'Nenhum fornecedor cadastrado' : 'Nenhum fornecedor encontrado'}
          </p>
          <p className="text-sm">Execute supabase-fornecedores.sql e fase6-compras-perdas.sql no Supabase e crie o primeiro fornecedor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((supplier) => {
            const stats = statsFor(supplier.id);
            return (
              <div key={supplier.id} className="group bg-card border rounded-xl p-4 space-y-3 hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left min-w-0 flex-1" onClick={() => navigate(`/fornecedores/${supplier.id}`)}>
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{supplier.name}</h3>
                    {supplier.contact_person && (
                      <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
                    )}
                  </button>
                  <Badge variant={supplier.active ? 'default' : 'secondary'}>
                    {supplier.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-muted-foreground truncate">
                      <Mail className="h-3 w-3" /> {supplier.email}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-muted-foreground truncate">
                      <MapPin className="h-3 w-3" /> {supplier.address}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Compras</span>
                    <span className="font-semibold">{stats.orders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total comprado</span>
                    <span className="font-semibold">{formatCurrency(stats.total)}</span>
                  </div>
                  {stats.open > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Em aberto</span>
                      <span className="font-semibold text-warning">{formatCurrency(stats.open)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/fornecedores/${supplier.id}`)}>
                    Detalhe
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  {canEdit && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(supplier)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => toggleActive(supplier)} title={supplier.active ? 'Desativar' : 'Ativar'}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={editing}
        onSave={handleSave}
      />
    </div>
  );
}