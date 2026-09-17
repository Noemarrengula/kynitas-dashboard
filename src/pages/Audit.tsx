import { useState, useEffect } from 'react';
import { ClipboardList, Search, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Pagination } from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/lib/supabase';
import type { AuditEntry } from '@/hooks/useAuditLog';

const actionLabels: Record<string, string> = {
  create: 'Criação',
  update: 'Actualização',
  delete: 'Eliminação',
  sale: 'Venda',
  payment: 'Pagamento',
  stock_adjust: 'Ajuste Stock',
  export: 'Exportação',
  backup: 'Backup',
  invoice: 'Factura',
};

const entityLabels: Record<string, string> = {
  products: 'Produto',
  sales: 'Venda',
  ingredients: 'Ingrediente',
  credits: 'Crédito',
  customers: 'Cliente',
  invoices: 'Factura',
  goals: 'Meta',
  backup: 'Backup',
};

export default function Audit() {
  const { currentBusiness } = useBusiness();
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const loadLogs = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const query = supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false })
        .limit(200);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        businessId: r.business_id as string,
        userId: r.user_id as string,
        userName: r.user_name as string,
        action: r.action as string,
        entity: r.entity as string,
        entityId: r.entity_id as string,
        details: r.details as Record<string, unknown>,
        createdAt: r.created_at as string,
      }));

      setLogs(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [currentBusiness?.id]);

  const filtered = logs.filter(l => {
    if (entityFilter !== 'all' && l.entity !== entityFilter) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.userName?.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || l.entityId?.toLowerCase().includes(q);
    }
    return true;
  });

  const pagination = usePagination(filtered, 20);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.audit')}</h1>
          <p className="text-muted-foreground">Registo de actividades do sistema</p>
        </div>
        <Button variant="outline" onClick={loadLogs}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10 h-9" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Entidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(entityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Acção" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(actionLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum registo de auditoria encontrado</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {pagination.paginatedItems.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{actionLabels[log.action] || log.action}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{entityLabels[log.entity] || log.entity}</span>
                        {log.entityId && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="font-mono text-xs text-muted-foreground">#{log.entityId.slice(0, 8)}</span>
                          </>
                        )}
                      </div>
                      {log.userName && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          por {log.userName} · {new Date(log.createdAt).toLocaleString('pt-MZ')}
                        </p>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="text-xs text-muted-foreground shrink-0">
                        <summary className="cursor-pointer hover:text-foreground">Detalhes</summary>
                        <pre className="mt-1 p-2 bg-muted rounded max-w-xs overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.handlePageChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
