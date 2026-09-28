import { useState } from 'react';
import { Armchair, X, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Table, Order } from '@/types';
import type { PosTableRef } from '@/types/domains/pos';

interface TablePickerProps {
  tables: Table[];
  orders: Order[];
  selected: PosTableRef | null;
  onSelect: (table: PosTableRef) => void;
  onClear: () => void;
}

const STATUS_META: Record<Table['status'], { dot: string; label: string }> = {
  free: { dot: 'bg-success', label: 'Livre' },
  occupied: { dot: 'bg-warning', label: 'Ocupada' },
  awaiting_payment: { dot: 'bg-blue-500', label: 'Aguardando pagamento' },
};

export function TablePicker({ tables, orders, selected, onSelect, onClear }: TablePickerProps) {
  const [open, setOpen] = useState(false);

  const orderItemCount = (tableId: string | undefined) => {
    if (!tableId) return 0;
    const order = orders.find(o => o.id === tableId && o.status !== 'paid');
    return order ? order.items.length : 0;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('justify-start gap-2 max-w-[130px] lg:max-w-[150px]', selected && 'border-primary/40 text-primary')}
          aria-label="Selecionar mesa"
        >
          <Armchair className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium">
            {selected ? `Mesa ${selected.number}` : 'Mesa'}
          </span>
          {selected && (
            <X
              className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={e => { e.stopPropagation(); onClear(); }}
              aria-label="Remover mesa"
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[340px] p-3" sideOffset={8}>
        <p className="mb-2 text-sm font-medium">Selecionar mesa</p>
        {tables.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma mesa cadastrada.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
            {tables.map(table => {
              const meta = STATUS_META[table.status] ?? STATUS_META.free;
              const items = orderItemCount(table.currentOrderId);
              const isSelected = selected?.id === table.id;
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => onSelect({ id: table.id, number: table.number, name: table.name, customerName: table.customer_name, linkedOrderId: table.currentOrderId })}
                  className={cn(
                    'relative flex flex-col items-center gap-1 rounded-lg border p-2.5 transition-colors hover:border-primary',
                    isSelected ? 'border-primary bg-primary/10' : 'border-border'
                  )}
                >
                  <span className={cn('absolute right-1.5 top-1.5 h-2 w-2 rounded-full', meta.dot)} />
                  <span className="text-sm font-semibold tabular-nums">{table.number}</span>
                  {table.name && <span className="text-[10px] text-muted-foreground truncate max-w-full">{table.name}</span>}
                  {items > 0 && (
                    <Badge variant="secondary" className="gap-1 text-[10px] px-1.5">
                      <ClipboardList className="h-3 w-3" /> {items}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Ao escolher uma mesa ocupada, o pedido actual é carregado no carrinho.
        </p>
      </PopoverContent>
    </Popover>
  );
}