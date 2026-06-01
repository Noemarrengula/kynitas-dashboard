import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/hooks/useDatabase';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Clock } from 'lucide-react';

export function RecentSales() {
  const { sales } = useDatabase();

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Vendas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentSales.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma venda registrada</p>
        ) : (
          <div className="space-y-3">
            {recentSales.map((sale) => {
              const paymentMethods = [
                sale.paymentDetails.cash > 0 && 'Dinheiro',
                sale.paymentDetails.mpesa > 0 && 'M-Pesa',
                sale.paymentDetails.emola > 0 && 'E-Mola',
                sale.paymentDetails.card > 0 && 'Cartão',
              ].filter(Boolean);

              return (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatCurrency(sale.total)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.createdAt), 'HH:mm', { locale: pt })}
                      </p>
                      {sale.tableId && (
                        <Badge variant="outline" className="text-xs">Mesa {sale.tableId}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {paymentMethods.slice(0, 2).map((method) => (
                      <Badge key={method} variant="secondary" className="text-[10px]">
                        {method}
                      </Badge>
                    ))}
                    {paymentMethods.length > 2 && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{paymentMethods.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
