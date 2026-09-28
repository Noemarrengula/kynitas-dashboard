import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useStore } from '@/store/useStore';

export interface OpenShiftState {
  loading: boolean;
  open: boolean;
  expectedTotal: number | null;
}

export function useOpenShift(): OpenShiftState {
  const { currentBusiness } = useBusiness();
  const sales = useStore(s => s.sales);
  const [state, setState] = useState<OpenShiftState>({ loading: true, open: false, expectedTotal: null });

  useEffect(() => {
    let active = true;
    const loadShift = async () => {
      if (!currentBusiness?.id) {
        if (active) setState({ loading: false, open: false, expectedTotal: null });
        return;
      }
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) {
          if (active) setState({ loading: false, open: false, expectedTotal: null });
          return;
        }

        const shift = data[0];
        const openedAt = new Date(shift.opened_at).getTime();

        const totals = { cash: 0, mpesa: 0, emola: 0, card: 0, change: 0 };
        sales.forEach(s => {
          const t = new Date(s.createdAt).getTime();
          if (t < openedAt) return;
          const pd = s.paymentDetails || {};
          totals.cash += pd.cash || 0;
          totals.mpesa += pd.mpesa || 0;
          totals.emola += pd.emola || 0;
          totals.card += pd.card || 0;
          totals.change += pd.change || 0;
        });

        const expectedTotal =
          (shift.opening_amount || 0) +
          totals.cash - totals.change + totals.mpesa + totals.emola + totals.card;

        if (active) setState({ loading: false, open: true, expectedTotal });
      } catch {
        if (active) setState({ loading: false, open: false, expectedTotal: null });
      }
    };

    loadShift();
    return () => {
      active = false;
    };
  }, [currentBusiness?.id, sales]);

  return state;
}