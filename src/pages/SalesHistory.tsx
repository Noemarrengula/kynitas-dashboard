import { useState, useMemo } from 'react';
import { History, Eye, Filter, Printer, Receipt } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/hooks/useDatabase';
import { SaleDetailsModal } from '@/components/sales/SaleDetailsModal';
import { SearchInput } from '@/components/SearchInput';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ExportButton } from '@/components/ExportButton';
import { Pagination } from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatSalesForExport } from '@/lib/export';
import { Sale } from '@/types';
import { format, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function SalesHistory() {
  const { sales, loading } = useDatabase();
  const { business } = useBusiness();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const reprintReceipt = (sale: Sale) => {
    const saleForPrint = {
      ...sale,
      items: sale.items,
      total: sale.total,
      paymentDetails: sale.payment_details || sale.paymentDetails,
      createdAt: sale.created_at || sale.createdAt,
      sale_number: sale.sale_number || sale.id.slice(0, 8)
    };

    printReceipt(saleForPrint, 'client');
    setTimeout(() => printReceipt(saleForPrint, 'merchant'), 500);
  };

  const printReceipt = (sale: any, copyType: 'client' | 'merchant') => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      
      doc.open();
      doc.write(generateReceiptHTML(sale, copyType));
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

  const generateReceiptHTML = (sale: any, copyType: 'client' | 'merchant') => {
    const formatCurrency = (value: number) => `${value.toFixed(2)} MT`;
    const centerText = (text: string, width = 48) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };
    const line = (char: string, width = 48) => char.repeat(width);
    const formatLine = (left: string, right: string, width = 48) => {
      const spaces = width - left.length - right.length;
      return left + ' '.repeat(Math.max(1, spaces)) + right;
    };

    const receipt = [];
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
    receipt.push('');
    receipt.push(line('-'));
    receipt.push('');
    receipt.push('ITENS:');
    receipt.push('');
    
    sale.items.forEach((item: any) => {
      receipt.push(item.product.name);
      receipt.push(formatLine(`  ${item.quantity}x ${formatCurrency(item.product.price)}`, formatCurrency(item.subtotal)));
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

    return `<!DOCTYPE html>
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
        <body><pre><strong>${receipt.join('\n')}</strong></pre></body>
      </html>`;
  };

  const printSalesReport = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    const totalVendas = filteredSales.length;
    const receitaTotal = filteredSales.reduce((acc, s) => acc + s.total, 0);
    
    let report = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Vendas</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.3;
              width: 80mm;
              padding: 5mm;
              background: white;
              color: #000;
            }
            h1 { font-size: 14px; text-align: center; margin-bottom: 10px; }
            h2 { font-size: 12px; margin: 10px 0 5px; border-bottom: 1px solid; }
            .line { border-top: 1px dashed; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .total { font-weight: bold; font-size: 12px; margin-top: 5px; }
            @media print {
              body { padding: 2mm; }
            }
          </style>
        </head>
        <body>
          <h1>RELATÓRIO DE VENDAS</h1>
          <div class="line"></div>
          <div class="row"><span>Data:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
          <div class="row"><span>Total Vendas:</span><span>${totalVendas}</span></div>
          <div class="row total"><span>Receita Total:</span><span>${formatCurrency(receitaTotal)}</span></div>
          <div class="line"></div>
          <h2>VENDAS</h2>`;
    
    filteredSales.forEach((sale) => {
      const createdAt = sale.created_at || sale.createdAt;
      const paymentDetails = sale.payment_details || sale.paymentDetails || {};
      const saleNumber = sale.sale_number || sale.id.slice(0, 8);
      let dateStr = '-';
      try {
        if (createdAt) {
          dateStr = format(new Date(createdAt), 'dd/MM HH:mm');
        }
      } catch (e) {
        dateStr = '-';
      }
      report += `
          <div style="margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc;">
            <div class="row"><span>${dateStr}</span><span>#${saleNumber}</span></div>
            <div class="row"><span>Total:</span><span>${formatCurrency(sale.total)}</span></div>
            ${paymentDetails.cash > 0 ? `<div class="row"><span>Numerário:</span><span>${formatCurrency(paymentDetails.cash)}</span></div>` : ''}
            ${paymentDetails.mpesa > 0 ? `<div class="row"><span>M-Pesa:</span><span>${formatCurrency(paymentDetails.mpesa)}</span></div>` : ''}
            ${paymentDetails.emola > 0 ? `<div class="row"><span>E-Mola:</span><span>${formatCurrency(paymentDetails.emola)}</span></div>` : ''}
            ${paymentDetails.card > 0 ? `<div class="row"><span>Cartão:</span><span>${formatCurrency(paymentDetails.card)}</span></div>` : ''}
          </div>`;
    });
    
    report += `
          <div class="line"></div>
          <p style="text-align: center; margin-top: 10px; font-size: 10px;">Fim do Relatório</p>
        </body>
      </html>`;
    
    doc.open();
    doc.write(report);
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
  };

  const filteredSales = useMemo(() => {
    let filtered = sales;

    if (search) {
      const safeSearch = sanitizeSearchQuery(search);
      const searchLower = safeSearch.toLowerCase();
      filtered = filtered.filter(sale => {
        const dateStr = format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm');
        return dateStr.includes(searchLower) || sale.id.toLowerCase().includes(searchLower);
      });
    }

    if (dateRange?.from) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        if (dateRange.to) {
          return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to });
        }
        return saleDate >= dateRange.from;
      });
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sales, search, dateRange]);

  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedSales,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredSales, 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Carregando vendas..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Histórico de Vendas
          </h1>
          <p className="text-muted-foreground">Todas as vendas realizadas</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={printSalesReport}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <ExportButton
            data={filteredSales}
            filename={`vendas-${format(new Date(), 'yyyy-MM-dd')}`}
            formatData={formatSalesForExport}
          />
        </div>
      </div>

      {showFilters && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Pesquisar por data ou ID..."
              className="flex-1"
            />
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            {(search || dateRange) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setDateRange(undefined);
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total de Vendas</p>
          <p className="text-2xl font-bold mt-1">{sales.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Receita Total</p>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(sales.reduce((acc, s) => acc + s.total, 0))}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Ticket Médio</p>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(sales.length > 0 ? sales.reduce((acc, s) => acc + s.total, 0) / sales.length : 0)}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium">Data e Hora</th>
                <th className="text-left py-3 px-4 text-sm font-medium">ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Pagamento</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Troco</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Mesa</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    {search ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => {
                  const paymentDetails = sale.payment_details || sale.paymentDetails || {};
                  const paymentMethods = [
                    paymentDetails.cash > 0 && 'Dinheiro',
                    paymentDetails.mpesa > 0 && 'M-Pesa',
                    paymentDetails.emola > 0 && 'E-Mola',
                    paymentDetails.card > 0 && 'Cartão',
                  ].filter(Boolean);

                  const createdAt = sale.created_at || sale.createdAt;
                  
                  return (
                    <tr key={sale.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-sm">
                        {createdAt ? format(new Date(createdAt), 'dd/MM/yyyy HH:mm', { locale: pt }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                        {sale.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {paymentMethods.map((method) => (
                            <Badge key={method} variant="secondary" className="text-xs">
                              {method}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-green-600">
                        {paymentDetails.change > 0 ? formatCurrency(paymentDetails.change) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {sale.table_number ? (
                          <div>
                            <p className="font-medium">Mesa {sale.table_number}</p>
                            {sale.table_name && <p className="text-xs text-muted-foreground">{sale.table_name}</p>}
                            {sale.table_customer_name && <p className="text-xs text-muted-foreground">{sale.table_customer_name}</p>}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSale(sale)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reprintReceipt(sale)}
                            title="Reimprimir recibo"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      <SaleDetailsModal
        sale={selectedSale}
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
}
