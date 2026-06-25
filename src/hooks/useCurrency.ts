import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatCurrency as fc } from '@/lib/utils';

export function useCurrency() {
  const currency = useStore(s => s.currency);

  return useMemo(() => ({
    currency,
    formatCurrency: (value: number) => fc(value, currency),
    locale: currency === 'AOA' ? 'pt-AO' : currency === 'USD' ? 'en-US' : 'pt-MZ',
  }), [currency]);
}
