export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'caixa';
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

export type BusinessRole = 'admin' | 'supervisor' | 'caixa';

export interface BusinessUser {
  id?: string;
  user_id: string;
  email: string;
  name: string;
  role: BusinessRole;
  active: boolean;
  business_id: string;
  business_name: string;
  created_at: string;
}