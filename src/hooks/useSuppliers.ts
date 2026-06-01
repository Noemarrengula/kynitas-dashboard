import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { Supplier, PurchaseOrder } from '@/types';

export function useSuppliers() {
  const { currentBusiness } = useBusinessContext();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBusiness?.id) {
      fetchSuppliers();
      fetchPurchaseOrders();
    }
  }, [currentBusiness?.id]);

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
    setLoading(false);
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

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
    if (!currentBusiness?.id) return;

    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ ...supplier, business_id: currentBusiness.id }])
      .select()
      .single();

    if (!error && data) {
      setSuppliers([...suppliers, data]);
      return data;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const { error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setSuppliers(suppliers.map(s => s.id === id ? { ...s, ...updates } : s));
    }
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (!error) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };

  const createPurchaseOrder = async (po: Omit<PurchaseOrder, 'id' | 'business_id' | 'order_number' | 'created_at' | 'updated_at'>) => {
    if (!currentBusiness?.id) return;

    const { data: poNumber } = await supabase.rpc('generate_po_number', {
      business_uuid: currentBusiness.id
    });

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{
        ...po,
        business_id: currentBusiness.id,
        order_number: poNumber
      }])
      .select()
      .single();

    if (!error && data) {
      setPurchaseOrders([data, ...purchaseOrders]);
      return data;
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    const { error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setPurchaseOrders(purchaseOrders.map(po => po.id === id ? { ...po, ...updates } : po));
    }
  };

  const receivePurchaseOrder = async (poId: string, items: any[], invoiceNumber?: string) => {
    const { data, error } = await supabase.rpc('receive_purchase_order', {
      po_id: poId,
      received_items: items,
      invoice_num: invoiceNumber
    });

    if (!error) {
      await fetchPurchaseOrders();
      return data;
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
