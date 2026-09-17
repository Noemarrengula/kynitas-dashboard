import { useState, useEffect, useCallback } from 'react';
import { Download, RotateCcw, HardDrive, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDatabase } from '@/hooks/useDatabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { listBackups, downloadBackup as dlBackup } from '@/hooks/useAutoBackup';
import { exportTableData } from '@/lib/exportData';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

type BackupEntry = {
  key: string;
  date: string;
  stats: { totalSales: number; totalProducts: number };
};

const exportOptions = [
  { value: 'sales', label: 'Vendas', tables: ['sales', 'orders'] as const },
  { value: 'products', label: 'Produtos', tables: ['products'] as const },
  { value: 'inventory', label: 'Inventário', tables: ['ingredients', 'stock_movements'] as const },
  { value: 'customers', label: 'Clientes', tables: ['customers'] as const },
  { value: 'credits', label: 'Créditos', tables: ['credits'] as const },
  { value: 'invoices', label: 'Facturas', tables: ['invoices'] as const },
] as const;

export default function Backup() {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const { loading, loadAllData } = useDatabase();
  const store = useStore();
  const { t } = useI18n();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [exporting, setExporting] = useState<string | null>(null);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const refreshBackups = useCallback(() => {
    if (!currentBusiness?.id) return;
    setBackups(listBackups(currentBusiness.id) as BackupEntry[]);
  }, [currentBusiness?.id]);

  useEffect(() => { refreshBackups(); }, [refreshBackups]);

  const handleCreateBackup = async () => {
    if (!currentBusiness?.id) return;
    setCreatingBackup(true);
    try {
      const businessId = currentBusiness.id;
      const timestamp = new Date().toISOString();
      const date = timestamp.split('T')[0];

      const [salesRes, productsRes, ingredientsRes, customersRes, creditsRes, invoicesRes] =
        await Promise.all([
          supabase.from('sales').select('*').eq('business_id', businessId),
          supabase.from('products').select('*').eq('business_id', businessId),
          supabase.from('ingredients').select('*').eq('business_id', businessId),
          supabase.from('customers').select('*').eq('business_id', businessId),
          supabase.from('credits').select('*').eq('business_id', businessId),
          supabase.from('invoices').select('*').eq('business_id', businessId),
        ]);

      const backupData = {
        version: '2.0',
        businessId,
        businessName: currentBusiness.name,
        timestamp,
        data: {
          sales: salesRes.data || [],
          products: productsRes.data || [],
          ingredients: ingredientsRes.data || [],
          customers: customersRes.data || [],
          credits: creditsRes.data || [],
          invoices: invoicesRes.data || [],
        },
        stats: {
          totalSales: salesRes.data?.length || 0,
          totalProducts: productsRes.data?.length || 0,
          totalIngredients: ingredientsRes.data?.length || 0,
          totalCustomers: customersRes.data?.length || 0,
          totalCredits: creditsRes.data?.length || 0,
          totalInvoices: invoicesRes.data?.length || 0,
        },
      };

      const backupKey = `backup_${businessId}_${date}_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      refreshBackups();
      toast({ title: 'Backup criado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao criar backup', variant: 'destructive' });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleExport = async (key: typeof exportOptions[number]['value']) => {
    setExporting(key);
    try {
      const option = exportOptions.find(o => o.value === key);
      if (!option) return;

      const dataMap: Record<string, unknown[]> = {
        sales: store.sales.map(s => ({ id: s.id, total: s.total, paymentMethod: s.paymentMethod, status: s.status, createdAt: s.createdAt })),
        products: store.products.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category, stock: p.stock, ivaRate: p.ivaRate })),
        ingredients: store.ingredients.map(i => ({ id: i.id, name: i.name, stock: i.stock, unit: i.unit, minStock: i.minStock })),
        customers: store.credits.map(c => ({ id: c.id, name: c.name, phone: c.phone, totalCredit: c.totalCredit })),
        credits: store.credits.map(c => ({ id: c.id, name: c.name, totalCredit: c.totalCredit, lastPayment: c.lastPayment })),
        invoices: store.invoices.map(i => ({ id: i.id, series: i.series, number: i.number, clientName: i.clientName, total: i.total, status: i.status, createdAt: i.createdAt })),
      };

      const rows = dataMap[key] || [];
      exportTableData(rows as Record<string, unknown>[], `${key}_${new Date().toISOString().slice(0, 10)}`, exportFormat);
      toast({ title: `${option.label} exportados como ${exportFormat.toUpperCase()}` });
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('page.backupExport')}</h1>
          <p className="text-muted-foreground">Gerir backups e exportar dados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshBackups}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
          <Button onClick={handleCreateBackup} disabled={creatingBackup}>
            <HardDrive className="h-4 w-4 mr-2" />
            {creatingBackup ? 'A criar...' : 'Criar Backup'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" /> Backups ({backups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum backup encontrado. Crie o primeiro backup manualmente.
              </p>
            ) : (
              <div className="space-y-2">
                {backups.slice(0, 10).map(entry => (
                  <div key={entry.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="text-sm">
                      <p className="font-medium">{new Date(entry.date).toLocaleString('pt-MZ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.stats.totalSales} vendas · {entry.stats.totalProducts} produtos
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => dlBackup(entry.key)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" /> Exportar Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={exportFormat} onValueChange={v => setExportFormat(v as 'json' | 'csv')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel compatível)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {exportOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(opt.value)}
                  disabled={exporting === opt.value}
                  className="justify-start"
                >
                  <Download className="h-3 w-3 mr-2" />
                  {exporting === opt.value ? '...' : opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="h-5 w-5" /> Restauro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Selecciona um backup para restaurar os dados. Isto irá substituir os dados actuais no servidor.
          </p>
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cria um backup primeiro.</p>
          ) : (
            <div className="space-y-2">
              {backups.slice(0, 5).map(entry => (
                <div key={entry.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm">{new Date(entry.date).toLocaleString('pt-MZ')}</span>
                  <Button variant="destructive" size="sm" onClick={() => {
                    if (confirm('Tens a certeza? Isto irá substituir os dados actuais.')) {
                      const data = JSON.parse(localStorage.getItem(entry.key) || '{}').data;
                      if (data) {
                        toast({ title: 'Restauro manual — usa o Supabase para reimportar o ficheiro JSON descarregado.' });
                      }
                    }
                  }}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
