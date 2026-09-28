import { useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Wifi, WifiOff, Pause, UserPlus, Armchair, History, PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { CustomerPicker } from './CustomerPicker';
import { TablePicker } from './TablePicker';
import type { Product, Table, Order } from '@/types';
import type { PosCustomer, PosTableRef } from '@/types/domains/pos';

interface PosToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchResults: Product[];
  onAddResult: (product: Product) => void;
  onNewSale: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  online: boolean;
  pendingCount: number;
  suspendedCount: number;
  onOpenSuspended: () => void;
  customer: PosCustomer | null;
  onSelectCustomer: (customer: PosCustomer | null) => void;
  canCredit: boolean;
  table: PosTableRef | null;
  onSelectTable: (table: PosTableRef) => void;
  onClearTable: () => void;
  tables: Table[];
  orders: Order[];
}

export function PosToolbar({
  search,
  onSearchChange,
  searchResults,
  onAddResult,
  onNewSale,
  searchInputRef,
  online,
  pendingCount,
  suspendedCount,
  onOpenSuspended,
  customer,
  onSelectCustomer,
  canCredit,
  table,
  onSelectTable,
  onClearTable,
  tables,
  orders,
}: PosToolbarProps) {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(false);

  const showDropdown = focused && search.trim().length > 0;
  const topResult = searchResults[0];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Pesquisar produto por nome..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={e => {
              if (e.key === 'Enter' && topResult) {
                onAddResult(topResult);
              }
            }}
            className="h-10 pl-9 pr-14"
            aria-label="Pesquisar produtos"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            F2
          </kbd>

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border bg-card shadow-lg">
              {searchResults.length > 0 ? (
                <>
                  <div className="max-h-72 overflow-y-auto">
                    {searchResults.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => { onAddResult(product); setFocused(false); }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted"
                      >
                        <span className="truncate text-sm">{product.name}</span>
                        <span className="shrink-0 text-sm font-medium text-primary tabular-nums">
                          {formatCurrency(product.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="border-t bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                    <kbd className="rounded border bg-background px-1 font-mono text-[10px]">Enter</kbd> adiciona «{topResult?.name}»
                  </p>
                </>
              ) : (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado
                </p>
              )}
            </div>
          )}
        </div>

        <CustomerPicker customer={customer} onSelect={onSelectCustomer} canCredit={canCredit} />
        <TablePicker tables={tables} orders={orders} selected={table} onSelect={onSelectTable} onClear={onClearTable} />

        <Button variant="outline" size="sm" onClick={onOpenSuspended} aria-label="Vendas suspensas">
          <Pause className="h-4 w-4" />
          <span className="hidden sm:inline">Suspensas</span>
          {suspendedCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
              {suspendedCount}
            </span>
          )}
        </Button>

        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
            online ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'
          )}
          title={online ? 'Ligado ao servidor' : 'Sem ligação — vendas guardadas localmente'}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">{online ? 'Online' : 'Offline'}</span>
          {online && pendingCount > 0 && (
            <span className="rounded-full bg-warning/20 px-1.5 text-[10px] tabular-nums text-warning">
              {pendingCount} pend.
            </span>
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={onNewSale} title="Nova venda (F1)" aria-label="Nova venda">
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>

      <div className="hidden lg:flex items-center gap-1.5">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/customers')}>
          <UserPlus className="h-3.5 w-3.5" /> + Cliente
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/tables')}>
          <Armchair className="h-3.5 w-3.5" /> Mesas
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onOpenSuspended}>
          <Pause className="h-3.5 w-3.5" /> Suspensas
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/sales/history')}>
          <History className="h-3.5 w-3.5" /> Últimas vendas
        </Button>
      </div>
    </div>
  );
}