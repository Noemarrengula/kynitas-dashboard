import { useState, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table } from '@/types';

interface TableManagementModalProps {
  open: boolean;
  onClose: () => void;
  table: Table | null;
  onSave: (data: { customer_name?: string; status: 'free' | 'occupied' | 'awaiting_payment' }) => void;
}

const TableManagementModal = memo(function TableManagementModal({ open, onClose, table, onSave }: TableManagementModalProps) {
  const [customerName, setCustomerName] = useState(table?.customer_name || '');
  const [status, setStatus] = useState<'free' | 'occupied' | 'awaiting_payment'>(table?.status || 'free');

  const handleSave = () => {
    onSave({
      customer_name: customerName.trim() || undefined,
      status,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Mesa {table?.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do Cliente (Opcional)</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João Silva"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ajuda a identificar quem está na mesa
            </p>
          </div>

          <div>
            <Label>Status da Mesa</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Livre</SelectItem>
                <SelectItem value="occupied">Ocupada</SelectItem>
                <SelectItem value="awaiting_payment">Aguardando Pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export { TableManagementModal };
