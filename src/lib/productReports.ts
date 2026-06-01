import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Sale, Product } from '@/types';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  times: number;
}

export const calculateTopProducts = (sales: Sale[]): TopProduct[] => {
  const productStats = new Map<string, TopProduct>();

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const productName = item.product?.name ?? 'Produto';
      const productPrice = item.product?.price ?? 0;
      const existing = productStats.get(productName) || {
        name: productName,
        quantity: 0,
        revenue: 0,
        times: 0,
      };

      productStats.set(productName, {
        name: productName,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (productPrice * item.quantity),
        times: existing.times + 1,
      });
    });
  });

  return Array.from(productStats.values()).sort((a, b) => b.quantity - a.quantity);
};

export const exportTopProductsToPDF = (sales: Sale[], filename: string) => {
  const doc = new jsPDF();
  const topProducts = calculateTopProducts(sales).slice(0, 20);

  doc.setFontSize(18);
  doc.text('Produtos Mais Vendidos', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Produto', 'Qtd Vendida', 'Vezes Vendido', 'Receita Total']],
    body: topProducts.map((p, i) => [
      (i + 1).toString(),
      p.name,
      p.quantity.toString(),
      p.times.toString(),
      `${p.revenue.toLocaleString('pt-MZ')} MT`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [255, 20, 147] },
  });

  doc.save(filename);
};

export const exportTopProductsToExcel = (sales: Sale[], filename: string) => {
  const topProducts = calculateTopProducts(sales);

  const data = [
    ['Produtos Mais Vendidos'],
    [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`],
    [],
    ['#', 'Produto', 'Quantidade Vendida', 'Vezes Vendido', 'Receita Total (MT)'],
    ...topProducts.map((p, i) => [
      i + 1,
      p.name,
      p.quantity,
      p.times,
      p.revenue,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 30 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mais Vendidos');
  
  XLSX.writeFile(workbook, filename);
};

export const exportOutOfStockToPDF = (products: Product[], filename: string) => {
  const doc = new jsPDF();
  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5);

  doc.setFontSize(18);
  doc.text('Relatório de Stock', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`, 14, 28);

  let startY = 35;

  if (outOfStock.length > 0) {
    doc.setFontSize(12);
    doc.text(`Produtos Fora de Stock (${outOfStock.length})`, 14, startY);
    
    autoTable(doc, {
      startY: startY + 5,
      head: [['Produto', 'Tipo', 'Preço Venda', 'Preço Custo']],
      body: outOfStock.map(p => [
        p.name,
        p.type === 'drink' ? 'Bebida' : 'Refeição',
        `${(p.price || 0).toLocaleString('pt-MZ')} MT`,
        `${(p.costPrice || 0).toLocaleString('pt-MZ')} MT`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 5;
    startY = finalY + 10;
  }

  if (lowStock.length > 0) {
    doc.setFontSize(12);
    doc.text(`Produtos com Stock Crítico (${lowStock.length})`, 14, startY);
    
    autoTable(doc, {
      startY: startY + 5,
      head: [['Produto', 'Tipo', 'Stock', 'Preço Venda']],
      body: lowStock.map(p => [
        p.name,
        p.type === 'drink' ? 'Bebida' : 'Refeição',
        `${p.stock} un.`,
        `${(p.price || 0).toLocaleString('pt-MZ')} MT`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8] },
    });
  }

  if (outOfStock.length === 0 && lowStock.length === 0) {
    doc.setFontSize(12);
    doc.text('✓ Todos os produtos têm stock adequado', 14, startY);
  }

  doc.save(filename);
};

export const exportStockStatusToPDF = (products: Product[], businessName: string, filename: string) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(businessName, 14, 20);
  doc.setFontSize(14);
  doc.text('Estado Atual do Stock', 14, 28);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`, 14, 36);

  const totalRevenue = products.reduce((a, p) => a + (p.stock * p.price), 0);
  const totalCost = products.reduce((a, p) => a + (p.stock * (p.costPrice || 0)), 0);

  autoTable(doc, {
    startY: 42,
    head: [['Produto', 'Categoria', 'Stock', 'Custo (MT)', 'Venda (MT)', 'Valor Custo (MT)', 'Receita Potencial (MT)']],
    body: products.map(p => [
      p.name,
      p.category,
      p.stock.toString(),
      (p.costPrice || 0).toLocaleString('pt-MZ'),
      p.price.toLocaleString('pt-MZ'),
      (p.stock * (p.costPrice || 0)).toLocaleString('pt-MZ'),
      (p.stock * p.price).toLocaleString('pt-MZ'),
    ]),
    foot: [[
      'TOTAL',
      '',
      '',
      '',
      '',
      totalCost.toLocaleString('pt-MZ'),
      totalRevenue.toLocaleString('pt-MZ'),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [255, 20, 147] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 42;

  doc.setFontSize(12);
  doc.text('Resumo', 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`Total de Produtos: ${products.length}`, 14, finalY + 25);
  doc.text(`Valor Total em Stock (Custo): ${totalCost.toLocaleString('pt-MZ')} MT`, 14, finalY + 33);
  doc.text(`Receita Potencial Total: ${totalRevenue.toLocaleString('pt-MZ')} MT`, 14, finalY + 41);
  if (totalCost > 0) {
    const margemMedia = ((totalRevenue - totalCost) / totalRevenue) * 100;
    doc.text(`Margem Média: ${margemMedia.toFixed(1)}%`, 14, finalY + 49);
  }

  doc.save(filename);
};

export const exportStockEvolutionToPDF = (products: Product[], sales: Sale[], startDate: Date, endDate: Date, businessName: string, filename: string) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(businessName, 14, 20);
  doc.setFontSize(14);
  doc.text('Evolução de Stock', 14, 28);
  doc.setFontSize(10);
  doc.text(`Período: ${format(startDate, 'dd/MM/yyyy', { locale: pt })} a ${format(endDate, 'dd/MM/yyyy', { locale: pt })}`, 14, 36);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`, 14, 44);

  const salesInPeriod = sales.filter(s => {
    const d = new Date(s.createdAt);
    return d >= startDate && d <= endDate;
  });

  const soldMap = new Map<string, number>();
  salesInPeriod.forEach(sale => {
    sale.items.forEach(item => {
      const qty = item.product?.name?.includes('(Dose)') && item.product?.dosesPorGarrafa
        ? item.quantity / item.product.dosesPorGarrafa
        : item.quantity;
      soldMap.set(item.productId, (soldMap.get(item.productId) || 0) + qty);
    });
  });

  const rows: string[][] = [];
  products.forEach(p => {
    const sold = soldMap.get(p.id) || 0;
    const initialStock = p.stock + sold;
    rows.push([
      p.name,
      p.category,
      initialStock.toFixed(1),
      sold.toFixed(1),
      p.stock.toFixed(1),
      (sold * p.price).toLocaleString('pt-MZ'),
    ]);
  });

  const totalSold = salesInPeriod.reduce((a, s) => a + s.total, 0);

  autoTable(doc, {
    startY: 50,
    head: [['Produto', 'Categoria', 'Stock Inicial', 'Qtd Vendida', 'Stock Final', 'Valor Vendido (MT)']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [255, 20, 147] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 50;
  doc.setFontSize(12);
  doc.text('Resumo do Período', 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`Total de Vendas no Período: ${salesInPeriod.length}`, 14, finalY + 25);
  doc.text(`Valor Total Vendido: ${totalSold.toLocaleString('pt-MZ')} MT`, 14, finalY + 33);
  doc.text(`Produtos com stock crítico (≤5): ${products.filter(p => p.stock <= 5).length}`, 14, finalY + 41);

  doc.save(filename);
};

export const exportOutOfStockToExcel = (products: Product[], filename: string) => {
  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5);

  const data = [
    ['Relatório de Stock'],
    [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: pt })}`],
    [],
    [`Produtos Fora de Stock: ${outOfStock.length}`],
    [`Produtos com Stock Crítico: ${lowStock.length}`],
    [],
  ];

  if (outOfStock.length > 0) {
    data.push(['PRODUTOS FORA DE STOCK']);
    data.push(['Produto', 'Tipo', 'Preço Venda (MT)', 'Preço Custo (MT)']);
    outOfStock.forEach(p => {
      data.push([
        p.name,
        p.type === 'drink' ? 'Bebida' : 'Refeição',
        p.price,
        p.costPrice,
      ]);
    });
    data.push([]);
  }

  if (lowStock.length > 0) {
    data.push(['PRODUTOS COM STOCK CRÍTICO']);
    data.push(['Produto', 'Tipo', 'Stock', 'Preço Venda (MT)']);
    lowStock.forEach(p => {
      data.push([
        p.name,
        p.type === 'drink' ? 'Bebida' : 'Refeição',
        p.stock,
        p.price,
      ]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
  
  XLSX.writeFile(workbook, filename);
};
