import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from './use-toast';
import { AccountPayable, ExpenseCategory } from '@/types';

export function useAccountsPayable() {
  const { currentBusiness } = useBusiness();
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBusiness?.id) {
      fetchAccounts();
      fetchCategories();
    }
  }, [currentBusiness?.id]);

  const fetchAccounts = async () => {
    if (!currentBusiness?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar contas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!currentBusiness?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const addAccount = async (account: Omit<AccountPayable, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from('accounts_payable')
        .insert({
          ...account,
          business_id: currentBusiness.id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setAccounts([...accounts, data]);
      toast({ title: 'Conta adicionada com sucesso!' });
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar conta',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateAccount = async (id: string, updates: Partial<AccountPayable>) => {
    try {
      const { data, error } = await supabase
        .from('accounts_payable')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAccounts(accounts.map(a => a.id === id ? data : a));
      toast({ title: 'Conta atualizada!' });
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar conta',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const markAsPaid = async (id: string, paymentMethod: string, paymentDate?: Date) => {
    return updateAccount(id, {
      status: 'paid',
      payment_method: paymentMethod,
      payment_date: paymentDate || new Date(),
    });
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAccounts(accounts.filter(a => a.id !== id));
      toast({ title: 'Conta removida!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover conta',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addCategory = async (name: string, description?: string) => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          business_id: currentBusiness.id,
          name,
          description,
        })
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      toast({ title: 'Categoria adicionada!' });
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar categoria',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    accounts,
    categories,
    loading,
    addAccount,
    updateAccount,
    markAsPaid,
    deleteAccount,
    addCategory,
    refreshAccounts: fetchAccounts,
  };
}
