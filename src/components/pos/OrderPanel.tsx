import { memo, useState } from 'react';
import { Minus, Plus, X, Receipt, Pause, Banknote, StickyNote, User, Armchair, Undo2, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import type { CartItem, PosCustomer, PosTableRef, SaleDiscount } from '@/types/domains/pos';

interface OrderPanelProps {
  items: CartItem[];
  customer: PosCustomer | null;
  table: PosTableRef | null;
  discount: SaleDiscount;
  discountAmount: number;
  subtotal: number;
  total: number;
  canAmountDiscount: boolean;
  onIncrement: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onSetNote: (uid: string, note: string) => void;
  onDiscountChange: (discount: SaleDiscount) => void;
  onOpenPayment: () => void;
  onPrintPrebill: () => void;
  onSuspend: () => void;
  onSendToKitchen: () => void;
  canSendToKitchen: boolean;
  sendingKitchen: boolean;
  sentOrderRef: string | null;
  lastRemoved: CartItem | null;
  onUndoRemove: () => void;
  disabled?: boolean;
  className?: string;
}

export const OrderPanel = memo(function OrderPanel({
  items,
  customer,
  table,
  discount,
  discountAmount,
  subtotal,
  total,
  canAmountDiscount,
  onIncrement,
  onRemove,
  onSetNote,
  onDiscountChange,
  onOpenPayment,
  onPrintPrebill,
  onSuspend,
  onSendToKitchen,
  canSendToKitchen,
  sendingKitchen,
  sentOrderRef,
  lastRemoved,
  onUndoRemove,
  disabled,
  className,
}: OrderPanelProps) {
  const [noteUid, setNoteUid] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const startNote = (uid: string, current: string) => {
    setNoteUid(uid);
    setNoteValue(current ?? '');
  };

  const commitNote = () => {
    if (noteUid) onSetNote(noteUid, noteValue.trim());
    setNoteUid(null);
    setNoteValue('');
  };

  return (
    <div className={cn('flex flex-col bg-card rounded-xl border h-full', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Pedido</h2>
          {items.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {customer && (
            <span className="inline-flex max-w-[120px] items-center gap-1 truncate rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.name}</span>
            </span>
          )}
          {table && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              <Armchair className="h-3 w-3" />
              Mesa {table.number}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
        {items.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Pedido vazio"
            description="Toque nos produtos para começar a vender."
            compact
            className="py-10"
          />
        ) : (
          items.map(item => (
            <div key={item.uid} className="rounded-lg border bg-background p-2.5">
              <div className="flex items-start gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(item.productId)}
                  className="-ml-1 -mt-0.5 h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover ${item.product?.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.product?.name ?? 'Produto'}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(item.subtotal)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(item.product?.price ?? 0)} × {item.quantity}
                  </p>
                  {item.note && (
                    <p className="mt-1 truncate rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning">
                      {item.note}
                    </p>
                  )}
                  {noteUid === item.uid ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Input
                        value={noteValue}
                        onChange={e => setNoteValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitNote(); if (e.key === 'Escape') setNoteUid(null); }}
                        onBlur={commitNote}
                        placeholder="Observação do item..."
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button size="icon-sm" variant="outline" className="h-7 w-7 shrink-0" onClick={commitNote}>
                        <StickyNote className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startNote(item.uid, item.note ?? '')}
                      className="mt-1 inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-primary"
                    >
                      <StickyNote className="h-3 w-3" />
                      {item.note ? 'Editar observação' : 'Observação'}
                    </button>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="h-7 w-7"
                    onClick={() => onIncrement(item.productId, -1)}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-7 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="h-7 w-7"
                    onClick={() => onIncrement(item.productId, 1)}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}

        {lastRemoved && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
            <span className="truncate text-muted-foreground">Item removido</span>
            <Button variant="outline" size="sm" className="h-7" onClick={onUndoRemove}>
              <Undo2 className="h-3.5 w-3.5" /> Desfazer
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2.5 border-t px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Desconto</span>
            {canAmountDiscount && (
              <div className="flex overflow-hidden rounded-md border">
                {(['percent', 'amount'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onDiscountChange({ type, value: 0 })}
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-medium leading-none',
                      discount.type === type ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
                    )}
                  >
                    {type === 'percent' ? '%' : 'MT'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {discount.type === 'percent' ? (
              <Input
                type="number"
                min="0"
                max="100"
                value={discount.value || ''}
                onChange={e => onDiscountChange({ type: 'percent', value: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                className="h-8 w-20 text-right text-xs"
                aria-label="Desconto em percentagem"
              />
            ) : (
              <Input
                type="number"
                min="0"
                value={discount.value || ''}
                onChange={e => onDiscountChange({ type: 'amount', value: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 w-24 text-right text-xs"
                aria-label="Desconto em valor"
              />
            )}
            <span className="text-xs text-muted-foreground">{discount.type === 'percent' ? '%' : 'MT'}</span>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Desconto</span>
              <span className="tabular-nums">−{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
            <span>Total</span>
            <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>

        {!disabled && items.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="flex-1" onClick={onPrintPrebill}>
                <Receipt className="h-4 w-4" /> Conta
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={onSuspend}>
                <Pause className="h-4 w-4" /> Suspender
              </Button>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onSendToKitchen}
              disabled={!canSendToKitchen || sendingKitchen}
            >
              {sentOrderRef ? (
                <>
                  <Check className="h-4 w-4" /> Pedido enviado #{sentOrderRef}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {sendingKitchen ? 'Enviando...' : 'Enviar pedido para cozinha'}
                </>
              )}
            </Button>
            <Button variant="gradient" size="lg" className="w-full" onClick={onOpenPayment}>
              <Banknote className="h-4 w-4" />
              Pagar {formatCurrency(total)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});