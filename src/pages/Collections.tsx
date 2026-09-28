import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Users, AlertTriangle, Wallet, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';
import { PaymentModal } from '@/components/credits/PaymentModal';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { formatCurrency } from '@/lib/utils';
import { format, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';

interface DebtRow {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  nuit?: string;
  status: 'active' | 'blocked' | 'inactive';
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  loyalty_points: number;
  total_charged: number;
  total_paid: number;
  last_charge_at: string | null;
  last_payment_at: string | null;
  days_since_last_charge: number | null;
}

export default function Collections() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentBusiness } = useBusiness();
  const { getDebtSummary, registerPayment } = useCredits();
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidThisMonth, setPaidThisMonth] = useState(0);
  const [payer, setPayer] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getDebtSummary();
    setRows(data as DebtRow[]);
    if (currentBusiness?.id) {
      const { data: payments } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('business_id', currentBusiness.id)
        .eq('type', 'payment')
        .gte('created_at', startOfMonth(new Date()).toISOString());
      setPaidThisMonth(payments?.reduce((acc: number, p: any) => acc + (p.amount ?? 0), 0) ?? 0);
    }
    setLoading(false);
  }, [currentBusiness?.id, getDebtSummary]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const debtors = useMemo(
    () => rows.filter(r => r.current_balance > 0),
    [rows]
  );
  const totalDebt = debtors.reduce((acc, r) => acc + r.current_balance, 0);
  const overLimit = debtors.filter(r => r.current_balance > r.credit_limit && r.credit_limit > 0).length;

  const handleSavePayment = async (amount: number, method: string, description?: string, reference?: string) => {
    if (!payer) return { success: false };
    const res = await registerPayment(payer.id, amount, method, description, reference);
    if (res.success) {
      await load();
    }
    return res;
  };

  const selectPayer = (id: string, name: string, balance: number) => {
    setPayer({ id, name, balance });
    setPaying(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Landmark className="h-6 w-6" />}
        title={t('collections.title')}
        description={t('collections.description')}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('collections.debtTotal')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-xl">
              <Wallet className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('collections.debtors')}</p>
              <p className="text-2xl font-bold mt-1">{debtors.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('collections.overLimit')}</p>
              <p className="text-2xl font-bold mt-1">{overLimit}</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('collections.paidThisMonth')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(paidThisMonth)}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <Landmark className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>
      </div>

      {/* Debtors */}
      {debtors.length === 0 ? (
        <div className="bg-card border rounded-xl py-16 text-center text-muted-foreground">
          {t('collections.none')}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">{t('customers.debt')}</TableHead>
                <TableHead className="text-right">{t('customer.creditLimit')}</TableHead>
                <TableHead className="text-right">{t('collections.usage')}</TableHead>
                <TableHead className="text-right">{t('collections.lastCharge')}</TableHead>
                <TableHead className="text-right">{t('collections.lastPayment')}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debtors.map((r) => {
                const usagePct = r.credit_limit > 0 ? (r.current_balance / r.credit_limit) * 100 : 100;
                const over = r.current_balance > r.credit_limit && r.credit_limit > 0;
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/customers/${r.id}`)}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.name}</span>
                        {r.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {r.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-destructive">{formatCurrency(r.current_balance)}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.credit_limit)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${over || usagePct >= 80 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{usagePct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.last_charge_at
                        ? format(new Date(r.last_charge_at), 'dd/MM/yyyy', { locale: pt })
                        : '—'}
                      {r.days_since_last_charge != null && r.days_since_last_charge >= 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {t('collections.daysAgo', { count: r.days_since_last_charge })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.last_payment_at
                        ? format(new Date(r.last_payment_at), 'dd/MM/yyyy', { locale: pt })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectPayer(r.id, r.name, r.current_balance);
                        }}
                      >
                        {t('collections.collect')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <PaymentModal
        open={paying}
        onClose={() => {
          setPaying(false);
          setPayer(null);
        }}
        onSave={handleSavePayment}
        customer={payer ? {
          id: payer.id,
          name: payer.name,
          currentBalance: payer.balance,
        } as any : null}
      />
    </div>
  );
}