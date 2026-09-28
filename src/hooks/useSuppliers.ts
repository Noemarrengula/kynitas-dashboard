import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useStore } from '@/store/useStore';
import {
  Supplier,
  PurchaseOrder,
  PurchaseReceipt,
  Loss,
  LossInput,
  ReceivePurchaseResult,
} from '@/types';
import { sanitizeObject } from '@/lib/sanitize';

interface HookResult<T> {
  data: T | null;
  error: Error | null;
}

interface ReceiveResult {
  data: ReceivePurchaseResult | null;
  error: Error | null;
}

export function useSuppliers() {
  const { currentBusiness } = useBusiness();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
  const [losses, setLosses] = useState<Loss[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
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
  }, [currentBusiness?.id]);

  const fetchPurchaseOrders = useCallback(async () => {
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
  }, [currentBusiness?.id]);

  const fetchPurchaseReceipts = useCallback(async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from('purchase_receipts')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('receipt_date', { ascending: false });

      if (!error && data) {
        setPurchaseReceipts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar receções:', err);
    }
  }, [currentBusiness?.id]);

  const fetchLosses = useCallback(async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from('losses')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('loss_date', { ascending: false });

      if (!error && data) {
        setLosses(data);
      }
    } catch (err) {
      console.error('Erro ao buscar perdas:', err);
    }
  }, [currentBusiness?.id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchSuppliers(),
      fetchPurchaseOrders(),
      fetchPurchaseReceipts(),
      fetchLosses(),
    ]);
    setLoading(false);
  }, [fetchSuppliers, fetchPurchaseOrders, fetchPurchaseReceipts, fetchLosses]);

  useEffect(() => {
    if (currentBusiness?.id) {
      loadAll();
    }
  }, [currentBusiness?.id]);

  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>): Promise<HookResult<Supplier>> => {
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
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, suppliers]);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>): Promise<HookResult<null>> => {
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
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, suppliers]);

  const deleteSupplier = useCallback(async (id: string): Promise<HookResult<null>> => {
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
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, suppliers]);

  const createPurchaseOrder = useCallback(async (po: Omit<PurchaseOrder, 'id' | 'business_id' | 'order_number' | 'created_at' | 'updated_at'>): Promise<HookResult<PurchaseOrder>> => {
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
          order_number: poNumber,
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
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, purchaseOrders]);

  const updatePurchaseOrder = useCallback(async (id: string, updates: Partial<PurchaseOrder>): Promise<HookResult<null>> => {
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
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, purchaseOrders]);

  const cancelPurchaseOrder = useCallback(async (id: string): Promise<HookResult<null>> => {
    return updatePurchaseOrder(id, { status: 'cancelled' });
  }, [updatePurchaseOrder]);

  const receivePurchaseOrder = useCallback(async (poId: string, items: Array<Record<string, any>>, invoiceNumber?: string): Promise<ReceiveResult> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };

      const { data, error } = await supabase.rpc('receive_purchase_order', {
        po_id: poId,
        received_items: items,
        invoice_num: invoiceNumber,
      });

      if (error) throw error;

      const result = (data ?? null) as ReceivePurchaseResult | null;

      if (result) {
        // Sincroniza a store local com o que o RPC executou (sem double-writes)
        const store = useStore.getState();
        const prodQty: Record<string, number> = {};
        const ingQty: Record<string, number> = {};

        (result.movements || []).forEach((m) => {
          const qty = Number(m.quantity) || 0;
          if (m.product_id) {
            store.addStockMovement({
              id: m.id,
              productId: m.product_id,
              ingredientId: undefined,
              type: (m.type as 'entry' | 'exit' | 'sale') || 'entry',
              quantity: Math.abs(qty),
              reason: m.reason || '',
              createdAt: m.created_at ? new Date(m.created_at) : new Date(),
            });
            prodQty[m.product_id] = (prodQty[m.product_id] || 0) + Math.abs(qty);
          }
          if (m.ingredient_id) {
            store.addStockMovement({
              id: m.id,
              productId: undefined,
              ingredientId: m.ingredient_id,
              type: (m.type as 'entry' | 'exit' | 'sale') || 'entry',
              quantity: Math.abs(qty),
              reason: m.reason || '',
              createdAt: m.created_at ? new Date(m.created_at) : new Date(),
            });
            ingQty[m.ingredient_id] = (ingQty[m.ingredient_id] || 0) + Math.abs(qty);
          }
        });

        Object.entries(prodQty).forEach(([pid, qty]) => {
          const current = store.products.find(p => p.id === pid)?.stock ?? 0;
          store.updateProduct(pid, { stock: Number((Number(current) + qty).toFixed(2)) });
        });
        Object.entries(ingQty).forEach(([iid, qty]) => {
          const current = store.ingredients.find(i => i.id === iid)?.stock ?? 0;
          store.updateIngredient(iid, { stock: Number((Number(current) + qty).toFixed(2)) });
        });

        // Adiciona a receção localmente
        const newReceipt: PurchaseReceipt = {
          id: result.receipt_id || `rec-${Date.now()}`,
          business_id: currentBusiness.id,
          purchase_order_id: poId,
          receipt_date: new Date().toISOString().slice(0, 10),
          receipt_number: result.receipt_number,
          items: items.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            ingredient_id: it.ingredient_id,
            ingredient_name: it.ingredient_name,
            ordered_quantity: Number(it.ordered_quantity) || 0,
            received_quantity: Number(it.received_quantity) || Number(it.quantity) || 0,
            quantity: Number(it.quantity) || 0,
            damaged_quantity: Number(it.damaged_quantity) || 0,
            unit_price: Number(it.unit_price) || 0,
          })),
          total: items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0),
          invoice_number: invoiceNumber,
          created_at: new Date().toISOString(),
        };
        setPurchaseReceipts([newReceipt, ...purchaseReceipts]);

        // Actualiza o estado da ordem em cache
        if (result.status) {
          setPurchaseOrders(purchaseOrders.map(po => po.id === poId ? { ...po, status: result.status as PurchaseOrder['status'] } : po));
        }
      }

      await fetchPurchaseOrders();
      await fetchPurchaseReceipts();
      return { data: result, error: null };
    } catch (err: unknown) {
      console.error('Erro ao receber ordem de compra:', err);
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, fetchPurchaseOrders, fetchPurchaseReceipts, purchaseOrders, purchaseReceipts]);

  const addLoss = useCallback(async (input: LossInput): Promise<HookResult<Loss>> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };
      if ((!input.product_id && !input.ingredient_id) || input.quantity <= 0) {
        return { data: null, error: new Error('Indique um item e uma quantidade válida') };
      }

      const { data, error } = await supabase
        .from('losses')
        .insert([{
          business_id: currentBusiness.id,
          product_id: input.product_id || null,
          ingredient_id: input.ingredient_id || null,
          quantity: input.quantity,
          unit: input.unit || null,
          reason: input.reason,
          loss_date: input.loss_date || new Date().toISOString().slice(0, 10),
          notes: input.notes || null,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setLosses([data, ...losses]);
        return { data, error: null };
      }
      return { data: null, error: null };
    } catch (err: unknown) {
      console.error('Erro ao registar perda:', err);
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, losses]);

  const updateLossStatus = useCallback(async (id: string, status: Loss['status']): Promise<HookResult<null>> => {
    try {
      if (!currentBusiness?.id) return { data: null, error: new Error('Negócio não encontrado') };

      const { error } = await supabase
        .from('losses')
        .update({ status })
        .eq('id', id)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;

      setLosses(losses.map(l => l.id === id ? { ...l, status } : l));
      return { data: null, error: null };
    } catch (err: unknown) {
      console.error('Erro ao atualizar perda:', err);
      return { data: null, error: err as Error };
    }
  }, [currentBusiness?.id, losses]);

  const confirmLoss = useCallback(async (id: string): Promise<HookResult<null>> => {
    return updateLossStatus(id, 'confirmed');
  }, [updateLossStatus]);

  const cancelLoss = useCallback(async (id: string): Promise<HookResult<null>> => {
    return updateLossStatus(id, 'cancelled');
  }, [updateLossStatus]);

  return {
    suppliers,
    purchaseOrders,
    purchaseReceipts,
    losses,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    createPurchaseOrder,
    updatePurchaseOrder,
    cancelPurchaseOrder,
    receivePurchaseOrder,
    addLoss,
    confirmLoss,
    cancelLoss,
    refreshSuppliers: fetchSuppliers,
    refreshPurchaseOrders: fetchPurchaseOrders,
    refreshPurchaseReceipts: fetchPurchaseReceipts,
    refreshLosses: fetchLosses,
    refreshAll: loadAll,
  };
}