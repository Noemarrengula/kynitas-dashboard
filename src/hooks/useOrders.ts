import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from './useDatabase';
import { Order } from '@/types';

export function useOrders() {
  const db = useDatabase();
  
  const query = useQuery({
    queryKey: ['orders'],
    queryFn: db.getOrders
  });

  return {
    orders: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: db.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Order> }) => 
      db.updateOrder(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}