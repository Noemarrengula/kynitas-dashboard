import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { user, loading } = useAuth();
  const { sidebarOpen } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn(
        "transition-all duration-200",
        "md:ml-56",
        sidebarOpen && "md:ml-56"
      )}>
        <Topbar />
        <main className="p-4 md:p-5 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
