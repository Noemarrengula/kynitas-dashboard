import { useState, useMemo, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import { useStore } from '@/store/useStore';
import { isWithinInterval, parseISO } from 'date-fns';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'product' | 'customer' | 'sale' | 'table' | 'employee';
  data: any;
  path?: string;
  icon?: string;
}

export interface SearchFilters {
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  minValue?: number;
  maxValue?: number;
  status?: string;
  type?: SearchResult['type'];
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const { products, sales } = useDatabase();
  const { customers, tables, employees } = useStore();

  // Obter categorias únicas
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => p.category && cats.add(p.category));
    return Array.from(cats).sort();
  }, [products]);

  // Aplicar filtro de data
  const isDateInRange = (date: Date | string | undefined): boolean => {
    if (!date || (!filters.dateFrom && !filters.dateTo)) return true;
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (filters.dateFrom && filters.dateTo) {
        return isWithinInterval(dateObj, {
          start: filters.dateFrom,
          end: filters.dateTo,
        });
      }
      if (filters.dateFrom) return dateObj >= filters.dateFrom;
      if (filters.dateTo) return dateObj <= filters.dateTo;
      return true;
    } catch (e) {
      return true;
    }
  };

  // Aplicar filtro de valor
  const isValueInRange = (value: number): boolean => {
    const minOk = !filters.minValue || value >= filters.minValue;
    const maxOk = !filters.maxValue || value <= filters.maxValue;
    return minOk && maxOk;
  };

  const searchResults = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase().trim();

    // Buscar produtos
    if (!filters.type || filters.type === 'product') {
      products.forEach(product => {
        if (
          (product.name.toLowerCase().includes(searchTerm) ||
            product.category?.toLowerCase().includes(searchTerm) ||
            product.id.toLowerCase().includes(searchTerm)) &&
          (!filters.category || product.category === filters.category) &&
          isValueInRange(product.price)
        ) {
          results.push({
            id: `product-${product.id}`,
            title: product.name,
            subtitle: `${product.category} • Stock: ${product.stock} • ${product.price.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}`,
            type: 'product',
            data: product,
            path: product.type === 'drink' ? '/products/drinks' : '/products/meals',
            icon: '🍺'
          });
        }
      });
    }

    // Buscar clientes
    if (!filters.type || filters.type === 'customer') {
      customers.forEach(customer => {
        if (
          customer.name.toLowerCase().includes(searchTerm) ||
          customer.phone?.toLowerCase().includes(searchTerm) ||
          customer.email?.toLowerCase().includes(searchTerm)
        ) {
          results.push({
            id: `customer-${customer.id}`,
            title: customer.name,
            subtitle: `${customer.phone || ''} • ${customer.email || ''}`,
            type: 'customer',
            data: customer,
            path: '/customers',
            icon: '👤'
          });
        }
      });
    }

    // Buscar vendas
    if (!filters.type || filters.type === 'sale') {
      sales.forEach(sale => {
        if (
          isDateInRange(sale.createdAt) &&
          isValueInRange(sale.total) &&
          (!filters.status || sale.status === filters.status)
        ) {
          const saleNumber = sale.saleNumber?.toString() || '';
          const total = sale.total.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
          const date = new Date(sale.createdAt).toLocaleDateString('pt-PT');
          
          if (
            saleNumber.includes(searchTerm) ||
            total.toLowerCase().includes(searchTerm) ||
            date.includes(searchTerm)
          ) {
            results.push({
              id: `sale-${sale.id}`,
              title: `Venda #${saleNumber}`,
              subtitle: `${total} • ${date}`,
              type: 'sale',
              data: sale,
              path: '/sales/history',
              icon: '🛒'
            });
          }
        }
      });
    }

    // Buscar mesas
    if (!filters.type || filters.type === 'table') {
      tables.forEach(table => {
        if (
          table.number.toString().includes(searchTerm) ||
          table.name?.toLowerCase().includes(searchTerm)
        ) {
          results.push({
            id: `table-${table.id}`,
            title: `Mesa ${table.number}`,
            subtitle: table.name || `Capacidade: ${table.capacity} pessoas`,
            type: 'table',
            data: table,
            path: '/tables',
            icon: '🪑'
          });
        }
      });
    }

    // Buscar funcionários
    if (!filters.type || filters.type === 'employee') {
      employees.forEach(employee => {
        if (
          employee.name.toLowerCase().includes(searchTerm) ||
          employee.role.toLowerCase().includes(searchTerm) ||
          employee.phone?.toLowerCase().includes(searchTerm)
        ) {
          results.push({
            id: `employee-${employee.id}`,
            title: employee.name,
            subtitle: `${employee.role} • ${employee.phone || ''}`,
            type: 'employee',
            data: employee,
            path: '/employees',
            icon: '👨‍💼'
          });
        }
      });
    }

    // Limitar resultados e ordenar por relevância
    return results
      .sort((a, b) => {
        // Priorizar matches exatos no título
        const aExact = a.title.toLowerCase().startsWith(searchTerm) ? 1 : 0;
        const bExact = b.title.toLowerCase().startsWith(searchTerm) ? 1 : 0;
        return bExact - aExact;
      })
      .slice(0, 20);
  }, [query, products, customers, sales, tables, employees]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setIsOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectResult = useCallback((result: SearchResult) => {
    // Aqui você pode implementar a navegação ou ação específica
    console.log('Selected result:', result);
    clearSearch();
  }, [clearSearch]);

  return {
    query,
    setQuery,
    searchResults,
    isOpen,
    openSearch,
    closeSearch,
    clearSearch,
    selectResult
  };
}