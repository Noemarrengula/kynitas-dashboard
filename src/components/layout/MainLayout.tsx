import { Outlet, Navigate } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useStore } from '@/store/useStore';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const sidebarOpen = useStore(s => s.sidebarOpen);
  useRealtimeSync();
  const { online, pendingCount, syncPending } = useOfflineSync();

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
        sidebarOpen ? "md:ml-[260px]" : "md:ml-20"
      )}>
        <Topbar />
        {(!online || pendingCount > 0) && (
          <div className={cn(
            "flex items-center justify-between gap-3 border-b px-4 py-2 text-xs",
            online ? "bg-warning/10 text-warning border-warning/20" : "bg-destructive/10 text-destructive border-destructive/20"
          )}>
            <span className="flex items-center gap-2">
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {online
                ? t('offline.pending', { count: pendingCount })
                : t('offline.noConnection')}
            </span>
            {online && pendingCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => syncPending()}>
                {t('offline.syncNow')}
              </Button>
            )}
          </div>
        )}
        <main className="p-3 md:p-5 animate-fade-in">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
