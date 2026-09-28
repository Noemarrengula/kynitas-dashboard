import { useEffect, useState } from 'react';
import { Banknote, Smartphone, CreditCard, Layers, Loader2, User, Gift, X, Plus, BookOpenCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import type { PosCustomer } from '@/types/domains/pos';

export type PaymentMethod = 'cash' | 'mpesa' | 'emola' | 'card';

export interface PaymentConfirm {
  cash: number;
  mpesa: number;
  emola: number;
  card: number;
  customerId?: string;
}

interface MixedRow {
  id: number;
  method: PaymentMethod;
  amount: string;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  customer: PosCustomer | null;
  canCredit: boolean;
  processing: boolean;
  onConfirm: (payment: PaymentConfirm) => void;
  onCredit: (customerName: string) => void;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  card: 'Cartão',
};

const METHODS: PaymentMethod[] = ['cash', 'mpesa', 'emola', 'card'];

export const PaymentDialog = function PaymentDialog({
  open,
  onOpenChange,
  total,
  customer,
  canCredit,
  processing,
  onConfirm,
  onCredit,
}: PaymentDialogProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'pay' | 'credit'>('pay');
  const [method, setMethod] = useState<PaymentMethod | 'mixed'>('cash');
  const [amounts, setAmounts] = useState<Record<PaymentMethod, string>>({ cash: '', mpesa: '', emola: '', card: '' });
  const [mixed, setMixed] = useState<MixedRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMode('pay');
      setMethod('cash');
      setAmounts({ cash: '', mpesa: '', emola: '', card: '' });
      setMixed([]);
      setError('');
    }
  }, [open]);

  const paid =
    method === 'mixed'
      ? mixed.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)
      : parseFloat(amounts[method]) || 0;
  const change = Math.max(0, paid - total);
  const remaining = Math.max(0, total - paid);
  const isValid = !processing && paid >= total;

  const projectedBalance = (customer?.currentBalance ?? 0) + total;
  const creditLimit = customer?.creditLimit ?? 0;
  const exceedsLimit = creditLimit > 0 && projectedBalance > creditLimit;
  const canConfirmCredit = !processing && !exceedsLimit && !!customer;

  const pickMethod = (next: PaymentMethod | 'mixed') => {
    setError('');
    if (next !== 'mixed' && amounts[next] === '' && total > 0) {
      setAmounts(prev => ({ ...prev, [next]: String(total) }));
    }
    setMethod(next);
  };

  const addMixedRow = () => {
    setError('');
    const used = new Set(mixed.map(r => r.method));
    const nextMethod = METHODS.find(m => !used.has(m)) ?? 'cash';
    setMixed(prev => [...prev, { id: Date.now() + Math.random(), method: nextMethod, amount: String(total) }]);
  };

  const buildPayment = (): PaymentConfirm => {
    const base = { cash: 0, mpesa: 0, emola: 0, card: 0, customerId: customer?.id };
    if (method === 'mixed') {
      for (const row of mixed) {
        const v = parseFloat(row.amount) || 0;
        base[row.method] += v;
      }
    } else {
      base[method] = parseFloat(amounts[method]) || 0;
    }
    return base;
  };

  const quickValues = () => {
    if (method === 'cash') return [total, total + 100, total + 500, total + 1000];
    return [total, total + 500, total + 1000];
  };

  const handleConfirm = () => {
    if (processing) return;
    if (paid <= 0) {
      setError('Informe o valor recebido.');
      return;
    }
    if (paid < total) {
      setError(remaining > 0 ? `Faltam ${formatCurrency(remaining)} para completar o pagamento.` : '');
      return;
    }
    onConfirm(buildPayment());
  };

  const handleMixedConfirm = () => {
    if (processing) return;
    if (paid < total) {
      setError(`Faltam ${formatCurrency(remaining)} para completar o pagamento.`);
      return;
    }
    onConfirm(buildPayment());
  };

  const handleCredit = () => {
    if (processing || !customer) return;
    if (exceedsLimit) {
      setError(t('pos.creditExceeds'));
      return;
    }
    onCredit(customer.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="payment-description">
        <DialogHeader>
          <DialogTitle>{mode === 'credit' ? 'Registar Crédito' : 'Registar Pagamento'}</DialogTitle>
        </DialogHeader>
        <p id="payment-description" className="sr-only">
          Selecione o método de pagamento e confirme o valor recebido.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold tabular-nums" aria-label={`Total a pagar: ${formatCurrency(total)}`}>
                {formatCurrency(total)}
              </p>
            </div>
            {customer && (
              <div className="shrink-0 text-right">
                <p className="flex items-center justify-end gap-1 text-sm font-medium">
                  <User className="h-4 w-4" /> {customer.name}
                </p>
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Gift className="h-3 w-3" /> {customer.loyaltyPoints ?? 0} pts
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {mode === 'credit' ? (
            <div className="space-y-4">
              <div className={`rounded-lg border p-4 ${exceedsLimit ? 'border-destructive/20 bg-destructive/10' : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'}`}>
                <p className={`flex items-center gap-2 text-sm font-medium ${exceedsLimit ? 'text-destructive' : 'text-blue-700 dark:text-blue-400'}`}>
                  <BookOpenCheck className="h-4 w-4" /> {t('pos.creditFor')} {customer?.name}
                </p>
                <p className={`mt-1 text-xs ${exceedsLimit ? 'text-destructive' : 'text-blue-600 dark:text-blue-300'}`}>
                  {t('pos.creditInfo')}
                </p>
                {customer && (
                  <div className={`mt-3 space-y-1 text-sm ${exceedsLimit ? 'text-destructive' : 'text-blue-700 dark:text-blue-400'}`}>
                    <div className="flex justify-between">
                      <span>{t('customer.currentDebt')}</span>
                      <span className="font-semibold">{formatCurrency(customer.currentBalance ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('customer.creditLimit')}</span>
                      <span className="font-semibold">{formatCurrency(customer.creditLimit ?? 0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-current/20 pt-1">
                      <span>{t('pos.debtAfterSale')}</span>
                      <span className={`font-bold ${exceedsLimit ? 'text-destructive' : ''}`}>
                        {formatCurrency(projectedBalance)}
                      </span>
                    </div>
                  </div>
                )}
                {exceedsLimit && (
                  <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                    {t('pos.creditExceeds')}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setMode('pay'); setError(''); }}
              >
                Voltar ao pagamento
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  { key: 'cash' as const, label: 'Dinheiro', icon: <Banknote className="h-4 w-4" /> },
                  { key: 'mpesa' as const, label: 'M-Pesa', icon: <Smartphone className="h-4 w-4" /> },
                  { key: 'emola' as const, label: 'E-Mola', icon: <Smartphone className="h-4 w-4" /> },
                  { key: 'card' as const, label: 'Cartão', icon: <CreditCard className="h-4 w-4" /> },
                  { key: 'mixed' as const, label: 'Misto', icon: <Layers className="h-4 w-4" /> },
                ]).map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => pickMethod(option.key)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                      method === option.key
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
                {canCredit && customer && (
                  <button
                    type="button"
                    onClick={() => { setMode('credit'); setError(''); }}
                    disabled={exceedsLimit}
                    title={exceedsLimit ? t('pos.creditExceeds') : undefined}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                      exceedsLimit
                        ? 'cursor-not-allowed border-destructive/30 bg-destructive/5 text-destructive line-through'
                        : 'border-blue-300 bg-blue-500/5 text-blue-600 hover:bg-blue-500/15 dark:border-blue-700 dark:text-blue-400'
                    )}
                  >
                    <BookOpenCheck className="h-4 w-4" />
                    Crédito
                  </button>
                )}
              </div>

              {method === 'mixed' ? (
                <div className="space-y-3">
                  {mixed.map(row => (
                    <div key={row.id} className="flex items-center gap-2">
                      <Select
                        value={row.method}
                        onValueChange={(v: PaymentMethod) => {
                          setMixed(prev => prev.map(r => (r.id === row.id ? { ...r, method: v } : r)));
                        }}
                      >
                        <SelectTrigger className="w-[130px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METHODS.map(m => (
                            <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        onChange={e => setMixed(prev => prev.map(r => (r.id === row.id ? { ...r, amount: e.target.value } : r)))}
                        className="h-9 text-right"
                        aria-label={`Valor ${METHOD_LABELS[row.method]}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setMixed(prev => prev.filter(r => r.id !== row.id))}
                        aria-label="Remover método"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {mixed.length < 4 && (
                    <Button variant="outline" size="sm" onClick={addMixedRow}>
                      <Plus className="h-4 w-4" /> Adicionar método
                    </Button>
                  )}
                  <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pago</span>
                      <span className="font-medium tabular-nums">{formatCurrency(paid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Restante</span>
                      <span className={cn('font-medium tabular-nums', remaining > 0 ? 'text-destructive' : 'text-success')}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{METHOD_LABELS[method as PaymentMethod]}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={amounts[method as PaymentMethod]}
                      onChange={e => { setAmounts(prev => ({ ...prev, [method]: e.target.value })); setError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickValues().map((value, idx) => (
                      <button
                        key={`${value}-${idx}`}
                        type="button"
                        onClick={() => { setAmounts(prev => ({ ...prev, [method]: String(value) })); setError(''); }}
                        className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        {idx === 0 ? 'Exacto' : `+${formatCurrency(value - total)}`}
                      </button>
                    ))}
                  </div>
                  {parseFloat(amounts[method as PaymentMethod] || '0') > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Troco</span>
                      <span className={cn('font-semibold tabular-nums', change >= 0 && paid >= total ? 'text-success' : 'text-destructive')}>
                        {paid >= total ? formatCurrency(change) : `Faltam ${formatCurrency(remaining)}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              variant="gradient"
              size="lg"
              disabled={mode === 'credit' ? !canConfirmCredit : !isValid}
              onClick={mode === 'credit' ? handleCredit : method === 'mixed' ? handleMixedConfirm : handleConfirm}
              className="sm:min-w-[220px]"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> A processar...
                </>
              ) : mode === 'credit' ? (
                <>Registar Crédito</>
              ) : (
                <>Confirmar {formatCurrency(total)}</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};