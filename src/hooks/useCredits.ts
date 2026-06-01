import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  current_balance: number;
  status: 'active' | 'blocked' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  business_id: string;
  customer_id: string;
  type: 'charge' | 'payment' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  sale_id?: string;
  payment_method?: string;
  description?: string;
  created_at: string;
}

export function useCredits() {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

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

      if (customersRes.data) setCustomers(customersRes.data);
      if (transactionsRes.data) setTransactions(transactionsRes.data);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customer, business_id: currentBusiness?.id }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCustomers([...customers, data]);
        toast({ title: 'Cliente cadastrado com sucesso!' });
      }
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .eq('business_id', currentBusiness?.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCustomers(customers.map(c => c.id === id ? data : c));
        toast({ title: 'Cliente atualizado com sucesso!' });
      }
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
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
      return data || [];
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
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
    getCustomerTransactions,
    refreshData: loadData,
  };
}
