import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, XCircle, Printer, ChevronLeft, ChevronRight, FileSpreadsheet, ReceiptText, BadgeDollarSign, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoices } from '@/hooks/useInvoices';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { printInvoice } from '@/lib/invoice';
import { InvoiceA4 } from '@/components/invoice/InvoiceA4';
import { Invoice } from '@/types';
import { formatCurrency } from '@/lib/utils';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'neutral' | 'info'> = {
  draft: 'warning',
  issued: 'success',
  cancelled: 'destructive',
};

const ITEMS_PER_PAGE = 20;

export default function Invoices() {
  const { invoices, loading, error, loadData, cancelInvoice, reprintInvoice, issueCreditNote, invoiceSeries } = useInvoices();
  const { business } = useBusiness();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeries, setFilterSeries] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [a4Invoice, setA4Invoice] = useState<Invoice | null>(null);

  const docTypeLabel = (dt: string): string => {
    const key = `invoice.docType.${dt}` as const;
    const label = t(key);
    return label === key ? dt : label;
  };

  const safeSearch = search.toLowerCase();

  const stats = useMemo(() => {
    const issued = invoices.filter(i => i.status === 'issued');
    const faturas = issued.filter(i => i.documentType !== 'NC');
    const creditNotes = issued.filter(i => i.documentType === 'NC');
    return {
      issued: issued.length,
      billed: faturas.reduce((s, i) => s + (i.total || 0), 0),
      vat: faturas.reduce((s, i) => s + (i.ivaAmount || 0), 0),
      creditNotes: creditNotes.reduce((s, i) => s + (i.total || 0), 0),
      cancelled: invoices.filter(i => i.status === 'cancelled').length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = !safeSearch ||
        inv.series.toLowerCase().includes(safeSearch) ||
        String(inv.number).includes(safeSearch) ||
        (inv.clientName || '').toLowerCase().includes(safeSearch) ||
        (inv.clientNuit || '').includes(safeSearch);
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
      const matchesType = filterType === 'all' || inv.documentType === filterType;
      const matchesSeries = filterSeries === 'all' || inv.series === filterSeries;
      const createdAt = new Date(inv.createdAt);
      const matchesFrom = !fromDate || createdAt >= new Date(fromDate + 'T00:00:00');
      const matchesTo = !toDate || createdAt <= new Date(toDate + 'T23:59:59');
      return matchesSearch && matchesStatus && matchesType && matchesSeries && matchesFrom && matchesTo;
    });
  }, [invoices, safeSearch, filterStatus, filterType, filterSeries, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterType, filterSeries, fromDate, toDate]);

  const handlePrint = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    const result = await reprintInvoice(invoice.id);
    setBusyId(null);
    if (result.data) printInvoice(result.data, business);
  };

  const handleCreditNote = async (invoice: Invoice) => {
    const label = `${docTypeLabel(invoice.documentType)} ${invoice.series}-${String(invoice.number).padStart(4, '0')}`;
    if (!confirm(t('invoices.confirmCreditNote', { doc: docTypeLabel(invoice.documentType), number: `${invoice.series}-${String(invoice.number).padStart(4, '0')}` }))) return;
    setBusyId(invoice.id);
    await issueCreditNote(invoice.id);
    setBusyId(null);
  };

  const handleCancel = async (invoice: Invoice) => {
    if (!confirm(t('invoices.confirmCancel', { doc: docTypeLabel(invoice.documentType), number: `${invoice.series}-${String(invoice.number).padStart(4, '0')}` }))) return;
    setBusyId(invoice.id);
    await cancelInvoice(invoice.id);
    setBusyId(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const kpis = [
    { icon: ReceiptText, label: t('invoices.kpiIssued'), value: String(stats.issued), tone: 'text-primary bg-primary/10' },
    { icon: BadgeDollarSign, label: t('invoices.kpiBilled'), value: formatCurrency(stats.billed), tone: 'text-success bg-success/10' },
    { icon: FileText, label: t('invoices.kpiVat'), value: formatCurrency(stats.vat), tone: 'text-info bg-info/10' },
    { icon: Landmark, label: t('invoices.kpiCreditNotes'), value: formatCurrency(stats.creditNotes), tone: 'text-warning bg-warning/10' },
    { icon: XCircle, label: t('invoices.kpiCancelled'), value: String(stats.cancelled), tone: 'text-destructive bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.invoices')}
        description={`${invoices.length} ${invoices.length === 1 ? 'documento' : 'documentos'}`}
      />

      {/* Dashboard — dados reais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${k.tone}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por série, nº, cliente, NUIT..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('invoices.allTypes')}</SelectItem>
            <SelectItem value="issued">{t('invoice.status.issued')}</SelectItem>
            <SelectItem value="draft">{t('invoice.status.draft')}</SelectItem>
            <SelectItem value="cancelled">{t('invoice.status.cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('invoices.allTypes')}</SelectItem>
            {(['FT', 'FS', 'FC', 'NC'] as const).map(dt => (
              <SelectItem key={dt} value={dt}>{docTypeLabel(dt)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSeries} onValueChange={setFilterSeries}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('invoices.allSeries')}</SelectItem>
            {invoiceSeries.map(s => (
              <SelectItem key={s.id} value={s.prefix}>{s.prefix}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input type="date" className="w-40" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <span className="text-sm text-muted-foreground">{t('invoices.to')}</span>
          <Input type="date" className="w-40" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      {error && paginated.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-muted-foreground">{t('invoices.loadError')}</p>
            <Button variant="outline" onClick={() => loadData()}>
              {t('invoices.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : paginated.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title={t('invoices.noDocuments')}
              description={t('invoices.emptyDescription')}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="list-panel space-y-3">
          {paginated.map(invoice => (
            <Card key={invoice.id}>
              <CardContent className="p-4 cursor-pointer" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{docTypeLabel(invoice.documentType)}</span>
                      <span className="text-muted-foreground">{invoice.series}-{String(invoice.number).padStart(4, '0')}</span>
                      <StatusBadge variant={statusVariant[invoice.status] ?? 'neutral'} dot>
                        {t(`invoice.status.${invoice.status}` as const)}
                      </StatusBadge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString('pt-MZ')}
                      {invoice.clientName && ` · ${invoice.clientName}`}
                      {invoice.clientNuit && ` · NUIT: ${invoice.clientNuit}`}
                    </div>
                    {invoice.atcud && (
                      <div className="text-xs text-muted-foreground font-mono">ATCUD: {invoice.atcud}</div>
                    )}
                    {invoice.originalInvoiceId && (
                      <div className="text-xs text-muted-foreground">→ {t('invoice.original')}</div>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">{formatCurrency(invoice.total)}</div>
                    <div className="text-xs text-muted-foreground">{t('invoices.kpiVat')}: {formatCurrency(invoice.ivaAmount)}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm" disabled={busyId === invoice.id} onClick={() => handlePrint(invoice)}>
                    <Printer className="h-4 w-4 mr-1" /> {t('invoices.printThermal')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setA4Invoice(invoice)}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> {t('invoices.printA4')}
                  </Button>
                  {invoice.status === 'issued' && invoice.documentType !== 'NC' && (
                    <Button variant="outline" size="sm" disabled={busyId === invoice.id} onClick={() => handleCreditNote(invoice)}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" /> {t('invoices.creditNote')}
                    </Button>
                  )}
                  {invoice.status === 'issued' && (
                    <Button variant="outline" size="sm" className="text-red-600" disabled={busyId === invoice.id} onClick={() => handleCancel(invoice)}>
                      <XCircle className="h-4 w-4 mr-1" /> {t('invoices.cancel')}
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