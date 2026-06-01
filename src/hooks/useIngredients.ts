import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from './useDatabase';
import { Ingredient } from '@/types';

export function useIngredients() {
  const db = useDatabase();
  
  const query = useQuery({
    queryKey: ['ingredients'],
    queryFn: db.getIngredients
  });

  return {
    ingredients: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch
  };
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: db.createIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Ingredient> }) => 
      db.updateIngredient(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}