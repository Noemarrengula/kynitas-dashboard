import { TrendingUp } from 'lucide-react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/dashboard/EmptyState';

export function TopProducts() {
  const { topProducts } = useDashboardAnalytics();

  return (
    <div className="bg-card border rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Produtos Mais Vendidos</h3>
        <TrendingUp className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-4">
        {topProducts.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem vendas registradas"
            description="Os produtos mais vendidos aparecerão aqui assim que houver vendas registradas."
          />
        ) : (
          <>
            {(() => {
              const maxQuantity = Math.max(...topProducts.map(p => p.quantity));
              return topProducts.slice(0, 5).map((product, index) => (
                <div key={product.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium truncate">{product.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0 ml-2">
                      {product.quantity} vendas
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all duration-500"
                      style={{ width: `${(product.quantity / maxQuantity) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ));
            })()}
          </>
        )}
      </div>
    </div>
  );
}