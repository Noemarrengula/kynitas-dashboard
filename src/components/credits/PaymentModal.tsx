import { useState, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '@/hooks/useCredits';
import { formatCurrency } from '@/lib/utils';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (amount: number, method: string, description?: string) => Promise<any>;
  customer: Customer | null;
}

const PaymentModal = memo(function PaymentModal({ open, onClose, onSave, customer }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const amountNum = parseFloat(amount);
    if (amountNum <= 0 || amountNum > customer.current_balance) {
      return;
    }

    setLoading(true);
    const result = await onSave(amountNum, paymentMethod, description || undefined);
    setLoading(false);

    if (result.success) {
      setAmount('');
      setDescription('');
      onClose();
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    onClose();
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receber Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="font-medium">{customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Dívida Atual:</span>
              <span className="font-semibold text-destructive">
                {formatCurrency(customer.current_balance)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor a Receber *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                max={customer.current_balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Máximo: {formatCurrency(customer.current_balance)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Método de Pagamento *</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Numerário</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="emola">E-Mola</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Observações</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Pagamento parcial, etc..."
                disabled={loading}
              />
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="bg-success/10 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Novo Saldo:</span>
                  <span className="font-semibold">
                    {formatCurrency(customer.current_balance - parseFloat(amount))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export { PaymentModal };
