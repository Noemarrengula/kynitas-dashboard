export type DocumentType = 'FT' | 'FS' | 'FC' | 'NC';
export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
  ivaAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  saleId?: string;
  documentType: DocumentType;
  series: string;
  number: number;
  clientName?: string;
  clientNuit?: string;
  clientAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  ivaRate: number;
  ivaAmount: number;
  withholdingTax: number;
  total: number;
  atcud?: string;
  hash?: string;
  hashPrev?: string;
  qrCodeData?: string;
  status: InvoiceStatus;
  cancellationReason?: string;
  reason?: string;
  printedCount: number;
  createdBy?: string;
  createdAt: Date;
  issuedAt?: Date;
  cancelledAt?: Date;
  updatedAt: Date;
}

export interface InvoiceSeries {
  id: string;
  businessId: string;
  code: string;
  prefix: string;
  currentNumber: number;
  startNumber: number;
  documentType: DocumentType;
  isDefault: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
