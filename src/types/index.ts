export * from './domains/product';
export * from './domains/sales';
export * from './domains/credit';
export * from './domains/transaction';
export * from './domains/user';
export * from './domains/invoice';
export * from './domains/purchase';

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
