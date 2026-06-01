import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from './useDatabase';
import { Product } from '@/types';

export function useProducts() {
  const db = useDatabase();
  
  const query = useQuery({
    queryKey: ['products'],
    queryFn: db.getProducts
  });

  return {
    products: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch
  };
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: db.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) => 
      db.updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const db = useDatabase();
  
  return useMutation({
    mutationFn: db.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}