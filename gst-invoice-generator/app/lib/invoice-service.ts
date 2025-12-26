/**
 * Invoice Service - Handles invoice number management via Supabase
 * Falls back to localStorage if Supabase is not configured
 */

import { invoiceSettingsStorage } from './storage';

export interface InvoiceExistsResponse {
  exists: boolean;
  invoice?: {
    invoiceNo: string;
    orderNo: string;
    createdAt: string;
    createdBy: string;
  };
}

export interface CreateInvoiceResponse {
  success: boolean;
  invoice?: any;
  error?: string;
  exists?: boolean;
  existingInvoice?: {
    invoiceNo: string;
    orderNo: string;
    createdAt: string;
    createdBy: string;
  };
}

class InvoiceService {
  /**
   * Get the next available invoice number
   * Uses Supabase if available, otherwise falls back to localStorage
   */
  async getNext(): Promise<string> {
    try {
      const response = await fetch('/api/invoices/next');
      if (response.ok) {
        const data = await response.json();
        return data.invoiceNo;
      } else {
        // Fallback to localStorage
        console.warn('Supabase unavailable, using localStorage fallback');
        return invoiceSettingsStorage.getNextInvoiceNumber();
      }
    } catch (error) {
      console.warn('Error fetching next invoice number, using localStorage fallback:', error);
      return invoiceSettingsStorage.getNextInvoiceNumber();
    }
  }

  /**
   * Check if an invoice number already exists
   */
  async exists(invoiceNo: string): Promise<InvoiceExistsResponse> {
    try {
      const response = await fetch('/api/invoices/exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNo }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        // If API fails, assume it doesn't exist (to allow creation)
        console.warn('Error checking invoice existence, assuming it does not exist');
        return { exists: false };
      }
    } catch (error) {
      console.warn('Error checking invoice existence, assuming it does not exist:', error);
      return { exists: false };
    }
  }

  /**
   * Create an invoice with duplicate checking
   * Returns error if invoice number already exists
   */
  async create(
    invoiceNo: string,
    orderNo: string,
    invoiceDate: string,
    options?: {
      orderDate?: string;
      customerName?: string;
      totalAmount?: number;
      invoiceData?: any;
    }
  ): Promise<CreateInvoiceResponse> {
    try {
      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo,
          orderNo,
          invoiceDate,
          orderDate: options?.orderDate,
          customerName: options?.customerName,
          totalAmount: options?.totalAmount,
          invoiceData: options?.invoiceData,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Conflict - invoice already exists
        return {
          success: false,
          error: data.error || 'Invoice number already exists',
          exists: true,
          existingInvoice: data.existingInvoice,
        };
      }

      if (response.ok) {
        return {
          success: true,
          invoice: data.invoice,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to create invoice',
        };
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      return {
        success: false,
        error: error.message || 'Failed to create invoice',
      };
    }
  }

  /**
   * Increment invoice number (extract number, add 1, reconstruct)
   * Handles formats like "Q-MAN-25-101" -> "Q-MAN-25-102"
   */
  incrementInvoiceNumber(invoiceNo: string): string {
    // Extract the numeric part at the end
    const match = invoiceNo.match(/^(.+?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2], 10);
      return `${prefix}${number + 1}`;
    }
    // If pattern doesn't match, just append "-1"
    return `${invoiceNo}-1`;
  }
}

export const invoiceService = new InvoiceService();

