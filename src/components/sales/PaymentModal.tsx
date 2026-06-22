import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (payment: {
    cash: number;
    mpesa: number;
    emola: number;
    card: number;
  }) => void;
  onCredit?: (customerName: string) => void;
}

export function PaymentModal({ open, onClose, totalAmount, onConfirm, onCredit }: PaymentModalProps) {
  const [cash, setCash] = useState('');
  const [mpesa, setMpesa] = useState('');
  const [emola, setEmola] = useState('');
  const [card, setCard] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');

  const cashValue = parseFloat(cash) || 0;
  const mpesaValue = parseFloat(mpesa) || 0;
  const emolaValue = parseFloat(emola) || 0;
  const cardValue = parseFloat(card) || 0;

  const totalReceived = cashValue + mpesaValue + emolaValue + cardValue;
  const change = Math.max(0, totalReceived - totalAmount);
  const isValid = totalReceived >= totalAmount;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm({
        cash: cashValue,
        mpesa: mpesaValue,
        emola: emolaValue,
        card: cardValue,
      });
      handleReset();
    }
  };

  const handleCredit = () => {
    if (!customerName.trim()) {
      setError('Digite o nome do cliente');
      return;
    }
    if (onCredit) {
      onCredit(customerName);
      handleReset();
    }
  };

  const handleReset = () => {
    setCash('');
    setMpesa('');
    setEmola('');
    setCard('');
    setCustomerName('');
    setIsCredit(false);
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()} modal>
      <DialogContent className="sm:max-w-md" aria-describedby="payment-description">
        <DialogHeader>
          <DialogTitle>Registar Pagamento</DialogTitle>
        </DialogHeader>
        <p id="payment-description" className="sr-only">Insira os valores recebidos por cada método de pagamento ou registre como crédito</p>

        <div className="space-y-4">
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <p className="text-2xl font-bold" aria-label={`Total a pagar: ${formatCurrency(totalAmount)}`}>{formatCurrency(totalAmount)}</p>
          </div>

          {error && (
            <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {isCredit ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">📝 Registar como Crédito</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">O cliente levará os produtos agora e pagará depois</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customer-name">Nome do Cliente *</Label>
                <Input
                  id="customer-name"
                  type="text"
                  placeholder="Ex: João Silva"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setError(''); }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cash" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Dinheiro
                </Label>
                <Input
                  id="cash"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesa" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  M-Pesa
                </Label>
                <Input
                  id="mpesa"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mpesa}
                  onChange={(e) => setMpesa(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emola" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  E-Mola
                </Label>
                <Input
                  id="emola"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={emola}
                  onChange={(e) => setEmola(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Cartão
                </Label>
                <Input
                  id="card"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                />
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Recebido:</span>
                  <span className="font-medium">{formatCurrency(totalReceived)}</span>
                </div>
                {totalReceived > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Troco:</span>
                    <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(change)}
                    </span>
                  </div>
                )}
                {!isValid && totalReceived > 0 && (
                  <p className="text-sm text-red-600">Valor insuficiente</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:justify-end">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="col-span-1"
            >
              Cancelar
            </Button>
            {!isCredit && (
              <Button 
                variant="outline"
                onClick={() => setIsCredit(true)}
                className="col-span-1 border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                📝 Crédito
              </Button>
            )}
            {isCredit ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCredit(false)}
                  className="col-span-1"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleCredit}
                  className="col-span-1 bg-blue-600 hover:bg-blue-700"
                >
                  Registar
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleConfirm} 
                disabled={!isValid}
                className="col-span-1"
              >
                Confirmar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
