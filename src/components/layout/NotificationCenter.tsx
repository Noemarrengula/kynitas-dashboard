import { useEffect, useRef } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, X, ExternalLink, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRealtimeNotifications, Notification } from '@/hooks/useRealtimeNotifications';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

const iconMap = {
  info: { icon: Info, color: 'text-blue-500 bg-blue-500/10' },
  success: { icon: CheckCircle, color: 'text-green-500 bg-green-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
  error: { icon: X, color: 'text-red-500 bg-red-500/10' },
};

const typeColors: Record<string, string> = {
  low_stock: 'border-l-amber-500',
  goal_achieved: 'border-l-green-500',
  new_sale: 'border-l-blue-500',
  system: 'border-l-muted',
};

export function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useRealtimeNotifications();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(notifications.length);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
  }, []);

  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      const latest = notifications[0];
      if (latest.type === 'warning' || latest.type === 'error') {
        audioRef.current?.play().catch(() => {});
      }
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  const handleAction = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.action?.onClick) notif.action.onClick();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] bg-destructive">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <DropdownMenuLabel className="text-xs p-0">Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={markAllAsRead}>
              Marcar todas lidas
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhuma notificação
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {notifications.slice(0, 20).map(notif => {
                const cfg = iconMap[notif.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    className={`flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${notif.read ? 'opacity-60' : ''} ${typeColors[notif.category || 'system'] || 'border-l-transparent'}`}
                    onClick={() => { markAsRead(notif.id); }}
                  >
                    <div className={`p-1.5 rounded-full shrink-0 ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notif.read ? '' : 'font-medium'}`}>{notif.title}</p>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(notif.timestamp).toLocaleString('pt-MZ')}
                      </p>
                    </div>
                    {notif.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs shrink-0"
                        onClick={e => { e.stopPropagation(); handleAction(notif); }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {notif.action.label}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
