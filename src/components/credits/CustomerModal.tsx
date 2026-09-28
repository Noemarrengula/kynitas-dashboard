import { useState, useEffect, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '@/hooks/useCredits';

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (customer: any) => Promise<any>;
  customer?: Customer | null;
}

const CustomerModal = memo(function CustomerModal({ open, onClose, onSave, customer }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    nuit: '',
    creditLimit: '5000',
    status: 'active' as 'active' | 'blocked' | 'inactive',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        nuit: customer.nuit || '',
        creditLimit: customer.creditLimit.toString(),
        status: customer.status,
        notes: customer.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        nuit: '',
        creditLimit: '5000',
        status: 'active',
        notes: '',
      });
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      name: formData.name,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      nuit: formData.nuit || undefined,
      creditLimit: parseFloat(formData.creditLimit),
      status: formData.status,
      notes: formData.notes || undefined,
    };

    const result = await onSave(data);
    setLoading(false);
    
    if (result.error === null) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+258 84 123 4567"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuit">NUIT</Label>
              <Input
                id="nuit"
                value={formData.nuit}
                onChange={(e) => setFormData({ ...formData, nuit: e.target.value })}
                placeholder="Nº de identificação fiscal"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Limite de Crédito *</Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
export { CustomerModal };
