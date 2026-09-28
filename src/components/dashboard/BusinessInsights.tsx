import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Package, HandCoins, Wallet, Armchair } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BusinessInsightsProps {
  revenuePct?: number;
  countPct?: number;
  criticalStockCount: number;
  pendingCredits: number;
  openShift: boolean;
  tablesOccupied: number;
}

interface Insight {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'info' | 'neutral';
}

const toneClasses = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
};

export function BusinessInsights({
  revenuePct,
  countPct,
  criticalStockCount,
  pendingCredits,
  openShift,
  tablesOccupied,
}: BusinessInsightsProps) {
  const insights: Insight[] = [];

  if (revenuePct === undefined) {
    insights.push({
      icon: TrendingUp,
      title: 'Vendas',
      description: 'Sem dados do período anterior para comparar.',
      tone: 'neutral',
    });
  } else if (revenuePct > 1) {
    insights.push({
      icon: TrendingUp,
      title: 'Vendas',
      description: `As vendas subiram ${Math.abs(revenuePct).toFixed(1)}% em relação ao período anterior.`,
      tone: 'success',
    });
  } else if (revenuePct < -1) {
    insights.push({
      icon: TrendingDown,
      title: 'Vendas',
      description: `As vendas desceram ${Math.abs(revenuePct).toFixed(1)}% em relação ao período anterior.`,
      tone: 'warning',
    });
  } else {
    insights.push({
      icon: TrendingUp,
      title: 'Vendas',
      description: `Volume de vendas estável${countPct !== undefined && countPct > 1 ? ' com mais vendas realizadas' : ''}.`,
      tone: 'info',
    });
  }

  insights.push(
    criticalStockCount > 0
      ? {
          icon: Package,
          title: 'Stock',
          description: `${criticalStockCount} produto(s) abaixo do stock mínimo.`,
          tone: 'warning',
        }
      : {
          icon: Package,
          title: 'Stock',
          description: 'Stock dentro dos níveis mínimos.',
          tone: 'success',
        },
  );

  insights.push(
    pendingCredits > 0
      ? {
          icon: HandCoins,
          title: 'Créditos',
          description: `${formatCurrency(pendingCredits)} pendentes de pagamento.`,
          tone: pendingCredits > 0 ? 'info' : 'success',
        }
      : {
          icon: HandCoins,
          title: 'Créditos',
          description: 'Sem valores pendentes de clientes.',
          tone: 'success',
        },
  );

  insights.push({
    icon: Wallet,
    title: 'Caixa',
    description: openShift
      ? 'Existe um turno de caixa aberto.'
      : 'Nenhum turno de caixa aberto no momento.',
    tone: openShift ? 'info' : 'neutral',
  });

  if (tablesOccupied > 0) {
    insights.push({
      icon: Armchair,
      title: 'Mesas',
      description: `${tablesOccupied} mesa(s) ocupada(s) agora.`,
      tone: 'info',
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {insights.map((insight) => (
        <Card key={insight.title}>
          <CardContent className="p-3.5">
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 p-2 rounded-lg shrink-0", toneClasses[insight.tone])}>
                <insight.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{insight.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}