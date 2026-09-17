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
  | 'auditoria';

const FEATURE_ROLES: Record<Feature, BusinessRole[]> = {
  dashboard: ['admin', 'supervisor'],
  pdv: ['admin', 'supervisor', 'caixa'],
  vendas_historico_geral: ['admin', 'supervisor'],
  vendas_historico_proprio: ['admin', 'supervisor', 'caixa'],
  mesas: ['admin', 'supervisor', 'caixa'],
  kds: ['admin', 'supervisor', 'caixa'],
  creditos: ['admin', 'supervisor', 'caixa'],
  clientes: ['admin', 'supervisor', 'caixa'],
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
  auditoria: ['admin'],
};

export function usePermissions() {
  const { currentBusinessUser } = useBusiness();
  const role: BusinessRole | null = currentBusinessUser?.role ?? null;

  const can = (feature: Feature): boolean => {
    if (!role) return false;
    return FEATURE_ROLES[feature].includes(role);
  };

  return {
    role,
    isAdmin: role === 'admin',
    isSupervisor: role === 'supervisor',
    isCaixa: role === 'caixa',
    can,
  };
}

export const ROLE_LABELS: Record<BusinessRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  caixa: 'Caixa',
};

export const ROLE_BADGE_CLASSES: Record<BusinessRole, string> = {
  admin: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  supervisor: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  caixa: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};