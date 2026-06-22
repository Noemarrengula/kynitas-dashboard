import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number;
  status: 'active' | 'blocked' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  businessId: string;
  customerId: string;
  type: 'charge' | 'payment' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  saleId?: string;
  paymentMethod?: string;
  description?: string;
  createdAt: string;
}

function toCustomer(db: any): Customer {
  return {
    id: db.id,
    businessId: db.business_id,
    name: db.name,
    phone: db.phone,
    email: db.email,
    address: db.address,
    creditLimit: db.credit_limit ?? 0,
    currentBalance: db.current_balance ?? 0,
    status: db.status,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function toCreditTransaction(db: any): CreditTransaction {
  return {
    id: db.id,
    businessId: db.business_id,
    customerId: db.customer_id,
    type: db.type,
    amount: db.amount,
    balanceBefore: db.balance_before,
    balanceAfter: db.balance_after,
    saleId: db.sale_id,
    paymentMethod: db.payment_method,
    description: db.description,
    createdAt: db.created_at,
  };
}

export function useCredits() {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const customersRef = useRef(customers);
  customersRef.current = customers;

  useEffect(() => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }
    loadData();
  }, [currentBusiness?.id]);

  const loadData = async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    try {
      const [customersRes, transactionsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .order('name'),
        supabase
          .from('credit_transactions')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (customersRes.data) setCustomers(customersRes.data.map(toCustomer));
      if (transactionsRes.data) setTransactions(transactionsRes.data.map(toCreditTransaction));
    } catch (error: unknown) {
      toast({
        title: 'Erro ao carregar dados',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          credit_limit: customer.creditLimit ?? 0,
          current_balance: customer.currentBalance ?? 0,
          status: customer.status || 'active',
          notes: customer.notes,
          business_id: currentBusiness?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCustomers([...customers, toCustomer(data)]);
        toast({ title: 'Cliente cadastrado com sucesso!' });
      }
      return { data: data ? toCustomer(data) : null, error: null };
    } catch (error: unknown) {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
      if (updates.currentBalance !== undefined) dbUpdates.current_balance = updates.currentBalance;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('customers')
        .update(dbUpdates)
        .eq('id', id)
        .eq('business_id', currentBusiness?.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCustomers(customers.map(c => c.id === id ? toCustomer(data) : c));
        toast({ title: 'Cliente atualizado com sucesso!' });
      }
      return { data: data ? toCustomer(data) : null, error: null };
    } catch (error: unknown) {
      toast({
        title: 'Erro ao atualizar cliente',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const registerPayment = async (
    customerId: string,
    amount: number,
    paymentMethod: string,
    description?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('register_credit_payment', {
        p_business_id: currentBusiness?.id,
        p_customer_id: customerId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_description: description
      });

      if (error) throw error;

      if (data?.success) {
        await loadData();
        toast({ title: 'Pagamento registrado com sucesso!' });
        return { success: true, data };
      } else {
        throw new Error(data?.error || 'Erro ao registrar pagamento');
      }
    } catch (error: unknown) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const findOrCreateCustomer = async (name: string): Promise<Customer | null> => {
    if (!currentBusiness?.id) return null;

    const existing = customersRef.current.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: currentBusiness.id,
        name,
        credit_limit: 0,
        current_balance: 0,
        status: 'active',
      })
      .select()
      .single();

    if (!error && data) {
      const customer = toCustomer(data);
      setCustomers([...customers, customer]);
      return customer;
    }
    return null;
  };

  const registerCreditCharge = async (
    customerName: string,
    items: any[],
    total: number,
    description?: string
  ) => {
    try {
      if (!currentBusiness?.id) throw new Error('Negócio não encontrado');

      const customer = await findOrCreateCustomer(customerName);
      if (!customer) throw new Error('Erro ao criar/encontrar cliente');

      const { data, error } = await supabase.rpc('create_credit_sale', {
        p_business_id: currentBusiness.id,
        p_customer_id: customer.id,
        p_items: items,
        p_total: total,
        p_description: description || 'Venda a crédito',
      });

      if (error) throw error;

      if (data?.success) {
        await loadData();
        return { success: true, saleId: data.sale_id, transactionId: data.transaction_id, data };
      } else {
        throw new Error(data?.error || 'Erro ao registrar venda a crédito');
      }
    } catch (error: unknown) {
      toast({
        title: 'Erro ao registrar venda a crédito',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const getCustomerTransactions = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(toCreditTransaction);
    } catch (error: unknown) {
      toast({
        title: 'Erro ao carregar histórico',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return [];
    }
  };

  return {
    customers,
    transactions,
    loading,
    addCustomer,
    updateCustomer,
    registerPayment,
    registerCreditCharge,
    getCustomerTransactions,
    refreshData: loadData,
  };
}
