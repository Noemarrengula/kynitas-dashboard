import { Play, Trash2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatCurrency } from '@/lib/utils';
import type { SuspendedSale } from '@/types/domains/pos';

interface SuspendedListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: SuspendedSale[];
  onResume: (sale: SuspendedSale) => void;
  onRemove: (id: string) => void;
  onNewSale: () => void;
}

export function SuspendedListSheet({
  open,
  onOpenChange,
  sales,
  onResume,
  onRemove,
  onNewSale,
}: SuspendedListSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Pause className="h-4 w-4" />
            Vendas Suspensas
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{sales.length}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {sales.length === 0 ? (
            <EmptyState
              icon={Pause}
              title="Nenhuma venda suspensa"
              description="Use «Suspender vendas» no pedido para continuar mais tarde."
              compact
              className="py-14"
            />
          ) : (
            sales.map(sale => (
              <div key={sale.id} className="rounded-xl border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{sale.ref}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleString('pt-MZ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary tabular-nums">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>

                {(sale.customer || sale.table) && (
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {sale.customer?.name}
                    {sale.customer && sale.table && ' · '}
                    {sale.table && `Mesa ${sale.table.number}`}
                  </p>
                )}

                <div className="mt-2.5 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => onResume(sale)}>
                    <Play className="h-3.5 w-3.5" /> Retomar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('flex-1 text-muted-foreground hover:text-destructive')}
                    onClick={() => onRemove(sale.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {sales.length === 0 && (
          <div className="border-t p-4">
            <Button variant="outline" className="w-full" onClick={() => { onNewSale(); }}>
              Nova venda
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}