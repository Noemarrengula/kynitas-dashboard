import { Search, User, Menu, LogOut, Building2, Check, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { usePermissions, ROLE_LABELS } from '@/hooks/usePermissions';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ThemeToggle } from '@/components/providers/ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import { useStore } from '@/store/useStore';
import { ALLOWED_LANGUAGES, type Language } from '@/i18n/dictionaries';

export function Topbar() {
  const { user, signOut } = useAuth();
  const { currentBusiness, businesses, switchBusiness } = useBusiness();
  const { role } = usePermissions();
  const { language, setLanguage, t } = useI18n();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { sidebarOpen, setSidebarOpen } = useStore();
  const criticalStockCount = 0; // TODO: Get from database

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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative flex-1 max-w-md min-w-0 hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('topbar.search')}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 h-9 text-sm w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Business Selector */}
        {businesses.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">{currentBusiness?.name || t('topbar.selectBusiness')}</span>
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
                  <span className="text-sm">{b.name}</span>
                  {b.id === currentBusiness?.id && (
                    <Check className="h-4 w-4 text-primary" />
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
              <span className="hidden sm:inline text-sm uppercase">{language}</span>
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

        {/* Role Badge */}
        {role && (
          <Badge variant={roleVariant()} className="hidden sm:inline-flex text-xs">
            {t(`role.${role}`) || ROLE_LABELS[role] || role}
          </Badge>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationCenter />

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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div className="flex flex-col">
                <span className="font-medium">{user?.user_metadata?.name || t('topbar.user')}</span>
                <span className="text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onClick={() => setShowLogoutDialog(true)}>
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
