// Core TypeScript interfaces for invoice generation

export interface PartyDetails {
  name: string;
  address: string;
  city?: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone?: string;
  email?: string;
  gstin?: string;
  country: string;
}

export interface InvoiceLineItem {
  sno: number;
  itemName: string;
  sku: string;
  quantity: number;
  ratePerItem: number;
  discountPerItem: number;
  taxableAmount: number;
  hsn: string;
  gstRate: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
}

export interface TaxSummary {
  subtotal: number;
  discountPercent?: number;
  discountAmount: number;
  totalTaxableAmount: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalTaxAmount: number;
  totalAmountAfterTax: number;
  // NO roundOff field - exact calculation only
}

export interface InvoiceMetadata {
  invoiceNo: string;
  orderNo: string;
  invoiceDate: string;
  orderDate: string;
  placeOfSupply: string;
  transportMode?: string;
  paymentMethod: string;
  state: string;
  stateCode: string;
  financialStatus?: 'paid' | 'pending' | 'unpaid' | 'partially_paid' | 'refunded' | 'voided';
  cancelledAt?: string;
}

export interface BusinessDetails {
  name: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
  phone: string;
  gstin: string;
  cin?: string;
  pan?: string;
}

export interface InvoiceData {
  business: BusinessDetails;
  metadata: InvoiceMetadata;
  billToParty: PartyDetails;
  shipToParty: PartyDetails;
  lineItems: InvoiceLineItem[];
  taxSummary: TaxSummary;
  amountInWords: string;
  metafields?: Record<string, string | number>;
}

// CSV parsing types
export interface CSVRow {
  [key: string]: string | number | undefined;
}

export interface ParsedCSVData {
  headers: string[];
  rows: CSVRow[];
  metafields: string[];
}

// Field mapping types
export interface FieldMapping {
  csvColumn: string;
  invoiceField: string;
  mapped: boolean;
}

export interface MappingProgress {
  field: string;
  status: 'pending' | 'mapping' | 'mapped';
  csvColumn?: string;
}

// Processing state
export type ProcessingStep = 'upload' | 'processing' | 'preview' | 'generated';

export interface ProcessingState {
  step: ProcessingStep;
  csvFile?: File;
  parsedData?: ParsedCSVData;
  invoices?: InvoiceData[];
  currentInvoiceIndex?: number;
  mappingProgress?: MappingProgress[];
  error?: string;
}







