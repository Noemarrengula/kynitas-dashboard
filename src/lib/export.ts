import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCSV(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatSalesForExport(sales: any[]) {
  return sales.map(sale => ({
    'Data': new Date(sale.created_at).toLocaleString('pt-PT'),
    'Total': `${sale.total.toFixed(2)} MT`,
    'Itens': sale.items.length,
    'Pagamento': sale.payment_details?.method || 'N/A',
  }));
}

export function formatProductsForExport(products: any[]) {
  return products.map(product => ({
    'Nome': product.name,
    'Categoria': product.category === 'drink' ? 'Bebida' : 'Refeição',
    'Preço': `${product.price.toFixed(2)} MT`,
    'Criado em': new Date(product.created_at).toLocaleDateString('pt-PT'),
  }));
}

export function formatIngredientsForExport(ingredients: any[]) {
  return ingredients.map(ingredient => ({
    'Nome': ingredient.name,
    'Unidade': ingredient.unit,
    'Stock': ingredient.stock,
    'Stock Mínimo': ingredient.min_stock,
    'Custo/Unidade': `${ingredient.cost_per_unit.toFixed(2)} MT`,
    'Status': ingredient.stock <= ingredient.min_stock ? 'CRÍTICO' : 'OK',
  }));
}
