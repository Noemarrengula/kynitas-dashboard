import { useState, useMemo } from 'react';
import { FileText, Search, XCircle, Printer, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useInvoices } from '@/hooks/useInvoices';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { printInvoice } from '@/lib/invoice';
import { InvoiceA4 } from '@/components/invoice/InvoiceA4';
import { Invoice, DocumentType } from '@/types';
import { formatCurrency } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  issued: 'Emitida',
  cancelled: 'Cancelada',
};

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  issued: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const docTypeLabels: Record<string, string> = {
  FT: 'Factura',
  FS: 'Factura Simplificada',
  FC: 'Factura Consumidor Final',
  NC: 'Nota de Crédito',
};

const ITEMS_PER_PAGE = 20;

export default function Invoices() {
  const { invoices, loading, cancelInvoice, reprintInvoice } = useInvoices();
  const { business } = useBusiness();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [a4Invoice, setA4Invoice] = useState<Invoice | null>(null);

  const safeSearch = search.toLowerCase();

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = !safeSearch ||
        inv.series.toLowerCase().includes(safeSearch) ||
        String(inv.number).includes(safeSearch) ||
        (inv.clientName || '').toLowerCase().includes(safeSearch) ||
        (inv.clientNuit || '').includes(safeSearch);
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, safeSearch, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCancel = async (invoice: Invoice) => {
    if (!confirm(`Cancelar ${docTypeLabels[invoice.documentType]} ${invoice.series}-${invoice.number}?`)) return;
    setCancellingId(invoice.id);
    await cancelInvoice(invoice.id);
    setCancellingId(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.invoices')}</h1>
          <p className="text-muted-foreground">{invoices.length} documentos</p>
        </div>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por série, nº, cliente..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'issued', 'draft', 'cancelled'].map(s => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setFilterStatus(s); setPage(1); }}
            >
              {s === 'all' ? 'Todas' : statusLabels[s]}
            </Button>
          ))}
        </div>
      </div>

      {paginated.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma factura encontrada</p>
            <p className="text-sm text-muted-foreground">As facturas aparecerão aqui após emitidas nas vendas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="list-panel space-y-3">
          {paginated.map(invoice => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{docTypeLabels[invoice.documentType]}</span>
                      <span className="text-muted-foreground">{invoice.series}-{String(invoice.number).padStart(4, '0')}</span>
                      <Badge className={statusColors[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString('pt-MZ')}
                      {invoice.clientName && ` · ${invoice.clientName}`}
                      {invoice.clientNuit && ` · NUIT: ${invoice.clientNuit}`}
                    </div>
                    {invoice.saleId && (
                      <div className="text-xs text-muted-foreground">Venda: {invoice.saleId.slice(0, 8)}</div>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">{formatCurrency(invoice.total)}</div>
                    <div className="text-xs text-muted-foreground">IVA: {formatCurrency(invoice.ivaAmount)}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                  <Button variant="outline" size="sm" onClick={async () => {
                    const result = await reprintInvoice(invoice.id);
                    if (result.data) printInvoice(result.data, business);
                  }}>
                    <Printer className="h-4 w-4 mr-1" /> Térmico
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setA4Invoice(invoice)}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> A4
                  </Button>
                  {invoice.status === 'issued' && (
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleCancel(invoice)} disabled={cancellingId === invoice.id}>
                      <XCircle className="h-4 w-4 mr-1" /> {cancellingId === invoice.id ? 'A cancelar...' : 'Cancelar'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!a4Invoice} onOpenChange={v => !v && setA4Invoice(null)}>
        <DialogContent className="max-w-4xl print:max-w-full print:shadow-none print:border-none">
          {a4Invoice && <InvoiceA4 invoice={a4Invoice} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
