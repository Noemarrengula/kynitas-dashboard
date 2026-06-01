import { useDatabase } from './useDatabase';

export function useSales() {
  const { sales, loading, error } = useDatabase();
  return {
    sales,
    loading,
    error: error?.message || null,
    refetch: () => {}
  };
}

export function useCreateSale() {
  const { addSale } = useDatabase();
  return { mutateAsync: addSale };
}
