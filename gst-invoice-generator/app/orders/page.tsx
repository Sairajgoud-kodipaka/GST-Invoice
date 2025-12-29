'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CSVProcessor } from '@/components/upload/CSVProcessor';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Plus, Search, Trash2, FileText, Eye, MoreVertical, Pencil, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Order,
  Invoice,
  invoiceDataToOrder,
  orderToInvoice,
} from '@/app/lib/storage';
import { SupabaseService } from '@/app/lib/supabase-service';
import { formatCurrency } from '@/app/lib/invoice-formatter';
import { InvoiceData } from '@/app/types/invoice';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import Link from 'next/link';

type StatusFilter = 'all' | 'pending' | 'has-invoice';

// Type-safe helper to validate InvoiceData structure
function validateInvoiceData(invoiceData: InvoiceData | undefined): string[] {
  const missingFields: string[] = [];
  if (!invoiceData) {
    return ['invoiceData'];
  }
  if (!invoiceData.business) missingFields.push('business');
  if (!invoiceData.billToParty) missingFields.push('billToParty');
  if (!invoiceData.shipToParty) missingFields.push('shipToParty');
  if (!invoiceData.lineItems || !Array.isArray(invoiceData.lineItems) || invoiceData.lineItems.length === 0) {
    missingFields.push('lineItems');
  }
  if (!invoiceData.taxSummary) missingFields.push('taxSummary');
  if (!invoiceData.metadata) missingFields.push('metadata');
  return missingFields;
}

interface EditInvoiceFormProps {
  order: Order;
  onSave: (invoiceData: InvoiceData) => void;
  onCancel: () => void;
}

function EditInvoiceForm({ order, onSave, onCancel }: EditInvoiceFormProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(order.invoiceData);

  const handleFieldChange = (path: string, value: any) => {
    const keys = path.split('.');
    setInvoiceData((prev) => {
      const updated = { ...prev };
      let current: any = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setInvoiceData((prev) => {
      const updated = { ...prev };
      updated.lineItems = [...updated.lineItems];
      updated.lineItems[index] = { ...updated.lineItems[index], [field]: value };
      
      // Recalculate line item totals
      const item = updated.lineItems[index];
      item.taxableAmount = (item.quantity * item.ratePerItem) - item.discountPerItem;
      const taxAmount = (item.taxableAmount * item.gstRate) / 100;
      if (item.igst) {
        item.igst = taxAmount;
      } else {
        item.cgst = taxAmount / 2;
        item.sgst = taxAmount / 2;
      }
      item.total = item.taxableAmount + taxAmount;

      // Recalculate tax summary
      updated.taxSummary = {
        subtotal: updated.lineItems.reduce((sum, i) => sum + (i.quantity * i.ratePerItem), 0),
        discountAmount: updated.lineItems.reduce((sum, i) => sum + i.discountPerItem, 0),
        totalTaxableAmount: updated.lineItems.reduce((sum, i) => sum + i.taxableAmount, 0),
        totalTaxAmount: updated.lineItems.reduce((sum, i) => sum + (i.igst || (i.cgst || 0) + (i.sgst || 0)), 0),
        totalAmountAfterTax: updated.lineItems.reduce((sum, i) => sum + i.total, 0),
      };
      if (updated.taxSummary.totalCgst !== undefined) {
        updated.taxSummary.totalCgst = updated.lineItems.reduce((sum, i) => sum + (i.cgst || 0), 0);
      }
      if (updated.taxSummary.totalSgst !== undefined) {
        updated.taxSummary.totalSgst = updated.lineItems.reduce((sum, i) => sum + (i.sgst || 0), 0);
      }
      if (updated.taxSummary.totalIgst !== undefined) {
        updated.taxSummary.totalIgst = updated.lineItems.reduce((sum, i) => sum + (i.igst || 0), 0);
      }

      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(invoiceData);
  };

  const financialStatusOptions = [
    { value: 'paid', label: 'Paid (Blue Stamp)' },
    { value: 'pending', label: 'Pending (Orange Stamp)' },
    { value: 'partially_paid', label: 'Partially Paid (Orange Stamp)' },
    { value: 'unpaid', label: 'Unpaid (Gray Stamp)' },
    { value: 'refunded', label: 'Refunded (Gray Stamp)' },
    { value: 'voided', label: 'Voided (Gray Stamp)' },
  ];

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="grid grid-cols-[1fr_2fr] gap-6 h-[calc(95vh-8rem)]">
        {/* Left Side - Edit Fields */}
        <div className="space-y-6 overflow-y-auto pr-2">
          {/* Financial Status & Stamp Selection */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <h3 className="font-semibold text-lg">Financial Status & Stamp</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="financialStatus" className="font-medium">Financial Status</Label>
              <Select
                value={invoiceData.metadata.financialStatus || 'none'}
                onValueChange={(value) => handleFieldChange('metadata.financialStatus', value === 'none' ? undefined : value)}
              >
                <SelectTrigger id="financialStatus" className="bg-white">
                  <SelectValue placeholder="Select financial status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Default: Paid)</SelectItem>
                  {financialStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the payment status stamp that will appear on the invoice
              </p>
            </div>
          </div>

          {/* Invoice Metadata */}
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium text-base">Invoice Metadata</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNo">Invoice Number</Label>
                <Input
                  id="invoiceNo"
                  value={invoiceData.metadata.invoiceNo}
                  onChange={(e) => handleFieldChange('metadata.invoiceNo', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderNo">Order Number</Label>
                <Input
                  id="orderNo"
                  value={invoiceData.metadata.orderNo}
                  onChange={(e) => handleFieldChange('metadata.orderNo', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={(() => {
                    const [day, month, year] = invoiceData.metadata.invoiceDate.split('-');
                    return `${year}-${month}-${day}`;
                  })()}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-');
                    handleFieldChange('metadata.invoiceDate', `${day}-${month}-${year}`);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={(() => {
                    const [day, month, year] = invoiceData.metadata.orderDate.split('-');
                    return `${year}-${month}-${day}`;
                  })()}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-');
                    handleFieldChange('metadata.orderDate', `${day}-${month}-${year}`);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Input
                  id="paymentMethod"
                  value={invoiceData.metadata.paymentMethod}
                  onChange={(e) => handleFieldChange('metadata.paymentMethod', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportMode">Transport Mode</Label>
                <Input
                  id="transportMode"
                  value={invoiceData.metadata.transportMode || ''}
                  onChange={(e) => handleFieldChange('metadata.transportMode', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bill To Party */}
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium text-base">Bill To Party</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billToName">Name</Label>
                <Input
                  id="billToName"
                  value={invoiceData.billToParty.name}
                  onChange={(e) => handleFieldChange('billToParty.name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToGstin">GSTIN</Label>
                <Input
                  id="billToGstin"
                  value={invoiceData.billToParty.gstin || ''}
                  onChange={(e) => handleFieldChange('billToParty.gstin', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToAddress">Address</Label>
                <Input
                  id="billToAddress"
                  value={invoiceData.billToParty.address}
                  onChange={(e) => handleFieldChange('billToParty.address', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToCity">City</Label>
                <Input
                  id="billToCity"
                  value={invoiceData.billToParty.city || ''}
                  onChange={(e) => handleFieldChange('billToParty.city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToState">State</Label>
                <Input
                  id="billToState"
                  value={invoiceData.billToParty.state}
                  onChange={(e) => handleFieldChange('billToParty.state', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToStateCode">State Code</Label>
                <Input
                  id="billToStateCode"
                  value={invoiceData.billToParty.stateCode}
                  onChange={(e) => handleFieldChange('billToParty.stateCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToPincode">Pincode</Label>
                <Input
                  id="billToPincode"
                  value={invoiceData.billToParty.pincode}
                  onChange={(e) => handleFieldChange('billToParty.pincode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToPhone">Phone</Label>
                <Input
                  id="billToPhone"
                  value={invoiceData.billToParty.phone || ''}
                  onChange={(e) => handleFieldChange('billToParty.phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToEmail">Email</Label>
                <Input
                  id="billToEmail"
                  type="email"
                  value={invoiceData.billToParty.email || ''}
                  onChange={(e) => handleFieldChange('billToParty.email', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Ship To Party */}
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium text-base">Ship To Party</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipToName">Name</Label>
                <Input
                  id="shipToName"
                  value={invoiceData.shipToParty.name}
                  onChange={(e) => handleFieldChange('shipToParty.name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToGstin">GSTIN</Label>
                <Input
                  id="shipToGstin"
                  value={invoiceData.shipToParty.gstin || ''}
                  onChange={(e) => handleFieldChange('shipToParty.gstin', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToAddress">Address</Label>
                <Input
                  id="shipToAddress"
                  value={invoiceData.shipToParty.address}
                  onChange={(e) => handleFieldChange('shipToParty.address', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToCity">City</Label>
                <Input
                  id="shipToCity"
                  value={invoiceData.shipToParty.city || ''}
                  onChange={(e) => handleFieldChange('shipToParty.city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToState">State</Label>
                <Input
                  id="shipToState"
                  value={invoiceData.shipToParty.state}
                  onChange={(e) => handleFieldChange('shipToParty.state', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToStateCode">State Code</Label>
                <Input
                  id="shipToStateCode"
                  value={invoiceData.shipToParty.stateCode}
                  onChange={(e) => handleFieldChange('shipToParty.stateCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToPincode">Pincode</Label>
                <Input
                  id="shipToPincode"
                  value={invoiceData.shipToParty.pincode}
                  onChange={(e) => handleFieldChange('shipToParty.pincode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToPhone">Phone</Label>
                <Input
                  id="shipToPhone"
                  value={invoiceData.shipToParty.phone || ''}
                  onChange={(e) => handleFieldChange('shipToParty.phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToEmail">Email</Label>
                <Input
                  id="shipToEmail"
                  type="email"
                  value={invoiceData.shipToParty.email || ''}
                  onChange={(e) => handleFieldChange('shipToParty.email', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium text-base">Line Items</h4>
            <div className="space-y-4">
              {invoiceData.lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        value={item.itemName}
                        onChange={(e) => handleLineItemChange(index, 'itemName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input
                        value={item.sku}
                        onChange={(e) => handleLineItemChange(index, 'sku', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rate Per Item</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.ratePerItem}
                        onChange={(e) => handleLineItemChange(index, 'ratePerItem', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Per Item</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.discountPerItem}
                        onChange={(e) => handleLineItemChange(index, 'discountPerItem', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HSN</Label>
                      <Input
                        value={item.hsn}
                        onChange={(e) => handleLineItemChange(index, 'hsn', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.gstRate}
                        onChange={(e) => handleLineItemChange(index, 'gstRate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.total.toFixed(2)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Summary (Read-only) */}
          <div className="space-y-4 border rounded-lg p-4 bg-green-50 dark:bg-green-950">
            <h4 className="font-medium text-base">Tax Summary (Auto-calculated)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="font-medium">{formatCurrency(invoiceData.taxSummary.subtotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Discount</p>
                <p className="font-medium">{formatCurrency(invoiceData.taxSummary.discountAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxable Amount</p>
                <p className="font-medium">{formatCurrency(invoiceData.taxSummary.totalTaxableAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tax</p>
                <p className="font-medium">{formatCurrency(invoiceData.taxSummary.totalTaxAmount)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium text-lg text-green-700 dark:text-green-400">{formatCurrency(invoiceData.taxSummary.totalAmountAfterTax)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>

        {/* Right Side - Live Preview */}
        <div className="border rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="bg-muted px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="font-semibold">Live Preview</h3>
              </div>
              <p className="text-xs text-muted-foreground">Updates in real-time</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {invoiceData ? (
              <InvoicePreview invoices={[invoiceData]} />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                No invoice data available
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function OrdersContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'amount-asc' | 'amount-desc'>('date-desc');
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<string | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const [allOrders, allInvoices] = await Promise.all([
          SupabaseService.getOrders(),
          SupabaseService.getInvoices(),
        ]);
        setOrders(allOrders);
        setInvoices(allInvoices);
        
        // Check for orderId in URL params
        const orderId = searchParams.get('orderId');
        if (orderId) {
          const order = allOrders.find(o => o.id === orderId);
          if (order) {
            setPreviewOrder(order);
            setIsPreviewOpen(true);
          }
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      }
    };

    loadOrders();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [searchParams]);

  // Helper function to parse DD-MM-YYYY date to Date object
  const parseOrderDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  // Helper function to convert YYYY-MM-DD to DD-MM-YYYY
  const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Helper function to convert DD-MM-YYYY to YYYY-MM-DD
  const formatDateFromInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter((o) => !o.hasInvoice);
    } else if (statusFilter === 'has-invoice') {
      filtered = filtered.filter((o) => o.hasInvoice);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((o) => {
        const orderDate = parseOrderDate(o.orderDate);
        if (!orderDate) return false;
        orderDate.setHours(0, 0, 0, 0);
        return orderDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => {
        const orderDate = parseOrderDate(o.orderDate);
        if (!orderDate) return false;
        orderDate.setHours(23, 59, 59, 999);
        return orderDate <= toDate;
      });
    }

    // Sort orders
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date-asc' || sortBy === 'date-desc') {
        const dateA = parseOrderDate(a.orderDate);
        const dateB = parseOrderDate(b.orderDate);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        const comparison = dateA.getTime() - dateB.getTime();
        return sortBy === 'date-asc' ? comparison : -comparison;
      } else if (sortBy === 'amount-asc' || sortBy === 'amount-desc') {
        const comparison = a.totalAmount - b.totalAmount;
        return sortBy === 'amount-asc' ? comparison : -comparison;
      }
      return 0;
    });

    return sorted;
  }, [orders, statusFilter, searchQuery, dateFrom, dateTo, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const toggleOrderSelection = (id: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map((o) => o.id)));
    }
  };

  const isAllSelected =
    paginatedOrders.length > 0 && selectedOrders.size === paginatedOrders.length;
  const isIndeterminate =
    selectedOrders.size > 0 && selectedOrders.size < paginatedOrders.length;

  const handleGenerateInvoice = async (order: Order, navigateToInvoice = true) => {
    if (isGeneratingInvoice === order.id) return; // Prevent duplicate clicks
    setIsGeneratingInvoice(order.id);
    try {
      // If invoice already exists, update it instead of creating duplicate
      if (order.hasInvoice && order.invoiceId) {
        const allInvoices = await SupabaseService.getInvoices();
        const existingInvoice = allInvoices.find(inv => inv.id === order.invoiceId);
        if (existingInvoice) {
          // Update existing invoice with current order data
          await SupabaseService.updateInvoice(order.invoiceId, {
            invoiceData: order.invoiceData,
            customerName: order.customerName,
            amount: order.totalAmount,
          });
          toast({
            title: 'Success',
            description: `Invoice ${existingInvoice.invoiceNumber} updated successfully`,
          });
          
          if (navigateToInvoice) {
            try {
              await router.push(`/invoices?invoiceId=${order.invoiceId}`);
            } catch (navError) {
              console.error('Navigation error:', navError);
              toast({
                title: 'Warning',
                description: 'Invoice updated but navigation failed. Please refresh the page.',
                variant: 'destructive',
              });
            }
          }
          // Reload orders
          const updatedOrders = await SupabaseService.getOrders();
          setOrders(updatedOrders);
          return;
        }
      }

      // Validate invoiceData structure - fail fast if incomplete
      const missingFields = validateInvoiceData(order.invoiceData);
      
      if (missingFields.length > 0) {
        throw new Error(
          `Order ${order.orderNumber} has incomplete invoice data. ` +
          `Missing: ${missingFields.join(', ')}. Please re-import this order from CSV.`
        );
      }

      // Create new invoice via API
      const invoice = await SupabaseService.createInvoice(order.invoiceData);
      await SupabaseService.updateOrder(order.id, {
        hasInvoice: true,
        invoiceId: invoice.id,
      });
      const updatedOrders = await SupabaseService.getOrders();
      setOrders(updatedOrders);
      toast({
        title: 'Success',
        description: `Invoice ${invoice.invoiceNumber} generated successfully`,
      });
      
      // Automatically navigate to invoices page with the new invoice
      if (navigateToInvoice) {
        try {
          await router.push(`/invoices?invoiceId=${invoice.id}`);
        } catch (navError) {
          console.error('Navigation error:', navError);
          toast({
            title: 'Warning',
            description: 'Invoice generated but navigation failed. Please refresh the page.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate invoice',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInvoice(null);
    }
  };

  const handleInvoicesReady = useCallback(
    async (generatedInvoices: InvoiceData[]) => {
      try {
        const newOrders = generatedInvoices.map(invoiceDataToOrder);
        await SupabaseService.createOrders(newOrders);
        const updatedOrders = await SupabaseService.getOrders();
        setOrders(updatedOrders);
        setShowUpload(false); // Hide upload section after successful import
        toast({
          title: 'Success',
          description: `${newOrders.length} order(s) imported successfully`,
        });
      } catch (error) {
        console.error('Error importing orders:', error);
        toast({
          title: 'Error',
          description: 'Failed to import orders',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      toast({
        title: 'Import Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
    [toast]
  );

  const handleBulkGenerateInvoices = async () => {
    if (isBulkGenerating) return; // Prevent duplicate clicks
    setIsBulkGenerating(true);
    
    const selectedOrderIds = Array.from(selectedOrders);
    const selectedOrdersData = orders.filter((o) => selectedOrderIds.includes(o.id));

    if (selectedOrdersData.length === 0) {
      toast({
        title: 'No orders selected',
        description: 'Please select at least one order',
        variant: 'destructive',
      });
      setIsBulkGenerating(false);
      return;
    }

    try {
      const updatedInvoices: Invoice[] = [];
      const newInvoices: Invoice[] = [];
      const allInvoices = await SupabaseService.getInvoices();
      
      for (const order of selectedOrdersData) {
        // If invoice already exists, update it instead of creating duplicate
        if (order.hasInvoice && order.invoiceId) {
          const existingInvoice = allInvoices.find(inv => inv.id === order.invoiceId);
          if (existingInvoice) {
            await SupabaseService.updateInvoice(order.invoiceId, {
              invoiceData: order.invoiceData,
              customerName: order.customerName,
              amount: order.totalAmount,
            });
            updatedInvoices.push(existingInvoice);
            continue;
          }
        }

        // Validate invoiceData structure - fail fast if incomplete
        const missingFields = validateInvoiceData(order.invoiceData);
        
        if (missingFields.length > 0) {
          console.error(`Order ${order.orderNumber} has incomplete invoice data. Missing: ${missingFields.join(', ')}`);
          // Skip this order and continue with others
          continue;
        }

        // Create new invoice
        const invoice = await SupabaseService.createInvoice(order.invoiceData);
        await SupabaseService.updateOrder(order.id, {
          hasInvoice: true,
          invoiceId: invoice.id,
        });
        newInvoices.push(invoice);
      }

      const updatedOrders = await SupabaseService.getOrders();
      setOrders(updatedOrders);
      setSelectedOrders(new Set());
      
      const totalProcessed = newInvoices.length + updatedInvoices.length;
      const message = newInvoices.length > 0 && updatedInvoices.length > 0
        ? `${newInvoices.length} invoice(s) generated, ${updatedInvoices.length} invoice(s) updated`
        : newInvoices.length > 0
        ? `${newInvoices.length} invoice(s) generated successfully`
        : `${updatedInvoices.length} invoice(s) updated successfully`;
      
      toast({
        title: 'Success',
        description: message,
      });
      
      // Navigate to invoices page after bulk generation
      if (totalProcessed > 0) {
        try {
          await router.push('/invoices');
        } catch (navError) {
          console.error('Navigation error:', navError);
          toast({
            title: 'Warning',
            description: 'Invoices generated but navigation failed. Please refresh the page.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoices';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeleting === id) return; // Prevent duplicate clicks
    setIsDeleting(id);
    try {
      await SupabaseService.deleteOrder(id);
      const updatedOrders = await SupabaseService.getOrders();
      setOrders(updatedOrders);
      setSelectedOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast({
        title: 'Success',
        description: 'Order deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete order',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (isBulkDeleting) return; // Prevent duplicate clicks
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedOrders);
      await SupabaseService.deleteOrders(ids);
      const updatedOrders = await SupabaseService.getOrders();
      setOrders(updatedOrders);
      setSelectedOrders(new Set());
      toast({
        title: 'Success',
        description: `${ids.length} order(s) deleted successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete orders',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkExport = async () => {
    if (isBulkExporting) return;
    setIsBulkExporting(true);

    const selectedOrderIds = Array.from(selectedOrders);
    const selectedOrdersData = orders.filter((o) => selectedOrderIds.includes(o.id));
    
    // Filter to only orders that have invoices
    const ordersWithInvoices = selectedOrdersData.filter((o) => o.hasInvoice && o.invoiceId);
    
    if (ordersWithInvoices.length === 0) {
      toast({
        title: 'No invoices to export',
        description: 'Please select orders that have invoices generated',
        variant: 'destructive',
      });
      setIsBulkExporting(false);
      return;
    }

    // Get invoice data for selected orders
    const allInvoices = await SupabaseService.getInvoices();
    const invoiceData = ordersWithInvoices
      .map((order) => {
        if (order.invoiceId) {
          const invoice = allInvoices.find(inv => inv.id === order.invoiceId);
          return invoice?.invoiceData;
        }
        return null;
      })
      .filter((data): data is InvoiceData => data !== null);

    if (invoiceData.length === 0) {
      toast({
        title: 'No invoice data found',
        description: 'Could not find invoice data for selected orders',
        variant: 'destructive',
      });
      setIsBulkExporting(false);
      return;
    }

    try {
      toast({
        title: 'Export Started',
        description: `Generating batch PDF for ${invoiceData.length} invoice(s)...`,
      });

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoices: invoiceData,
          batch: true,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate batch PDF';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          // If parsing fails, use default message
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          a.download = filenameMatch[1];
        } else {
          a.download = 'invoice_batch.pdf';
        }
      } else {
        a.download = 'invoice_batch.pdf';
      }

      document.body.appendChild(a);
      a.click();
      
      // Clean up after a short delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (a.parentNode) {
          document.body.removeChild(a);
        }
      }, 100);

      toast({
        title: 'Success',
        description: `Batch PDF with ${invoiceData.length} invoice(s) exported successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export batch PDF',
        variant: 'destructive',
      });
    } finally {
      setIsBulkExporting(false);
    }
  };

  const handlePreview = (order: Order) => {
    setPreviewOrder(order);
    setIsPreviewOpen(true);
  };

  const handleEdit = (order: Order) => {
    setEditOrder(order);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (updatedInvoiceData: InvoiceData) => {
    if (!editOrder) return;

    try {
      // Update order's invoice data
      await SupabaseService.updateOrder(editOrder.id, {
        invoiceData: updatedInvoiceData,
        customerName: updatedInvoiceData.billToParty.name,
        totalAmount: updatedInvoiceData.taxSummary.totalAmountAfterTax,
      });

      // If order has an invoice, update it too
      if (editOrder.hasInvoice && editOrder.invoiceId) {
        const allInvoices = await SupabaseService.getInvoices();
        const invoice = allInvoices.find(inv => inv.id === editOrder.invoiceId);
        if (invoice) {
          await SupabaseService.updateInvoice(editOrder.invoiceId, {
            invoiceData: updatedInvoiceData,
            customerName: updatedInvoiceData.billToParty.name,
            amount: updatedInvoiceData.taxSummary.totalAmountAfterTax,
          });
        }
      }

      const updatedOrders = await SupabaseService.getOrders();
      setOrders(updatedOrders);
      setIsEditOpen(false);
      setEditOrder(null);
      toast({
        title: 'Success',
        description: 'Order invoice updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order invoice',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold mb-2">
              Orders
              {orders.length > 0 && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  ({orders.length})
                </span>
              )}
            </h1>
          <p className="text-muted-foreground">
              Import, view, and manage orders. Generate invoices from orders.
          </p>
        </div>
        <div>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="h-4 w-4 mr-2" />
            {showUpload ? 'Hide Upload' : 'Import Orders'}
          </Button>
        </div>
      </div>

      {/* CSV Upload Section */}
      {showUpload && (
        <div className="border rounded-lg p-6 bg-muted/50">
          <h2 className="text-lg font-semibold mb-4">Import Orders from CSV</h2>
          <CSVProcessor
            onInvoicesReady={handleInvoicesReady}
            onError={handleError}
          />
        </div>
      )}

        {/* Bulk Actions Bar */}
        {selectedOrders.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedOrders.size} order(s) selected
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkExport}
                disabled={isBulkExporting}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isBulkExporting ? 'Exporting...' : 'Export Complete Batch'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkGenerateInvoices}
                disabled={isBulkGenerating}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isBulkGenerating ? 'Generating...' : 'Generate Invoices'}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending Invoice</SelectItem>
                <SelectItem value="has-invoice">Has Invoice</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date-asc' | 'date-desc' | 'amount-asc' | 'amount-desc')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-[160px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-[160px]"
              />
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setCurrentPage(1);
                  }}
                  className="h-8"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">
              {orders.length === 0
                ? 'No orders yet. Click "Import Orders" to upload a CSV file.'
                : 'No orders match your search'}
          </p>
        </div>
      ) : (
          <>
        <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onCheckedChange={toggleSelectAll}
                />
                </TableHead>
                <TableHead>Order Number</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                  {paginatedOrders.map((order) => {
                    const isSelected = selectedOrders.has(order.id);
                return (
                  <TableRow
                        key={order.id}
                    className={isSelected ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                          <button
                            onClick={() => handlePreview(order)}
                            className="hover:underline text-primary"
                          >
                            {order.orderNumber}
                          </button>
                        </TableCell>
                        <TableCell>{order.orderDate}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>
                          {order.hasInvoice ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Has Invoice
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                              Pending Invoice
                            </span>
                          )}
                    </TableCell>
                    <TableCell>
                          {order.hasInvoice && order.invoiceId ? (
                            <Link
                              href={`/invoices?invoiceId=${order.invoiceId}`}
                              className="hover:underline text-primary"
                            >
                              {invoices.find(inv => inv.id === order.invoiceId)?.invoiceNumber || 'N/A'}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                    </TableCell>
                    <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateInvoice(order)}
                              title={order.hasInvoice ? 'Update Invoice' : 'Generate Invoice'}
                              disabled={isGeneratingInvoice === order.id}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(order.id)}
                              disabled={isDeleting === order.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {previewOrder && (
            <div className="mt-4 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-medium">{previewOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{previewOrder.orderDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{previewOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{formatCurrency(previewOrder.totalAmount)}</p>
                </div>
              </div>

              {/* Invoice Preview */}
              <div>
                <h3 className="font-semibold mb-4">Invoice Preview</h3>
                {previewOrder.invoiceData ? (
                  <InvoicePreview invoices={[previewOrder.invoiceData]} />
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    No invoice data available for this order
                  </div>
                )}
              </div>

              {/* Actions */}
              <DialogFooter>
                <Button 
                  onClick={async () => {
                    await handleGenerateInvoice(previewOrder, true);
                    setIsPreviewOpen(false);
                  }}
                  disabled={isGeneratingInvoice === previewOrder.id}
                >
                  {isGeneratingInvoice === previewOrder.id 
                    ? 'Processing...' 
                    : previewOrder.hasInvoice 
                    ? 'Update Invoice' 
                    : 'Generate Invoice'}
                </Button>
                {previewOrder.hasInvoice && previewOrder.invoiceId && (
                  <Link href={`/invoices?invoiceId=${previewOrder.invoiceId}`}>
                    <Button variant="outline">
                      View Invoice
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Edit invoice details and select the financial status stamp
            </DialogDescription>
          </DialogHeader>
          {editOrder && (
            <EditInvoiceForm
              order={editOrder}
              onSave={handleSaveEdit}
              onCancel={() => {
                setIsEditOpen(false);
                setEditOrder(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <p>Loading orders...</p>
          </div>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
