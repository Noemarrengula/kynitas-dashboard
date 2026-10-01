import { useState, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewTableModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { number: number; name?: string; customer_name?: string }) => Promise<boolean>;
  existingNumbers: number[];
}

const NewTableModal = memo(function NewTableModal({ open, onClose, onSave, existingNumbers }: NewTableModalProps) {
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const [number, setNumber] = useState(nextNumber);
  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    if (saving) return;
    if (existingNumbers.includes(number)) {
      alert('Número de mesa já existe!');
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave({
        number,
        name: name.trim() || undefined,
        customer_name: customerName.trim() || undefined,
      });
      if (!ok) return;
      setNumber(nextNumber + 1);
      setName('');
      setCustomerName('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Mesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Número da Mesa *</Label>
            <Input
              type="number"
              value={number}
              onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
              min={1}
            />
          </div>

          <div>
            <Label>Nome da Mesa (Opcional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Varanda, Sala VIP"
            />
          </div>

          <div>
            <Label>Nome do Cliente (Opcional)</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? 'A criar...' : 'Criar Mesa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
export { NewTableModal };
