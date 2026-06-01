import { useBusiness } from "@/contexts/BusinessContext";
import type { BusinessRole } from "@/types/domains/user";

export type Permission = 
  | 'manage_business'
  | 'manage_users'
  | 'view_reports'
  | 'manage_products'
  | 'manage_stock'
  | 'manage_settings'
  | 'view_sales'
  | 'manage_employees'
  | 'manage_financial'
  | 'manage_credits';

const ROLE_PERMISSIONS: Record<BusinessRole, Permission[]> = {
  super_admin: [
    'manage_business',
    'manage_users',
    'view_reports',
    'manage_products',
    'manage_stock',
    'manage_settings',
    'view_sales',
    'manage_employees',
    'manage_financial',
    'manage_credits',
  ],
  owner: [
    'view_reports',
    'manage_products',
    'manage_stock',
    'manage_settings',
    'view_sales',
    'manage_employees',
    'manage_financial',
    'manage_credits',
  ],
  manager: [
    'view_reports',
    'manage_products',
    'manage_stock',
    'view_sales',
    'manage_employees',
    'manage_credits',
  ],
  staff: [
    'view_sales',
  ],
};

export function usePermissions() {
  const { currentBusinessUser } = useBusiness();
  const role = currentBusinessUser?.role || 'staff';

  const can = (permission: Permission): boolean => {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };

  const isSuperAdmin = role === 'super_admin';
  const isOwner = role === 'owner' || role === 'super_admin';
  const isManager = role === 'manager' || role === 'owner' || role === 'super_admin';

  return {
    role,
    isSuperAdmin,
    isOwner,
    isManager,
    can,
    permissions: ROLE_PERMISSIONS[role] || [],
  };
}

export const ROLE_LABELS: Record<BusinessRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Proprietário',
  manager: 'Gerente',
  staff: 'Funcionário',
};
