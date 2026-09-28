import type { SuspendedSale } from '@/types/domains/pos';

const KEY_PREFIX = 'erp-suspended-sales';

export function suspendedSalesKey(businessId: string): string {
  return `${KEY_PREFIX}:${businessId}`;
}

export function getSuspendedSales(businessId: string | undefined): SuspendedSale[] {
  if (!businessId) return [];
  try {
    const raw = localStorage.getItem(suspendedSalesKey(businessId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Erro ao ler vendas suspensas:', e);
    return [];
  }
}

export function saveSuspendedSales(businessId: string, sales: SuspendedSale[]): void {
  try {
    localStorage.setItem(suspendedSalesKey(businessId), JSON.stringify(sales));
  } catch (e) {
    console.error('Erro ao guardar vendas suspensas:', e);
  }
}

export function addSuspendedSale(businessId: string, sale: SuspendedSale): void {
  const sales = getSuspendedSales(businessId);
  sales.unshift(sale);
  saveSuspendedSales(businessId, sales);
}

export function removeSuspendedSale(businessId: string, id: string): SuspendedSale[] {
  const sales = getSuspendedSales(businessId).filter(s => s.id !== id);
  saveSuspendedSales(businessId, sales);
  return sales;
}