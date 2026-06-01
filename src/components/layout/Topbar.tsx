import { Bell, Search, User, Menu, LogOut, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
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

export function Topbar() {
  const { user, signOut } = useAuth();
  const { currentBusiness, businesses, switchBusiness } = useBusiness();
  const { role, isSuperAdmin } = usePermissions();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const criticalStockCount = 0; // TODO: Get from database

  const roleVariant = () => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'owner': return 'default' as const;
      case 'manager': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquisar..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Business Selector */}
        {(isSuperAdmin || businesses.length > 1) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">{currentBusiness?.name || 'Selecionar'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Selecionar Bar</DropdownMenuLabel>
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

        {/* Role Badge */}
        {role && (
          <Badge variant={roleVariant()} className="hidden sm:inline-flex text-xs">
            {ROLE_LABELS[role] || role}
          </Badge>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {criticalStockCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] bg-destructive">
                  {criticalStockCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs">Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
                <span className="font-medium">{user?.user_metadata?.name || 'Utilizador'}</span>
                <span className="text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onClick={() => setShowLogoutDialog(true)}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Confirmar saída"
        description="Tem a certeza que deseja sair?"
        onConfirm={signOut}
      />
    </header>
  );
}
