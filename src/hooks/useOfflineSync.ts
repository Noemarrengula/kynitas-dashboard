import { useEffect, useRef, useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useStore } from '@/store/useStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  getPendingSales,
  removePendingSale,
  getOnline,
  countPendingSales,
  type PendingSale,
} from '@/lib/offline';
import { toast } from './use-toast';

export function useOfflineSync() {
  const { currentBusiness } = useBusiness();
  const flushingRef = useRef(false);
  const [online, setOnline] = useState(getOnline());
  const [pendingCount, setPendingCount] = useState(
    currentBusiness?.id ? countPendingSales(currentBusiness.id) : 0
  );

  useEffect(() => {
    setPendingCount(currentBusiness?.id ? countPendingSales(currentBusiness.id) : 0);
  }, [currentBusiness?.id]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      toast({ title: 'Online', description: 'Sincronizando dados pendentes...' });
    };
    const goOffline = () => {
      setOnline(false);
      toast({
        title: 'Modo offline',
        description: 'As vendas serão guardadas localmente e sincronizadas depois.',
        variant: 'destructive',
      });
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (online && currentBusiness?.id) {
      syncPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, currentBusiness?.id]);

  const isNetworkError = (err: { message?: string } | null): boolean => {
    if (!err) return false;
    return /fetch|network|offline|failed to fetch/i.test(err.message || '');
  };

  const reloadSales = async (businessId: string) => {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (data) {
      const transformed = data.map(sale => ({
        id: sale.id,
        saleNumber: sale.sale_number,
        items: sale.items,
        total: sale.total,
        paymentDetails: sale.payment_details || {},
        tableId: sale.table_id,
        table_number: sale.table_number,
        table_name: sale.table_name,
        table_customer_name: sale.table_customer_name,
        customerId: sale.customer_id,
        createdAt: sale.created_at,
        isCredit: sale.is_credit ?? undefined,
        creditId: sale.credit_id ?? undefined,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useStore.getState().setSales(transformed as any);
    }
  };

  const syncOne = async (businessId: string, sale: PendingSale) => {
    const { count } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    const payload = {
      business_id: businessId,
      sale_number: (count || 0) + 1,
      items: sale.items as unknown as Record<string, unknown>,
      total: sale.total,
      payment_details: (sale.paymentDetails || {}) as unknown as Record<string, unknown>,
      table_id: sale.tableId || null,
      table_number: sale.table_number || null,
      table_name: sale.table_name || null,
table_customer_name: sale.table_customer_name || null,
        customer_id: sale.customerId || null,
        created_at: sale.queuedAt,
      };

    const { error } = await supabase.from('sales').insert(payload);
    if (error) throw error;
  };

  const syncPending = async (): Promise<number> => {
    if (!currentBusiness?.id || !isSupabaseConfigured()) return pendingCount;
    if (flushingRef.current) return pendingCount;

    const pending = getPendingSales(currentBusiness.id);
    if (pending.length === 0) return pendingCount;

    flushingRef.current = true;
    let synced = 0;
    try {
      const sorted = [...pending].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
      for (const sale of sorted) {
        try {
          await syncOne(currentBusiness.id, sale);
          removePendingSale(currentBusiness.id, sale.id);
          synced++;
        } catch (err) {
          const e = err as { message?: string };
          if (!isNetworkError(e)) {
            // erro de negócio (ex.: stock) — remove para não bloquear a fila
            removePendingSale(currentBusiness.id, sale.id);
            synced++;
          } else {
            break; // rede caiu a meio: parar e tentar depois
          }
        }
      }

      const remaining = countPendingSales(currentBusiness.id);
      setPendingCount(remaining);

      if (synced > 0) {
        await reloadSales(currentBusiness.id);
        toast({
          title: 'Sincronizado',
          description: `${synced} venda${synced !== 1 ? 's' : ''} enviada${synced !== 1 ? 's' : ''} com sucesso.`,
        });
      }
      return remaining;
    } catch (err) {
      console.error('[OFFLINE] Falha na sincronização:', err);
      return pendingCount;
    } finally {
      flushingRef.current = false;
    }
  };

  return { online, pendingCount, syncPending };
}