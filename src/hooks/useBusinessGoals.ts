import { useState, useEffect, useMemo } from 'react';
import { useDatabase } from './useDatabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns';

export interface BusinessGoal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category: 'revenue' | 'sales_count' | 'average_ticket' | 'customer_retention' | 'product_sales';
  target: number;
  current: number;
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'achieved' | 'overachieved';
  period: string; // YYYY-MM-DD format
  createdAt: string;
  updatedAt: string;
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  category: 'financial' | 'operational' | 'customer' | 'inventory';
}

export function useBusinessGoals() {
  const { currentBusiness } = useBusiness();
  const { sales, products } = useDatabase();
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar metas do banco de dados
  useEffect(() => {
    if (!currentBusiness?.id) return;

    const loadGoals = async () => {
      try {
        const { data, error } = await supabase
          .from('business_goals')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setGoals(data || []);
      } catch (error) {
        console.error('Erro ao carregar metas:', error);
        // Criar metas padrão se não existirem
        createDefaultGoals();
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [currentBusiness?.id]);

  const createDefaultGoals = async () => {
    if (!currentBusiness?.id) return;

    const today = new Date();
    const defaultGoals = [
      {
        business_id: currentBusiness.id,
        type: 'daily',
        category: 'revenue',
        target: 50000, // 50k AOA por dia
        period: today.toISOString().split('T')[0]
      },
      {
        business_id: currentBusiness.id,
        type: 'weekly',
        category: 'revenue',
        target: 300000, // 300k AOA por semana
        period: startOfWeek(today).toISOString().split('T')[0]
      },
      {
        business_id: currentBusiness.id,
        type: 'monthly',
        category: 'revenue',
        target: 1200000, // 1.2M AOA por mês
        period: startOfMonth(today).toISOString().split('T')[0]
      },
      {
        business_id: currentBusiness.id,
        type: 'daily',
        category: 'sales_count',
        target: 20, // 20 vendas por dia
        period: today.toISOString().split('T')[0]
      }
    ];

    try {
      const { data, error } = await supabase
        .from('business_goals')
        .insert(defaultGoals)
        .select();

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Erro ao criar metas padrão:', error);
    }
  };

  // Calcular progresso das metas
  const goalsWithProgress = useMemo(() => {
    return goals.map(goal => {
      let current = 0;
      const today = new Date();
      const goalDate = new Date(goal.period);

      switch (goal.type) {
        case 'daily':
          if (goalDate.toDateString() === today.toDateString()) {
            if (goal.category === 'revenue') {
              current = sales
                .filter(s => new Date(s.createdAt).toDateString() === today.toDateString())
                .reduce((sum, s) => sum + s.total, 0);
            } else if (goal.category === 'sales_count') {
              current = sales
                .filter(s => new Date(s.createdAt).toDateString() === today.toDateString())
                .length;
            }
          }
          break;

        case 'weekly': {
          const weekStart = startOfWeek(today);
          const weekEnd = endOfWeek(today);
          if (goal.category === 'revenue') {
            current = sales
              .filter(s => {
                const saleDate = new Date(s.createdAt);
                return saleDate >= weekStart && saleDate <= weekEnd;
              })
              .reduce((sum, s) => sum + s.total, 0);
          }
          break;
        }

        case 'monthly': {
          const monthStart = startOfMonth(today);
          const monthEnd = endOfMonth(today);
          if (goal.category === 'revenue') {
            current = sales
              .filter(s => {
                const saleDate = new Date(s.createdAt);
                return saleDate >= monthStart && saleDate <= monthEnd;
              })
              .reduce((sum, s) => sum + s.total, 0);
          }
          break;
        }
      }

      const progress = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0;
      let status: BusinessGoal['status'] = 'not_started';
      
      if (progress === 0) status = 'not_started';
      else if (progress < 100) status = 'in_progress';
      else if (progress === 100) status = 'achieved';
      else status = 'overachieved';

      return {
        ...goal,
        current,
        progress,
        status
      };
    });
  }, [goals, sales]);

  // Calcular KPIs
  const kpis = useMemo((): KPI[] => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Vendas de hoje
    const todaySales = sales.filter(s => 
      new Date(s.createdAt).toDateString() === today.toDateString()
    );
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

    // Vendas de ontem
    const yesterdaySales = sales.filter(s => 
      new Date(s.createdAt).toDateString() === yesterday.toDateString()
    );
    const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.total, 0);

    // Ticket médio
    const avgTicket = todaySales.length > 0 ? todayRevenue / todaySales.length : 0;
    const yesterdayAvgTicket = yesterdaySales.length > 0 ? yesterdayRevenue / yesterdaySales.length : 0;

    // Produtos em stock
    const productsInStock = products.filter(p => p.stock > 0).length;
    const totalProducts = products.length;

    return [
      {
        id: 'daily-revenue',
        name: 'Receita Diária',
        value: todayRevenue,
        target: 50000,
        unit: 'AOA',
        trend: todayRevenue > yesterdayRevenue ? 'up' : todayRevenue < yesterdayRevenue ? 'down' : 'stable',
        trendValue: yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0,
        category: 'financial'
      },
      {
        id: 'daily-sales',
        name: 'Vendas Diárias',
        value: todaySales.length,
        target: 20,
        unit: 'vendas',
        trend: todaySales.length > yesterdaySales.length ? 'up' : todaySales.length < yesterdaySales.length ? 'down' : 'stable',
        trendValue: yesterdaySales.length > 0 ? ((todaySales.length - yesterdaySales.length) / yesterdaySales.length) * 100 : 0,
        category: 'operational'
      },
      {
        id: 'avg-ticket',
        name: 'Ticket Médio',
        value: avgTicket,
        unit: 'AOA',
        trend: avgTicket > yesterdayAvgTicket ? 'up' : avgTicket < yesterdayAvgTicket ? 'down' : 'stable',
        trendValue: yesterdayAvgTicket > 0 ? ((avgTicket - yesterdayAvgTicket) / yesterdayAvgTicket) * 100 : 0,
        category: 'financial'
      },
      {
        id: 'stock-availability',
        name: 'Disponibilidade Stock',
        value: totalProducts > 0 ? (productsInStock / totalProducts) * 100 : 0,
        target: 90,
        unit: '%',
        trend: 'stable',
        trendValue: 0,
        category: 'inventory'
      }
    ];
  }, [sales, products]);

  const createGoal = async (goalData: Omit<BusinessGoal, 'id' | 'current' | 'progress' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_goals')
        .insert({
          ...goalData,
          business_id: currentBusiness.id
        })
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      throw error;
    }
  };

  const updateGoal = async (id: string, updates: Partial<BusinessGoal>) => {
    try {
      const { data, error } = await supabase
        .from('business_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => prev.map(g => g.id === id ? data : g));
      return data;
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('business_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Erro ao deletar meta:', error);
      throw error;
    }
  };

  return {
    goals: goalsWithProgress,
    kpis,
    loading,
    createGoal,
    updateGoal,
    deleteGoal
  };
}