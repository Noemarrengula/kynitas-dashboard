import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { BusinessRole } from '@/types/domains/user';

interface PermissionGateProps {
  permission: string;
  role?: BusinessRole;
  children: ReactNode;
}

export function PermissionGate({ permission, role, children }: PermissionGateProps) {
  const { can, role: currentRole } = usePermissions();

  if (role && currentRole !== role) return null;
  if (!can(permission)) return null;

  return <>{children}</>;
}