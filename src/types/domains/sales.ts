export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid';
  total: number;
  createdAt: Date;
  paymentMethod?: 'mpesa' | 'cash' | 'card';
}

export interface OrderItem {
  productId: string;
  product: import('./product').Product;
  quantity: number;
  subtotal: number;
}

export interface Table {
  id: string;
  number: number;
  name?: string;
  customer_name?: string;
  status: 'free' | 'occupied' | 'awaiting_payment';
  currentOrderId?: string;
  opened_at?: Date;
  closed_at?: Date;
}
