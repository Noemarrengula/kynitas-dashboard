export interface PaymentDetails {
  cash: number;
  mpesa: number;
  emola: number;
  card: number;
  total: number;
  change: number;
}

export interface Sale {
  id: string;
  saleNumber?: number;
  items: import('./sales').OrderItem[];
  total: number;
  paymentDetails: PaymentDetails;
  createdAt: Date;
  tableId?: string;
  table_number?: number;
  table_name?: string;
  table_customer_name?: string;
  customerId?: string;
  isCredit?: boolean;
  creditId?: string;
}

export interface StockMovement {
  id: string;
  productId?: string;
  ingredientId?: string;
  type: 'entry' | 'exit' | 'sale';
  quantity: number;
  reason: string;
  createdAt: Date;
}
