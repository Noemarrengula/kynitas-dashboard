export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'manager' | 'waiter' | 'cashier' | 'staff';
  avatar?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    role?: string;
  };
}

export type BusinessRole = 'super_admin' | 'owner' | 'manager' | 'staff';

export interface BusinessUser {
  user_id: string;
  email: string;
  name: string;
  role: BusinessRole;
  active: boolean;
  business_id: string;
  business_name: string;
  created_at: string;
}
