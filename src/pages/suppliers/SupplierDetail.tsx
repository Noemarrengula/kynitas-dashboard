import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Truck, Phone, Mail, MapPin, Plus, ReceiptText, Edit, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAuditLog } from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { LoadingRow, PurchaseOrderStatusBadge } from '@/components/purchases/status-badges';
import { SupplierFormDialog, type SupplierFormValues } from '@/components/suppliers/SupplierFormDialog';
import type { Supplier } from '@/types';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { suppliers, purchaseOrders, updateSupplier, loading } = useSuppliers();
  const { log } = useAuditLog();
  const { can } = usePermissions();
  const canEdit = can('inventario_editar');

  const [editOpen, setEditOpen] = useState(false);

  if (loading) {
    return <div className="bg-card border rounded-xl"><LoadingRow /></div>;
  }

  const supplier = suppliers.find((s) => s.id === id);
  if (!supplier) {
    return (
      <div className="bg-card border rounded-xl text-center py-16 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Fornecedor não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/fornecedores')}>
          Voltar aos Fornecedores
        </Button>
      </div>
    );
  }

  const orders = purchaseOrders.filter((po) => po.supplier_id === supplier.id);
  const totalPurchased = orders.reduce((sum, po) => sum + po.total, 0);
  const openValue = orders
    .filter((po) => ['confirmed', 'sent', 'partial'].includes(po.status))
    .reduce((sum, po) => sum + po.total, 0);
  const receivedCount = orders.filter((po) => po.status === 'received').length;

  const handleSave = async (values: SupplierFormValues) => {
    await updateSupplier(supplier.id, values);
    log('update', 'suppliers', supplier.id, { name: values.name });
    toast({ title: 'Fornecedor atualizado!' });
    setEditOpen(false);
  };

  const toggleActive = async (s: Supplier) => {
    await updateSupplier(s.id, { active: !s.active });
    log('update', 'suppliers', s.id, { active: !s.active });
    toast({ title: s.active ? 'Fornecedor desativado' : 'Fornecedor ativado' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Truck className="h-6 w-6" />}
        title={supplier.name}
        description={`${supplier.contact_person || 'Sem contacto'} · NUIT ${supplier.nuit || '—'}`}
      >
        <Button variant="outline" onClick={() => navigate('/fornecedores')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Fornecedores
        </Button>
        {canEdit && (
          <Button variant="gradient" onClick={() => navigate('/compras/nova', { state: { supplierId: supplier.id } })}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Compra
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Estado</p>
          <div className="mt-1">
            <Badge variant={supplier.active ? 'default' : 'secondary'}>
              {supplier.active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Compras</p>
          <p className="font-semibold mt-1">{orders.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total comprado</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(totalPurchased)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="text-xl font-bold text-warning mt-1">{formatCurrency(openValue)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Recebidas</p>
          <p className="font-semibold mt-1">{receivedCount}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Contacto e Condições</h2>
          {canEdit && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleActive(supplier)}>
                <Power className="h-4 w-4 mr-1" />
                {supplier.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {supplier.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {supplier.phone}
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> {supplier.email}
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {supplier.address}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <ReceiptText className="h-4 w-4" /> Prazo de pagamento: <span className="font-medium text-foreground">{supplier.payment_terms} dias</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ReceiptText className="h-4 w-4" /> Limite de crédito: <span className="font-medium text-foreground">{formatCurrency(supplier.credit_limit)}</span>
          </div>
          {supplier.notes && <p className="md:col-span-2 text-sm">{supplier.notes}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ordens de Compra</h2>
          <Badge variant="secondary">{orders.length}</Badge>
        </div>
        {orders.length === 0 ? (
          <div className="bg-card border rounded-xl text-center py-12 text-muted-foreground">
            <ReceiptText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma compra com este fornecedor</p>
            <p className="text-sm">Crie uma compra para acompanhar o abastecimento.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((po) => (
              <button
                key={po.id}
                onClick={() => navigate(`/compras/${po.id}`)}
                className="w-full bg-card border rounded-xl px-4 py-3 text-left hover:border-primary transition-colors flex items-center gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{po.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(po.order_date), "dd 'de' MMM yyyy", { locale: pt })} · {po.items.length} linha(s)
                  </p>
                </div>
                <PurchaseOrderStatusBadge status={po.status} />
                <p className="font-semibold text-sm">{formatCurrency(po.total)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <SupplierFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={supplier}
        onSave={handleSave}
      />
    </div>
  );
}