export * from './domains/product';
export * from './domains/sales';
export * from './domains/credit';
export * from './domains/transaction';
export * from './domains/user';
export * from './domains/invoice';

export interface DashboardMetrics {
  totalSales: number;
  ordersCount: number;
  criticalStockCount: number;
  topProducts: { name: string; quantity: number }[];
  salesByDay: { day: string; sales: number }[];
}

export interface ExpenseCategory {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  created_at: Date;
}

export interface AccountPayable {
  id: string;
  business_id: string;
  category_id?: string;
  description: string;
  amount: number;
  due_date: Date;
  payment_date?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DREReport {
  business_id: string;
  period: Date;
  total_revenue: number;
  total_costs: number;
  total_expenses: number;
  gross_profit: number;
  net_profit: number;
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: import('./domains/product').Product;
        Insert: Omit<import('./domains/product').Product, 'id'>;
        Update: Partial<Omit<import('./domains/product').Product, 'id'>>;
      };
      ingredients: {
        Row: import('./domains/ingredient').Ingredient;
        Insert: Omit<import('./domains/ingredient').Ingredient, 'id'>;
        Update: Partial<Omit<import('./domains/ingredient').Ingredient, 'id'>>;
      };
      orders: {
        Row: import('./domains/sales').Order;
        Insert: Omit<import('./domains/sales').Order, 'id'>;
        Update: Partial<Omit<import('./domains/sales').Order, 'id'>>;
      };
      sales: {
        Row: import('./domains/transaction').Sale;
        Insert: Omit<import('./domains/transaction').Sale, 'id'>;
        Update: Partial<Omit<import('./domains/transaction').Sale, 'id'>>;
      };
      users: {
        Row: import('./domains/user').User;
        Insert: Omit<import('./domains/user').User, 'id'>;
        Update: Partial<Omit<import('./domains/user').User, 'id'>>;
      };
      invoices: {
        Row: import('./domains/invoice').Invoice;
        Insert: Omit<import('./domains/invoice').Invoice, 'id'>;
        Update: Partial<Omit<import('./domains/invoice').Invoice, 'id'>>;
      };
      invoice_series: {
        Row: import('./domains/invoice').InvoiceSeries;
        Insert: Omit<import('./domains/invoice').InvoiceSeries, 'id'>;
        Update: Partial<Omit<import('./domains/invoice').InvoiceSeries, 'id'>>;
      };
    };
  };
}

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

export interface PurchaseOrder {
  id: string;
  business_id: string;
  supplier_id: string;
  order_number: string;
  order_date: string;
  expected_delivery?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  items: Array<{
    ingredient_id: string;
    ingredient_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseReceipt {
  id: string;
  business_id: string;
  purchase_order_id?: string;
  supplier_id: string;
  receipt_date: string;
  items: Array<{
    ingredient_id: string;
    ingredient_name: string;
    quantity: number;
  }>;
  total: number;
  invoice_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  packages?: PackageType[];
}

export interface PackageType {
  id: string;
  name: string;
  quantity: number;
  costPerPackage: number;
}
