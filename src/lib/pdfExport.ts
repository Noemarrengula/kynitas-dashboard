import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export function exportSalesToPDF(sales: any[], filename: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Vendas', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, 14, 28);
  
  // Table
  const tableData = sales.map(sale => [
    format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm'),
    sale.id.slice(0, 8),
    `${sale.total.toFixed(2)} MT`,
    sale.table_number ? `Mesa ${sale.table_number}` : '-',
    sale.table_customer_name || '-',
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [['Data/Hora', 'ID', 'Total', 'Mesa', 'Cliente']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });
  
  // Footer
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total de Vendas: ${sales.length}`, 14, finalY + 10);
  doc.text(`Receita Total: ${totalRevenue.toFixed(2)} MT`, 14, finalY + 18);
  
  doc.save(filename);
}

export function exportDREToPDF(dreData: any, filename: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('DRE - Demonstração do Resultado', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Período: ${format(new Date(dreData.period), 'MMMM/yyyy', { locale: pt })}`, 14, 28);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, 14, 34);
  
  // DRE Table
  const tableData = [
    ['RECEITAS', '', `${dreData.total_revenue.toFixed(2)} MT`],
    ['Vendas', `${dreData.total_revenue.toFixed(2)} MT`, ''],
    ['', '', ''],
    ['(-) CUSTOS', '', `${dreData.total_costs.toFixed(2)} MT`],
    ['Custo dos Produtos Vendidos', `${dreData.total_costs.toFixed(2)} MT`, ''],
    ['', '', ''],
    ['(=) LUCRO BRUTO', '', `${dreData.gross_profit.toFixed(2)} MT`],
    ['', '', ''],
    ['(-) DESPESAS OPERACIONAIS', '', `${dreData.total_expenses.toFixed(2)} MT`],
    ['Despesas Gerais', `${dreData.total_expenses.toFixed(2)} MT`, ''],
    ['', '', ''],
    ['(=) LUCRO LÍQUIDO', '', `${dreData.net_profit.toFixed(2)} MT`],
  ];
  
  autoTable(doc, {
    startY: 45,
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 0 || data.row.index === 3 || data.row.index === 6 || data.row.index === 8 || data.row.index === 11) {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 11) {
        data.cell.styles.fillColor = [59, 130, 246];
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
  });
  
  // Indicators
  const finalY = (doc as any).lastAutoTable.finalY || 45;
  const marginPercentage = dreData.total_revenue > 0 ? (dreData.gross_profit / dreData.total_revenue) * 100 : 0;
  const profitPercentage = dreData.total_revenue > 0 ? (dreData.net_profit / dreData.total_revenue) * 100 : 0;
  
  doc.setFontSize(10);
  doc.text('INDICADORES:', 14, finalY + 15);
  doc.text(`Margem Bruta: ${marginPercentage.toFixed(2)}%`, 14, finalY + 23);
  doc.text(`Margem Líquida: ${profitPercentage.toFixed(2)}%`, 14, finalY + 31);
  
  doc.save(filename);
}

export function exportAccountsPayableToPDF(accounts: any[], filename: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Contas a Pagar', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, 14, 28);
  
  // Table
  const tableData = accounts.map(account => [
    format(new Date(account.due_date), 'dd/MM/yyyy'),
    account.description,
    account.category_name || '-',
    `${account.amount.toFixed(2)} MT`,
    account.status === 'paid' ? 'Pago' : account.status === 'overdue' ? 'Vencido' : 'Pendente',
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [['Vencimento', 'Descrição', 'Categoria', 'Valor', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 70 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 25 },
    },
  });
  
  // Summary
  const totalAmount = accounts.reduce((sum, a) => sum + a.amount, 0);
  const paidAmount = accounts.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.amount, 0);
  const pendingAmount = accounts.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0);
  const overdueAmount = accounts.filter(a => a.status === 'overdue').reduce((sum, a) => sum + a.amount, 0);
  
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total: ${totalAmount.toFixed(2)} MT`, 14, finalY + 10);
  doc.text(`Pago: ${paidAmount.toFixed(2)} MT`, 14, finalY + 18);
  doc.text(`Pendente: ${pendingAmount.toFixed(2)} MT`, 14, finalY + 26);
  if (overdueAmount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Vencido: ${overdueAmount.toFixed(2)} MT`, 14, finalY + 34);
  }
  
  doc.save(filename);
}

export function exportInventoryToPDF(ingredients: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Inventário', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, 14, 28);
  
  const tableData = ingredients.map(ing => [
    ing.name,
    `${ing.stock} ${ing.unit}`,
    `${ing.minStock} ${ing.unit}`,
    `${ing.costPerUnit.toFixed(2)} MT`,
    `${(ing.stock * ing.costPerUnit).toFixed(2)} MT`,
    ing.stock <= ing.minStock ? 'Crítico' : 'OK',
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [['Ingrediente', 'Stock', 'Mínimo', 'Custo/Un', 'Valor Total', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });
  
  const totalValue = ingredients.reduce((sum, i) => sum + (i.stock * i.costPerUnit), 0);
  const criticalCount = ingredients.filter(i => i.stock <= i.minStock).length;
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total de Ingredientes: ${ingredients.length}`, 14, finalY + 10);
  doc.text(`Valor Total em Stock: ${totalValue.toFixed(2)} MT`, 14, finalY + 18);
  if (criticalCount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Ingredientes Críticos: ${criticalCount}`, 14, finalY + 26);
  }
  
  doc.save(`inventario-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportInventoryToExcel(ingredients: any[]) {
  const headers = ['Ingrediente', 'Stock', 'Unidade', 'Mínimo', 'Custo/Unidade', 'Valor Total', 'Status'];
  const rows = ingredients.map(ing => [
    ing.name,
    ing.stock,
    ing.unit,
    ing.minStock,
    ing.costPerUnit.toFixed(2),
    (ing.stock * ing.costPerUnit).toFixed(2),
    ing.stock <= ing.minStock ? 'Crítico' : 'OK',
  ]);
  
  const totalValue = ingredients.reduce((sum, i) => sum + (i.stock * i.costPerUnit), 0);
  const criticalCount = ingredients.filter(i => i.stock <= i.minStock).length;
  
  rows.push([]);
  rows.push(['RESUMO']);
  rows.push(['Total de Ingredientes', ingredients.length]);
  rows.push(['Valor Total em Stock', totalValue.toFixed(2)]);
  rows.push(['Ingredientes Críticos', criticalCount]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `inventario-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
