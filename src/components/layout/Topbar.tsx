import {
  Building2,
  Check,
  ChevronDown,
  Languages,
  LogOut,
  Menu,
  Settings,
  UserCircle2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { usePermissions, ROLE_LABELS } from '@/hooks/usePermissions';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ThemeToggle } from '@/components/providers/ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useStore } from '@/store/useStore';
import { ALLOWED_LANGUAGES, type Language } from '@/i18n/dictionaries';

function OnlineStatus() {
  const { online, pendingCount } = useOfflineSync();
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "hidden md:flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        online
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      )}
      title={online ? t('topbar.online') : t('topbar.offline')}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span className="text-xs font-medium">{online ? t('topbar.online') : t('topbar.offline')}</span>
      {pendingCount > 0 && (
        <Badge
          variant="secondary"
          className="h-4 min-w-4 px-1 text-[9px] font-bold tabular-nums"
        >
          {pendingCount}
        </Badge>
      )}
    </div>
  );
}

export function Topbar() {
  const { user, signOut } = useAuth();
  const { currentBusiness, businesses, switchBusiness } = useBusiness();
  const { role, can } = usePermissions();
  const { language, setLanguage, t } = useI18n();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { sidebarOpen, setSidebarOpen } = useStore();
  const navigate = useNavigate();

  const LANG_LABELS: Record<Language, string> = {
    pt: t('lang.pt'),
    en: t('lang.en'),
  };

  const roleVariant = () => {
    switch (role) {
      case 'admin': return 'destructive' as const;
      case 'supervisor': return 'secondary' as const;
      case 'caixa': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-4 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Estado Online/Offline */}
        <OnlineStatus />

        {/* Business Selector */}
        {businesses.length > 1 && currentBusiness && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm max-w-40 truncate">{currentBusiness.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">{t('topbar.selectBar')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {businesses.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => switchBusiness(b.id)}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm truncate">{b.name}</span>
                  {b.id === currentBusiness?.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9 px-2.5" title={t('settings.language')}>
              <Languages className="h-4 w-4" />
              <span className="hidden uppercase text-xs font-semibold tracking-wide">{language}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">{t('settings.language')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALLOWED_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang}
                onClick={() => setLanguage(lang)}
                className="flex items-center justify-between"
              >
                <span className="text-sm">{LANG_LABELS[lang]}</span>
                {lang === language && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <NotificationCenter />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Role Badge */}
        {role && (
          <Badge variant={roleVariant()} className="hidden lg:inline-flex text-xs">
            {t(`role.${role}`) || ROLE_LABELS[role] || role}
          </Badge>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{user?.user_metadata?.name || t('topbar.user')}</span>
                <span className="text-muted-foreground font-normal truncate">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {can('configuracoes') && (
              <>
                <DropdownMenuItem className="text-xs" onClick={() => navigate('/settings')}>
                  <UserCircle2 className="h-4 w-4 mr-2" />
                  {t('topbar.myProfile')}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('topbar.preferences')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="text-xs text-destructive focus:text-destructive"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title={t('topbar.confirmLogoutTitle')}
        description={t('topbar.confirmLogoutDescription')}
        onConfirm={signOut}
      />
    </header>
  );
}