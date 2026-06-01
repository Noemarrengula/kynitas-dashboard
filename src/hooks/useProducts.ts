import { useDatabase } from './useDatabase';

export function useProducts() {
  const { products, loading, error } = useDatabase();
  return {
    products,
    loading,
    error: error?.message || null,
    refetch: () => {}
  };
}

export function useCreateProduct() {
  const { addProduct } = useDatabase();
  return { mutateAsync: addProduct };
}

export function useUpdateProduct() {
  const { updateProduct } = useDatabase();
  return {
    mutateAsync: ({ id, updates }: { id: string; updates: any }) =>
      updateProduct(id, updates)
  };
}

export function useDeleteProduct() {
  const { deleteProduct } = useDatabase();
  return { mutateAsync: deleteProduct };
}
