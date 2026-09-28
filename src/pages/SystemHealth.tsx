import { HeartPulse, Info } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import HealthCheckPanel from '@/components/dashboard/HealthCheckPanel';
import { useI18n } from '@/contexts/I18nContext';

export default function SystemHealth() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.systemHealth')}
        description="Diagnóstico técnico da ligação ao Supabase, autenticação e segurança."
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>Marrengula IT</span>
        </div>
      </PageHeader>

      <HealthCheckPanel showDetails />

      <Card>
        <CardContent className="p-5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
            <HeartPulse className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">O que é isto?</p>
            <p className="mt-1 text-sm">
              Esta página agrupa verificações técnicas do sistema: conexão ao Supabase, estado da
              autenticação, dados do negócio, acesso às tabelas e estado das políticas de segurança
              (RLS). Se algo falhar, use o botão "Atualizar" para repetir a verificação.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}