import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Square,
  Play,
  History,
  AlertTriangle,
  Coffee,
  Receipt,
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Banknote,
  Smartphone,
  CreditCard,
  HandCoins,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDatabase } from '@/hooks/useDatabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { PaymentDetails } from '@/types';

interface Shift {
  id: string;
  businessId: string;
  cashierId: string;
  cashierName?: string;
  openedAt: Date;
  closedAt?: Date;
  openingAmount: number;
  expectedCash: number;
  countedCash: number;
  expectedMpesa: number;
  countedMpesa: number;
  expectedEmola: number;
  countedEmola: number;
  expectedCard: number;
  countedCard: number;
  expectedTotal: number;
  countedTotal: number;
  difference: number;
  status: 'open' | 'closed';
  notes?: string;
}

interface PaymentTotals {
  cash: number;
  mpesa: number;
  emola: number;
  card: number;
  change: number;
  total: number;
}

interface ShiftExpected {
  expectedCash: number;
  expectedMpesa: number;
  expectedEmola: number;
  expectedCard: number;
  expectedTotal: number;
  totals: PaymentTotals;
}

interface ShiftMovement {
  id: string;
  time: Date;
  type: 'venda' | 'entrada';
  description: string;
  methodLabel: string;
  amount: number;
}

interface CashMovement {
  id: string;
  business_id: string;
  type: string;
  payment_method: string | null;
  amount: number;
  description?: string;
  created_at: string;
}

const METHOD_ROWS: { key: keyof PaymentTotals; label: string }[] = [
  { key: 'cash', label: 'Dinheiro' },
  { key: 'mpesa', label: 'M-Pesa' },
  { key: 'emola', label: 'E-Mola' },
  { key: 'card', label: 'Cartão' },
];

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  card: 'Cartão',
  transfer: 'Transferência',
};

const MOVE_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'venda', label: 'Vendas' },
  { key: 'entrada', label: 'Entradas' },
  { key: 'saida', label: 'Saídas' },
  { key: 'estorno', label: 'Estornos' },
  { key: 'transferencia', label: 'Transferências' },
];

const METHOD_ICONS: Record<string, typeof Banknote> = {
  cash: Banknote,
  mpesa: Smartphone,
  emola: Smartphone,
  card: CreditCard,
};

export default function Cashier() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { sales, credits } = useDatabase();
  const { log: auditLog } = useAuditLog();
  const { t } = useI18n();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [openingAmount, setOpeningAmount] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);

  const [closeShift, setCloseShift] = useState<Shift | null>(null);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [closeBusy, setCloseBusy] = useState(false);

  const [detailShift, setDetailShift] = useState<Shift | null>(null);

  const loadShifts = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('opened_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setShifts((data || []).map(dbShiftToShift));

      const { data: movementsData, error: movementsError } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });
      if (movementsError) throw movementsError;
      setCashMovements(movementsData || []);
    } catch (err: unknown) {
      setLoadError(getErrorMessage(err, 'Não foi possível carregar os turnos.'));
      toast({
        title: 'Erro ao carregar turnos',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const userId = user?.id || '';

  const openShifts = useMemo(() => shifts.filter(s => s.status === 'open'), [shifts]);
  const myOpenShift = openShifts.find(s => s.cashierId === userId) || null;

  const visibleShifts = useMemo(() => {
    if (!can('caixa_geral')) return shifts.filter(s => s.cashierId === userId);
    return shifts;
  }, [shifts, can, userId]);

  const paymentTotals = useCallback((from: Date, to?: Date): PaymentTotals => {
    const start = from.getTime();
    const end = to ? to.getTime() : Date.now();
    const totals: PaymentTotals = { cash: 0, mpesa: 0, emola: 0, card: 0, change: 0, total: 0 };
    for (const sale of sales) {
      const ts = new Date(sale.createdAt).getTime();
      if (ts < start || ts > end) continue;
      const pd = sale.paymentDetails || ({} as PaymentDetails);
      totals.cash += pd.cash || 0;
      totals.mpesa += pd.mpesa || 0;
      totals.emola += pd.emola || 0;
      totals.card += pd.card || 0;
      totals.change += pd.change || 0;
      totals.total += sale.total || 0;
    }
    for (const mv of cashMovements) {
      const ts = new Date(mv.created_at).getTime();
      if (ts < start || ts > end) continue;
      if (mv.type !== 'credit_payment') continue;
      const bucket = mv.payment_method;
      if (bucket === 'cash' || bucket === 'mpesa' || bucket === 'emola' || bucket === 'card') {
        totals[bucket] += mv.amount || 0;
      }
    }
    return totals;
  }, [sales, cashMovements]);

  const shiftExpected = useCallback((shift: Shift): ShiftExpected => {
    const totals = paymentTotals(shift.openedAt, shift.closedAt);
    return {
      expectedCash: (shift.openingAmount || 0) + totals.cash - totals.change,
      expectedMpesa: totals.mpesa,
      expectedEmola: totals.emola,
      expectedCard: totals.card,
      expectedTotal:
        (shift.openingAmount || 0) + totals.cash - totals.change +
        totals.mpesa + totals.emola + totals.card,
      totals,
    };
  }, [paymentTotals]);

  const shiftSaleCount = useCallback((shift: Shift): number => {
    const start = shift.openedAt.getTime();
    const end = shift.closedAt ? shift.closedAt.getTime() : Date.now();
    return sales.reduce((acc, s) => {
      const ts = new Date(s.createdAt).getTime();
      return acc + (ts >= start && ts <= end ? 1 : 0);
    }, 0);
  }, [sales]);

  const shiftCreditTotal = useCallback((shift: Shift): number => {
    const start = shift.openedAt.getTime();
    const end = shift.closedAt ? shift.closedAt.getTime() : Date.now();
    return credits.reduce((acc, c) => {
      const ts = new Date(c.createdAt).getTime();
      return acc + (ts >= start && ts <= end ? (c.total || 0) : 0);
    }, 0);
  }, [credits]);

  const shiftMovements = useCallback((shift: Shift): ShiftMovement[] => {
    const start = shift.openedAt.getTime();
    const end = shift.closedAt ? shift.closedAt.getTime() : Date.now();
    const result: ShiftMovement[] = [];
    for (const sale of sales) {
      const ts = new Date(sale.createdAt).getTime();
      if (ts < start || ts > end) continue;
      const pd = sale.paymentDetails || ({} as PaymentDetails);
      if (!pd.cash && !pd.mpesa && !pd.emola && !pd.card && !sale.total) continue;
      result.push({
        id: sale.id,
        time: new Date(sale.createdAt),
        type: 'venda',
        description: sale.saleNumber ? `Venda #${String(sale.saleNumber).padStart(5, '0')}` : 'Venda',
        methodLabel: saleMethodLabel(pd),
        amount: sale.total || 0,
      });
    }
    for (const mv of cashMovements) {
      const ts = new Date(mv.created_at).getTime();
      if (ts < start || ts > end) continue;
      if (mv.type !== 'credit_payment') continue;
      result.push({
        id: `cm-${mv.id}`,
        time: new Date(mv.created_at),
        type: 'entrada',
        description: mv.description || 'Pagamento de dívida',
        methodLabel: mv.payment_method ? METHOD_LABELS[mv.payment_method] || mv.payment_method : '—',
        amount: mv.amount || 0,
      });
    }
    return result.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [sales, cashMovements]);

  const handleOpen = async () => {
    if (!currentBusiness?.id || !user) return;
    const amount = parseFloat(openingAmount) || 0;
    if (amount < 0) {
      toast({
        title: 'Valor inválido',
        description: 'O fundo de caixa não pode ser negativo.',
        variant: 'destructive',
      });
      return;
    }
    setOpeningBusy(true);
    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          business_id: currentBusiness.id,
          cashier_id: user.id,
          cashier_name: user.user_metadata?.name || user.email || undefined,
          opening_amount: amount,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setShifts([dbShiftToShift(data), ...shifts]);
        setOpeningAmount('');
        auditLog('shift_open', 'shifts', data.id, { openingAmount: amount });
        toast({ title: 'Turno aberto', description: `Fundo de caixa: ${formatCurrency(amount)}` });
      }
    } catch (err: unknown) {
      toast({
        title: 'Erro ao abrir turno',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setOpeningBusy(false);
    }
  };

  const openCloseDialog = (shift: Shift) => {
    setCloseShift(shift);
    const expected = shiftExpected(shift);
    setCounted({
      cash: expected.expectedCash.toFixed(2),
      mpesa: expected.expectedMpesa.toFixed(2),
      emola: expected.expectedEmola.toFixed(2),
      card: expected.expectedCard.toFixed(2),
    });
    setNotes('');
  };

  const handleClose = async () => {
    if (!closeShift || !currentBusiness?.id) return;

    const expected = shiftExpected(closeShift);
    const countedCash = parseFloat(counted.cash || '0') || 0;
    const countedMpesa = parseFloat(counted.mpesa || '0') || 0;
    const countedEmola = parseFloat(counted.emola || '0') || 0;
    const countedCard = parseFloat(counted.card || '0') || 0;
    const countedTotal = countedCash + countedMpesa + countedEmola + countedCard;
    const difference = countedTotal - expected.expectedTotal;

    setCloseBusy(true);
    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          expected_cash: expected.expectedCash,
          counted_cash: countedCash,
          expected_mpesa: expected.expectedMpesa,
          counted_mpesa: countedMpesa,
          expected_emola: expected.expectedEmola,
          counted_emola: countedEmola,
          expected_card: expected.expectedCard,
          counted_card: countedCard,
          expected_total: expected.expectedTotal,
          counted_total: countedTotal,
          difference,
          notes: notes || null,
        })
        .eq('id', closeShift.id)
        .eq('business_id', currentBusiness.id);
      if (error) throw error;

      setShifts(shifts.map(s => s.id === closeShift.id ? {
        ...s,
        status: 'closed',
        closedAt: new Date(),
        expectedCash: expected.expectedCash,
        countedCash,
        expectedMpesa: expected.expectedMpesa,
        countedMpesa,
        expectedEmola: expected.expectedEmola,
        countedEmola,
        expectedCard: expected.expectedCard,
        countedCard,
        expectedTotal: expected.expectedTotal,
        countedTotal,
        difference,
        notes: notes || undefined,
      } : s));
      auditLog('shift_close', 'shifts', closeShift.id, { difference });
      setCloseShift(null);
      toast({
        title: difference === 0 ? 'Caixa fechado sem diferenças' : 'Caixa fechado',
        description: difference === 0
          ? 'Reconciliação perfeita.'
          : `Diferença de ${difference > 0 ? 'sobra' : 'falta'} ${formatCurrency(Math.abs(difference))}.`,
        variant: difference === 0 ? 'default' : 'destructive',
      });
    } catch (err: unknown) {
      toast({
        title: 'Erro ao fechar caixa',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setCloseBusy(false);
    }
  };

  const operatorName = user?.user_metadata?.name || user?.email || 'Operador';

  if (loading) {
    return <CaixaSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Wallet className="h-5 w-5" />}
        title={t('nav.cashier')}
        description="Abertura, resumo e fecho de caixa por método de pagamento"
      />

      {openShifts.length > 0 && !myOpenShift && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Existe um turno aberto por outro caixa neste negócio.
        </div>
      )}

      {loading ? null : (
        myOpenShift ? (
          <OpenShiftSection
            shift={myOpenShift}
            expected={shiftExpected(myOpenShift)}
            movements={shiftMovements(myOpenShift)}
            saleCount={shiftSaleCount(myOpenShift)}
            creditTotal={shiftCreditTotal(myOpenShift)}
            onClose={() => openCloseDialog(myOpenShift)}
          />
        ) : (
          <OpenShiftForm
            operatorName={operatorName}
            openingAmount={openingAmount}
            setOpeningAmount={setOpeningAmount}
            busy={openingBusy}
            onOpen={handleOpen}
          />
        )
      )}

      {loadError && !loading ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertCircle}
              title="Não foi possível carregar os dados"
              description={loadError}
              action={
                <Button variant="outline" onClick={() => { loadShifts(); }}>Tentar novamente</Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <HistorySection
          shifts={visibleShifts}
          expectedOf={shiftExpected}
          saleCountOf={shiftSaleCount}
          onSelectDetail={setDetailShift}
        />
      )}

      {closeShift && (
        <CloseDialog
          shift={closeShift}
          expected={shiftExpected(closeShift)}
          counted={counted}
          setCounted={setCounted}
          notes={notes}
          setNotes={setNotes}
          busy={closeBusy}
          onCancel={() => setCloseShift(null)}
          onConfirm={handleClose}
        />
      )}

      {detailShift && (
        <HistoryDetailDialog shift={detailShift} expected={shiftExpected(detailShift)} onClose={() => setDetailShift(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Abertura do caixa
// ---------------------------------------------------------------------------

function OpenShiftForm({
  operatorName,
  openingAmount,
  setOpeningAmount,
  busy,
  onOpen,
}: {
  operatorName: string;
  openingAmount: string;
  setOpeningAmount: (v: string) => void;
  busy: boolean;
  onOpen: () => void;
}) {
  const amount = parseFloat(openingAmount) || 0;
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Abrir caixa
          </CardTitle>
          <Badge variant="secondary">Caixa fechado</Badge>
        </div>
        <CardDescription>
          Defina o fundo inicial para começar a operação. O caixa fica disponível imediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Operador</Label>
            <Input value={operatorName} readOnly className="bg-muted/40" />
          </div>
          <div className="grid gap-1.5">
            <Label>Data</Label>
            <Input value={format(new Date(), 'dd/MM/yyyy', { locale: pt })} readOnly className="bg-muted/40" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="grid gap-1.5">
            <Label htmlFor="opening-amount">
              Fundo inicial <span className="text-muted-foreground">(Dinheiro)</span>
            </Label>
            <Input
              id="opening-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={openingAmount}
              onChange={e => setOpeningAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
            />
          </div>
          <div className="grid gap-1.5 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Total inicial</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(amount)}</p>
          </div>
        </div>

        <Button onClick={onOpen} disabled={busy} className="w-full md:w-auto" size="lg">
          <Play className="h-4 w-4 mr-2" />
          {busy ? 'A abrir...' : 'Abrir caixa'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Caixa aberto: resumo + movimentos
// ---------------------------------------------------------------------------

function OpenShiftSection({
  shift,
  expected,
  movements,
  saleCount,
  creditTotal,
  onClose,
}: {
  shift: Shift;
  expected: ShiftExpected;
  movements: ShiftMovement[];
  saleCount: number;
  creditTotal: number;
  onClose: () => void;
}) {
  const [moveFilter, setMoveFilter] = useState('all');

  const filteredMs = moveFilter === 'venda'
    ? movements.filter(m => m.type === 'venda')
    : moveFilter === 'entrada'
      ? movements.filter(m => m.type === 'entrada')
      : movements;

  const elapsed = Math.max(0, differenceInMinutes(new Date(), new Date(shift.openedAt)));

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coffee className="h-4 w-4 text-primary" />
              Caixa aberto
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-success/10 text-success border-success/20">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />
                Aberto
              </Badge>
              <Button variant="gradient" size="sm" onClick={onClose}>
                <Square className="h-3.5 w-3.5 mr-1.5" /> Fechar caixa
              </Button>
            </div>
          </div>
          <CardDescription>
            {shift.cashierName || 'Caixa'} · desde {format(new Date(shift.openedAt), 'HH:mm', { locale: pt })} ·{' '}
            há {elapsed >= 60 ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}min` : `${elapsed} min`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo do turno */}
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo do turno</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
              <SummaryCell label="Vendas" value={String(saleCount)} />
              <SummaryCell label="Receita" value={formatCurrency(expected.totals.total)} />
              <SummaryCell label="Dinheiro" value={formatCurrency(expected.expectedCash)} tone="text-success" />
              <SummaryCell label="M-Pesa" value={formatCurrency(expected.expectedMpesa)} tone="text-primary" />
              <SummaryCell label="E-Mola" value={formatCurrency(expected.expectedEmola)} tone="text-primary" />
              <SummaryCell label="Cartão" value={formatCurrency(expected.expectedCard)} tone="text-primary" />
              <SummaryCell label="Créditos" value={formatCurrency(creditTotal)} tone="text-warning" icon={HandCoins} />
            </div>
          </div>

          {/* Movimentos */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Movimentos ({filteredMs.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MOVE_FILTERS.map(f => {
                  const disabled = f.key !== 'all' && f.key !== 'venda' && f.key !== 'entrada';
                  const active = moveFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      disabled={disabled}
                      title={disabled ? 'Sem registos disponíveis' : undefined}
                      onClick={() => setMoveFilter(f.key)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        disabled
                          ? 'cursor-not-allowed border-border text-muted-foreground/40'
                          : active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredMs.length === 0 ? (
              <div className="rounded-lg border bg-card p-6">
                <EmptyState
                  icon={Receipt}
                  title="Sem movimentos neste turno"
                  description="As vendas registadas aparecem aqui por ordem cronológica."
                  compact
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="hidden sm:table-cell">Operador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMs.slice(0, 60).map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="tabular-nums whitespace-nowrap">
                          {format(m.time, 'HH:mm', { locale: pt })}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.type === 'venda' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                            {m.type === 'venda' ? 'Venda' : 'Entrada'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{m.description}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <ArrowMark method={m.methodLabel} />
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-success">
                          +{formatCurrency(m.amount)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {shift.cashierName || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {movements.length > 60 && (
                  <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                    Mostrando os primeiros 60 movimentos.
                  </p>
                )}
                {filteredMs.length === 0 ? null : (
                  <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                    Entradas, saídas, estornos e transferências não são registados neste sistema.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone = 'text-foreground',
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: string;
  icon?: typeof Banknote;
}) {
  return (
    <div className="rounded-lg bg-background px-2.5 py-2">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className={cn('mt-0.5 truncate text-sm font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

function ArrowMark({ method }: { method: string }) {
  const Icon = METHOD_ICONS[method.toLowerCase()] || Banknote;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate">{method}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Fecho do caixa
// ---------------------------------------------------------------------------

function CloseDialog({
  shift,
  expected,
  counted,
  setCounted,
  notes,
  setNotes,
  busy,
  onCancel,
  onConfirm,
}: {
  shift: Shift;
  expected: ShiftExpected;
  counted: Record<string, string>;
  setCounted: (v: Record<string, string>) => void;
  notes: string;
  setNotes: (v: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const expectedByKey: Record<string, number> = {
    cash: expected.expectedCash,
    mpesa: expected.expectedMpesa,
    emola: expected.expectedEmola,
    card: expected.expectedCard,
  };

  const countedTotal = METHOD_ROWS.reduce(
    (acc, r) => acc + ((parseFloat(counted[r.key] || '0') || 0)),
    0
  );
  const difference = countedTotal - expected.expectedTotal;
  const reconciled = difference === 0;

  return (
    <Dialog open onOpenChange={open => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
          <DialogDescription>
            Confira a contagem física por método. A diferença calcula-se automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo esperado */}
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo esperado</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {methodSummaryRows(expected).map(row => (
                <div key={row.label} className="rounded-md bg-background px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{row.label}</p>
                  <p className="text-xs font-semibold tabular-nums">{formatCurrency(row.value)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground">Total esperado</span>
              <span className="font-semibold tabular-nums">{formatCurrency(expected.expectedTotal)}</span>
            </div>
          </div>

          {/* Contagem real */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Contagem real</p>
            <div className="space-y-2">
              {METHOD_ROWS.map(r => (
                <div key={r.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                  <span className="text-sm">{r.label}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    esperado {formatCurrency(expectedByKey[r.key])}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-28 tabular-nums"
                    value={counted[r.key] ?? ''}
                    onChange={e => setCounted({ ...counted, [r.key]: e.target.value })}
                    aria-label={`Contagem ${r.label}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Diferença */}
          <div className={cn(
            'flex items-center justify-between rounded-lg border px-3 py-2.5',
            reconciled ? 'border-success/30 bg-success/10' : 'border-warning/40 bg-warning/10'
          )}>
            <div className="flex items-center gap-2">
              {reconciled
                ? <CheckCircle2 className="h-4 w-4 text-success" />
                : <AlertCircle className="h-4 w-4 text-warning" />}
              <span className="text-sm font-medium">
                {reconciled ? 'Caixa conferido' : 'Diferença de caixa'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Esperado {formatCurrency(expected.expectedTotal)} · Contado {formatCurrency(countedTotal)}</span>
              <span className={cn('font-semibold tabular-nums', reconciled ? 'text-success' : 'text-destructive')}>
                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
              </span>
            </div>
          </div>

          {!reconciled && (
            <div className="grid gap-1.5">
              <Label htmlFor="close-notes">Motivo da diferença</Label>
              <Input
                id="close-notes"
                placeholder="Descreva o motivo da diferença"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Voltar</Button>
          <Button variant="gradient" onClick={onConfirm} disabled={busy}>
            <Lock className="h-4 w-4 mr-2" />
            {busy ? 'A fechar...' : 'Confirmar fecho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Histórico de caixas
// ---------------------------------------------------------------------------

function HistorySection({
  shifts,
  expectedOf,
  saleCountOf,
  onSelectDetail,
}: {
  shifts: Shift[];
  expectedOf: (s: Shift) => ShiftExpected;
  saleCountOf: (s: Shift) => number;
  onSelectDetail: (s: Shift) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" /> Histórico de caixas
        </CardTitle>
        <CardDescription>
          Toque numa linha para ver os detalhes da contagem.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {shifts.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sem caixas registados"
            description="Abra o caixa para começar a operação."
            compact
            className="py-10"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caixa</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Fecho</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map(shift => {
                const expected = shift.status === 'open' ? expectedOf(shift) : null;
                const expectedTotal = shift.status === 'open' ? expected!.expectedTotal : shift.expectedTotal;
                const countedTotal = shift.status === 'open' ? null : shift.countedTotal;
                const difference = shift.status === 'open' ? null : shift.difference;
                return (
                  <TableRow
                    key={shift.id}
                    className="cursor-pointer"
                    onClick={() => onSelectDetail(shift)}
                  >
                    <TableCell className="font-medium">{shift.cashierName || 'Caixa'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(shift.openedAt), 'dd/MM HH:mm', { locale: pt })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {shift.closedAt
                        ? format(new Date(shift.closedAt), 'dd/MM HH:mm', { locale: pt })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{saleCountOf(shift)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(shift.status === 'open'
                        ? expected!.expectedTotal
                        : shift.expectedTotal
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {difference === null ? (
                        '—'
                      ) : (
                        <span className={cn(
                          'font-semibold tabular-nums',
                          difference === 0 ? 'text-success' : difference > 0 ? 'text-warning' : 'text-destructive'
                        )}>
                          {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {shift.status === 'open'
                        ? <Badge className="gap-1 bg-success/10 text-success border-success/20"><span className="h-1.5 w-1.5 rounded-full bg-success" />Aberto</Badge>
                        : <Badge variant="secondary">Fechado</Badge>}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryDetailDialog({ shift, expected, onClose }: { shift: Shift; expected: ShiftExpected; onClose: () => void }) {
  const rows = METHOD_ROWS.map(r => ({
    label: r.label,
    expected: shift.status === 'open' ? expected[r.key === 'cash' ? 'expectedCash' : r.key === 'mpesa' ? 'expectedMpesa' : r.key === 'emola' ? 'expectedEmola' : 'expectedCard'] : shift[`expected${cap(r.key)}` as 'expectedCash'],
    counted: shift.status === 'open' ? null : shift[`counted${cap(r.key)}` as 'countedCash'],
    diff: shift.status === 'open' ? null : (shift[`counted${cap(r.key)}` as 'countedCash'] - shift[`expected${cap(r.key)}` as 'expectedCash']),
  }));

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {shift.cashierName || 'Caixa'} · {format(new Date(shift.openedAt), 'dd/MM/yyyy', { locale: pt })}
          </DialogTitle>
          <DialogDescription>
            Detalhes da contagem por método de pagamento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                esperado {formatCurrency(row.expected)}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {row.counted === null ? '—' : formatCurrency(row.counted)}
              </span>
              <span className={cn(
                'w-24 text-right text-sm font-semibold tabular-nums',
                row.diff === null || row.diff === 0 ? 'text-muted-foreground' : row.diff > 0 ? 'text-warning' : 'text-destructive'
              )}>
                {row.diff === null ? '—' : row.diff === 0 ? '✓' : `${row.diff > 0 ? '+' : ''}${formatCurrency(row.diff)}`}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm tabular-nums">
              esperado {formatCurrency(shift.status === 'open' ? expected.expectedTotal : shift.expectedTotal)}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {shift.status === 'open' ? '—' : formatCurrency(shift.countedTotal)}
            </span>
            <span className="w-24 text-right">
              {shift.status === 'open' ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                <DifferenceBadge difference={shift.difference} />
              )}
            </span>
          </div>

          {shift.notes && (
            <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <span className="font-medium">Motivo da diferença:</span> {shift.notes}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Abertura: {format(new Date(shift.openedAt), 'dd/MM/yyyy HH:mm', { locale: pt })}</span>
            {shift.closedAt && <span>Fecho: {format(new Date(shift.closedAt), 'dd/MM/yyyy HH:mm', { locale: pt })}</span>}
            <span>Fundo: {formatCurrency(shift.openingAmount)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DifferenceBadge({ difference }: { difference: number }) {
  if (difference === 0) {
    return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" />✓</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', difference > 0 ? 'text-warning' : 'text-destructive')}>
      <AlertCircle className="h-3.5 w-3.5" />
      {difference > 0 ? '+' : ''}{formatCurrency(difference)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function methodSummaryRows(expected: ShiftExpected) {
  const values: Record<string, number> = {
    cash: expected.expectedCash,
    mpesa: expected.expectedMpesa,
    emola: expected.expectedEmola,
    card: expected.expectedCard,
  };
  return METHOD_ROWS.map(r => ({
    label: r.label,
    value: values[r.key],
  }));
}

function saleMethodLabel(pd: PaymentDetails): string {
  const parts: string[] = [];
  if (pd.cash > 0) parts.push('Dinheiro');
  if (pd.mpesa > 0) parts.push('M-Pesa');
  if (pd.emola > 0) parts.push('E-Mola');
  if (pd.card > 0) parts.push('Cartão');
  return parts.join(' + ') || '—';
}

function cap(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function CaixaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function dbShiftToShift(db: any): Shift {
  return {
    id: db.id,
    businessId: db.business_id,
    cashierId: db.cashier_id,
    cashierName: db.cashier_name || undefined,
    openedAt: db.opened_at ? new Date(db.opened_at) : new Date(),
    closedAt: db.closed_at ? new Date(db.closed_at) : undefined,
    openingAmount: db.opening_amount || 0,
    expectedCash: db.expected_cash || 0,
    countedCash: db.counted_cash || 0,
    expectedMpesa: db.expected_mpesa || 0,
    countedMpesa: db.counted_mpesa || 0,
    expectedEmola: db.expected_emola || 0,
    countedEmola: db.counted_emola || 0,
    expectedCard: db.expected_card || 0,
    countedCard: db.counted_card || 0,
    expectedTotal: db.expected_total || 0,
    countedTotal: db.counted_total || 0,
    difference: db.difference || 0,
    status: db.status || 'open',
    notes: db.notes || undefined,
  };
}