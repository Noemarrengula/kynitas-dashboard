import { Invoice, InvoiceItem } from '@/types';
import { formatCurrency, centerText, line, formatLine } from './receipt';

interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  nuit?: string;
}

function buildQRUrl(invoice: Invoice): string {
  const data = invoice.qrCodeData || [
    invoice.documentType,
    `${invoice.series}-${String(invoice.number).padStart(4, '0')}`,
    invoice.total.toFixed(2),
    invoice.ivaAmount.toFixed(2),
    invoice.atcud || '',
    invoice.hash || '',
    new Date(invoice.createdAt).toISOString(),
  ].join('|');
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
}

export const buildInvoiceLines = (invoice: Invoice, business?: BusinessInfo | null) => {
  const lines: string[] = [];
  lines.push(centerText(business?.name || ''));
  if (business?.address) lines.push(centerText(business.address));
  if (business?.phone) lines.push(centerText('Tel: ' + business.phone));
  if (business?.nuit) lines.push(centerText('NUIT: ' + business.nuit));
  lines.push('');
  lines.push(line('='));
  lines.push('');

  const docTypeLabel: Record<string, string> = {
    FT: 'FACTURA',
    FS: 'FACTURA SIMPLIFICADA',
    FC: 'FACTURA CONSUMIDOR FINAL',
    NC: 'NOTA DE CREDITO',
  };

  lines.push(centerText(docTypeLabel[invoice.documentType] || invoice.documentType));
  lines.push(centerText(`${invoice.series}-${String(invoice.number).padStart(4, '0')}`));
  lines.push('');
  lines.push(line('-'));
  lines.push('');

  lines.push('Data: ' + new Date(invoice.createdAt).toLocaleString('pt-MZ'));
  lines.push('Documento: ' + invoice.series + '-' + String(invoice.number).padStart(4, '0'));
  if (invoice.status === 'cancelled') {
    lines.push('*** CANCELADO ***');
    if (invoice.cancellationReason) lines.push('Motivo: ' + invoice.cancellationReason);
  }
  lines.push('');

  if (invoice.clientName) {
    lines.push(line('-'));
    lines.push('CLIENTE:');
    lines.push('  Nome: ' + invoice.clientName);
    if (invoice.clientNuit) lines.push('  NUIT: ' + invoice.clientNuit);
    if (invoice.clientAddress) lines.push('  Endereco: ' + invoice.clientAddress);
    lines.push('');
  }

  lines.push(line('-'));
  lines.push('');
  lines.push('ITENS:');
  lines.push('');

  (invoice.items || []).forEach((item: InvoiceItem) => {
    lines.push(item.productName);
    const qty = `${item.quantity}x ${formatCurrency(item.unitPrice)}`;
    const total = formatCurrency(item.total);
    lines.push('  ' + formatLine(qty, total));
  });

  lines.push('');
  lines.push(line('-'));
  lines.push('');

  const subtotal = (invoice.items || []).reduce((s: number, i: InvoiceItem) => s + i.total, 0);
  lines.push(formatLine('Subtotal:', formatCurrency(subtotal)));
  lines.push(formatLine('IVA (' + invoice.ivaRate + '%):', formatCurrency(invoice.ivaAmount)));
  if (invoice.withholdingTax > 0) {
    lines.push(formatLine('Retencao:', formatCurrency(invoice.withholdingTax)));
  }
  lines.push(line('-'));
  lines.push(formatLine('TOTAL:', formatCurrency(invoice.total)));

  lines.push('');
  lines.push(line('='));
  lines.push('');

  if (invoice.atcud) {
    lines.push('ATCUD: ' + invoice.atcud);
  }
  if (invoice.hash) {
    lines.push('Hash: ' + invoice.hash.slice(0, 20) + '...');
  }

  lines.push('');
  lines.push(centerText('QR Code:'));
  lines.push(centerText(buildQRUrl(invoice)));
  lines.push('');

  lines.push(line('='));
  lines.push('');
  lines.push(centerText('Documento fiscal'));
  lines.push(centerText('Processado por software certificado'));
  lines.push('');
  lines.push(centerText('Obrigado pela preferencia!'));

  return lines;
};

const INVOICE_CSS = `@page { size: 80mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.3; width: 80mm; margin: 0; padding: 5mm; background: #fff; color: #000; font-weight: bold; }
pre, strong { margin: 0; padding: 0; white-space: pre; font-family: inherit; font-size: inherit; color: #000; font-weight: bold; }
@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } body { padding: 2mm; background: #fff !important; color: #000 !important; font-weight: bold !important; } pre, strong { color: #000 !important; font-weight: bold !important; } }`;

export const wrapInvoiceHTML = (lines: string[]) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Factura</title>
    <style>${INVOICE_CSS}</style>
  </head>
  <body><pre><strong>${lines.join('\n')}</strong></pre></body>
</html>`;

export const printInvoice = (invoice: Invoice, business?: BusinessInfo | null) => {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const lines = buildInvoiceLines(invoice, business);
    doc.open();
    doc.write(wrapInvoiceHTML(lines));
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 100);
  } catch (error) {
    console.error('Erro ao imprimir factura:', error);
  }
};
