import { Sale } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useBusiness } from '@/contexts/BusinessContext';

interface ReceiptPrintProps {
  sale: Sale;
  copyType?: 'client' | 'merchant';
}

export function ReceiptPrint({ sale, copyType = 'client' }: ReceiptPrintProps) {
  const { business } = useBusiness();
  const WIDTH = 48; // XPprinter Font A - 48 colunas (padrão)

  const clean = (str: string) => str
    .replace(/[áàãâ]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íì]/g, 'i')
    .replace(/[óòõô]/g, 'o')
    .replace(/[úù]/g, 'u')
    .replace(/ç/g, 'c');

  const pad = (left: string, right: string) => {
    const l = clean(left);
    const r = clean(right);
    const sp = WIDTH - l.length - r.length;
    return l + ' '.repeat(Math.max(1, sp)) + r;
  };

  const center = (text: string) => {
    const t = clean(text);
    const sp = Math.floor((WIDTH - t.length) / 2);
    return ' '.repeat(sp) + t;
  };

  const lines: string[] = [];
  
  // HEADER
  lines.push(center('================================'));
  lines.push(center(business?.name || 'KYNITAS BAR'));
  lines.push(center('Bar & Restaurante'));
  if (business?.address) lines.push(center(business.address));
  if (business?.phone) lines.push(center('Tel: ' + business.phone));
  if (business?.nuit) lines.push(center('NUIT: ' + business.nuit));
  lines.push(center('================================'));
  lines.push('');
  
  // INFO
  lines.push('Data: ' + format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm'));
  lines.push('Venda N.: #' + (sale.saleNumber || sale.id.slice(0, 8).toUpperCase()));
  if (sale.tableId) lines.push('Mesa: ' + sale.tableId);
  lines.push('');
  lines.push('------------------------------------------------');
  lines.push(center('ITENS DA VENDA'));
  lines.push('------------------------------------------------');
  lines.push('');
  
  // ITEMS
  if (sale.items && sale.items.length > 0) {
    sale.items.forEach(item => {
      const name = clean(item.product?.name || 'Item').substring(0, WIDTH);
      lines.push(name);
      
      const qty = item.quantity + 'x';
      const price = formatCurrency(item.product?.price || 0);
      const total = formatCurrency(item.subtotal);
      lines.push(pad('  ' + qty + ' ' + price, total));
      lines.push('');
    });
  }
  
  lines.push('------------------------------------------------');
  lines.push('');
  
  // TOTAL
  lines.push(pad('>>> TOTAL:', formatCurrency(sale.total) + ' <<<'));
  lines.push('');
  lines.push('================================================');
  lines.push('');
  
  // PAYMENT
  lines.push(center('DETALHES DO PAGAMENTO'));
  lines.push('------------------------------------------------');
  lines.push('');
  
  if (sale.paymentDetails.cash > 0) {
    lines.push(pad('  Numerario:', formatCurrency(sale.paymentDetails.cash)));
  }
  if (sale.paymentDetails.mpesa > 0) {
    lines.push(pad('  M-Pesa:', formatCurrency(sale.paymentDetails.mpesa)));
  }
  if (sale.paymentDetails.emola > 0) {
    lines.push(pad('  E-Mola:', formatCurrency(sale.paymentDetails.emola)));
  }
  if (sale.paymentDetails.card > 0) {
    lines.push(pad('  Cartao:', formatCurrency(sale.paymentDetails.card)));
  }
  
  lines.push('');
  lines.push(pad('Total Recebido:', formatCurrency(sale.paymentDetails.total)));
  
  if (sale.paymentDetails.change > 0) {
    lines.push(pad('>>> Troco:', formatCurrency(sale.paymentDetails.change) + ' <<<'));
  }
  
  lines.push('');
  lines.push('================================================');
  lines.push('');
  lines.push(center(copyType === 'client' ? '*** COPIA DO CLIENTE ***' : '*** COPIA DO COMERCIANTE ***'));
  lines.push('');
  lines.push('================================================');
  lines.push('');
  lines.push(center('Obrigado pela preferencia!'));
  lines.push(center('Volte sempre!'));
  lines.push('');
  lines.push(center('Documento nao serve como fatura'));
  lines.push('');
  lines.push(center('www.marrengula-it.co.mz'));

  return (
    <div style={{
      width: '80mm',
      margin: '0 auto',
      padding: '5mm',
      backgroundColor: '#ffffff',
      color: '#000',
      border: '1px solid #e5e7eb'
    }}>
      <pre style={{
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        lineHeight: '1.4',
        margin: 0,
        padding: 0,
        whiteSpace: 'pre',
        fontWeight: 'bold',
        color: '#000',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}><strong>{lines.join('\n')}</strong></pre>
    </div>
  );
}
