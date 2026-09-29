import { useBusiness } from "@/contexts/BusinessContext";
import type { BusinessRole } from "@/types/domains/user";

export type Feature =
  | 'dashboard'
  | 'pdv'
  | 'vendas_historico_geral'
  | 'vendas_historico_proprio'
  | 'mesas'
  | 'kds'
  | 'creditos'
  | 'clientes'
  | 'cobrancas'
  | 'compras'
  | 'funcionarios'
  | 'metas'
  | 'facturas'
  | 'financeiro'
  | 'produtos_visualizar'
  | 'produtos_editar'
  | 'inventario_visualizar'
  | 'inventario_editar'
  | 'relatorios'
  | 'caixa_proprio'
  | 'caixa_geral'
  | 'precos_margens'
  | 'configuracoes'
  | 'gestao_utilizadores'
  | 'backup'
  | 'auditoria'
  | 'administracao';

const FEATURE_ROLES: Record<Feature, BusinessRole[]> = {
  dashboard: ['admin', 'supervisor', 'caixa'],
  pdv: ['admin', 'supervisor', 'caixa'],
  vendas_historico_geral: ['admin', 'supervisor'],
  vendas_historico_proprio: ['admin', 'supervisor', 'caixa'],
  mesas: ['admin', 'supervisor', 'caixa'],
  kds: ['admin', 'supervisor', 'caixa'],
  creditos: ['admin', 'supervisor', 'caixa'],
  clientes: ['admin', 'supervisor', 'caixa'],
  cobrancas: ['admin', 'supervisor'],
  compras: ['admin', 'supervisor'],
  funcionarios: ['admin', 'supervisor'],
  metas: ['admin', 'supervisor'],
  facturas: ['admin', 'supervisor'],
  produtos_visualizar: ['admin', 'supervisor', 'caixa'],
  produtos_editar: ['admin', 'supervisor'],
  inventario_visualizar: ['admin', 'supervisor', 'caixa'],
  inventario_editar: ['admin', 'supervisor'],
  relatorios: ['admin', 'supervisor'],
  caixa_proprio: ['admin', 'supervisor', 'caixa'],
  caixa_geral: ['admin', 'supervisor'],
  precos_margens: ['admin', 'supervisor'],
  financeiro: ['admin', 'supervisor'],
  configuracoes: ['admin'],
  gestao_utilizadores: ['admin'],
  backup: ['admin'],
  auditoria: ['admin', 'super_admin'],
  administracao: ['super_admin'],
};

// ============================================================================
// MATRIZ GRANULAR DE PERMISSÕES (FASE 08.5 — §11 da especificação)
// ----------------------------------------------------------------------------
// Nomes canónicos "grupo.acção". Um admins/supervisor vazio NUNCA esconde
// segurança real: o backend (RLS + RPCs) continua a impor as mesmas regras.
// ============================================================================
export type Permission =
  | 'dashboard.view'
  | 'sales.view'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.cancel'
  | 'pos.access'
  | 'cash.open'
  | 'cash.view'
  | 'cash.movement'
  | 'cash.close'
  | 'cash.view_all'
  | 'tables.view'
  | 'tables.manage'
  | 'kds.view'
  | 'kds.manage'
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'stock.view'
  | 'stock.adjust'
  | 'stock.manage'
  | 'purchases.view'
  | 'purchases.create'
  | 'purchases.edit'
  | 'purchases.receive'
  | 'suppliers.view'
  | 'suppliers.manage'
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'credit.view'
  | 'credit.create'
  | 'credit.collect'
  | 'loyalty.view'
  | 'loyalty.manage'
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.reprint'
  | 'invoices.cancel'
  | 'invoices.credit_note'
  | 'reports.view'
  | 'reports.financial'
  | 'reports.operational'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.disable'
  | 'roles.view'
  | 'roles.manage'
  | 'businesses.view'
  | 'businesses.create'
  | 'businesses.edit'
  | 'settings.view'
  | 'settings.manage'
  | 'fiscal.view'
  | 'fiscal.manage'
  | 'series.view'
  | 'series.manage'
  | 'audit.view'
  | 'system.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view', 'sales.view', 'sales.create', 'sales.edit', 'sales.cancel', 'pos.access',
  'cash.open', 'cash.view', 'cash.movement', 'cash.close', 'cash.view_all',
  'tables.view', 'tables.manage', 'kds.view', 'kds.manage',
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'stock.view', 'stock.adjust', 'stock.manage',
  'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.receive',
  'suppliers.view', 'suppliers.manage',
  'customers.view', 'customers.create', 'customers.edit',
  'credit.view', 'credit.create', 'credit.collect',
  'loyalty.view', 'loyalty.manage',
  'invoices.view', 'invoices.create', 'invoices.reprint', 'invoices.cancel', 'invoices.credit_note',
  'reports.view', 'reports.financial', 'reports.operational',
  'users.view', 'users.create', 'users.edit', 'users.disable',
  'roles.view', 'roles.manage',
  'businesses.view', 'businesses.create', 'businesses.edit',
  'settings.view', 'settings.manage',
  'fiscal.view', 'fiscal.manage',
  'series.view', 'series.manage',
  'audit.view', 'system.manage',
];

// CAIXA: apenas operacional — nunca preços, stock, compras, utilizadores, fiscal.
export const ROLE_PERMISSIONS: Record<BusinessRole, readonly Permission[]> = {
  caixa: [
    'dashboard.view',
    'sales.view', 'sales.create',
    'pos.access',
    'cash.open', 'cash.view', 'cash.movement', 'cash.close',
    'tables.view', 'tables.manage',
    'kds.view',
    'products.view',
    'stock.view',
    'customers.view', 'customers.create',
    'credit.view', 'credit.create',
    'loyalty.view',
    'invoices.view', 'invoices.create', 'invoices.reprint',
  ],
  supervisor: [
    'dashboard.view',
    'sales.view', 'sales.create', 'sales.edit', 'sales.cancel',
    'pos.access',
    'cash.open', 'cash.view', 'cash.movement', 'cash.close', 'cash.view_all',
    'tables.view', 'tables.manage',
    'kds.view', 'kds.manage',
    'products.view', 'products.create', 'products.edit',
    'stock.view', 'stock.adjust', 'stock.manage',
    'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.receive',
    'suppliers.view', 'suppliers.manage',
    'customers.view', 'customers.create', 'customers.edit',
    'credit.view', 'credit.create', 'credit.collect',
    'loyalty.view', 'loyalty.manage',
    'invoices.view', 'invoices.create', 'invoices.reprint', 'invoices.cancel',
    'reports.view', 'reports.operational',
  ],
  admin: [
    'dashboard.view',
    'sales.view', 'sales.create', 'sales.edit', 'sales.cancel',
    'pos.access',
    'cash.open', 'cash.view', 'cash.movement', 'cash.close', 'cash.view_all',
    'tables.view', 'tables.manage',
    'kds.view', 'kds.manage',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'stock.view', 'stock.adjust', 'stock.manage',
    'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.receive',
    'suppliers.view', 'suppliers.manage',
    'customers.view', 'customers.create', 'customers.edit',
    'credit.view', 'credit.create', 'credit.collect',
    'loyalty.view', 'loyalty.manage',
    'invoices.view', 'invoices.create', 'invoices.reprint', 'invoices.cancel', 'invoices.credit_note',
    'reports.view', 'reports.financial', 'reports.operational',
    'users.view', 'users.create', 'users.edit', 'users.disable',
    'roles.view',
    'settings.view', 'settings.manage',
    'fiscal.view', 'fiscal.manage',
    'series.view', 'series.manage',
    'businesses.view',
    'audit.view',
  ],
  super_admin: ALL_PERMISSIONS,
};

export function usePermissions() {
  const { currentBusinessUser } = useBusiness();
  const role: BusinessRole | null = currentBusinessUser?.role ?? null;

  // NÍVEL 1—3: can(key) aceita features (menus/rotas actuais) ou permissões
  // granulares "grupo.acção". super_admin tem sempre acesso total (Nível 2).
  const can = (key: string): boolean => {
    if (!role) return false;
    if (role === 'super_admin') return true;
    if (key.includes('.')) {
      return ROLE_PERMISSIONS[role].includes(key as Permission);
    }
    return FEATURE_ROLES[key as Feature]?.includes(role) ?? false;
  };

  const canAny = (...keys: string[]): boolean => keys.some(k => can(k));
  const canAll = (...keys: string[]): boolean => keys.every(k => can(k));

  const permissions = (): readonly Permission[] => ROLE_PERMISSIONS[role ?? 'caixa'];

  return {
    role,
    isAdmin: role === 'admin',
    isSupervisor: role === 'supervisor',
    isCaixa: role === 'caixa',
    isSuperAdmin: role === 'super_admin',
    can,
    canAny,
    canAll,
    permissions,
  };
}

export const ROLE_LABELS: Record<BusinessRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  caixa: 'Caixa',
  super_admin: 'Super Admin',
};

export const ROLE_BADGE_CLASSES: Record<BusinessRole, string> = {
  admin: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  supervisor: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  caixa: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  super_admin: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
};