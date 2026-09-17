import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Square,
  Play,
  History,
  AlertTriangle,
  Coffee,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDatabase } from '@/hooks/useDatabase';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
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
import { format, differenceInHours } from 'date-fns';
import { pt } from 'date-fns/locale';

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

const METHOD_ROWS: { key: keyof PaymentTotals; label: string }[] = [
  { key: 'cash', label: 'Numerário' },
  { key: 'mpesa', label: 'M-Pesa' },
  { key: 'emola', label: 'e-Mola' },
  { key: 'card', label: 'Cartão' },
];

export default function Cashier() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { sales } = useDatabase();
  const { t } = useI18n();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const [openingAmount, setOpeningAmount] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);

  const [closeShift, setCloseShift] = useState<Shift | null>(null);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [closeBusy, setCloseBusy] = useState(false);

  const loadShifts = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('opened_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setShifts((data || []).map(dbShiftToShift));
    } catch (err: unknown) {
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
      const t = new Date(sale.createdAt).getTime();
      if (t < start || t > end) continue;
      const pd = sale.paymentDetails || {}; 
      totals.cash += pd.cash || 0;
      totals.mpesa += pd.mpesa || 0;
      totals.emola += pd.emola || 0;
      totals.card += pd.card || 0;
      totals.change += pd.change || 0;
      totals.total += sale.total || 0;
    }
    return totals;
  }, [sales]);

  const shiftExpected = useCallback((shift: Shift) => {
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
      setCloseShift(null);
      const diffLabel = formatCurrency(difference);
      toast({
        title: difference === 0 ? 'Caixa fechado sem diferenças' : 'Caixa fechado',
        description: difference === 0
          ? 'Reconciliação perfeita.'
          : `Diferença de ${difference > 0 ? 'sobra' : 'falta'} ${diffLabel}.`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Wallet className="h-5 w-5" />}
        title={t('nav.cashier')}
        description="Turnos e fecho de caixa por método de pagamento"
      />

      {openShifts.length > 0 && !myOpenShift && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Existe um turno aberto por outro caixa neste negócio.
        </div>
      )}

      {myOpenShift ? (
        <OpenShiftCard
          shift={myOpenShift}
          expected={shiftExpected(myOpenShift)}
          onClose={() => openCloseDialog(myOpenShift)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" /> Abrir turno
            </CardTitle>
            <CardDescription>
              Defina o fundo de caixa inicial do turno.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid max-w-xs gap-1.5">
              <Label htmlFor="opening-amount">Fundo de caixa</Label>
              <Input
                id="opening-amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={openingAmount}
                onChange={e => setOpeningAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleOpen(); }}
              />
            </div>
            <Button onClick={handleOpen} disabled={openingBusy}>
              {openingBusy ? 'A abrir...' : 'Abrir turno'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> Histórico de turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visibleShifts.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">Sem turnos registados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caixa</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead className="text-right">Fundo</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleShifts.map(shift => {
                  const expected = shift.status === 'open' ? shiftExpected(shift) : null;
                  const expectedTotal = shift.status === 'open' ? expected!.expectedTotal : shift.expectedTotal;
                  const countedTotal = shift.status === 'open' ? null : shift.countedTotal;
                  const difference = shift.status === 'open' ? null : shift.difference;
                  return (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.cashierName || 'Caixa'}</TableCell>
                      <TableCell>
                        {format(new Date(shift.openedAt), 'dd/MM HH:mm', { locale: pt })}
                        {shift.status === 'open' && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (há {differenceInHours(new Date(), new Date(shift.openedAt))}h)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(shift.openingAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expectedTotal)}</TableCell>
                      <TableCell className="text-right">
                        {countedTotal === null ? '—' : formatCurrency(countedTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {difference === null ? (
                          '—'
                        ) : (
                          <span className={cn(
                            'font-semibold',
                            difference === 0 ? 'text-success' : difference > 0 ? 'text-warning' : 'text-destructive'
                          )}>
                            {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
                          {shift.status === 'open' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={closeShift !== null} onOpenChange={open => !open && setCloseShift(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>
              Contagem física por método. A diferença calcula-se automaticamente.
            </DialogDescription>
          </DialogHeader>
          {closeShift && (
            <CloseForm
              shift={closeShift}
              expected={shiftExpected(closeShift)}
              counted={counted}
              setCounted={setCounted}
              notes={notes}
              setNotes={setNotes}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseShift(null)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={closeBusy}>
              {closeBusy ? 'A fechar...' : 'Fechar caixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OpenShiftCard({
  shift,
  expected,
  onClose,
}: {
  shift: Shift;
  expected: { expectedCash: number; expectedMpesa: number; expectedEmola: number; expectedCard: number; expectedTotal: number; totals: PaymentTotals };
  onClose: () => void;
}) {
  const rows: { label: string; value: number; expected: number }[] = [
    { label: 'Numerário (fundo + vendas)', value: expected.expectedCash, expected: expected.expectedCash },
    { label: 'M-Pesa', value: expected.expectedMpesa, expected: expected.expectedMpesa },
    { label: 'e-Mola', value: expected.expectedEmola, expected: expected.expectedEmola },
    { label: 'Cartão', value: expected.expectedCard, expected: expected.expectedCard },
  ];

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            Turno aberto
          </CardTitle>
          <Badge className="bg-success/10 text-success border-success/20">Aberto</Badge>
        </div>
        <CardDescription>
          Desde {format(new Date(shift.openedAt), 'dd/MM/yyyy HH:mm', { locale: pt })} · {shift.cashierName || 'Caixa'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Vendas (total)</p>
            <p className="text-sm font-semibold">{formatCurrency(expected.totals.total)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Esperado</p>
            <p className="text-sm font-semibold">{formatCurrency(expected.expectedCash)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">M-Pesa</p>
            <p className="text-sm font-semibold">{formatCurrency(expected.expectedMpesa)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">e-Mola / Cartão</p>
            <p className="text-sm font-semibold">
              {formatCurrency(expected.expectedEmola + expected.expectedCard)}
            </p>
          </div>
        </div>
        <Button className="w-full md:w-auto" onClick={onClose}>
          <Square className="h-4 w-4 mr-2" /> Fechar caixa
        </Button>
      </CardContent>
    </Card>
  );
}

function CloseForm({
  shift,
  expected,
  counted,
  setCounted,
  notes,
  setNotes,
}: {
  shift: Shift;
  expected: { expectedCash: number; expectedMpesa: number; expectedEmola: number; expectedCard: number; expectedTotal: number; totals: PaymentTotals };
  counted: Record<string, string>;
  setCounted: (v: Record<string, string>) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  const expectedByKey: Record<string, number> = {
    cash: expected.expectedCash,
    mpesa: expected.expectedMpesa,
    emola: expected.expectedEmola,
    card: expected.expectedCard,
  };
  const diff = METHOD_ROWS.reduce((acc, r) => {
    return acc + ((parseFloat(counted[r.key] || '0') || 0) - (expectedByKey[r.key] || 0));
  }, 0);

  return (
    <div className="space-y-3">
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
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium">Diferença (contado − esperado)</span>
        <span className={cn(
          'font-semibold tabular-nums',
          diff === 0 ? 'text-success' : diff > 0 ? 'text-warning' : 'text-destructive'
        )}>
          {diff > 0 ? '+' : ''}{formatCurrency(diff)}
        </span>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="close-notes">Observações</Label>
        <Input
          id="close-notes"
          placeholder="Notas sobre o fecho (opcional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
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