import { useState, useEffect } from 'react';
import { User, UserPlus, Search, X, Gift, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useCredits } from '@/hooks/useCredits';
import { useI18n } from '@/contexts/I18nContext';
import type { PosCustomer } from '@/types/domains/pos';

interface CustomerSearchRow {
  id: string;
  name: string;
  phone?: string;
  loyalty_points?: number;
  credit_limit?: number;
  current_balance?: number;
}

interface CustomerPickerProps {
  customer: PosCustomer | null;
  onSelect: (customer: PosCustomer | null) => void;
  canCredit: boolean;
}

export function CustomerPicker({ customer, onSelect, canCredit }: CustomerPickerProps) {
  const { business } = useBusiness();
  const { customers: allCustomers, addCustomer } = useCredits();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setCreating(false);
    }
  }, [open]);

  const searchCustomers = async (value: string) => {
    if (!value.trim() || value.trim().length < 2 || !business?.id || !isSupabaseConfigured()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, loyalty_points, credit_limit, current_balance')
        .eq('business_id', business.id)
        .eq('active', true)
        .or(`phone.ilike.%${value}%,name.ilike.%${value}%,email.ilike.%${value}%,nuit.ilike.%${value}%`)
        .order('name')
        .limit(8);
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (row: CustomerSearchRow) => {
    onSelect({
      id: row.id,
      name: row.name,
      phone: row.phone,
      loyaltyPoints: row.loyalty_points,
      creditLimit: row.credit_limit,
      currentBalance: row.current_balance,
    });
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !business) return;
    setCreating(true);
    const { data } = await addCustomer({
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      creditLimit: 0,
      currentBalance: 0,
      status: 'active',
    });
    setCreating(false);
    if (data) {
      onSelect({
        id: data.id,
        name: data.name,
        phone: data.phone,
        creditLimit: data.creditLimit,
        currentBalance: data.currentBalance,
      });
      setNewName('');
      setNewPhone('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('max-w-[180px] lg:max-w-[220px] justify-start gap-2', customer && 'border-primary/40 text-primary')}
          aria-label="Selecionar cliente"
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium">
            {customer ? customer.name : 'Cliente'}
          </span>
          {customer && canCredit && customer.currentBalance > 0 && (
            <span className="ml-auto rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive tabular-nums">
              {formatCurrency(customer.currentBalance)}
            </span>
          )}
          {customer && canCredit && !customer.currentBalance && (
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
              {formatCurrency(customer.creditLimit ?? 0)}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[320px] p-0" sideOffset={8}>
        {customer && !creating ? (
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => onSelect(null)} aria-label="Remover cliente">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted p-2">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Gift className="h-3 w-3" /> Pontos
                </p>
                <p className="text-sm font-semibold tabular-nums">{customer.loyaltyPoints ?? 0}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Wallet className="h-3 w-3" /> Limite
                </p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(customer.creditLimit ?? 0)}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-sm font-semibold tabular-nums ${(customer.currentBalance ?? 0) > 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(customer.currentBalance ?? 0)}
                </p>
              </div>
            </div>

            {(customer.currentBalance ?? 0) > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {t('pos.debtWarning', { amount: formatCurrency(customer.currentBalance ?? 0) })}
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full" onClick={() => setCreating(false)}>
              Trocar cliente
            </Button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {creating ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pos-new-name">Nome do cliente</Label>
                  <Input
                    id="pos-new-name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: João Silva"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pos-new-phone">Telefone (opcional)</Label>
                  <Input
                    id="pos-new-phone"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="Ex: 84 123 4567"
                    inputMode="tel"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setCreating(false)}>
                    Voltar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!newName.trim() || creating}
                    onClick={handleCreate}
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={e => { setQuery(e.target.value); searchCustomers(e.target.value); }}
                    placeholder="Pesquisar nome ou telefone..."
                    className="pl-8"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {results.length > 0 ? (
                    results.map(row => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => handleSelect(row)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.name}</p>
                          {row.phone && (
                            <p className="truncate text-xs text-muted-foreground">{row.phone}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                          <p>{row.loyalty_points ?? 0} pts</p>
                          {canCredit && <p>{formatCurrency(row.current_balance ?? 0)}</p>}
                        </div>
                      </button>
                    ))
                  ) : allCustomers.length > 0 && query.trim().length < 2 ? (
                    allCustomers.slice(0, 8).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelect({ id: c.id, name: c.name, phone: c.phone, loyalty_points: 0, credit_limit: c.creditLimit, current_balance: c.currentBalance })}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          {c.phone && <p className="truncate text-xs text-muted-foreground">{c.phone}</p>}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(c.currentBalance)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-primary hover:bg-muted"
                    >
                      <UserPlus className="h-4 w-4" />
                      Criar novo cliente
                      {query.trim().length >= 2 && <span className="text-xs text-muted-foreground">— não encontrado</span>}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}