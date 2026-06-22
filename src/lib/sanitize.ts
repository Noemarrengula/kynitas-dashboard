/**
 * Biblioteca de sanitização de inputs
 * Previne XSS e injection attacks
 */

/**
 * Remove tags HTML e caracteres perigosos
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers (onclick=, onload=, etc)
    .trim();
}

/**
 * Sanitiza números (permite apenas dígitos)
 */
export function sanitizeNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  
  const num = typeof input === 'string' 
    ? parseFloat(input.replace(/[^\d.-]/g, ''))
    : input;
  
  return isNaN(num) ? 0 : num;
}

/**
 * Sanitiza telefone (permite apenas números, +, -, espaços e parênteses)
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return '';
  
  return input.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Sanitiza email
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .toLowerCase()
    .replace(/[^\w@.-]/g, '')
    .trim();
}

/**
 * Sanitiza URL
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (!input) return '';
  
  try {
    const url = new URL(input);
    // Apenas permite http e https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitiza objeto completo recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeText(value) as any;
    } else if (typeof value === 'number') {
      sanitized[key as keyof T] = value as any;
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item) : sanitizeText(String(item))
      ) as any;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key as keyof T] = sanitizeObject(value) as any;
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}

/**
 * Valida e sanitiza dados de produto
 */
export function sanitizeProductData(data: any) {
  return {
    name: sanitizeText(data.name),
    description: sanitizeText(data.description),
    price: sanitizeNumber(data.price),
    costPrice: sanitizeNumber(data.costPrice),
    stock: sanitizeNumber(data.stock),
    category: sanitizeText(data.category),
    internalId: sanitizeText(data.internalId),
    image: data.image ? sanitizeUrl(data.image) : undefined,
  };
}

/**
 * Valida e sanitiza dados de venda
 */
export function sanitizeSaleData(data: any) {
  return {
    items: Array.isArray(data.items) ? data.items.map((item: any) => ({
      productId: item.productId, // Manter UUID sem modificação
      product: item.product,     // Manter dados do produto para receipt/stock
      quantity: sanitizeNumber(item.quantity),
      subtotal: sanitizeNumber(item.subtotal),
    })) : [],
    total: sanitizeNumber(data.total),
    paymentDetails: {
      cash: sanitizeNumber(data.paymentDetails?.cash),
      mpesa: sanitizeNumber(data.paymentDetails?.mpesa),
      emola: sanitizeNumber(data.paymentDetails?.emola),
      card: sanitizeNumber(data.paymentDetails?.card),
      total: sanitizeNumber(data.paymentDetails?.total),
      change: sanitizeNumber(data.paymentDetails?.change),
    },
    tableId: data.tableId ? data.tableId : undefined, // Manter UUID sem modificação
    table_number: data.table_number,
    table_name: data.table_name,
    table_customer_name: data.table_customer_name,
  };
}

/**
 * Valida e sanitiza dados de cliente
 */
export function sanitizeCustomerData(data: any) {
  return {
    name: sanitizeText(data.name),
    email: data.email ? sanitizeEmail(data.email) : undefined,
    phone: data.phone ? sanitizePhone(data.phone) : undefined,
    address: sanitizeText(data.address),
    nuit: sanitizeText(data.nuit),
  };
}

/**
 * Previne SQL Injection em strings de busca
 */
/**
 * Valida e sanitiza dados de ingrediente
 */
export function sanitizeIngredientData(data: any) {
  return {
    name: sanitizeText(data.name),
    stock: sanitizeNumber(data.stock),
    unit: sanitizeText(data.unit),
    minStock: sanitizeNumber(data.minStock),
    costPerUnit: sanitizeNumber(data.costPerUnit),
    packages: Array.isArray(data.packages) ? data.packages.map((p: any) => ({
      id: p.id,
      name: sanitizeText(p.name),
      quantity: sanitizeNumber(p.quantity),
      costPerPackage: sanitizeNumber(p.costPerPackage),
    })) : data.packages,
  };
}

/**
 * Valida e sanitiza dados de fornecedor
 */
export function sanitizeSupplierData(data: any) {
  return {
    name: sanitizeText(data.name),
    contact_person: sanitizeText(data.contact_person),
    email: sanitizeEmail(data.email),
    phone: sanitizePhone(data.phone),
    address: sanitizeText(data.address),
    nuit: sanitizeText(data.nuit),
    notes: sanitizeText(data.notes),
    payment_terms: sanitizeNumber(data.payment_terms),
    credit_limit: sanitizeNumber(data.credit_limit),
  };
}

export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (!query) return '';
  
  return query
    .replace(/['";\\]/g, '') // Remove aspas e barras
    .replace(/--/g, '') // Remove comentários SQL
    .replace(/\/\*/g, '') // Remove início de comentário multi-linha
    .replace(/\*\//g, '') // Remove fim de comentário multi-linha
    .trim()
    .slice(0, 100); // Limita tamanho
}
