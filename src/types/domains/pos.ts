import type { OrderItem } from './sales';

export interface PosCustomer {
  id: string;
  name: string;
  phone?: string;
  loyaltyPoints?: number;
  creditLimit?: number;
  currentBalance?: number;
}

export interface PosTableRef {
  id: string;
  number: number;
  name?: string;
  customerName?: string;
  linkedOrderId?: string;
}

export interface CartItem extends OrderItem {
  uid: string;
  note?: string;
}

export interface SaleDiscount {
  type: 'percent' | 'amount';
  value: number;
}

export interface SuspendedSale {
  id: string;
  ref: string;
  items: CartItem[];
  discount: SaleDiscount;
  customer: PosCustomer | null;
  table: PosTableRef | null;
  total: number;
  createdAt: string;
}