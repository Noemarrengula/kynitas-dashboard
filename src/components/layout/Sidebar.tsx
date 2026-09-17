import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, 
  TrendingUp,
  Wine, 
  UtensilsCrossed, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  History,
  Warehouse,
  DollarSign,
  UserCog,
  UserCircle,
  X,
  FileText,
  Target,
  HardDrive,
  ClipboardList,
  ChefHat,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { usePermissions, type Feature } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { useEffect } from 'react';

const menuItems: { icon: typeof LayoutDashboard; labelKey: string; path: string; feature: Feature }[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/dashboard', feature: 'dashboard' },
  { icon: TrendingUp, labelKey: 'nav.executive', path: '/executive', feature: 'relatorios' },
  { icon: Wine, labelKey: 'nav.drinks', path: '/products/drinks', feature: 'produtos_visualizar' },
  { icon: UtensilsCrossed, labelKey: 'nav.meals', path: '/products/meals', feature: 'produtos_visualizar' },
  { icon: Warehouse, labelKey: 'nav.inventory', path: '/inventory', feature: 'inventario_visualizar' },
  { icon: Package, labelKey: 'nav.stock', path: '/stock', feature: 'inventario_visualizar' },
  { icon: ShoppingCart, labelKey: 'nav.sales', path: '/sales', feature: 'pdv' },
  { icon: Wallet, labelKey: 'nav.cashier', path: '/cashier', feature: 'caixa_proprio' },
  { icon: ChefHat, labelKey: 'nav.kds', path: '/kds', feature: 'kds' },
  { icon: History, labelKey: 'nav.history', path: '/sales/history', feature: 'vendas_historico_geral' },
  { icon: Users, labelKey: 'nav.tables', path: '/tables', feature: 'mesas' },
  { icon: DollarSign, labelKey: 'nav.credits', path: '/credits-vendas', feature: 'creditos' },
  { icon: UserCircle, labelKey: 'nav.customers', path: '/customers', feature: 'clientes' },
  { icon: UserCog, labelKey: 'nav.employees', path: '/employees', feature: 'funcionarios' },
  { icon: Target, labelKey: 'nav.goals', path: '/goals', feature: 'metas' },
  { icon: FileText, labelKey: 'nav.invoices', path: '/invoices', feature: 'facturas' },
  { icon: BarChart3, labelKey: 'nav.reports', path: '/reports', feature: 'relatorios' },
  { icon: FileText, labelKey: 'nav.iva', path: '/iva-report', feature: 'relatorios' },
  { icon: HardDrive, labelKey: 'nav.backup', path: '/backup', feature: 'backup' },
  { icon: ClipboardList, labelKey: 'nav.audit', path: '/audit', feature: 'auditoria' },
  { icon: DollarSign, labelKey: 'nav.financial', path: '/financial', feature: 'relatorios' },
  { icon: Settings, labelKey: 'nav.settings', path: '/settings', feature: 'configuracoes' },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, setUser } = useStore();
  const { can } = usePermissions();
  const { t } = useI18n();

  const visibleItems = menuItems.filter(item => can(item.feature));

  const handleLogout = () => {
    setUser(null);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen flex flex-col gradient-sidebar border-r border-sidebar-border transition-all duration-200 overflow-hidden",
          sidebarOpen ? "w-56" : "w-16",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex-none flex h-14 items-center border-b border-sidebar-border">
          <div className={cn(
            "flex items-center",
            sidebarOpen ? "gap-2.5" : "gap-0"
          )}>
            <img src="./logo.png" alt="Marrengula IT" className="h-8 w-8 rounded-lg object-cover" />
            <div className={cn("overflow-hidden transition-all duration-200", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
               <h1 className="text-sm font-semibold text-sidebar-foreground truncate">Marrengula IT</h1>
              <p className="text-[9px] text-sidebar-foreground/50 truncate">ERP</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              sidebarOpen ? "ml-auto" : "absolute left-1/2 -translate-x-1/2 top-12"
            )}
          >
            {sidebarOpen ? (
              <>
                <X className="h-3.5 w-3.5 md:hidden" />
                <ChevronLeft className="h-3.5 w-3.5 hidden md:block" />
              </>
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Navigation + Logout */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto custom-scrollbar flex-1">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all duration-150",
                    sidebarOpen ? "md:justify-start" : "md:justify-center",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className={cn(
                    "truncate transition-all duration-200",
                    sidebarOpen ? "opacity-100" : "opacity-0 md:opacity-0 w-0 overflow-hidden"
                  )}>
                    {t(item.labelKey)}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="flex-none p-2 border-t border-sidebar-border">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                "w-full justify-start gap-2 text-xs text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive",
                !sidebarOpen && "md:justify-center md:px-0"
              )}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className={cn(
                "truncate transition-all duration-200",
                sidebarOpen ? "opacity-100" : "opacity-0 md:opacity-0 w-0 overflow-hidden"
              )}>
                {t('nav.logout')}
              </span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
