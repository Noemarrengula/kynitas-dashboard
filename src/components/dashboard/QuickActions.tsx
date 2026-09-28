import { Plus, ShoppingCart, Users, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  label: string;
  icon: typeof Plus;
  route: string;
  feature: Parameters<ReturnType<typeof usePermissions>['can']>[0];
}

const actions: QuickAction[] = [
  { label: 'Nova venda', icon: ShoppingCart, route: '/sales', feature: 'pdv' },
  { label: 'Novo produto', icon: Plus, route: '/products/drinks', feature: 'produtos_editar' },
  { label: 'Novo cliente', icon: Users, route: '/customers', feature: 'clientes' },
  { label: 'Abrir caixa', icon: Wallet, route: '/cashier', feature: 'caixa_proprio' },
];

export function QuickActions() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  const visible = actions.filter((a) => can(a.feature));

  if (visible.length === 0) return null;

  return (
    <div>
      <SectionHeader
        title="Acções rápidas"
        description="Atalhos para as acções mais frequentes"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {visible.map((action) => (
          <Button
            key={action.route}
            variant="outline"
            size="sm"
            className="group"
            onClick={() => navigate(action.route)}
          >
            <action.icon className="h-4 w-4 mr-2" />
            {action.label}
            <ArrowRight className="h-3.5 w-3.5 ml-2 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Button>
        ))}
      </div>
    </div>
  );
}