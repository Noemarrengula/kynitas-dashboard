import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Sale } from '@/types';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ProfitData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export const calculateProfitData = (sales: Sale[]): ProfitData[] => {
  const profitByDate = new Map<string, { revenue: number; cost: number }>();

  sales.forEach(sale => {
    const date = format(new Date(sale.createdAt), 'dd/MM/yyyy');
    const existing = profitByDate.get(date) || { revenue: 0, cost: 0 };
    
    const saleCost = sale.items.reduce((acc, item) => {
      return acc + ((item.product?.costPrice ?? 0) * item.quantity);
    }, 0);

    profitByDate.set(date, {
      revenue: existing.revenue + sale.total,
      cost: existing.cost + saleCost,
    });
  });

  return Array.from(profitByDate.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    cost: data.cost,
    profit: data.revenue - data.cost,
    margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
  }));
};

export const exportProfitToPDF = (sales: Sale[], filename: string) => {
  const doc = new jsPDF();
  const profitData = calculateProfitData(sales);

  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Lucros', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`, 14, 28);

  // Summary
  const totalRevenue = profitData.reduce((acc, d) => acc + d.revenue, 0);
  const totalCost = profitData.reduce((acc, d) => acc + d.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  doc.setFontSize(12);
  doc.text('Resumo Geral', 14, 38);
  doc.setFontSize(10);
  doc.text(`Receita Total: ${totalRevenue.toLocaleString('pt-MZ')} MT`, 14, 46);
  doc.text(`Custo Total: ${totalCost.toLocaleString('pt-MZ')} MT`, 14, 52);
  doc.text(`Lucro Total: ${totalProfit.toLocaleString('pt-MZ')} MT`, 14, 58);
  doc.text(`Margem Média: ${avgMargin}%`, 14, 64);

  // Table
  autoTable(doc, {
    startY: 72,
    head: [['Data', 'Receita', 'Custo', 'Lucro', 'Margem']],
    body: profitData.map(d => [
      d.date,
      `${d.revenue.toLocaleString('pt-MZ')} MT`,
      `${d.cost.toLocaleString('pt-MZ')} MT`,
      `${d.profit.toLocaleString('pt-MZ')} MT`,
      `${d.margin.toFixed(1)}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [255, 20, 147] },
  });

  doc.save(filename);
};

export const exportProfitToExcel = (sales: Sale[], filename: string) => {
  const profitData = calculateProfitData(sales);

  // Summary data
  const totalRevenue = profitData.reduce((acc, d) => acc + d.revenue, 0);
  const totalCost = profitData.reduce((acc, d) => acc + d.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  const summaryData = [
    ['Relatório de Lucros'],
    [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`],
    [],
    ['Resumo Geral'],
    ['Receita Total', totalRevenue],
    ['Custo Total', totalCost],
    ['Lucro Total', totalProfit],
    ['Margem Média', `${avgMargin}%`],
    [],
    ['Data', 'Receita (MT)', 'Custo (MT)', 'Lucro (MT)', 'Margem (%)'],
  ];

  const detailData = profitData.map(d => [
    d.date,
    d.revenue,
    d.cost,
    d.profit,
    parseFloat(d.margin.toFixed(1)),
  ]);

  const worksheetData = [...summaryData, ...detailData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Column widths
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lucros');
  
  XLSX.writeFile(workbook, filename);
};
