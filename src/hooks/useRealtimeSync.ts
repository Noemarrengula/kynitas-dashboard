import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { toast } from './use-toast';

export function useRealtimeSync() {
  const { setIngredients, setSales, ingredients, sales } = useStore();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Sincronizar ingredientes em tempo real
    const ingredientsChannel = supabase
      .channel('ingredients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients' },
        (payload) => {
          console.log('Ingrediente atualizado:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newIngredient = {
              id: payload.new.id,
              name: payload.new.name,
              stock: payload.new.stock,
              unit: payload.new.unit,
              minStock: payload.new.min_stock,
              costPerUnit: payload.new.cost_per_unit,
              packages: payload.new.packages,
            };

            setIngredients(
              ingredients.some(i => i.id === newIngredient.id)
                ? ingredients.map(i => i.id === newIngredient.id ? newIngredient : i)
                : [...ingredients, newIngredient]
            );
          }
        }
      )
      .subscribe();

    // Sincronizar vendas em tempo real
    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('Nova venda:', payload);
          
          const newSale = {
            id: payload.new.id,
            items: payload.new.items,
            total: payload.new.total,
            paymentDetails: payload.new.payment_details,
            tableId: payload.new.table_id,
            createdAt: new Date(payload.new.created_at),
          };

          setSales([newSale, ...sales]);
          
          toast({
            title: 'Nova venda registrada!',
            description: `Total: ${newSale.total.toFixed(2)} MT`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ingredientsChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [ingredients, sales, setIngredients, setSales]);
}
