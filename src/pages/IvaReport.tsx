import { useState, useMemo } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/contexts/I18nContext';
import { formatCurrency } from '@/lib/utils';
import { exportTableData } from '@/lib/exportData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

export default function IvaReport() {
  const { invoices } = useStore();
  const { t } = useI18n();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i).toLocaleString('pt-MZ', { month: 'long' }) }));
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const report = useMemo(() => {
    const { start, end } = getMonthRange(year, month);
    const issued = invoices.filter(i =>
      i.status === 'issued' &&
      new Date(i.createdAt) >= start &&
      new Date(i.createdAt) <= end
    );

    const subtotal = issued.reduce((s, i) => s + (i.items?.reduce((a, item) => a + (item.total || 0), 0) || 0), 0);
    const ivaAmount = issued.reduce((s, i) => s + (i.ivaAmount || 0), 0);
    const total = issued.reduce((s, i) => s + (i.total || 0), 0);

    const byRate = [0, 5, 10, 16].map(rate => {
      const filtered = issued.filter(i => (i.ivaRate ?? 16) === rate);
      return {
        rate: `${rate}%`,
        count: filtered.length,
        subtotal: filtered.reduce((s, i) => s + (i.items?.reduce((a, item) => a + (item.total || 0), 0) || 0), 0),
        iva: filtered.reduce((s, i) => s + (i.ivaAmount || 0), 0),
        total: filtered.reduce((s, i) => s + (i.total || 0), 0),
      };
    });

    return { issued, subtotal, ivaAmount, total, byRate, count: issued.length };
  }, [invoices, year, month]);

  const handleExport = () => {
    const rows = report.byRate.map(r => ({
      'Taxa IVA': r.rate,
      'Facturas': r.count,
      'Subtotal': r.subtotal,
      'Valor IVA': r.iva,
      'Total': r.total,
    }));
    exportTableData(rows, `iva_${year}_${String(month).padStart(2, '0')}`, 'csv');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('page.ivaReport')}</h1>
          <p className="text-muted-foreground">Mapa mensal de IVA para submissão fiscal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Facturas Emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Subtotal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(report.subtotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">IVA Liquidado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(report.ivaAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(report.total)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="list-panel">
        <CardHeader>
          <CardTitle>Distribuição por Taxa de IVA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Taxa</th>
                  <th className="text-right py-2">Facturas</th>
                  <th className="text-right py-2">Subtotal</th>
                  <th className="text-right py-2">Valor IVA</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.byRate.filter(r => r.count > 0).map(r => (
                  <tr key={r.rate} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{r.rate}</td>
                    <td className="py-2 text-right">{r.count}</td>
                    <td className="py-2 text-right">{formatCurrency(r.subtotal)}</td>
                    <td className="py-2 text-right">{formatCurrency(r.iva)}</td>
                    <td className="py-2 text-right">{formatCurrency(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{report.count}</td>
                  <td className="py-2 text-right">{formatCurrency(report.subtotal)}</td>
                  <td className="py-2 text-right">{formatCurrency(report.ivaAmount)}</td>
                  <td className="py-2 text-right">{formatCurrency(report.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.byRate.filter(r => r.count > 0)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="rate" />
              <YAxis tickFormatter={v => formatCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="iva" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Valor IVA" />
              <Bar dataKey="subtotal" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Subtotal" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
