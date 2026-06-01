export interface Credit {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: import('./sales').OrderItem[];
  total: number;
  amountPaid: number;
  remainingBalance: number;
  status: 'pending' | 'partial' | 'paid';
  createdAt: Date;
  updatedAt: Date;
  lastPaymentAt?: Date;
  notes?: string;
  saleId?: string;
}
