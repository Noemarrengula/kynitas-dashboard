import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { formatCurrency } from '@/lib/utils';
import { Users, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function TopTablesCard() {
  const { topTables } = useDashboardAnalytics();

  if (topTables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mesas Mais Rentáveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma mesa com vendas nos últimos 7 dias
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...topTables.map(t => t.revenue));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Mesas Mais Rentáveis (7 dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topTables.map((table, index) => (
          <div key={table.number} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">
                    Mesa {table.number}
                    {table.name && <span className="text-muted-foreground text-sm"> ({table.name})</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{table.count} atendimentos</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{formatCurrency(table.revenue)}</p>
                <p className="text-xs text-muted-foreground">
                  Média: {formatCurrency(table.revenue / table.count)}
                </p>
              </div>
            </div>
            <Progress value={(table.revenue / maxRevenue) * 100} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
