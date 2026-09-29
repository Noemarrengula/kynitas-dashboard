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
  Shield,
  X,
  FileText,
  Target,
  HardDrive,
  ClipboardList,
  HeartPulse,
  ChefHat,
  Wallet,
  ArrowLeftRight,
  HandCoins,
  CreditCard,
  Percent,
  Boxes,
  BookOpen,
  Truck,
  ReceiptText,
  PackageCheck,
  PackageX,
  BrainCircuit,
  Landmark,
  Crown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermissions, type Feature } from '@/hooks/usePermissions';
import { useI18n } from '@/contexts/I18nContext';
import { useEffect } from 'react';

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
  feature: Feature;
  exact?: boolean;
}

interface NavSection {
  sectionKey: string;
  labelKey: string;
  items: NavItem[];
}

// Módulos mapeados directamente às rotas existentes (App.tsx)
const navSections: NavSection[] = [
  {
    sectionKey: 'command',
    labelKey: 'nav.section.command',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/dashboard', feature: 'dashboard' },
    ],
  },
  {
    sectionKey: 'operations',
    labelKey: 'nav.section.operations',
    items: [
      { icon: ShoppingCart, labelKey: 'nav.sales', path: '/sales', feature: 'pdv' },
      { icon: Users, labelKey: 'nav.tables', path: '/tables', feature: 'mesas' },
      { icon: ChefHat, labelKey: 'nav.kds', path: '/kds', feature: 'kds' },
      { icon: Wallet, labelKey: 'nav.cashier', path: '/cashier', feature: 'caixa_proprio' },
      { icon: History, labelKey: 'nav.history', path: '/sales/history', feature: 'vendas_historico_geral' },
    ],
  },
  {
    sectionKey: 'inventory',
    labelKey: 'nav.section.inventory',
    items: [
      { icon: Warehouse, labelKey: 'nav.inventoryOverview', path: '/inventory', feature: 'inventario_visualizar', exact: true },
      { icon: Wine, labelKey: 'nav.drinks', path: '/products/drinks', feature: 'produtos_visualizar' },
      { icon: UtensilsCrossed, labelKey: 'nav.meals', path: '/products/meals', feature: 'produtos_visualizar' },
      { icon: Package, labelKey: 'nav.stock', path: '/stock', feature: 'inventario_visualizar' },
      { icon: Boxes, labelKey: 'nav.ingredients', path: '/inventory/ingredients', feature: 'inventario_visualizar' },
      { icon: BookOpen, labelKey: 'nav.recipes', path: '/inventory/recipes', feature: 'inventario_visualizar' },
      { icon: ArrowLeftRight, labelKey: 'nav.movements', path: '/stock/movements', feature: 'inventario_visualizar' },
    ],
  },
  {
    sectionKey: 'procurement',
    labelKey: 'nav.section.procurement',
    items: [
      { icon: Truck, labelKey: 'nav.suppliers', path: '/fornecedores', feature: 'inventario_visualizar', exact: true },
      { icon: ReceiptText, labelKey: 'nav.purchases', path: '/compras', feature: 'compras', exact: true },
      { icon: PackageCheck, labelKey: 'nav.receipts', path: '/rececoes', feature: 'inventario_visualizar' },
      { icon: PackageX, labelKey: 'nav.losses', path: '/perdas', feature: 'inventario_visualizar' },
    ],
  },
  {
    sectionKey: 'customers',
    labelKey: 'nav.section.customers',
    items: [
      { icon: Users, labelKey: 'nav.customers', path: '/customers', feature: 'clientes' },
      { icon: Landmark, labelKey: 'nav.collections', path: '/cobrancas', feature: 'cobrancas' },
      { icon: HandCoins, labelKey: 'nav.credits', path: '/credits-vendas', feature: 'creditos' },
      { icon: CreditCard, labelKey: 'nav.creditsManagment', path: '/credits', feature: 'creditos' },
    ],
  },
  {
    sectionKey: 'finance',
    labelKey: 'nav.section.finance',
    items: [
      { icon: FileText, labelKey: 'nav.invoices', path: '/invoices', feature: 'facturas' },
      { icon: Percent, labelKey: 'nav.iva', path: '/iva-report', feature: 'relatorios' },
      { icon: DollarSign, labelKey: 'nav.financial', path: '/financial', feature: 'financeiro' },
      { icon: Target, labelKey: 'nav.goals', path: '/goals', feature: 'metas' },
    ],
  },
  {
    sectionKey: 'intelligence',
    labelKey: 'nav.section.intelligence',
    items: [
      { icon: BrainCircuit, labelKey: 'nav.bi', path: '/bi', feature: 'relatorios' },
      { icon: TrendingUp, labelKey: 'nav.executive', path: '/executive', feature: 'relatorios' },
      { icon: BarChart3, labelKey: 'nav.reports', path: '/reports', feature: 'relatorios' },
    ],
  },
  {
    sectionKey: 'admin',
    labelKey: 'nav.section.admin',
    items: [
      { icon: UserCog, labelKey: 'nav.employees', path: '/employees', feature: 'funcionarios' },
      { icon: Shield, labelKey: 'nav.users', path: '/settings/users', feature: 'gestao_utilizadores' },
      { icon: HardDrive, labelKey: 'nav.backup', path: '/backup', feature: 'backup' },
      { icon: ClipboardList, labelKey: 'nav.audit', path: '/audit', feature: 'auditoria' },
      { icon: HeartPulse, labelKey: 'nav.systemHealth', path: '/health', feature: 'configuracoes' },
      { icon: Settings, labelKey: 'nav.settings', path: '/settings', feature: 'configuracoes' },
      { icon: Crown, labelKey: 'nav.administracao', path: '/administracao', feature: 'administracao' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, setUser } = useStore();
  const { can } = usePermissions();
  const { t } = useI18n();

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => can(item.feature)),
    }))
    .filter((section) => section.items.length > 0);

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
    <TooltipProvider delayDuration={200}>
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
            sidebarOpen ? "w-[260px] translate-x-0" : "w-20 -translate-x-full md:translate-x-0"
          )}
          aria-label="Navegação principal"
        >
          {/* Logo */}
          <div className="flex-none flex h-14 items-center border-b border-sidebar-border px-3">
            <div className={cn("flex items-center", sidebarOpen ? "gap-2.5" : "gap-0")}>
              <img src="./logo.png" alt="Marrengula IT" className="h-8 w-8 rounded-lg object-cover" />
              <div className={cn("overflow-hidden transition-all duration-200", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
                <h1 className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">Marrengula IT</h1>
                <p className="text-[9px] text-sidebar-foreground/50 truncate">ERP</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                sidebarOpen
                  ? "ml-auto"
                  : "absolute left-1/2 -translate-x-1/2 top-12"
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

          {/* Navegação por módulos */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3 space-y-4">
              {visibleSections.map((section) => {
                const sectionItems = section.items.map((item) => {
                  const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname === item.path ||
                      location.pathname.startsWith(item.path + "/");

                  const link = (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md text-xs font-medium transition-all duration-150",
                        sidebarOpen ? "px-2.5 py-2 justify-start" : "px-0 py-2 justify-center",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      {isActive && sidebarOpen && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/80" />
                      )}
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn(
                        "truncate transition-all duration-200",
                        sidebarOpen ? "opacity-100" : "md:hidden w-0 opacity-0 overflow-hidden"
                      )}>
                        {t(item.labelKey)}
                      </span>
                    </NavLink>
                  );

                  if (sidebarOpen) return link;

                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        {t(item.labelKey)}
                      </TooltipContent>
                    </Tooltip>
                  );
                });

                return (
                  <div key={section.sectionKey}>
                    {sidebarOpen ? (
                      <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                        {t(section.labelKey)}
                      </p>
                    ) : (
                      <div className="mx-[21px] my-2 h-px bg-sidebar-border" />
                    )}
                    <div className="flex flex-col gap-0.5">{sectionItems}</div>
                  </div>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="flex-none p-2 border-t border-sidebar-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className={cn(
                      "w-full gap-2.5 text-xs text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive",
                      sidebarOpen ? "justify-start px-2.5" : "justify-center px-0"
                    )}
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span className={cn(
                      "truncate transition-all duration-200",
                      sidebarOpen ? "opacity-100" : "md:hidden w-0 opacity-0 overflow-hidden"
                    )}>
                      {t('nav.logout')}
                    </span>
                  </Button>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right" className="ml-2">
                    {t('nav.logout')}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}