import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface SupplierFormValues {
  name: string;
  contact_person?: string;
  nuit?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms: number;
  credit_limit: number;
  notes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: { id: string } & SupplierFormValues | null;
  onSave: (values: SupplierFormValues) => void | Promise<void>;
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSave }: Props) {
  const [form, setForm] = useState<SupplierFormValues>({
    name: '',
    contact_person: '',
    nuit: '',
    phone: '',
    email: '',
    address: '',
    payment_terms: 30,
    credit_limit: 0,
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: supplier?.name ?? '',
        contact_person: supplier?.contact_person ?? '',
        nuit: supplier?.nuit ?? '',
        phone: supplier?.phone ?? '',
        email: supplier?.email ?? '',
        address: supplier?.address ?? '',
        payment_terms: supplier?.payment_terms ?? 30,
        credit_limit: supplier?.credit_limit ?? 0,
        notes: supplier?.notes ?? '',
      });
    }
  }, [open, supplier]);

  const set = (patch: Partial<SupplierFormValues>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      return;
    }
    await onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Nome do Fornecedor *</Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex: Distribuidora ABC" />
          </div>
          <div className="space-y-2">
            <Label>Pessoa de Contacto</Label>
            <Input value={form.contact_person || ''} onChange={(e) => set({ contact_person: e.target.value })} placeholder="Nome do contacto" />
          </div>
          <div className="space-y-2">
            <Label>NUIT</Label>
            <Input value={form.nuit || ''} onChange={(e) => set({ nuit: e.target.value })} placeholder="Número de identificação" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone || ''} onChange={(e) => set({ phone: e.target.value })} placeholder="+258 84 000 0000" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email || ''} onChange={(e) => set({ email: e.target.value })} placeholder="email@fornecedor.com" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Endereço</Label>
            <Input value={form.address || ''} onChange={(e) => set({ address: e.target.value })} placeholder="Endereço completo" />
          </div>
          <div className="space-y-2">
            <Label>Prazo de Pagamento (dias)</Label>
            <Input
              type="number"
              value={form.payment_terms}
              onChange={(e) => set({ payment_terms: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Limite de Crédito (MT)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.credit_limit}
              onChange={(e) => set({ credit_limit: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Notas</Label>
            <Input value={form.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Observações adicionais" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}