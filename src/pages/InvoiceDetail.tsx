import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, FileSpreadsheet, XCircle, FileText, ReceiptText, CalendarDays, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useInvoices } from '@/hooks/useInvoices';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { printInvoice } from '@/lib/invoice';
import { InvoiceA4 } from '@/components/invoice/InvoiceA4';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  card: 'Cartão',
};

const statusVariant: Record<string, 'success' | 'warning' | 'destructive'> = {
  draft: 'warning',
  issued: 'success',
  cancelled: 'destructive',
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, loading, loadData, reprintInvoice, issueCreditNote, cancelInvoice } = useInvoices();
  const { business } = useBusiness();
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);
  const [showA4, setShowA4] = useState(false);
  const [sale, setSale] = useState<any>(null);

  const invoice = invoices.find(i => i.id === id);
  const creditNotes = invoices.filter(i => i.originalInvoiceId === id && i.documentType === 'NC');
  const hasCreditNote = creditNotes.length > 0;
  const original = invoice?.originalInvoiceId ? invoices.find(i => i.id === invoice.originalInvoiceId) : undefined;

  useEffect(() => {
    if (!id) return;
    const exists = invoices.some(i => i.id === id);
    if (!exists && !loading) loadData();
  }, [id, invoices, loading, loadData]);

  useEffect(() => {
    if (!invoice?.saleId) {
      setSale(null);
      return;
    }
    supabase
      .from('sales')
      .select('*')
      .eq('id', invoice.saleId)
      .single()
      .then(res => setSale(res.data ?? null));
  }, [invoice?.saleId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!invoice) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={FileText}
            title={t('invoice.notFound')}
            description={t('invoice.notInList')}
          />
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => { loadData(); navigate('/invoices'); }}>
              {t('invoice.back')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const docLabel = invoice.documentType === 'FT'
    ? t('invoice.docType.FT')
    : invoice.documentType === 'FS'
      ? t('invoice.docType.FS')
      : invoice.documentType === 'FC'
        ? t('invoice.docType.FC')
        : t('invoice.docType.NC');

  const docNumber = `${invoice.series}-${String(invoice.number).padStart(4, '0')}`;

  const paymentMethods = sale?.payment_details
    ? Object.entries(sale.payment_details)
        .filter(([k, v]) => METHOD_LABELS[k] && (v as number) > 0)
        .map(([k, v]) => `${METHOD_LABELS[k]} ${formatCurrency(v as number)}`)
    : [];

  const handlePrint = async () => {
    setBusy(true);
    const result = await reprintInvoice(invoice.id);
    setBusy(false);
    if (result.data) printInvoice(result.data, business);
  };

  const handleCreditNote = async () => {
    setBusy(true);
    await issueCreditNote(invoice.id);
    setBusy(false);
  };

  const handleCancel = async () => {
    setBusy(true);
    await cancelInvoice(invoice.id);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t('invoice.back')}
          </Button>
          <h1 className="text-xl font-bold">{docLabel} · {docNumber}</h1>
          <StatusBadge variant={statusVariant[invoice.status] ?? 'neutral'} dot>
            {t(`invoice.status.${invoice.status}`)}
          </StatusBadge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={busy} onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> {t('invoice.printAgain')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowA4(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> {t('invoices.printA4')}
          </Button>
          {invoice.status === 'issued' && invoice.documentType !== 'NC' && !hasCreditNote && (
            <Button variant="outline" size="sm" disabled={busy} onClick={handleCreditNote}>
              <ReceiptText className="h-4 w-4 mr-1" /> {t('invoices.creditNote')}
            </Button>
          )}
          {invoice.status === 'issued' && (
            <Button variant="outline" size="sm" className="text-red-600" disabled={busy} onClick={handleCancel}>
              <XCircle className="h-4 w-4 mr-1" /> {t('invoices.cancel')}
            </Button>
          )}
        </div>
      </div>

      {/* Relacionamentos documentais */}
      {(original || creditNotes.length > 0 || invoice.saleId) && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {invoice.saleId && (
              <span className="text-muted-foreground">
                {t('invoice.sale')}: <span className="font-mono">{invoice.saleId.slice(0, 8)}</span>
              </span>
            )}
            {invoice.originalInvoiceId && original && (
              <Link to={`/invoices/${original.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                {t('invoice.original')}: {original.series}-{String(original.number).padStart(4, '0')}
              </Link>
            )}
            {creditNotes.map(nc => (
              <Link key={nc.id} to={`/invoices/${nc.id}`} className="inline-flex items-center gap-1 text-warning hover:underline">
                {t('invoice.creditNoteOf')}: {nc.series}-{String(nc.number).padStart(4, '0')}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Itens */}
          <Card className="list-panel">
            <CardHeader>
              <CardTitle>{t('invoice.items')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t('invoice.qty')}</TableHead>
                    <TableHead>{t('invoice.product')}</TableHead>
                    <TableHead className="text-right">{t('invoice.unitPrice')}</TableHead>
                    <TableHead className="text-right">{t('invoice.ivaRate')}</TableHead>
                    <TableHead className="text-right">{t('invoice.ivaAmount')}</TableHead>
                    <TableHead className="text-right">{t('invoice.lineTotal')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoice.items || []).map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{item.ivaRate ?? 16}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.ivaAmount || 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <div className="w-72 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{t('invoice.subtotal')}</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('invoice.vat')} ({invoice.ivaRate || 16}%)</span>
                    <span>{formatCurrency(invoice.ivaAmount)}</span>
                  </div>
                  {invoice.withholdingTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{t('invoice.withholding')}</span>
                      <span>-{formatCurrency(invoice.withholdingTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-1">
                    <span>{t('invoice.grandTotal')}</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>{t('invoice.customer')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {invoice.clientName ? (
                <>
                  <p className="font-semibold">{invoice.clientName}</p>
                  {invoice.clientNuit && <p>{t('invoice.nuit')}: {invoice.clientNuit}</p>}
                  {invoice.clientAddress && <p>{t('invoice.address')}: {invoice.clientAddress}</p>}
                </>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {/* Emissão */}
          <Card>
            <CardHeader>
              <CardTitle>{t('invoice.documentIssued')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('invoice.type')}</span>
                <span>{docLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('invoice.series')}</span>
                <span className="font-mono">{invoice.series}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('invoice.number')}</span>
                <span className="font-mono">{String(invoice.number).padStart(4, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('invoice.issueDate')}</span>
                <span>{new Date(invoice.issuedAt || invoice.createdAt).toLocaleString('pt-MZ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('invoice.prints')}</span>
                <span>{invoice.printedCount}</span>
              </div>
              {invoice.reason && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('invoice.reason')}</span>
                  <span>{invoice.reason}</span>
                </div>
              )}
              {invoice.atcud && (
                <div className="pt-2">
                  <p className="text-muted-foreground text-xs">ATCUD</p>
                  <p className="font-mono text-xs break-all">{invoice.atcud}</p>
                </div>
              )}
              {invoice.hash && (
                <div className="pt-1">
                  <p className="text-muted-foreground text-xs flex items-center gap-1"><Hash className="h-3 w-3" /> Hash</p>
                  <p className="font-mono text-xs break-all">{invoice.hash}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>{t('invoice.payment')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {paymentMethods.length > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('invoice.method')}</span>
                    <span>{paymentMethods.join(' + ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('invoice.grandTotal')}</span>
                    <span className="font-semibold">{formatCurrency(sale?.total ?? invoice.total)}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">{t('invoice.noSale')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showA4} onOpenChange={v => !v && setShowA4(false)}>
        <DialogContent className="max-w-4xl print:max-w-full print:shadow-none print:border-none">
          {showA4 && <InvoiceA4 invoice={invoice} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}