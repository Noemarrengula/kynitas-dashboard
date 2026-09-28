import { memo } from 'react';
import { ShoppingCart, PackageX, Scale, SearchX } from 'lucide-react';
import type { Product } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const isWeighted = (product: Product) => product.name.toUpperCase().includes('KG');

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  searchActive?: boolean;
  onAdd: (product: Product) => void;
  className?: string;
}

export const ProductGrid = memo(function ProductGrid({
  products,
  loading,
  searchActive,
  onAdd,
  className,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5', className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-3 space-y-2.5">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={searchActive ? SearchX : PackageX}
        title="Nenhum produto encontrado"
        description={searchActive ? 'Ajuste a pesquisa para ver mais resultados.' : 'Esta categoria ainda não tem produtos.'}
        compact
        className="py-16"
      />
    );
  }

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5', className)}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
});

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const ProductCard = memo(function ProductCard({ product, onAdd }: ProductCardProps) {
  const outOfStock = product.stock <= 0;
  const weighted = isWeighted(product);
  const fractional = Boolean(product.fracionavel);

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={outOfStock}
      aria-label={`Adicionar ${product.name} ao pedido`}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all',
        'hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        outOfStock && 'opacity-55 disabled:pointer-events-none disabled:cursor-not-allowed'
      )}
    >
      <div className="relative h-14 w-full overflow-hidden rounded-lg bg-muted shrink-0">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingCart className="h-5 w-5" />
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Badge variant="destructive" className="text-[10px]">Esgotado</Badge>
          </div>
        )}
      </div>

      <p className="mt-2 text-sm font-medium leading-tight line-clamp-2 min-h-[2.1rem]">
        {product.name}
      </p>
      <div className="mt-1.5 flex items-end justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary tabular-nums truncate">
            {formatCurrency(product.price)}
            {weighted && <span className="text-xs font-normal text-muted-foreground"> /kg</span>}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            {fractional && (
              <span className="inline-flex items-center gap-0.5">
                <Scale className="h-3 w-3" /> dose/garrafa
              </span>
            )}
            {!outOfStock && (
              <span className="tabular-nums">{product.stock} em stock</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});