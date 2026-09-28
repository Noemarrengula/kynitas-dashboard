import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from './useAuditLog';
import { useStore } from '@/store/useStore';
import { Invoice, InvoiceSeries, DocumentType } from '@/types';

function toInvoice(db: any): Invoice {
  return {
    id: db.id,
    businessId: db.business_id,
    saleId: db.sale_id,
    originalInvoiceId: db.original_invoice_id,
    documentType: db.document_type,
    series: db.series,
    number: db.number,
    clientName: db.client_name,
    clientNuit: db.client_nuit,
    clientAddress: db.client_address,
    items: db.items || [],
    subtotal: db.subtotal,
    ivaRate: db.iva_rate ?? 16,
    ivaAmount: db.iva_amount ?? 0,
    withholdingTax: db.withholding_tax ?? 0,
    total: db.total,
    atcud: db.atcud,
    hash: db.hash,
    hashPrev: db.hash_prev,
    qrCodeData: db.qr_code_data,
    status: db.status || 'draft',
    cancellationReason: db.cancellation_reason,
    reason: db.reason,
    printedCount: db.printed_count ?? 0,
    createdBy: db.created_by,
    createdAt: db.created_at,
    issuedAt: db.issued_at,
    cancelledAt: db.cancelled_at,
    updatedAt: db.updated_at,
  };
}

function toInvoiceSeries(db: any): InvoiceSeries {
  return {
    id: db.id,
    businessId: db.business_id,
    code: db.code,
    prefix: db.prefix,
    currentNumber: db.current_number,
    startNumber: db.start_number,
    documentType: db.document_type,
    isDefault: db.is_default || false,
    active: db.active ?? true,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function upsertInvoiceInStore(invoice: Invoice) {
  useStore.getState().setInvoices(
    [invoice, ...useStore.getState().invoices.filter(i => i.id !== invoice.id)]
  );
}

export function useInvoices() {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const { log: auditLog } = useAuditLog();
  const invoices = useStore(s => s.invoices);
  const invoiceSeries = useStore(s => s.invoiceSeries);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [invoicesRes, seriesRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoice_series')
          .select('*')
          .eq('business_id', currentBusiness.id),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (seriesRes.error) throw seriesRes.error;

      useStore.getState().setInvoices((invoicesRes.data || []).map(toInvoice));
      useStore.getState().setInvoiceSeries((seriesRes.data || []).map(toInvoiceSeries));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar facturas';
      setError(message);
      toast({ title: 'Erro ao carregar facturas', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const issueInvoice = useCallback(async (saleId: string, documentType: DocumentType, clientInfo?: { name?: string; nuit?: string; address?: string }) => {
    if (!currentBusiness?.id) return { data: null, error: 'Negócio não encontrado' };

    try {
      const { data, error } = await supabase.rpc('issue_invoice', {
        p_business_id: currentBusiness.id,
        p_sale_id: saleId,
        p_document_type: documentType,
        p_client_name: clientInfo?.name || null,
        p_client_nuit: clientInfo?.nuit || null,
        p_client_address: clientInfo?.address || null,
      });

      if (error) throw error;

      const invoice = toInvoice(data.invoice);
      upsertInvoiceInStore(invoice);

      if (data.existing) {
        toast({ description: `Factura já emitida para esta venda: ${invoice.series}-${String(invoice.number).padStart(4, '0')}` });
      } else {
        toast({ title: 'Factura emitida', description: `${invoice.series}-${String(invoice.number).padStart(4, '0')}` });
        auditLog('invoice', 'invoices', invoice.id, { documentType, series: invoice.series, number: invoice.number, total: invoice.total });
      }

      return { data: invoice, error: null, existing: Boolean(data.existing) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao emitir factura';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      return { data: null, error: message };
    }
  }, [currentBusiness?.id, toast, auditLog]);

  const issueCreditNote = useCallback(async (originalInvoiceId: string, reason?: string) => {
    if (!currentBusiness?.id) return { data: null, error: 'Negócio não encontrado' };

    try {
      const { data, error } = await supabase.rpc('issue_credit_note', {
        p_business_id: currentBusiness.id,
        p_original_invoice_id: originalInvoiceId,
        p_reason: reason || null,
      });

      if (error) throw error;

      const invoice = toInvoice(data.invoice);
      upsertInvoiceInStore(invoice);

      if (data.existing) {
        toast({ description: `Nota de crédito já emitida: ${invoice.series}-${String(invoice.number).padStart(4, '0')}` });
      } else {
        toast({ title: 'Nota de crédito emitida', description: `${invoice.series}-${String(invoice.number).padStart(4, '0')}` });
        auditLog('credit_note', 'invoices', invoice.id, { originalInvoiceId, series: invoice.series, number: invoice.number, total: invoice.total });
      }

      return { data: invoice, error: null, existing: Boolean(data.existing) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao emitir nota de crédito';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      return { data: null, error: message };
    }
  }, [currentBusiness?.id, toast, auditLog]);

  const cancelInvoice = useCallback(async (invoiceId: string, reason?: string) => {
    if (!currentBusiness?.id) return { error: 'Negócio não encontrado' };

    try {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'cancelled', cancellation_reason: reason || '', cancelled_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .eq('business_id', currentBusiness.id);

      if (updateError) throw updateError;

      useStore.getState().updateInvoice(invoiceId, { status: 'cancelled', cancellationReason: reason });

      toast({ title: 'Factura cancelada', variant: 'destructive' });
      auditLog('delete', 'invoices', invoiceId, { reason });
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar factura';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      return { error: message };
    }
  }, [currentBusiness?.id, toast]);

  const reprintInvoice = useCallback(async (invoiceId: string) => {
    if (!currentBusiness?.id) return { error: 'Negócio não encontrado' };

    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !data) return { error: 'Factura não encontrada' };

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ printed_count: (data.printed_count || 0) + 1 })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      useStore.getState().updateInvoice(invoiceId, { printedCount: (data.printed_count || 0) + 1 });
      auditLog('reprint', 'invoices', invoiceId, { series: data.series, number: data.number });

      return { data: toInvoice(data), error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao reimprimir';
      return { error: message };
    }
  }, [currentBusiness?.id, auditLog]);

  return {
    invoices,
    invoiceSeries,
    loading,
    error,
    loadData,
    issueInvoice,
    issueCreditNote,
    cancelInvoice,
    reprintInvoice,
  };
}
