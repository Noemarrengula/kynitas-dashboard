import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { HourPoint, WeekdayPoint, PaymentPoint, TopProductPoint, DailyPoint } from '@/lib/analytics';
import type { SalesForecast } from '@/lib/forecast';

export interface StockForecastRow {
  name: string;
  type: 'product' | 'ingredient';
  unit: string;
  stock: number;
  minStock: number;
  avgDailyQty: number;
  daysUntilEmpty: number | null;
  suggestedRestockQty: number;
  needsRestock: boolean;
}

interface ExecutiveReportInput {
  rangeLabel: string;
  kpis: { label: string; value: string }[];
  byHour: HourPoint[];
  byWeekday: WeekdayPoint[];
  payments: PaymentPoint[];
  topProducts: TopProductPoint[];
  daily: DailyPoint[];
  forecast: SalesForecast;
}

const HEAD_FILL: [number, number, number] = [124, 58, 237];

function formatMt(value: number): string {
  return `${value.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT`;
}

export function exportExecutiveReportToPDF(input: ExecutiveReportInput) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Relatório Executivo — BI', 14, 20);

  doc.setFontSize(10);
  doc.text(`Período: ${input.rangeLabel}`, 14, 28);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, 14, 34);

  autoTable(doc, {
    startY: 40,
    head: [['Indicador', 'Valor']],
    body: input.kpis.map((k) => [k.label, k.value]),
    theme: 'grid',
    headStyles: { fillColor: HEAD_FILL },
    styles: { fontSize: 9 },
  });

  const yAfterKpis = (doc as any).lastAutoTable?.finalY || 40;

  doc.setFontSize(12);
  doc.text('Vendas por Hora do Dia', 14, yAfterKpis + 12);
  autoTable(doc, {
    startY: yAfterKpis + 16,
    head: [['Hora', 'Vendas', 'Receita']],
    body: input.byHour.map((h) => [h.label, String(h.orders), formatMt(h.revenue)]),
    theme: 'grid',
    headStyles: { fillColor: HEAD_FILL },
    styles: { fontSize: 8 },
  });

  const yAfterHour = (doc as any).lastAutoTable?.finalY || yAfterKpis + 16;

  doc.setFontSize(12);
  doc.text('Vendas por Dia da Semana', 14, yAfterHour + 12);
  autoTable(doc, {
    startY: yAfterHour + 16,
    head: [['Dia', 'Vendas', 'Receita']],
    body: input.byWeekday.map((d) => [d.label, String(d.orders), formatMt(d.revenue)]),
    theme: 'grid',
    headStyles: { fillColor: HEAD_FILL },
    styles: { fontSize: 8 },
  });

  const yAfterWeekday = (doc as any).lastAutoTable?.finalY || yAfterHour + 16;

  doc.setFontSize(12);
  doc.text('Métodos de Pagamento', 14, yAfterWeekday + 12);
  autoTable(doc, {
    startY: yAfterWeekday + 16,
    head: [['Método', 'Valor']],
    body: input.payments.map((p) => [p.label, formatMt(p.value)]),
    theme: 'grid',
    headStyles: { fillColor: HEAD_FILL },
    styles: { fontSize: 9 },
  });

  const yAfterPayments = (doc as any).lastAutoTable?.finalY || yAfterWeekday + 16;

  doc.setFontSize(12);
  doc.text('Top Produtos', 14, yAfterPayments + 12);
  autoTable(doc, {
    startY: yAfterPayments + 16,
    head: [['Produto', 'Quantidade', 'Receita']],
    body: input.topProducts.slice(0, 15).map((p) => [p.name, String(p.quantity), formatMt(p.revenue)]),
    theme: 'grid',
    headStyles: { fillColor: HEAD_FILL },
    styles: { fontSize: 9 },
  });

  const yAfterProducts = (doc as any).lastAutoTable?.finalY || yAfterPayments + 16;

  doc.setFontSize(12);
  doc.text('Previsão (Próximos 7 Dias)', 14, yAfterProducts + 12);
  autoTable(doc, {
    startY: yAfterProducts + 16,
    head: [['Dia', 'Previsão']],
    body: input.forecast.forecastNext7.map((d) => [d.day, formatMt(d.forecast)]),
    theme: 'grid',
    headStyles: { fillColor: HEAD_FILL },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || yAfterProducts + 16;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Previsão 7 Dias: ${formatMt(input.forecast.totalForecast7)}`, 14, finalY + 10);

  doc.save(`relatorio-executivo-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportExecutiveReportToExcel(input: ExecutiveReportInput) {
  const rows: unknown[][] = [
    ['Relatório Executivo — BI'],
    [`Período: ${input.rangeLabel}`],
    [`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`],
    [],
    ['Indicadores'],
    ['Indicador', 'Valor'],
    ...input.kpis.map((k) => [k.label, k.value]),
    [],
    ['Vendas por Hora do Dia'],
    ['Hora', 'Vendas', 'Receita (MT)'],
    ...input.byHour.map((h) => [h.label, h.orders, Math.round(h.revenue * 100) / 100]),
    [],
    ['Vendas por Dia da Semana'],
    ['Dia', 'Vendas', 'Receita (MT)'],
    ...input.byWeekday.map((d) => [d.label, d.orders, Math.round(d.revenue * 100) / 100]),
    [],
    ['Métodos de Pagamento'],
    ['Método', 'Valor (MT)'],
    ...input.payments.map((p) => [p.label, Math.round(p.value * 100) / 100]),
    [],
    ['Top Produtos'],
    ['Produto', 'Quantidade', 'Receita (MT)'],
    ...input.topProducts.map((p) => [p.name, p.quantity, Math.round(p.revenue * 100) / 100]),
    [],
    ['Previsão (Próximos 7 Dias)'],
    ['Dia', 'Previsão (MT)'],
    ...input.forecast.forecastNext7.map((d) => [d.day, Math.round(d.forecast * 100) / 100]),
    [],
    ['Total Previsão 7 Dias', Math.round(input.forecast.totalForecast7 * 100) / 100],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Executivo');
  XLSX.writeFile(workbook, `relatorio-executivo-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export function exportStockForecastToPDF(rows: StockForecastRow[]) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Relatório de Previsão de Stock', 14, 20);

  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, 14, 28);

  const critical = rows.filter((r) => r.needsRestock || r.stock <= r.minStock);
  const tableData = rows.map((r) => [
    r.name,
    r.type === 'product' ? 'Produto' : 'Ingrediente',
    `${r.stock} ${r.unit}`,
    `${r.minStock} ${r.unit}`,
    r.avgDailyQty > 0 ? r.avgDailyQty.toFixed(1) : '—',
    r.daysUntilEmpty !== null ? `${r.daysUntilEmpty} dia(s)` : '—',
    Math.max(0, r.suggestedRestockQty),
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Item', 'Tipo', 'Stock', 'Mínimo', 'Consumo/Dia', 'Esgota em', 'Repor']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12] },
    styles: { fontSize: 8 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 35;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total de itens analisados: ${rows.length}`, 14, finalY + 10);
  if (critical.length > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Itens em risco de rutura: ${critical.length}`, 14, finalY + 18);
  }

  doc.save(`previsao-stock-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportStockForecastToExcel(rows: StockForecastRow[]) {
  const headers = ['Item', 'Tipo', 'Stock', 'Unidade', 'Mínimo', 'Consumo/Dia', 'Esgota em (dias)', 'Repor'];
  const data = rows.map((r) => [
    r.name,
    r.type === 'product' ? 'Produto' : 'Ingrediente',
    r.stock,
    r.unit,
    r.minStock,
    r.avgDailyQty > 0 ? Math.round(r.avgDailyQty * 10) / 10 : '',
    r.daysUntilEmpty,
    Math.max(0, r.suggestedRestockQty),
  ]);

  const critical = rows.filter((r) => r.needsRestock || r.stock <= r.minStock);

  const sheet = XLSX.utils.aoa_to_sheet([
    ['Relatório de Previsão de Stock'],
    [`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`],
    [],
    headers,
    ...data,
    [],
    ['Total de itens', rows.length],
    ['Itens em risco de rutura', critical.length],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Previsao Stock');
  XLSX.writeFile(workbook, `previsao-stock-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}