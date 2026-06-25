import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCode } from '@/components/ui/QRCode';
import { Invoice } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useBusiness } from '@/contexts/BusinessContext';
import { useReactToPrint } from '@/hooks/useReactToPrint';

interface Props {
  invoice: Invoice;
}

export function InvoiceA4({ invoice }: Props) {
  const { currentBusiness } = useBusiness();
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint(printRef);

  const docTypeLabel: Record<string, string> = {
    FT: 'FACTURA',
    FS: 'FACTURA SIMPLIFICADA',
    FC: 'FACTURA CONSUMIDOR FINAL',
    NC: 'NOTA DE CRÉDITO',
  };

  const subtotal = invoice.items?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;
  const ivaAmount = invoice.ivaAmount || 0;
  const total = invoice.total || 0;

  return (
    <div>
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir A4
        </Button>
      </div>
      <div ref={printRef} className="bg-white text-black p-8 mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold">{currentBusiness?.name}</h1>
            {currentBusiness?.address && <p className="text-sm">{currentBusiness.address}</p>}
            {currentBusiness?.phone && <p className="text-sm">Tel: {currentBusiness.phone}</p>}
            {currentBusiness?.nuit && <p className="text-sm">NUIT: {currentBusiness.nuit}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{docTypeLabel[invoice.documentType]}</h2>
            <p className="text-sm font-mono">{invoice.series}-{String(invoice.number).padStart(4, '0')}</p>
            <p className="text-sm">{new Date(invoice.createdAt).toLocaleString('pt-MZ')}</p>
            {invoice.atcud && <p className="text-xs text-gray-500">ATCUD: {invoice.atcud}</p>}
          </div>
        </div>

        {invoice.clientName && (
          <div className="mb-6 p-3 bg-gray-50 rounded">
            <h3 className="text-sm font-semibold mb-1">Cliente</h3>
            <p className="text-sm">{invoice.clientName}</p>
            {invoice.clientNuit && <p className="text-sm">NUIT: {invoice.clientNuit}</p>}
            {invoice.clientAddress && <p className="text-sm">{invoice.clientAddress}</p>}
          </div>
        )}

        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 w-10">Qtd</th>
              <th className="text-left py-2">Descrição</th>
              <th className="text-right py-2 w-28">Preço Unit.</th>
              <th className="text-right py-2 w-16">IVA%</th>
              <th className="text-right py-2 w-24">Valor IVA</th>
              <th className="text-right py-2 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-right">{item.ivaRate ?? 16}%</td>
                <td className="py-2 text-right">{formatCurrency(item.ivaAmount || 0)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA ({invoice.ivaRate || 16}%)</span>
              <span>{formatCurrency(ivaAmount)}</span>
            </div>
            {invoice.withholdingTax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Retenção</span>
                <span>-{formatCurrency(invoice.withholdingTax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t-2 border-black pt-1">
              <span>TOTAL</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          {invoice.hash && (
            <div className="mb-4">
              <p className="text-xs font-mono break-all">Hash: {invoice.hash}</p>
            </div>
          )}
          {invoice.qrCodeData && (
            <QRCode data={invoice.qrCodeData} size={100} />
          )}
          <p className="text-xs text-gray-400 mt-2">Documento gerado electronicamente</p>
        </div>
      </div>
    </div>
  );
}
