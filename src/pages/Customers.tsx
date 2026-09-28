import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Gift, Phone, Mail, Calendar, TrendingUp, Loader2, History, Coins, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import CustomerModal from '@/components/customers/CustomerModal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nuit?: string;
  birth_date?: string;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_at?: string;
  credit_limit: number;
  current_balance: number;
  status: 'active' | 'blocked' | 'inactive';
}

interface LoyaltyTx {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'bonus';
  description?: string;
  created_at: string;
}

type StatusFilter = 'all' | 'active' | 'blocked' | 'inactive';

export default function Customers() {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Detalhe de pontos de um cliente
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTx[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [business?.id]);

  const loadCustomers = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('total_spent', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };



  const filteredCustomers = customers.filter(c => {
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.nuit || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDetail = async (customer: Customer) => {
    setDetailCustomer(customer);
    setLoyaltyHistory([]);
    setRedeemPoints('');
    setBonusPoints('');
    setHistoryLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setLoyaltyHistory(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de pontos:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshCustomerPoints = (customerId: string, points: number) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, loyalty_points: points } : c));
    setDetailCustomer(prev => prev ? { ...prev, loyalty_points: points } : prev);
  };

  const handleRedeem = async () => {
    const points = parseFloat(redeemPoints);
    if (!detailCustomer || !points || points <= 0) {
      toast({ title: 'Pontos inválidos', description: 'Indique uma quantidade de pontos válida', variant: 'destructive' });
      return;
    }
    setMutating(true);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
      const { data, error } = await supabase.rpc('redeem_loyalty_points', {
        p_customer: detailCustomer.id,
        p_points: Math.floor(points),
      });
      if (error) throw error;
      const result = data as { ok: boolean; msg?: string; remaining?: number; discount?: number };
      if (!result.ok) {
        toast({ title: 'Não foi possível resgatar', description: result.msg || 'Erro desconhecido', variant: 'destructive' });
        return;
      }
      toast({
        title: 'Pontos resgatados!',
        description: `Desconto de ${result.discount} MT · saldo ${result.remaining} pts`,
      });
      refreshCustomerPoints(detailCustomer.id, result.remaining ?? 0);
      await openDetail(detailCustomer);
    } catch (err) {
      console.error('Erro ao resgatar pontos:', err);
      toast({ title: 'Erro ao resgatar pontos', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setMutating(false);
    }
  };

  const handleBonus = async () => {
    const points = parseFloat(bonusPoints);
    if (!detailCustomer || !points || points <= 0) {
      toast({ title: 'Pontos inválidos', description: 'Indique uma quantidade de pontos válida', variant: 'destructive' });
      return;
    }
    setMutating(true);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
      const { error } = await supabase.rpc('add_bonus_points', {
        p_customer: detailCustomer.id,
        p_points: Math.floor(points),
      });
      if (error) throw error;
      toast({ title: 'Bónus adicionado', description: `${Math.floor(points)} pontos creditados` });
      await openDetail(detailCustomer);
    } catch (err) {
      console.error('Erro ao adicionar bónus:', err);
      toast({ title: 'Erro ao adicionar bónus', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setMutating(false);
    }
  };

  const totalCustomers = customers.length;
  const totalPoints = customers.reduce((acc, c) => acc + c.loyalty_points, 0);
  const totalRevenue = customers.reduce((acc, c) => acc + c.total_spent, 0);
  const totalDebt = customers.reduce((acc, c) => acc + c.current_balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title={t('nav.customers')}
        description="Gestão de clientes, crédito e fidelidade"
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('common.new')}
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('customers.total')}</p>
              <p className="text-2xl font-bold mt-1">{totalCustomers}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('customers.points')}</p>
              <p className="text-2xl font-bold mt-1">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <Gift className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('customers.totalDebt')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-xl">
              <CreditCard className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('customers.revenue')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('customers.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('customers.filter.all')}</SelectItem>
            <SelectItem value="active">{t('customers.status.active')}</SelectItem>
            <SelectItem value="blocked">{t('customers.status.blocked')}</SelectItem>
            <SelectItem value="inactive">{t('customers.status.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customers Grid */}
      <div className="list-panel grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const usagePct = customer.credit_limit > 0
            ? Math.min((customer.current_balance / customer.credit_limit) * 100, 100)
            : 0;
          const nearLimit = usagePct >= 80;
          const isBlocked = customer.status === 'blocked';

          return (
            <div key={customer.id} className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{customer.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </div>
                  )}
                  {customer.nuit && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Wallet className="h-3 w-3" />
                      {customer.nuit}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={isBlocked ? 'destructive' : nearLimit ? 'destructive' : 'secondary'} className="flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    {customer.loyalty_points}
                  </Badge>
                  <Badge variant={isBlocked ? 'destructive' : 'outline'} className="text-[10px]">
                    {customer.status === 'active'
                      ? t('customers.status.active')
                      : customer.status === 'blocked'
                        ? t('customers.status.blocked')
                        : t('customers.status.inactive')}
                  </Badge>
                </div>
              </div>

              {customer.current_balance > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" /> {t('customers.debt')}
                    </span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(customer.current_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('customers.creditAvailable')}</span>
                    <span>{formatCurrency(Math.max(customer.credit_limit - customer.current_balance, 0))} / {formatCurrency(customer.credit_limit)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${nearLimit ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">{t('customers.totalSpent')}</p>
                  <p className="font-semibold">{formatCurrency(customer.total_spent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('customers.visits')}</p>
                  <p className="font-semibold">{customer.visit_count}</p>
                </div>
              </div>

              {customer.last_visit_at && (
                <div className="text-xs text-muted-foreground">
                  {t('customers.lastPurchase')}: {format(new Date(customer.last_visit_at), 'dd/MM/yyyy', { locale: pt })}
                </div>
              )}

              {customer.birth_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(customer.birth_date), 'dd/MM', { locale: pt })}
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openDetail(customer)}>
                  <History className="h-3.5 w-3.5 mr-1" />
                  {t('customers.pointsHistory')}
                </Button>
                <Button variant="gradient" size="sm" className="flex-1" onClick={() => navigate(`/customers/${customer.id}`)}>
                  {t('customers.openProfile')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          {search || statusFilter !== 'all' ? t('customers.noneFound') : t('customers.noneRegistered')}
        </div>
      )}

      {/* Create Dialog */}
      <CustomerModal 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={loadCustomers}
      />

      {/* Loyalty Detail Dialog */}
      <Dialog open={!!detailCustomer} onOpenChange={(open) => !open && setDetailCustomer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              {detailCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              {detailCustomer?.phone} · {detailCustomer?.loyalty_points} pontos disponíveis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Resgatar pontos (1 pt = 1 MT)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Pontos"
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                  />
                  <Button variant="gradient" onClick={handleRedeem} disabled={mutating} className="shrink-0">
                    {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resgatar'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adicionar bónus</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Pontos"
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(e.target.value)}
                  />
                  <Button onClick={handleBonus} disabled={mutating} className="shrink-0">
                    + Bonus
                  </Button>
                </div>
              </div>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : loyaltyHistory.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                Sem movimentos de pontos ainda. Associe clientes ao registar vendas no PDV.
              </p>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {loyaltyHistory.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.points < 0 ? 'destructive' : 'secondary'}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {tx.type === 'earn' ? 'Compra' : tx.type === 'bonus' ? 'Bónus' : 'Resgate'}
                        {tx.description ? ` · ${tx.description}` : ''}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {format(new Date(tx.created_at), 'dd/MM/yyyy', { locale: pt })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailCustomer(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}