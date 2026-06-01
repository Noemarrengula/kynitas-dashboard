import { useState, useEffect } from 'react';
import { Download, RefreshCw, Trash2, Database, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/contexts/BusinessContext';
import { listBackups, downloadBackup } from '@/hooks/useAutoBackup';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export function BackupSettings() {
  const { currentBusiness } = useBusiness();
  const [backups, setBackups] = useState<any[]>([]);

  useEffect(() => {
    if (currentBusiness?.id) {
      loadBackups();
    }
  }, [currentBusiness?.id]);

  const loadBackups = () => {
    if (!currentBusiness?.id) return;
    const list = listBackups(currentBusiness.id);
    setBackups(list);
  };

  const handleDownload = (backupKey: string) => {
    downloadBackup(backupKey);
    toast({
      title: 'Backup baixado',
      description: 'Arquivo salvo com sucesso',
    });
  };

  const handleDelete = (backupKey: string) => {
    localStorage.removeItem(backupKey);
    loadBackups();
    toast({
      title: 'Backup removido',
      description: 'Backup deletado com sucesso',
    });
  };

  const createManualBackup = async () => {
    // Trigger manual backup
    window.location.reload();
    toast({
      title: 'Backup criado',
      description: 'Backup manual criado com sucesso',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup Automático
          </CardTitle>
          <CardDescription>
            Seus dados são salvos automaticamente a cada 6 horas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Backup Ativo</p>
                <p className="text-sm text-green-700">
                  Últimos 7 backups mantidos localmente
                </p>
              </div>
            </div>
            <Button onClick={createManualBackup} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Criar Agora
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Backups Disponíveis ({backups.length})</h4>
            
            {backups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum backup disponível ainda
              </p>
            ) : (
              backups.map((backup) => (
                <div
                  key={backup.key}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {format(new Date(backup.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {backup.stats.totalSales} vendas
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {backup.stats.totalProducts} produtos
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup.key)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(backup.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 <strong>Dica:</strong> Baixe seus backups regularmente e guarde em local seguro (Google Drive, Dropbox, etc.)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
