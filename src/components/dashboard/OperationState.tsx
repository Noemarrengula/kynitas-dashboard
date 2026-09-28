import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';

export function OperationState() {
  const { criticalAlerts, warningAlerts, hasAlerts } = useAlerts();

  if (!hasAlerts) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        <span className="font-medium text-success">Tudo em ordem</span>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Nenhuma situação requer atenção neste momento.
        </span>
      </div>
    );
  }

  if (criticalAlerts > 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="font-medium text-destructive">
          {criticalAlerts} situação{criticalAlerts > 1 ? 'ões' : ''} crítica{criticalAlerts > 1 ? 's' : ''}
        </span>
        {warningAlerts > 0 && (
          <span className="text-sm text-muted-foreground hidden sm:inline">
            · {warningAlerts} com atenção
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
      <span className="font-medium text-warning">
        {warningAlerts} situação{warningAlerts > 1 ? 'ões' : ''} requer{warningAlerts > 1 ? 'm' : ''} atenção
      </span>
    </div>
  );
}