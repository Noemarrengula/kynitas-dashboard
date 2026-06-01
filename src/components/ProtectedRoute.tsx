import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useBusiness } from '@/contexts/BusinessContext';
import { Loader2 } from 'lucide-react';
import type { Permission } from '@/hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requireSuperAdmin,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: businessLoading } = useBusiness();
  const { can, isSuperAdmin } = usePermissions();

  if (authLoading || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
