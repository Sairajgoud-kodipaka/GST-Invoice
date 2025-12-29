'use client';

import { Order, Invoice } from './storage';
import { InvoiceData } from '@/app/types/invoice';

// Service layer for Supabase operations
export class SupabaseService {
  // Orders
  static async getOrders(): Promise<Order[]> {
    try {
      const response = await fetch('/api/orders/list');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      return data.orders || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  static async createOrder(order: Order): Promise<Order> {
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }
    const data = await response.json();
    return data.order;
  }

  static async createOrders(orders: Order[]): Promise<Order[]> {
    const response = await fetch('/api/orders/bulk-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create orders');
    }
    const data = await response.json();
    return data.orders || [];
  }

  static async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const response = await fetch('/api/orders/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update order');
    }
    const data = await response.json();
    return data.order;
  }

  static async deleteOrder(id: string): Promise<void> {
    const response = await fetch('/api/orders/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete order');
    }
  }

  static async deleteOrders(ids: string[]): Promise<void> {
    const response = await fetch('/api/orders/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete orders');
    }
  }

  // Invoices
  static async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await fetch('/api/invoices/list');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await response.json();
      return data.invoices || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  static async createInvoice(invoiceData: InvoiceData): Promise<Invoice> {
    const response = await fetch('/api/invoices/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceData }),
    });
    if (!response.ok) {
      const error = await response.json();
      // Create a custom error that includes the existing invoice info for 409 conflicts
      const errorObj = new Error(error.error || 'Failed to create invoice');
      if (response.status === 409 && error.existingInvoice) {
        (errorObj as any).status = 409;
        (errorObj as any).existingInvoice = error.existingInvoice;
        (errorObj as any).orderExists = error.orderExists || false;
      }
      throw errorObj;
    }
    const data = await response.json();
    
    // Transform to Invoice interface
    const invoice = data.invoice;
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_no || '',
      invoiceDate: invoice.invoice_date || '',
      orderNumber: invoice.order_no || '',
      orderId: invoice.order_no || '',
      customerName: invoice.customer_name || '',
      amount: invoice.total_amount ? parseFloat(invoice.total_amount.toString()) : 0,
      invoiceData: invoice.invoice_data || {},
      createdAt: invoice.created_at || new Date().toISOString(),
    };
  }

  static async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const response = await fetch('/api/invoices/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update invoice');
    }
    const data = await response.json();
    return data.invoice;
  }

  static async deleteInvoice(id: string): Promise<void> {
    const response = await fetch('/api/invoices/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete invoice');
    }
  }

  static async deleteInvoices(ids: string[]): Promise<void> {
    const response = await fetch('/api/invoices/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete invoices');
    }
  }

  // Get invoice by invoice number
  static async getInvoiceByInvoiceNumber(invoiceNo: string): Promise<Invoice | null> {
    try {
      const invoices = await this.getInvoices();
      return invoices.find(inv => inv.invoiceNumber === invoiceNo) || null;
    } catch (error) {
      console.error('Error fetching invoice by invoice number:', error);
      return null;
    }
  }

  // Get invoice by order number
  static async getInvoiceByOrderNumber(orderNo: string): Promise<Invoice | null> {
    try {
      const invoices = await this.getInvoices();
      return invoices.find(inv => inv.orderNumber === orderNo) || null;
    } catch (error) {
      console.error('Error fetching invoice by order number:', error);
      return null;
    }
  }
}


