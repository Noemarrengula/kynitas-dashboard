import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { Supplier, PurchaseOrder } from '@/types';
import { sanitizeText, sanitizeObject } from '@/lib/sanitize';

interface HookResult<T> {
  data: T | null;
  error: Error | null;
}

export function useSuppliers() {
  const { currentBusiness } = useBusiness();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBusiness?.id) {
      loadAll();
    }
  }, [currentBusiness?.id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchSuppliers(), fetchPurchaseOrders()]);
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');

      if (!error && data) {
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
    }
  };

  const fetchPurchaseOrders = async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('order_date', { ascending: false });

      if (!error && data) {
        setPurchaseOrders(data);
      }
    } catch (err) {
      console.error('Erro ao buscar ordens de compra:', err);
    }
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>): Promise<HookResult<Supplier>> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };

      const sanitized = sanitizeObject(supplier);

      const { data, error } = await supabase
        .from('suppliers')
        .insert([{ ...sanitized, business_id: currentBusiness.id }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSuppliers([...suppliers, data]);
        return { data, error: null };
      }
      return { data: null, error: null };
    } catch (err: unknown) {
      console.error('Erro ao adicionar fornecedor:', err);
      return { data: null, error: err };
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<HookResult<null>> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };

      const sanitized = sanitizeObject(updates);

      const { error } = await supabase
        .from('suppliers')
        .update(sanitized)
        .eq('id', id)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;

      setSuppliers(suppliers.map(s => s.id === id ? { ...s, ...updates } : s));
      return { data: null, error: null };
    } catch (err: unknown) {
      console.error('Erro ao atualizar fornecedor:', err);
      return { data: null, error: err };
    }
  };

  const deleteSupplier = async (id: string): Promise<HookResult<null>> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;

      setSuppliers(suppliers.filter(s => s.id !== id));
      return { data: null, error: null };
    } catch (err: unknown) {
      console.error('Erro ao remover fornecedor:', err);
      return { data: null, error: err };
    }
  };

  const createPurchaseOrder = async (po: Omit<PurchaseOrder, 'id' | 'business_id' | 'order_number' | 'created_at' | 'updated_at'>): Promise<HookResult<PurchaseOrder>> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };

      const { data: poNumber, error: rpcError } = await supabase.rpc('generate_po_number', {
        business_uuid: currentBusiness.id
      });

      if (rpcError) throw rpcError;
      if (!poNumber) throw new Error('Erro ao gerar número da ordem de compra');

      const sanitized = sanitizeObject(po);

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([{
          ...sanitized,
          business_id: currentBusiness.id,
          order_number: poNumber
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPurchaseOrders([data, ...purchaseOrders]);
        return { data, error: null };
      }
      return { data: null, error: null };
    } catch (err: unknown) {
      console.error('Erro ao criar ordem de compra:', err);
      return { data: null, error: err };
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>): Promise<HookResult<null>> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };

      const { error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;

      setPurchaseOrders(purchaseOrders.map(po => po.id === id ? { ...po, ...updates } : po));
      return { data: null, error: null };
    } catch (err: unknown) {
      console.error('Erro ao atualizar ordem de compra:', err);
      return { data: null, error: err };
    }
  };

  const receivePurchaseOrder = async (poId: string, items: any[], invoiceNumber?: string) => {
    try {
      if (!currentBusiness?.id) throw new Error('Negócio não encontrado');

      const { data, error } = await supabase.rpc('receive_purchase_order', {
        po_id: poId,
        received_items: items,
        invoice_num: invoiceNumber
      });

      if (error) throw error;

      if (data) {
        const productIds = items.filter(i => i.product_id).map(i => i.product_id);
        const ingredientIds = items.filter(i => i.ingredient_id).map(i => i.ingredient_id);

        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, stock')
            .in('id', productIds);

          if (products) {
            const updates = products.map(p => {
              const item = items.find(i => i.product_id === p.id);
              return {
                id: p.id,
                stock: (p.stock || 0) + (item?.quantity || 0)
              };
            });
            for (const u of updates) {
              await supabase.from('products').update({ stock: u.stock }).eq('id', u.id);
            }
          }
        }

        if (ingredientIds.length > 0) {
          const { data: ingredients } = await supabase
            .from('ingredients')
            .select('id, stock')
            .in('id', ingredientIds);

          if (ingredients) {
            const updates = ingredients.map(ing => {
              const item = items.find(i => i.ingredient_id === ing.id);
              return {
                id: ing.id,
                stock: (ing.stock || 0) + (item?.quantity || 0)
              };
            });
            for (const u of updates) {
              await supabase.from('ingredients').update({ stock: u.stock }).eq('id', u.id);
            }
          }
        }
      }

      await fetchPurchaseOrders();
      return data;
    } catch (err: unknown) {
      console.error('Erro ao receber ordem de compra:', err);
      return null;
    }
  };

  return {
    suppliers,
    purchaseOrders,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    createPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    refreshSuppliers: fetchSuppliers,
    refreshPurchaseOrders: fetchPurchaseOrders,
  };
}
