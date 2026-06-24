import { useState, useMemo, useCallback } from 'react';
import { CreditCard, Plus, DollarSign, AlertCircle, TrendingUp, Users, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/SearchInput';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CustomerModal } from '@/components/credits/CustomerModal';
import { PaymentModal } from '@/components/credits/PaymentModal';
import { useCredits, Customer } from '@/hooks/useCredits';
import { formatCurrency } from '@/lib/utils';

export default function Credits() {
  const [search, setSearch] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { customers, loading, addCustomer, updateCustomer, registerPayment } = useCredits();

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const query = search.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone?.toLowerCase().includes(query)
    );
  }, [customers, search]);

  const totalDebt = customers.reduce((sum, c) => sum + c.current_balance, 0);
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const blockedCustomers = customers.filter(c => c.status === 'blocked').length;

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setCustomerModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = useCallback(async (data: any) => {
    if (selectedCustomer) {
      return await updateCustomer(selectedCustomer.id, data);
    } else {
      return await addCustomer(data);
    }
  }, [selectedCustomer, updateCustomer, addCustomer]);

  const handlePayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentModalOpen(true);
  };

  const handleSavePayment = useCallback(async (amount: number, method: string, description?: string) => {
    if (!selectedCustomer) return { success: false };
    return await registerPayment(selectedCustomer.id, amount, method, description);
  }, [selectedCustomer, registerPayment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Carregando clientes..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Gestão de Vales
          </h1>
          <p className="text-muted-foreground">Controle de crédito e contas fiadas</p>
        </div>
        <Button variant="gradient" onClick={handleAddCustomer}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dívida Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clientes Ativos</p>
              <p className="text-xl font-bold">{activeCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bloqueados</p>
              <p className="text-xl font-bold">{blockedCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-xl font-bold">
                {formatCurrency(customers.length > 0 ? totalDebt / customers.length : 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Pesquisar cliente por nome ou telefone..."
      />

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </div>
        ) : (
          filteredCustomers.map((customer) => {
          const usagePercent = (customer.current_balance / customer.credit_limit) * 100;
          const isNearLimit = usagePercent >= 80;
          const isBlocked = customer.status === 'blocked';

          return (
            <Card key={customer.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{customer.name}</h3>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <Badge variant={isBlocked ? 'destructive' : 'secondary'}>
                    {isBlocked ? 'Bloqueado' : 'Ativo'}
                  </Badge>
                </div>

                {/* Balance */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dívida Atual</span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(customer.current_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite</span>
                    <span className="font-medium">{formatCurrency(customer.credit_limit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disponível</span>
                    <span className="font-medium text-success">
                      {formatCurrency(customer.credit_limit - customer.current_balance)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uso do Crédito</span>
                    <span>{usagePercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isNearLimit ? 'bg-destructive' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleEditCustomer(customer)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="flex-1"
                    onClick={() => handlePayment(customer)}
                    disabled={customer.current_balance === 0}
                  >
                    Receber
                  </Button>
                </div>
              </div>
            </Card>
          );
        })
        )}
      </div>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => {
          setCustomerModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
      />

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSave={handleSavePayment}
        customer={selectedCustomer}
      />
    </div>
  );
}
