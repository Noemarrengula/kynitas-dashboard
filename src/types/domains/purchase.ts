export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  nuit?: string;
  payment_terms: number;
  credit_limit: number;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  product_id?: string;
  product_name?: string;
  ingredient_id?: string;
  ingredient_name?: string;
  quantity: number;
  unit_price: number;
  iva_rate?: number;
  discount_percent?: number;
  total?: number;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'partial'
  | 'received'
  | 'cancelled';

export interface PurchaseOrder {
  id: string;
  business_id: string;
  supplier_id: string;
  order_number: string;
  order_date: string;
  expected_delivery?: string;
  status: PurchaseOrderStatus;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseReceiptItem {
  product_id?: string;
  product_name?: string;
  ingredient_id?: string;
  ingredient_name?: string;
  /** Quantidade encomendada nessa linha */
  ordered_quantity?: number;
  /** Quantidade recebida fisicamente (aceite + danificada) */
  received_quantity?: number;
  /** Quantidade aceite (entra no stock disponível) */
  quantity: number;
  damaged_quantity?: number;
  unit_price?: number;
  total?: number;
}

export interface PurchaseReceipt {
  id: string;
  business_id: string;
  purchase_order_id?: string;
  supplier_id?: string;
  receipt_date: string;
  receipt_number?: string;
  items: PurchaseReceiptItem[];
  total: number;
  invoice_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export type LossStatus = 'pending' | 'confirmed' | 'cancelled';

export type LossReason =
  | 'deterioração'
  | 'quebra'
  | 'validade'
  | 'danificado'
  | 'outro';

export interface Loss {
  id: string;
  business_id: string;
  product_id?: string;
  ingredient_id?: string;
  quantity: number;
  unit?: string;
  reason: string;
  loss_date: string;
  notes?: string;
  status: LossStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LossInput {
  product_id?: string;
  ingredient_id?: string;
  quantity: number;
  reason: string;
  loss_date?: string;
  notes?: string;
}

export interface ReceivePurchaseResult {
  receipt_id?: string;
  receipt_number?: string;
  status?: PurchaseOrderStatus;
  movements?: StockMovementLike[];
}

export interface StockMovementLike {
  id: string;
  product_id?: string;
  ingredient_id?: string;
  type: string;
  quantity: number;
  reason?: string;
  created_at?: string;
}