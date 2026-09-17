import { useMemo } from 'react';
import { TrendingDown, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ForecastEntry {
  id: string;
  name: string;
  unit: string;
  stock: number;
  avgDailyQty: number;
  daysUntilEmpty: number | null;
  needsRestock: boolean;
  suggestedRestockQty: number;
}

interface ForecastSectionProps {
  title: string;
  subtitle: string;
  entries: ForecastEntry[];
}

export function ForecastSection({ title, subtitle, entries }: ForecastSectionProps) {
  const withConsumption = useMemo(
    () => entries.filter(e => e.avgDailyQty > 0),
    [entries]
  );

  const needsRestock = useMemo(
    () => withConsumption.filter(e => e.needsRestock),
    [withConsumption]
  );

  const totalSuggested = needsRestock.reduce((acc, e) => acc + e.suggestedRestockQty, 0);
  const minDays = needsRestock.length > 0
    ? Math.min(...needsRestock.map(e => e.daysUntilEmpty ?? 0))
    : null;

  const sorted = useMemo(
    () => [...withConsumption].sort((a, b) => (a.daysUntilEmpty ?? 999) - (b.daysUntilEmpty ?? 999)),
    [withConsumption]
  );

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
            {needsRestock.length} a repor
          </Badge>
          {minDays !== null && (
            <Badge className="bg-warning/10 text-warning hover:bg-warning/20">
              {minDays} dia(s) para esgotar
            </Badge>
          )}
          {totalSuggested > 0 && (
            <Badge variant="secondary">
              Repor ~{Math.round(totalSuggested)}/
            </Badge>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sem dados de consumo nos últimos 30 dias. Registe vendas para ver a previsão.
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.slice(0, 8).map(entry => {
            const progressPct = entry.daysUntilEmpty !== null
              ? Math.min(100, (entry.daysUntilEmpty / 14) * 100)
              : 100;
            return (
              <div key={entry.id} className="flex items-center gap-4">
                <div className="w-36 shrink-0">
                  <p className="text-sm font-medium truncate" title={entry.name}>{entry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.stock} {entry.unit} · {entry.avgDailyQty.toFixed(1)}/dia
                  </p>
                </div>
                <div className="flex-1">
                  <Progress
                    value={progressPct}
                  />
                </div>
                <div className="w-28 shrink-0 text-right">
                  {entry.daysUntilEmpty === null ? (
                    <span className="text-xs text-muted-foreground">Sem vendas</span>
                  ) : (
                    <Badge className={cn(
                      entry.daysUntilEmpty <= 0 ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' :
                      entry.daysUntilEmpty < 7 ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                      'bg-success/10 text-success hover:bg-success/20'
                    )}>
                      {entry.daysUntilEmpty} dia(s)
                    </Badge>
                  )}
                  {entry.needsRestock && (
                    <span className="block text-[10px] text-muted-foreground mt-1">
                      +{Math.round(entry.suggestedRestockQty)} {entry.unit}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {needsRestock.length > 0 && (
        <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs text-warning">
          <PackageSearch className="h-4 w-4" />
          Estes itens esgotam em menos de 7 dias ao ritmo atual de consumo.
        </div>
      )}
    </div>
  );
}