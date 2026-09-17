import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { toast } from './use-toast';

export function useRealtimeSync() {
  const {
    setIngredients, setSales, setProducts, setTables, setOrders,
    ingredients, sales, products, tables, orders
  } = useStore();
  const ingredientsRef = useRef(ingredients);
  const salesRef = useRef(sales);
  const productsRef = useRef(products);
  const tablesRef = useRef(tables);
  const ordersRef = useRef(orders);

  ingredientsRef.current = ingredients;
  salesRef.current = sales;
  productsRef.current = products;
  tablesRef.current = tables;
  ordersRef.current = orders;

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channels = [];

    // Ingredientes
    const ingredientsChannel = supabase
      .channel('ingredients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients' },
        (payload) => {
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
            setIngredients(ingredientsRef.current.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    channels.push(ingredientsChannel);

    // Vendas
    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
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
              customerId: payload.new.customer_id,
              createdAt: new Date(payload.new.created_at),
            };
            setSales([newSale, ...salesRef.current]);
            toast({
              title: 'Nova venda registrada!',
              description: `Total: ${newSale.total?.toFixed(2) || '0.00'} MT`,
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
              customerId: payload.new.customer_id,
              createdAt: new Date(payload.new.created_at),
            };
            setSales(salesRef.current.map(s => s.id === updatedSale.id ? updatedSale : s));
          } else if (payload.eventType === 'DELETE') {
            setSales(salesRef.current.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    channels.push(salesChannel);

    // Produtos
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newProduct = {
              id: payload.new.id,
              name: payload.new.name,
              category: payload.new.category,
              price: payload.new.price,
              costPrice: payload.new.cost_price,
              stock: payload.new.stock,
              internalId: payload.new.internal_id,
              type: payload.new.type,
              recipe: payload.new.recipe,
              image: payload.new.image,
            };
            const current = productsRef.current;
            setProducts(
              current.some(p => p.id === newProduct.id)
                ? current.map(p => p.id === newProduct.id ? newProduct : p)
                : [...current, newProduct]
            );
          } else if (payload.eventType === 'DELETE') {
            setProducts(productsRef.current.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    channels.push(productsChannel);

    // Mesas
    const tablesChannel = supabase
      .channel('tables-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTable = {
              id: payload.new.id,
              number: payload.new.number,
              name: payload.new.name,
              customer_name: payload.new.customer_name,
              status: payload.new.status,
              currentOrderId: payload.new.current_order_id,
              opened_at: payload.new.opened_at ? new Date(payload.new.opened_at) : undefined,
              closed_at: payload.new.closed_at ? new Date(payload.new.closed_at) : undefined,
            };
            const current = tablesRef.current;
            setTables(
              current.some(t => t.id === newTable.id)
                ? current.map(t => t.id === newTable.id ? newTable : t)
                : [...current, newTable]
            );
          } else if (payload.eventType === 'DELETE') {
            setTables(tablesRef.current.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    channels.push(tablesChannel);

    // Orders
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newOrder = {
              id: payload.new.id,
              tableId: payload.new.table_id,
              items: payload.new.items,
              status: payload.new.status,
              total: payload.new.total,
              paymentMethod: payload.new.payment_method,
              createdAt: new Date(payload.new.created_at),
            };
            const current = ordersRef.current;
            setOrders(
              current.some(o => o.id === newOrder.id)
                ? current.map(o => o.id === newOrder.id ? newOrder : o)
                : [...current, newOrder]
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(ordersRef.current.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    channels.push(ordersChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [setIngredients, setSales, setProducts, setTables, setOrders]);
}
