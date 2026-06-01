import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { toast } from './use-toast';

export function useRealtimeSync() {
  const { setIngredients, setSales, ingredients, sales } = useStore();
  const ingredientsRef = useRef(ingredients);
  const salesRef = useRef(sales);

  // Manter refs sempre actualizados
  ingredientsRef.current = ingredients;
  salesRef.current = sales;

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

            const current = ingredientsRef.current;
            setIngredients(
              current.some(i => i.id === newIngredient.id)
                ? current.map(i => i.id === newIngredient.id ? newIngredient : i)
                : [...current, newIngredient]
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            const current = ingredientsRef.current;
            setIngredients(current.filter(i => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    // Sincronizar vendas em tempo real
    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('Venda atualizada:', payload);

          if (payload.eventType === 'INSERT') {
            const newSale = {
              id: payload.new.id,
              items: payload.new.items,
              total: payload.new.total,
              paymentDetails: payload.new.payment_details,
              tableId: payload.new.table_id,
              table_number: payload.new.table_number,
              table_name: payload.new.table_name,
              table_customer_name: payload.new.table_customer_name,
              createdAt: new Date(payload.new.created_at),
            };

            const current = salesRef.current;
            setSales([newSale, ...current]);

            toast({
              title: 'Nova venda registrada!',
              description: `Total: ${newSale.total.toFixed(2)} MT`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedSale = {
              id: payload.new.id,
              items: payload.new.items,
              total: payload.new.total,
              paymentDetails: payload.new.payment_details,
              tableId: payload.new.table_id,
              table_number: payload.new.table_number,
              table_name: payload.new.table_name,
              table_customer_name: payload.new.table_customer_name,
              createdAt: new Date(payload.new.created_at),
            };

            const current = salesRef.current;
            setSales(current.map(s => s.id === updatedSale.id ? updatedSale : s));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            const current = salesRef.current;
            setSales(current.filter(s => s.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ingredientsChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [setIngredients, setSales]); // já não depende de ingredients/sales
}
