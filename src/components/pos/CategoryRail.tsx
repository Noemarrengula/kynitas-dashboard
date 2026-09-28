import { memo } from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';

export const ALL_CATEGORY = 'Todos';

interface CategoryRailProps {
  categories: string[];
  selected: string;
  counts: Record<string, number>;
  onSelect: (category: string) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export const CategoryRail = memo(function CategoryRail({
  categories,
  selected,
  counts,
  onSelect,
  orientation = 'vertical',
  className,
}: CategoryRailProps) {
  const items = [ALL_CATEGORY, ...categories];

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex gap-1.5 overflow-x-auto pb-1 no-scrollbar', className)}>
        {items.map(category => {
          const isSelected = category === selected;
          return (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {category}
              <span className={cn('ml-1.5 text-xs', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                {counts[category] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav
      className={cn('flex flex-col gap-0.5 pr-1', className)}
      aria-label="Categorias de produtos"
    >
      <button
        onClick={() => onSelect(ALL_CATEGORY)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
          selected === ALL_CATEGORY
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" />
        <span className="flex-1 min-w-0 truncate">{ALL_CATEGORY}</span>
        <span className={cn('text-xs tabular-nums', selected === ALL_CATEGORY ? 'text-primary/70' : 'text-muted-foreground/70')}>
          {counts[ALL_CATEGORY] ?? 0}
        </span>
      </button>
      {categories.map(category => {
        const isSelected = category === selected;
        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors',
              isSelected
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span
              className={cn(
                'h-4 w-1 shrink-0 rounded-full',
                isSelected ? 'bg-primary' : 'bg-transparent'
              )}
            />
            <span className="flex-1 min-w-0 truncate">{category}</span>
            <span className={cn('text-xs tabular-nums', isSelected ? 'text-primary/70' : 'text-muted-foreground/70')}>
              {counts[category] ?? 0}
            </span>
          </button>
        );
      })}
    </nav>
  );
});