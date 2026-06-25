import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, 
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
  Banknote,
  FileText,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Wine, label: 'Bebidas', path: '/products/drinks' },
  { icon: UtensilsCrossed, label: 'Refeições', path: '/products/meals' },
  { icon: Warehouse, label: 'Inventário', path: '/inventory' },
  { icon: Package, label: 'Stock', path: '/stock' },
  { icon: ShoppingCart, label: 'Vendas', path: '/sales' },
  { icon: History, label: 'Histórico', path: '/sales/history' },
  { icon: Users, label: 'Mesas', path: '/tables' },
  { icon: Banknote, label: 'Créditos', path: '/credits-vendas' },
  { icon: UserCircle, label: 'Clientes', path: '/customers' },
  { icon: UserCog, label: 'Funcionários', path: '/employees' },
  { icon: Target, label: 'Metas', path: '/goals' },
  { icon: FileText, label: 'Facturas', path: '/invoices' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: DollarSign, label: 'Financeiro', path: '/financial' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, setUser } = useStore();

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
          "fixed left-0 top-0 z-40 h-screen gradient-sidebar border-r border-sidebar-border transition-all duration-200",
          "w-56",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
          <div className={cn("flex items-center gap-2.5 transition-opacity", !sidebarOpen && "md:opacity-0")}>
            <img src="/logo.png" alt="Marrengula IT" className="h-8 w-8 rounded-lg object-cover" />
            <div className="overflow-hidden">
               <h1 className="text-sm font-semibold text-sidebar-foreground truncate">Marrengula IT</h1>
              <p className="text-[9px] text-sidebar-foreground/50 truncate">ERP</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100vh - 3.5rem)' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className={cn(
                  "truncate transition-all",
                  sidebarOpen ? "w-auto" : "w-0 md:w-0 overflow-hidden"
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-sidebar-border">
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
              "truncate transition-all",
              sidebarOpen ? "w-auto" : "w-0 md:w-0 overflow-hidden"
            )}>
              Sair
            </span>
          </Button>
        </div>
      </aside>
    </>
  );
}
