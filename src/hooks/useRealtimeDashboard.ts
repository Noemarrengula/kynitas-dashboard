import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';

interface DashboardData {
  today_sales: number;
  today_revenue: number;
  avg_ticket: number;
  critical_ingredients: number;
  last_sale: {
    id: string;
    total: number;
    created_at: string;
  } | null;
}

export function useRealtimeDashboard() {
  const { business } = useBusiness();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    loadDashboard();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadDashboard, 30000);

    // Escutar novas vendas em tempo real
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        () => {
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [business?.id]);

  const loadDashboard = async () => {
    if (!business?.id || !isSupabaseConfigured()) return;

    try {
      const { data: dashboardData, error } = await supabase
        .rpc('realtime_dashboard', { business_uuid: business.id });

      if (error) throw error;
      setData(dashboardData);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refresh: loadDashboard };
}
