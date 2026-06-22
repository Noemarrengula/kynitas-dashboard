import { useState, useEffect } from 'react';
import { Users, Plus, Search, Gift, Phone, Mail, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import CustomerModal from '@/components/customers/CustomerModal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_at?: string;
}

export default function Customers() {
  const { business } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        .eq('active', true)
        .order('total_spent', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };



  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalCustomers = customers.length;
  const totalPoints = customers.reduce((acc, c) => acc + c.loyalty_points, 0);
  const totalRevenue = customers.reduce((acc, c) => acc + c.total_spent, 0);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clientes
          </h1>
          <p className="text-muted-foreground">Gestão de clientes e programa de fidelidade</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
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
              <p className="text-sm text-muted-foreground">Pontos Totais</p>
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
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
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
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Gift className="h-3 w-3" />
                {customer.loyalty_points}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Total Gasto</p>
                <p className="font-semibold">{formatCurrency(customer.total_spent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Visitas</p>
                <p className="font-semibold">{customer.visit_count}</p>
              </div>
            </div>

            {customer.last_visit_at && (
              <div className="text-xs text-muted-foreground">
                Última visita: {format(new Date(customer.last_visit_at), 'dd/MM/yyyy', { locale: pt })}
              </div>
            )}

            {customer.birth_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(customer.birth_date), 'dd/MM', { locale: pt })}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
        </div>
      )}

      {/* Create Dialog */}
      <CustomerModal 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={loadCustomers}
      />
    </div>
  );
}
