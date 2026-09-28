import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Gift, ShoppingCart, Coins, Pencil, Phone, Mail, Wallet, MapPin, StickyNote, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';
import { CustomerModal } from '@/components/credits/CustomerModal';
import { PaymentModal } from '@/components/credits/PaymentModal';
import { useCredits, Customer, CreditTransaction } from '@/hooks/useCredits';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/contexts/I18nContext';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface SaleRow {
  id: string;
  items: any[];
  total: number;
  payment_details: any;
  created_at: string;
}

interface LoyaltyRow {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'bonus';
  description?: string;
  created_at: string;
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    customers,
    loading,
    updateCustomer,
    registerPayment,
    getCustomerTransactions,
  } = useCredits();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyRow[]>([]);
  const [creditTxs, setCreditTxs] = useState<CreditTransaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const customer: Customer | undefined = useMemo(
    () => customers.find(c => c.id === id),
    [customers, id]
  );

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setDataLoading(true);
      try {
        const [salesRes, loyaltyRes, txs] = await Promise.all([
          supabase.from('sales').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
          supabase.from('loyalty_transactions').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
          getCustomerTransactions(id),
        ]);
        if (!active) return;
        setSales(salesRes.data ?? []);
        setLoyalty(loyaltyRes.data ?? []);
        setCreditTxs(txs);
      } catch (e) {
        console.error('Erro ao carregar ficha do cliente:', e);
      } finally {
        if (active) setDataLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, getCustomerTransactions]);

  const payments = useMemo(() => creditTxs.filter(tx => tx.type === 'payment'), [creditTxs]);
  const charges = useMemo(() => creditTxs.filter(tx => tx.type === 'charge' || tx.type === 'adjustment'), [creditTxs]);

  const handleSaveCustomer = async (data: any) => {
    if (!customer) return { error: new Error('Cliente não encontrado') };
    return await updateCustomer(customer.id, data);
  };

  const handleSavePayment = async (amount: number, method: string, description?: string, reference?: string) => {
    if (!customer) return { success: false };
    const res = await registerPayment(customer.id, amount, method, description, reference);
    if (res.success) {
      const txs = await getCustomerTransactions(customer.id);
      setCreditTxs(txs);
    }
    return res;
  };

  if (loading || (dataLoading && !customer) || !customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const available = Math.max(customer.creditLimit - customer.currentBalance, 0);
  const usagePct = customer.creditLimit > 0 ? (customer.currentBalance / customer.creditLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CreditCard className="h-6 w-6" />}
        title={customer.name}
        description={t('customers.openProfile')}
      >
        <Button variant="outline" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          {t('customer.edit')}
        </Button>
        <Button variant="gradient" onClick={() => setPaymentOpen(true)} disabled={customer.currentBalance <= 0}>
          {t('customer.collect')}
        </Button>
      </PageHeader>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('customer.currentDebt')}</p>
          <p className="text-lg font-bold text-destructive mt-1">{formatCurrency(customer.currentBalance)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('customer.creditLimit')}</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(customer.creditLimit)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('customer.available')}</p>
          <p className="text-lg font-bold text-success mt-1">{formatCurrency(available)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('customers.points')}</p>
          <p className="text-lg font-bold mt-1">{customer.loyaltyPoints ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('customers.totalSpent')}</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(customer.totalSpent ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('customers.visits')}</p>
          <p className="text-lg font-bold mt-1">{customer.visitCount ?? 0}</p>
        </Card>
      </div>

      {/* Contact + usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" /> {t('customer.contact')}
          </h3>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {customer.phone || '—'}
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {customer.email}
              </div>
            )}
            {customer.nuit && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" /> {t('customer.nuit')}: {customer.nuit}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {customer.address}
              </div>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('customer.status')}</span>
            <Badge variant={customer.status === 'blocked' ? 'destructive' : customer.status === 'active' ? 'default' : 'secondary'}>
              {customer.status === 'active'
                ? t('customers.status.active')
                : customer.status === 'blocked'
                  ? t('customers.status.blocked')
                  : t('customers.status.inactive')}
            </Badge>
          </div>
          {customer.notes && (
            <>
              <Separator />
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <StickyNote className="h-4 w-4 shrink-0 mt-0.5" /> {customer.notes}
              </div>
            </>
          )}
          {customer.lastVisitAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {t('customers.lastPurchase')}: {format(new Date(customer.lastVisitAt), 'dd/MM/yyyy HH:mm', { locale: pt })}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> {t('customer.credit')}
            </h3>
            <span className="text-sm font-semibold">{usagePct.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${usagePct >= 80 ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{t('customer.currentDebt')}</p>
              <p className="font-bold text-destructive mt-1">{formatCurrency(customer.currentBalance)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{t('customer.creditLimit')}</p>
              <p className="font-bold mt-1">{formatCurrency(customer.creditLimit)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{t('customer.available')}</p>
              <p className="font-bold text-success mt-1">{formatCurrency(available)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> {t('customer.tab.sales')}
          </TabsTrigger>
          <TabsTrigger value="credit" className="gap-2">
            <CreditCard className="h-4 w-4" /> {t('customer.tab.credit')}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Wallet className="h-4 w-4" /> {t('customer.tab.payments')}
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-2">
            <Gift className="h-4 w-4" /> {t('customer.tab.loyalty')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          {dataLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : sales.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">{t('customer.noSales')}</p>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nº de artigos</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: pt })}</TableCell>
                      <TableCell>{sale.items?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {(sale.payment_details?.method ?? 'credit').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(sale.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="credit" className="space-y-4">
          {dataLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : charges.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">{t('customer.noCredit')}</p>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: pt })}</TableCell>
                      <TableCell>{tx.description || 'Venda a crédito'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.reference || '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(tx.balanceAfter)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {dataLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : payments.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">{t('customer.noPayments')}</p>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: pt })}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(tx.paymentMethod ?? 'cash').toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.reference || '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(tx.balanceAfter)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          {dataLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : loyalty.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">{t('customer.noLoyalty')}</p>
          ) : (
            <Card className="divide-y">
              {loyalty.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={tx.points < 0 ? 'destructive' : 'secondary'}>
                      {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {tx.type === 'earn'
                        ? t('customer.loyaltyEarn')
                        : tx.type === 'bonus'
                          ? t('customer.loyaltyBonus')
                          : t('customer.loyaltyRedeem')}
                      {tx.description ? ` · ${tx.description}` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {format(new Date(tx.created_at), 'dd/MM/yyyy', { locale: pt })}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CustomerModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveCustomer}
        customer={customer}
      />

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSave={handleSavePayment}
        customer={customer}
      />
    </div>
  );
}