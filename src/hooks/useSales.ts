import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from './useDatabase';
import { Sale } from '@/types';

export function useSales() {
  const db = useDatabase();
  
  const query = useQuery({
    queryKey: ['sales'],
    queryFn: db.getSales
  });

  return {
    sales: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch
  };
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: db.createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}