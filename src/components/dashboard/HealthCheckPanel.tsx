import { useHealthCheck } from '@/hooks/useHealthCheck';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HealthCheckPanelProps {
  showDetails?: boolean;
}

export function HealthCheckPanel({ showDetails = true }: HealthCheckPanelProps) {
  const { health, checking, isHealthy, retry } = useHealthCheck();

  const checks = [
    {
      name: 'Supabase Conectado',
      status: health.supabaseConnected,
      description: 'Conexão com servidor estabelecida',
    },
    {
      name: 'Autenticação',
      status: health.userAuthenticated,
      description: 'Usuário autenticado',
    },
    {
      name: 'Negócio Carregado',
      status: health.businessLoaded,
      description: 'Dados do negócio carregados',
    },
    {
      name: 'Tabelas Acessíveis',
      status: health.tablesExist,
      description: 'Banco de dados respondendo',
    },
    {
      name: 'RLS Policies',
      status: health.rlsPoliciesActive,
      description: 'Segurança de linha ativa',
    },
  ];

  if (!showDetails) {
    // Mostrador compacto (apenas status geral)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : isHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {checking ? 'Verificando...' : isHealthy ? 'Sistema OK' : 'Problemas detectados'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {health.lastError ? (
              <div className="text-red-400">{health.lastError}</div>
            ) : (
              <div className="text-green-400">Todos os sistemas funcionando</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Painel completo com detalhes
  return (
    <Card className="p-4 mb-4 border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">Status do Sistema</h3>
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : isHealthy ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={retry}
          disabled={checking}
          className="h-8"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${checking ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {health.lastError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{health.lastError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {checks.map((check) => (
          <div 
            key={check.name} 
            className={`p-3 rounded-lg border ${
              check.status 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {check.status ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-medium text-foreground">{check.name}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{check.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Última verificação: {health.timestamp.toLocaleTimeString('pt-BR')}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          Made by Marrengula IT
        </span>
      </div>
    </Card>
  );
}

export default HealthCheckPanel;
