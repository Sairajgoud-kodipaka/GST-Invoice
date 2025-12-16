import NP from 'number-precision';
import { InvoiceData, InvoiceLineItem, TaxSummary } from '@/app/types/invoice';

// Business state (seller state)
const SELLER_STATE = 'Telangana';
const SELLER_STATE_CODE = '36';

export function calculateInvoiceTotals(invoice: InvoiceData): InvoiceData {
  // Simple: Just return CSV values as-is, no calculations
  // All values are already parsed from CSV in field-mapper.ts
  return invoice;
}

export function processInvoices(invoices: InvoiceData[]): InvoiceData[] {
  return invoices.map(calculateInvoiceTotals);
}



