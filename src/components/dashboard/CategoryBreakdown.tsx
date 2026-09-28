import { useMemo } from 'react';
import { ChartPie } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Sale } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface CategoryBreakdownProps {
  sales: Sale[];
}

const BAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  '#a78bfa',
  '#f472b6',
];

function resolveCategory(category: string | undefined, type?: string): string {
  if (category && category.trim()) return category.trim();
  const fallback: Record<string, string> = { drink: 'Bebidas', meal: 'Refeições', cigarette: 'Tabaco' };
  return (type && fallback[type]) || 'Outros';
}

export function CategoryBreakdown({ sales }: CategoryBreakdownProps) {
  const categories = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = resolveCategory(item.product?.category, item.product?.type);
        const entry = map.get(key) || { revenue: 0, count: 0 };
        entry.revenue += item.subtotal;
        entry.count += item.quantity;
        map.set(key, entry);
      });
    });

    const total = Array.from(map.values()).reduce((acc, c) => acc + c.revenue, 0);

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        count: data.count,
        pct: total > 0 ? (data.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [sales]);

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ChartPie className="h-4 w-4" />
            Vendas por Categoria
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ChartPie className="h-4 w-4" />
          Vendas por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categories.map((cat, index) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium truncate">{cat.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {cat.pct.toFixed(0)}% · {formatCurrency(cat.revenue)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${cat.pct}%`,
                    backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}