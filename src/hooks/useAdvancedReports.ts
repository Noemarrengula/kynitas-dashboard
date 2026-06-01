import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';

export function useAdvancedReports() {
  const { business } = useBusiness();
  const [loading, setLoading] = useState(false);

  const getTopProducts = async (limit = 10) => {
    if (!business?.id || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('top_selling_products')
        .select('*')
        .eq('business_id', business.id)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar top produtos:', error);
      return [];
    }
  };

  const getSalesByHour = async () => {
    if (!business?.id || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('sales_by_hour')
        .select('*')
        .eq('business_id', business.id)
        .order('hour');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar vendas por hora:', error);
      return [];
    }
  };

  const getSalesByWeekday = async () => {
    if (!business?.id || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('sales_by_weekday')
        .select('*')
        .eq('business_id', business.id)
        .order('day_of_week');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar vendas por dia:', error);
      return [];
    }
  };

  const getPaymentMethodsSummary = async () => {
    if (!business?.id || !isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('payment_methods_summary')
        .select('*')
        .eq('business_id', business.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar resumo de pagamentos:', error);
      return null;
    }
  };

  const getDailyPerformance = async (days = 30) => {
    if (!business?.id || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('daily_performance')
        .select('*')
        .eq('business_id', business.id)
        .limit(days);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar performance diária:', error);
      return [];
    }
  };

  const getProfitReport = async (startDate: string, endDate: string) => {
    if (!business?.id || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .rpc('profit_report', {
          start_date: startDate,
          end_date: endDate,
          business_uuid: business.id,
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar relatório de lucro:', error);
      return [];
    }
  };

  return {
    loading,
    getTopProducts,
    getSalesByHour,
    getSalesByWeekday,
    getPaymentMethodsSummary,
    getDailyPerformance,
    getProfitReport,
  };
}
