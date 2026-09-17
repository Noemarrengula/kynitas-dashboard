export const ALLOWED_LANGUAGES = ['pt', 'en'] as const;
export type Language = (typeof ALLOWED_LANGUAGES)[number];

export type Dictionary = Record<string, string>;

const pt: Dictionary = {
  // Navegação
  'nav.dashboard': 'Dashboard',
  'nav.executive': 'Executivo',
  'nav.drinks': 'Bebidas',
  'nav.meals': 'Refeições',
  'nav.inventory': 'Inventário',
  'nav.stock': 'Stock',
  'nav.sales': 'Vendas',
  'nav.cashier': 'Caixa',
  'nav.kds': 'Cozinha',
  'nav.history': 'Histórico',
  'nav.tables': 'Mesas',
  'nav.credits': 'Créditos',
  'nav.customers': 'Clientes',
  'nav.employees': 'Funcionários',
  'nav.goals': 'Metas',
  'nav.invoices': 'Facturas',
  'nav.reports': 'Relatórios',
  'nav.iva': 'IVA',
  'nav.backup': 'Backup',
  'nav.audit': 'Auditoria',
  'nav.financial': 'Financeiro',
  'nav.settings': 'Configurações',
  'nav.logout': 'Sair',

  // Topbar
  'topbar.search': 'Pesquisar...',
  'topbar.selectBusiness': 'Selecionar',
  'topbar.selectBar': 'Selecionar Bar',
  'topbar.user': 'Utilizador',
  'topbar.confirmLogoutTitle': 'Confirmar saída',
  'topbar.confirmLogoutDescription': 'Tem a certeza que deseja sair?',

  // Roles
  'role.admin': 'Administrador',
  'role.supervisor': 'Supervisor',
  'role.caixa': 'Caixa',

  // Offline banner
  'offline.pending': '{{count}} venda(s) aguardando sincronização',
  'offline.noConnection': 'Sem ligação — vendas em modo offline',
  'offline.syncNow': 'Sincronizar agora',

  // Settings tabs
  'settings.business': 'Negócio',
  'settings.profile': 'Perfil',
  'settings.categories': 'Categorias',
  'settings.employees': 'Funcionários',
  'settings.printer': 'Impressora',
  'settings.backup': 'Backup',
  'settings.cashdrawer': 'Gaveta',
  'settings.fiscal': 'Fiscal',
  'settings.currency': 'Moeda',
  'settings.users': 'Utilizadores',
  'settings.language': 'Idioma',

  // Ações comuns
  'common.save': 'Guardar',
  'common.saving': 'A guardar...',
  'common.cancel': 'Cancelar',
  'common.close': 'Fechar',
  'common.edit': 'Editar',
  'common.delete': 'Apagar',
  'common.search': 'Pesquisar',
  'common.confirm': 'Confirmar',
  'common.new': 'Novo',
  'common.loading': 'A carregar...',
  'common.pdf': 'PDF',
  'common.excel': 'Excel',
  'common.back': 'Voltar',
  'common.all': 'Todos',
  'common.none': 'Nenhum',
  'common.yes': 'Sim',
  'common.no': 'Não',
  'common.total': 'Total',
  'common.actions': 'Ações',

  // Idiomas
  'lang.pt': 'Português',
  'lang.en': 'English',

  // Títulos de páginas
  'page.salesHistory': 'Histórico de Vendas',
  'page.stockMovements': 'Movimentações de Stock',
  'page.ivaReport': 'Relatório de IVA',
  'page.backupExport': 'Backup & Exportação',
  'page.suppliers': 'Fornecedores',
  'page.cigarettes': 'Cigarros',
};

const en: Dictionary = {
  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.executive': 'Executive',
  'nav.drinks': 'Drinks',
  'nav.meals': 'Meals',
  'nav.inventory': 'Inventory',
  'nav.stock': 'Stock',
  'nav.sales': 'Sales',
  'nav.cashier': 'Cashier',
  'nav.kds': 'Kitchen',
  'nav.history': 'History',
  'nav.tables': 'Tables',
  'nav.credits': 'Credits',
  'nav.customers': 'Customers',
  'nav.employees': 'Employees',
  'nav.goals': 'Goals',
  'nav.invoices': 'Invoices',
  'nav.reports': 'Reports',
  'nav.iva': 'VAT',
  'nav.backup': 'Backup',
  'nav.audit': 'Audit',
  'nav.financial': 'Financial',
  'nav.settings': 'Settings',
  'nav.logout': 'Log out',

  // Topbar
  'topbar.search': 'Search...',
  'topbar.selectBusiness': 'Select',
  'topbar.selectBar': 'Select Bar',
  'topbar.user': 'User',
  'topbar.confirmLogoutTitle': 'Confirm log out',
  'topbar.confirmLogoutDescription': 'Are you sure you want to log out?',

  // Roles
  'role.admin': 'Administrator',
  'role.supervisor': 'Supervisor',
  'role.caixa': 'Cashier',

  // Offline banner
  'offline.pending': '{{count}} sale(s) awaiting sync',
  'offline.noConnection': 'No connection — sales in offline mode',
  'offline.syncNow': 'Sync now',

  // Settings tabs
  'settings.business': 'Business',
  'settings.profile': 'Profile',
  'settings.categories': 'Categories',
  'settings.employees': 'Employees',
  'settings.printer': 'Printer',
  'settings.backup': 'Backup',
  'settings.cashdrawer': 'Drawer',
  'settings.fiscal': 'Fiscal',
  'settings.currency': 'Currency',
  'settings.users': 'Users',
  'settings.language': 'Language',

  // Common actions
  'common.save': 'Save',
  'common.saving': 'Saving...',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.search': 'Search',
  'common.confirm': 'Confirm',
  'common.new': 'New',
  'common.loading': 'Loading...',
  'common.pdf': 'PDF',
  'common.excel': 'Excel',
  'common.back': 'Back',
  'common.all': 'All',
  'common.none': 'None',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.total': 'Total',
  'common.actions': 'Actions',

  // Languages
  'lang.pt': 'Português',
  'lang.en': 'English',

  // Page titles
  'page.salesHistory': 'Sales History',
  'page.stockMovements': 'Stock Movements',
  'page.ivaReport': 'VAT Report',
  'page.backupExport': 'Backup & Export',
  'page.suppliers': 'Suppliers',
  'page.cigarettes': 'Cigarettes',
};

export const dictionaries: Record<Language, Dictionary> = { pt, en };