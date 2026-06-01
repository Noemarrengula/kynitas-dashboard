import { useState } from 'react';
import { History, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function StockMovements() {
  const { stockMovements, products } = useStore();
  const [filter, setFilter] = useState<'all' | 'entry' | 'exit'>('all');

  const filteredMovements = stockMovements.filter(m => 
    filter === 'all' || m.type === filter
  );

  const sortedMovements = [...filteredMovements].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalEntries = stockMovements.filter(m => m.type === 'entry').reduce((acc, m) => acc + m.quantity, 0);
  const totalExits = stockMovements.filter(m => m.type === 'exit').reduce((acc, m) => acc + m.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Movimentações de Stock
        </h1>
        <p className="text-muted-foreground">Histórico completo de entradas e saídas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Movimentos</p>
                <p className="text-2xl font-bold">{stockMovements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-green-600">{totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-2xl font-bold text-red-600">{totalExits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'entry', label: 'Entradas' },
          { value: 'exit', label: 'Saídas' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as typeof filter)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              filter === option.value
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedMovements.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma movimentação registrada
            </p>
          ) : (
            <div className="space-y-2">
              {sortedMovements.map((movement) => {
                const product = products.find(p => p.id === movement.productId);
                if (!product) return null;

                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{movement.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(movement.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {product.type === 'drink' ? 'Bebida' : 'Refeição'}
                        </Badge>
                      </div>
                      <div className={cn(
                        "text-2xl font-bold min-w-[80px] text-right",
                        movement.type === 'entry' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {movement.type === 'entry' ? '+' : '-'}{movement.quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
