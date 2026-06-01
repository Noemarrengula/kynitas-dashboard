import { Sale } from '@/types';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface PrinterConfig {
  width: number;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  nuit?: string;
}

const defaultConfig: PrinterConfig = {
  width: 48,
  businessName: 'KYNITAS BAR',
  businessAddress: '',
  businessPhone: '',
};

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function line(char: string, width: number): string {
  return char.repeat(width);
}

function formatLine(left: string, right: string, width: number): string {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

export function generateReceipt(sale: Sale, config: Partial<PrinterConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  // Cabeçalho
  lines.push(centerText('================================', cfg.width));
  lines.push(centerText(cfg.businessName, cfg.width));
  lines.push(centerText('Bar & Restaurante', cfg.width));
  
  if (cfg.businessAddress) {
    lines.push(centerText(cfg.businessAddress, cfg.width));
  }
  if (cfg.businessPhone) {
    lines.push(centerText('Tel: ' + cfg.businessPhone, cfg.width));
  }
  if (cfg.nuit) {
    lines.push(centerText('NUIT: ' + cfg.nuit, cfg.width));
  }
  
  lines.push(centerText('================================', cfg.width));
  lines.push('');

  // Data e hora
  lines.push('Data: ' + format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: pt }));
  lines.push('Venda N.: #' + (sale.saleNumber || sale.id.slice(0, 8).toUpperCase()));
  if (sale.tableId) {
    lines.push('Mesa: ' + sale.tableId);
  }
  
  lines.push('');
  lines.push(line('-', cfg.width));
  lines.push(centerText('ITENS DA VENDA', cfg.width));
  lines.push(line('-', cfg.width));
  lines.push('');
  
  sale.items.forEach(item => {
    const name = item.product.name.substring(0, cfg.width);
    lines.push(name);
    
    const qty = `  ${item.quantity}x ${item.product.price.toFixed(2)} MT`;
    const subtotal = item.subtotal.toFixed(2) + ' MT';
    lines.push(formatLine(qty, subtotal, cfg.width));
    lines.push('');
  });

  lines.push(line('-', cfg.width));
  lines.push('');

  // Total
  const total = sale.total.toFixed(2) + ' MT';
  lines.push(formatLine('>>> TOTAL:', total + ' <<<', cfg.width));
  
  lines.push('');
  lines.push(line('=', cfg.width));
  lines.push('');

  // Pagamento - Mostrar métodos usados
  lines.push(centerText('DETALHES DO PAGAMENTO', cfg.width));
  lines.push(line('-', cfg.width));
  lines.push('');
  
  if (sale.paymentDetails.cash > 0) {
    lines.push(formatLine('  Numerario:', sale.paymentDetails.cash.toFixed(2) + ' MT', cfg.width));
  }
  if (sale.paymentDetails.mpesa > 0) {
    lines.push(formatLine('  M-Pesa:', sale.paymentDetails.mpesa.toFixed(2) + ' MT', cfg.width));
  }
  if (sale.paymentDetails.emola > 0) {
    lines.push(formatLine('  E-Mola:', sale.paymentDetails.emola.toFixed(2) + ' MT', cfg.width));
  }
  if (sale.paymentDetails.card > 0) {
    lines.push(formatLine('  Cartao:', sale.paymentDetails.card.toFixed(2) + ' MT', cfg.width));
  }
  
  const totalReceived = sale.paymentDetails.cash + sale.paymentDetails.mpesa + 
                        sale.paymentDetails.emola + sale.paymentDetails.card;
  
  lines.push('');
  lines.push(formatLine('Total Recebido:', totalReceived.toFixed(2) + ' MT', cfg.width));
  
  if (sale.paymentDetails.change > 0) {
    lines.push(formatLine('>>> Troco:', sale.paymentDetails.change.toFixed(2) + ' MT <<<', cfg.width));
  }

  lines.push('');
  lines.push(line('=', cfg.width));
  lines.push('');

  // Rodapé
  lines.push(centerText('Obrigado pela preferencia!', cfg.width));
  lines.push(centerText('Volte sempre!', cfg.width));
  lines.push('');
  lines.push(centerText('Documento nao serve como fatura', cfg.width));
  lines.push('');
  lines.push(centerText('www.marrengula-it.co.mz', cfg.width));

  return lines.join('\n');
}

export function generateSalesReport(sales: Sale[], period: string, config: Partial<PrinterConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  lines.push(centerText('RELATORIO DE VENDAS', cfg.width));
  lines.push(centerText(period, cfg.width));
  lines.push('');
  lines.push(line('=', cfg.width));
  lines.push('');

  const total = sales.reduce((acc, s) => acc + s.total, 0);
  const totalCash = sales.reduce((acc, s) => acc + s.paymentDetails.cash, 0);
  const totalMpesa = sales.reduce((acc, s) => acc + s.paymentDetails.mpesa, 0);
  const totalEmola = sales.reduce((acc, s) => acc + s.paymentDetails.emola, 0);
  const totalCard = sales.reduce((acc, s) => acc + s.paymentDetails.card, 0);

  lines.push('RESUMO:');
  lines.push(formatLine('Total Vendas:', sales.length.toString(), cfg.width));
  lines.push(formatLine('Receita Total:', total.toFixed(2) + ' MT', cfg.width));
  lines.push(formatLine('Ticket Medio:', (total / sales.length).toFixed(2) + ' MT', cfg.width));
  lines.push(line('-', cfg.width));

  lines.push('POR METODO:');
  lines.push(formatLine('Dinheiro:', totalCash.toFixed(2) + ' MT', cfg.width));
  lines.push(formatLine('M-Pesa:', totalMpesa.toFixed(2) + ' MT', cfg.width));
  lines.push(formatLine('E-Mola:', totalEmola.toFixed(2) + ' MT', cfg.width));
  lines.push(formatLine('Cartao:', totalCard.toFixed(2) + ' MT', cfg.width));
  lines.push(line('=', cfg.width));

  lines.push('');
  lines.push(centerText(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt }), cfg.width));

  return lines.join('\n');
}

export async function printToThermal(content: string): Promise<void> {
  const printWindow = window.open('', '', 'width=300,height=600');
  if (!printWindow) {
    throw new Error('Permita popups para imprimir');
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Recibo</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body { 
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            line-height: 1.4;
            width: 80mm;
            margin: 0;
            padding: 5mm;
            background: #fff;
            color: #000;
            font-weight: bold;
          }
          pre, strong { 
            margin: 0;
            padding: 0;
            white-space: pre;
            font-family: inherit;
            font-size: inherit;
            color: #000;
            font-weight: bold;
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body { 
              padding: 2mm;
              background: #fff !important;
              color: #000 !important;
              font-weight: bold !important;
            }
            pre, strong {
              color: #000 !important;
              font-weight: bold !important;
            }
          }
        </style>
      </head>
      <body><pre><strong>${content}</strong></pre></body>
    </html>
  `);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    setTimeout(() => printWindow.close(), 500);
  }, 250);
}
