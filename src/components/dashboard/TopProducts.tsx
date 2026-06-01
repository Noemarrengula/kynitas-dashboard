import { TrendingUp } from 'lucide-react';

const topProducts = [
  { name: 'Cerveja Artesanal', quantity: 145, revenue: 21750 },
  { name: 'Picanha na Brasa', quantity: 89, revenue: 66750 },
  { name: 'Camarão Grelhado', quantity: 67, revenue: 56950 },
  { name: 'Vinho Tinto Reserva', quantity: 52, revenue: 23400 },
  { name: 'Frango à Zambeziana', quantity: 48, revenue: 26400 },
];

export function TopProducts() {
  const maxQuantity = Math.max(...topProducts.map(p => p.quantity));

  return (
    <div className="bg-card border rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Produtos Mais Vendidos</h3>
        <TrendingUp className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-4">
        {topProducts.map((product, index) => (
          <div key={product.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-5">
                  {index + 1}.
                </span>
                <span className="text-sm font-medium">{product.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {product.quantity} vendas
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-500"
                style={{ width: `${(product.quantity / maxQuantity) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
