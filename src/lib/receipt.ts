export const formatCurrency = (value: number) => `${value.toFixed(2)} MT`;

export const centerText = (text: string, width = 48) => {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
};

export const line = (char: string, width = 48) => char.repeat(width);

export const formatLine = (left: string, right: string, width = 48) => {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
};

interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  nuit?: string;
}

interface PaymentDetails {
  cash: number;
  mpesa: number;
  emola: number;
  card: number;
  total: number;
  change: number;
}

interface SaleForPrint {
  id: string;
  createdAt: string;
  sale_number?: string;
  tableId?: string;
  customer_name?: string;
  items: Array<{
    product?: { name?: string; price?: number } | null;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
  paymentDetails: PaymentDetails;
}

interface OrderItemForPrint {
  product?: { name?: string; price?: number } | null;
  quantity: number;
  subtotal: number;
}

export const buildReceiptLines = (sale: SaleForPrint, copyType: 'client' | 'merchant', business?: BusinessInfo | null) => {
  const receipt: string[] = [];
  receipt.push(centerText(business?.name || 'KYNITAS BAR'));
  receipt.push(centerText('Bar & Restaurante'));
  if (business?.address) receipt.push(centerText(business.address));
  if (business?.phone) receipt.push(centerText('Tel: ' + business.phone));
  if (business?.nuit) receipt.push(centerText('NUIT: ' + business.nuit));
  receipt.push('');
  receipt.push(line('='));
  receipt.push('');
  receipt.push('Data: ' + new Date(sale.createdAt).toLocaleString('pt-MZ'));
  receipt.push('Venda: #' + (sale.sale_number || sale.id.slice(0, 8).toUpperCase()));
  if (sale.tableId) receipt.push('Mesa: ' + sale.tableId);
  if (sale.customer_name) receipt.push('Cliente: ' + sale.customer_name);
  receipt.push('');
  receipt.push(line('-'));
  receipt.push('');
  receipt.push('ITENS:');
  receipt.push('');
  
  sale.items.forEach((item: any) => {
    receipt.push(item.product?.name ?? 'Produto');
    receipt.push(formatLine(`  ${item.quantity}x ${formatCurrency(item.product?.price ?? 0)}`, formatCurrency(item.subtotal)));
  });
  
  receipt.push('');
  receipt.push(line('-'));
  receipt.push('');
  receipt.push(formatLine('TOTAL:', formatCurrency(sale.total)));
  receipt.push('');
  receipt.push(line('-'));
  receipt.push('');
  receipt.push('PAGAMENTO:');
  receipt.push('');
  
  if (sale.paymentDetails.cash > 0) {
    receipt.push(formatLine('  Numerario:', formatCurrency(sale.paymentDetails.cash)));
  }
  if (sale.paymentDetails.mpesa > 0) {
    receipt.push(formatLine('  M-Pesa:', formatCurrency(sale.paymentDetails.mpesa)));
  }
  if (sale.paymentDetails.emola > 0) {
    receipt.push(formatLine('  E-Mola:', formatCurrency(sale.paymentDetails.emola)));
  }
  if (sale.paymentDetails.card > 0) {
    receipt.push(formatLine('  Cartao:', formatCurrency(sale.paymentDetails.card)));
  }
  
  receipt.push('');
  receipt.push(formatLine('Total Recebido:', formatCurrency(sale.paymentDetails.total)));
  
  if (sale.paymentDetails.change > 0) {
    receipt.push(formatLine('Troco:', formatCurrency(sale.paymentDetails.change)));
  }
  
  receipt.push('');
  receipt.push(line('='));
  receipt.push('');
  receipt.push(centerText(copyType === 'client' ? '*** COPIA DO CLIENTE ***' : '*** COPIA DO COMERCIANTE ***'));
  receipt.push('');
  receipt.push(centerText('Obrigado pela preferencia!'));
  receipt.push(centerText('Volte sempre!'));
  receipt.push('');
  receipt.push(centerText('Documento nao serve como fatura'));

  return receipt;
};

export const buildPreBillLines = (items: OrderItemForPrint[], tableName?: string, business?: BusinessInfo | null) => {
  const receipt: string[] = [];
  receipt.push(centerText(business?.name || 'KYNITAS BAR'));
  receipt.push(centerText('Bar & Restaurante'));
  receipt.push('');
  receipt.push(line('='));
  receipt.push('');
  receipt.push('Data: ' + new Date().toLocaleString('pt-MZ'));
  if (tableName) receipt.push('Mesa: ' + tableName);
  receipt.push('*** PRE-CONTA ***');
  receipt.push('');
  receipt.push(line('-'));
  receipt.push('');
  receipt.push('ITENS:');
  receipt.push('');
  
  items.forEach((item) => {
    receipt.push(item.product?.name ?? 'Produto');
    receipt.push(formatLine(`  ${item.quantity}x ${formatCurrency(item.product?.price ?? 0)}`, formatCurrency(item.subtotal)));
  });
  
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  receipt.push('');
  receipt.push(line('-'));
  receipt.push('');
  receipt.push(formatLine('TOTAL:', formatCurrency(total)));
  receipt.push('');
  receipt.push(line('='));
  receipt.push('');
  receipt.push(centerText('Obrigado pela preferencia!'));
  receipt.push('');
  receipt.push(centerText('Documento nao serve como fatura'));

  return receipt;
};

const RECEIPT_CSS = `@page { size: 80mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
body { font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.4; width: 80mm; margin: 0; padding: 5mm; background: #fff; color: #000; font-weight: bold; }
pre, strong { margin: 0; padding: 0; white-space: pre; font-family: inherit; font-size: inherit; color: #000; font-weight: bold; }
@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } body { padding: 2mm; background: #fff !important; color: #000 !important; font-weight: bold !important; } pre, strong { color: #000 !important; font-weight: bold !important; } }`;

export const wrapReceiptHTML = (receiptLines: string[]) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Recibo</title>
    <style>${RECEIPT_CSS}</style>
  </head>
  <body><pre><strong>${receiptLines.join('\n')}</strong></pre></body>
</html>`;

export const printReceipt = (sale: SaleForPrint, copyType: 'client' | 'merchant', business?: BusinessInfo | null) => {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    const lines = buildReceiptLines(sale, copyType, business);
    doc.open();
    doc.write(wrapReceiptHTML(lines));
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
    console.error('Erro ao imprimir:', error);
  }
};

export const printPreBill = (items: OrderItemForPrint[], tableName?: string, business?: BusinessInfo | null) => {
  if (items.length === 0) return;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    const lines = buildPreBillLines(items, tableName, business);
    doc.open();
    doc.write(wrapReceiptHTML(lines));
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
    console.error('Erro ao imprimir pre-conta:', error);
  }
};
