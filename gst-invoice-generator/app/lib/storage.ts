'use client';

import { InvoiceData } from '@/app/types/invoice';

// Types
export interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: number;
  hasInvoice: boolean;
  invoiceId?: string;
  invoiceData: InvoiceData;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  amount: number;
  invoiceData: InvoiceData;
  createdAt: string;
}

// Storage keys
const ORDERS_STORAGE_KEY = 'gst-invoice-orders';
const INVOICES_STORAGE_KEY = 'gst-invoice-invoices';
const BUSINESS_SETTINGS_KEY = 'gst-invoice-business-settings';
const INVOICE_SETTINGS_KEY = 'gst-invoice-invoice-settings';

// Generic storage class with atomic operations
class Storage<T extends { id: string }> {
  private key: string;
  private items: T[] = [];
  private operationQueue: Promise<any> = Promise.resolve();

  constructor(key: string) {
    this.key = key;
    this.load();
  }

  // Queue operations to ensure atomicity
  private queueOperation<R>(operation: () => R): Promise<R> {
    this.operationQueue = this.operationQueue.then(async () => {
      return operation();
    }).catch((error) => {
      console.error(`Error in storage operation for ${this.key}:`, error);
      throw error;
    });
    return this.operationQueue;
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.key);
      this.items = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Error loading ${this.key}:`, error);
      this.items = [];
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.items));
    } catch (error) {
      console.error(`Error saving ${this.key}:`, error);
      throw error; // Re-throw to allow error handling in queue
    }
  }

  // Atomic load and save operation
  private async atomicLoadAndSave(operation: (items: T[]) => T[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.load();
        this.items = operation([...this.items]);
        this.save();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  getAll(): T[] {
    this.load();
    return [...this.items];
  }

  getById(id: string): T | undefined {
    this.load();
    return this.items.find((item) => item.id === id);
  }

  add(item: T): void {
    this.queueOperation(() => 
      this.atomicLoadAndSave((items) => {
        items.push(item);
        return items;
      })
    ).catch((error) => {
      console.error(`Error adding item to ${this.key}:`, error);
    });
  }

  addMany(items: T[]): void {
    this.queueOperation(() => 
      this.atomicLoadAndSave((currentItems) => {
        currentItems.push(...items);
        return currentItems;
      })
    ).catch((error) => {
      console.error(`Error adding items to ${this.key}:`, error);
    });
  }

  update(id: string, updates: Partial<T>): void {
    this.queueOperation(() => 
      this.atomicLoadAndSave((items) => {
        const index = items.findIndex((item) => item.id === id);
        if (index !== -1) {
          items[index] = { ...items[index], ...updates };
        }
        return items;
      })
    ).catch((error) => {
      console.error(`Error updating item in ${this.key}:`, error);
    });
  }

  delete(id: string): void {
    this.queueOperation(() => 
      this.atomicLoadAndSave((items) => {
        return items.filter((item) => item.id !== id);
      })
    ).catch((error) => {
      console.error(`Error deleting item from ${this.key}:`, error);
    });
  }

  deleteMany(ids: string[]): void {
    this.queueOperation(() => 
      this.atomicLoadAndSave((items) => {
        return items.filter((item) => !ids.includes(item.id));
      })
    ).catch((error) => {
      console.error(`Error deleting items from ${this.key}:`, error);
    });
  }

  clearAll(): void {
    this.queueOperation(() => {
      if (typeof window === 'undefined') return Promise.resolve();
      // Clear both memory and localStorage atomically
      return this.atomicLoadAndSave(() => []).then(() => {
        // Also explicitly remove from localStorage for extra safety
        try {
          localStorage.removeItem(this.key);
        } catch (error) {
          console.error(`Error removing ${this.key} from localStorage:`, error);
        }
      });
    }).catch((error) => {
      console.error(`Error clearing ${this.key}:`, error);
    });
  }
}

// Storage instances
export const ordersStorage = new Storage<Order>(ORDERS_STORAGE_KEY);
export const invoicesStorage = new Storage<Invoice>(INVOICES_STORAGE_KEY);

// Helper functions
export function invoiceDataToOrder(invoiceData: InvoiceData): Order {
  return {
    id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orderNumber: invoiceData.metadata.orderNo,
    orderDate: invoiceData.metadata.orderDate,
    customerName: invoiceData.billToParty.name,
    totalAmount: invoiceData.taxSummary.totalAmountAfterTax,
    hasInvoice: false,
    invoiceData,
    createdAt: new Date().toISOString(),
  };
}

export function orderToInvoice(order: Order, invoiceData: InvoiceData): Invoice {
  return {
    id: `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    invoiceNumber: invoiceData.metadata.invoiceNo,
    invoiceDate: invoiceData.metadata.invoiceDate,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customerName: order.customerName,
    amount: order.totalAmount,
    invoiceData,
    createdAt: new Date().toISOString(),
  };
}

// Settings Storage
export interface BusinessSettings {
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
  logoUrl?: string; // Base64 or URL
}

export interface InvoiceSettings {
  prefix: string;
  startingNumber: number;
  autoIncrement: boolean;
  defaultPaymentTerms: number; // days
  defaultPaymentMethod: string;
}

export const businessSettingsStorage = {
  get: (): BusinessSettings | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(BUSINESS_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading business settings:', error);
      return null;
    }
  },

  save: (settings: BusinessSettings): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving business settings:', error);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BUSINESS_SETTINGS_KEY);
  },
};

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  prefix: 'INV-',
  startingNumber: 1,
  autoIncrement: true,
  defaultPaymentTerms: 30,
  defaultPaymentMethod: 'Bank Transfer',
};

export const invoiceSettingsStorage = {
  get: (): InvoiceSettings => {
    if (typeof window === 'undefined') return DEFAULT_INVOICE_SETTINGS;
    try {
      const stored = localStorage.getItem(INVOICE_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_INVOICE_SETTINGS;
    } catch (error) {
      console.error('Error loading invoice settings:', error);
      return DEFAULT_INVOICE_SETTINGS;
    }
  },

  save: (settings: InvoiceSettings): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving invoice settings:', error);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(INVOICE_SETTINGS_KEY);
  },
};

