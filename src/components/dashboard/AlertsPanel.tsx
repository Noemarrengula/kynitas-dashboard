import { Alert, useAlerts } from '@/hooks/useAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AlertsPanel() {
  const { alerts, hasAlerts, criticalAlerts, warningAlerts } = useAlerts();
  const navigate = useNavigate();

  if (!hasAlerts) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-full">
              <Info className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium">Tudo em ordem!</p>
              <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getColorClasses = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'border-destructive/50 bg-destructive/5 text-destructive';
      case 'warning':
        return 'border-warning/50 bg-warning/5 text-warning';
      default:
        return 'border-blue-500/50 bg-blue-50 text-blue-600';
    }
  };

  const handleAction = (alert: Alert) => {
    switch (alert.category) {
      case 'stock':
        navigate('/inventory');
        break;
      case 'credit':
        navigate('/credits');
        break;
      case 'table':
        navigate('/tables');
        break;
      case 'product':
        navigate('/products');
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertas do Sistema
          </CardTitle>
          <div className="flex gap-2">
            {criticalAlerts > 0 && (
              <Badge variant="destructive">{criticalAlerts} Crítico(s)</Badge>
            )}
            {warningAlerts > 0 && (
              <Badge variant="outline" className="border-warning text-warning">
                {warningAlerts} Aviso(s)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${getColorClasses(alert.type)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">{getIcon(alert.type)}</div>
                <div className="flex-1">
                  <p className="font-semibold">{alert.title}</p>
                  <p className="text-sm opacity-90 mt-1">{alert.message}</p>
                </div>
              </div>
              {alert.action && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(alert)}
                  className="shrink-0"
                >
                  {alert.action}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
