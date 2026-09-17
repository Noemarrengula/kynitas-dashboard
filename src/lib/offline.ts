// =============================================================================
// Camada offline: cache de leitura + fila de vendas pendentes
// Persistência via localStorage (adapter simple; trocável por IndexedDB).
// =============================================================================

const businessQueueKey = (businessId: string) => `erp-offline-sales:${businessId}`;
const cacheKey = (businessId: string, table: string) => `erp-cache:${businessId}:${table}`;

export function getOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    try {
      // quota excedida: limpa caches mais antigos e tenta de novo
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('erp-cache:')) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // sem espaço, ignora (a fila é prioritária e guarda-se primeiro)
    }
  }
}

// ---------------------------------------------------------------------------
// CACHE DE LEITURA (seed quando offline)
// ---------------------------------------------------------------------------
export function writeCache<T>(businessId: string, table: string, rows: T[]): void {
  writeJSON(cacheKey(businessId, table), {
    cachedAt: new Date().toISOString(),
    rows,
  });
}

export function readCache<T>(businessId: string, table: string): { cachedAt: string; rows: T[] } | null {
  return readJSON<{ cachedAt: string; rows: T[] } | null>(cacheKey(businessId, table), null);
}

// ---------------------------------------------------------------------------
// FILA DE VENDAS PENDENTES
// ---------------------------------------------------------------------------
export interface PendingSale {
  id: string;
  businessId: string;
  saleNumber?: number;
  items: unknown;
  total: number;
  paymentDetails: unknown;
  tableId?: string;
  table_number?: number;
  table_name?: string;
  table_customer_name?: string;
  customerId?: string;
  queuedAt: string;
}

export function getPendingSales(businessId: string): PendingSale[] {
  return readJSON<PendingSale[]>(businessQueueKey(businessId), []);
}

export function enqueuePendingSale(businessId: string, sale: PendingSale): void {
  const queue = getPendingSales(businessId);
  if (!queue.some(s => s.id === sale.id)) {
    writeJSON(businessQueueKey(businessId), [...queue, sale]);
  }
}

export function removePendingSale(businessId: string, saleId: string): void {
  writeJSON(businessQueueKey(businessId), getPendingSales(businessId).filter(s => s.id !== saleId));
}

export function countPendingSales(businessId: string): number {
  return businessId ? getPendingSales(businessId).length : 0;
}