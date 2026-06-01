import { useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useBusiness } from '@/contexts/BusinessContext';
import { Table, Order } from '@/types';

export function useTablesPersistence() {
  const { currentBusiness } = useBusiness();
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!currentBusiness?.id || !isSupabaseConfigured()) return;
    loadTablesAndOrders();
  }, [currentBusiness?.id]);

  const loadTablesAndOrders = async () => {
    if (!currentBusiness?.id || loadingRef.current) return;
    loadingRef.current = true;

    try {
      const [tablesRes, ordersRes] = await Promise.all([
        supabase
          .from('tables')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .order('number'),
        supabase
          .from('orders')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (tablesRes.data) {
        useStore.getState().setTables(tablesRes.data.map(dbTableToTable));
      }
      if (ordersRes.data) {
        useStore.getState().setOrders(ordersRes.data.map(dbOrderToOrder));
      }
    } catch (err: any) {
      console.error('Erro ao carregar mesas/orders:', err);
    } finally {
      loadingRef.current = false;
    }
  };

  const syncTable = async (table: Table) => {
    if (!currentBusiness?.id || !isSupabaseConfigured()) return;

    const existing = useStore.getState().tables.find(t => t.id === table.id);
    const dbData: Record<string, any> = {
      business_id: currentBusiness.id,
      number: table.number,
      name: table.name || null,
      customer_name: table.customer_name || null,
      status: table.status,
      opened_at: table.opened_at?.toISOString() || null,
      closed_at: table.closed_at?.toISOString() || null,
    };
    if (table.currentOrderId) dbData.current_order_id = table.currentOrderId;

    if (existing) {
      await supabase
        .from('tables')
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq('id', table.id)
        .eq('business_id', currentBusiness.id);
    } else {
      const { error } = await supabase
        .from('tables')
        .insert({ id: table.id, ...dbData });

      if (error && error.code === '23505') {
        await supabase
          .from('tables')
          .update({ ...dbData, updated_at: new Date().toISOString() })
          .eq('id', table.id)
          .eq('business_id', currentBusiness.id);
      }
    }
  };

  const syncOrder = async (order: Order) => {
    if (!currentBusiness?.id || !isSupabaseConfigured()) return;

    const existing = useStore.getState().orders.find(o => o.id === order.id);
    const dbData = {
      business_id: currentBusiness.id,
      table_id: order.tableId,
      items: order.items,
      status: order.status,
      total: order.total,
      payment_method: order.paymentMethod || null,
      created_at: order.createdAt.toISOString(),
    };

    if (existing) {
      await supabase
        .from('orders')
        .update(dbData)
        .eq('id', order.id)
        .eq('business_id', currentBusiness.id);
    } else {
      await supabase
        .from('orders')
        .insert({ id: order.id, ...dbData });
    }
  };

  const addTable = useCallback(async (table: Table) => {
    useStore.getState().addTable(table);
    await syncTable(table);
  }, []);

  const updateTable = useCallback(async (id: string, data: Partial<Table>) => {
    const current = useStore.getState().tables.find(t => t.id === id);
    if (!current) return;

    const updated = { ...current, ...data };
    useStore.getState().updateTable(id, data);
    await syncTable(updated);
  }, []);

  const deleteTable = useCallback(async (id: string) => {
    if (!currentBusiness?.id || !isSupabaseConfigured()) return;

    await supabase
      .from('tables')
      .delete()
      .eq('id', id)
      .eq('business_id', currentBusiness.id);

    const remaining = useStore.getState().tables.filter(t => t.id !== id);
    useStore.getState().setTables(remaining);
  }, [currentBusiness?.id]);

  const addOrder = useCallback(async (order: Order) => {
    useStore.getState().addOrder(order);
    await syncOrder(order);
  }, []);

  const updateOrder = useCallback(async (id: string, data: Partial<Order>) => {
    const current = useStore.getState().orders.find(o => o.id === id);
    if (!current) return;

    const updated = { ...current, ...data };
    useStore.getState().updateOrder(id, data);
    await syncOrder(updated);
  }, []);

  return {
    loadTablesAndOrders,
    addTable,
    updateTable,
    deleteTable,
    addOrder,
    updateOrder,
  };
}

function dbTableToTable(db: any): Table {
  return {
    id: db.id,
    number: db.number,
    name: db.name || undefined,
    customer_name: db.customer_name || undefined,
    status: db.status,
    currentOrderId: db.current_order_id || undefined,
    opened_at: db.opened_at ? new Date(db.opened_at) : undefined,
    closed_at: db.closed_at ? new Date(db.closed_at) : undefined,
  };
}

function dbOrderToOrder(db: any): Order {
  return {
    id: db.id,
    tableId: db.table_id,
    items: db.items || [],
    status: db.status || 'pending',
    total: db.total || 0,
    createdAt: db.created_at ? new Date(db.created_at) : new Date(),
    paymentMethod: db.payment_method,
  };
}
