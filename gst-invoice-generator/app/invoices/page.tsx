'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PDFButton } from '@/components/actions/PDFButton';
import { BatchPDFButton } from '@/components/actions/BatchPDFButton';
import { PrintButton } from '@/components/actions/PrintButton';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { Invoice } from '@/app/lib/storage';
import { SupabaseService } from '@/app/lib/supabase-service';
import { formatCurrency } from '@/app/lib/invoice-formatter';
import { FileText, Search, Download, Trash2, Eye, MoreVertical, Upload, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { CSVProcessor } from '@/components/upload/CSVProcessor';
import { InvoiceData } from '@/app/types/invoice';
import { invoiceDataToOrder } from '@/app/lib/storage';
import { useCallback } from 'react';

function InvoicesContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        // Load invoices from Supabase
        const allInvoices = await SupabaseService.getInvoices();
        setInvoices(allInvoices);
        
        // Check for invoiceId or orderNumber in URL params after loading
        const invoiceId = searchParams.get('invoiceId');
        const orderNumber = searchParams.get('orderNumber');
        
        if (invoiceId) {
          const invoice = allInvoices.find((inv: Invoice) => inv.id === invoiceId);
          if (invoice) {
            setPreviewInvoice(invoice);
            setIsPreviewOpen(true);
          }
        } else if (orderNumber) {
          // Filter invoices by order number
          setSearchQuery(orderNumber);
          const invoice = allInvoices.find((inv: Invoice) => inv.orderNumber === orderNumber);
          if (invoice) {
            setPreviewInvoice(invoice);
            setIsPreviewOpen(true);
          }
        }
      } catch (error) {
        console.error('Error loading invoices:', error);
        toast({
          title: 'Error',
          description: 'Failed to load invoices',
          variant: 'destructive',
        });
      }
    };

    loadInvoices();
    
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadInvoices();
    }, 5000);
    return () => clearInterval(interval);
  }, [searchParams, toast]);

  // Helper function to parse invoice date (DD-MM-YYYY)
  const parseInvoiceDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  // Filter invoices based on search and date range
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.customerName.toLowerCase().includes(query) ||
          inv.orderNumber.toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((inv) => {
        const invoiceDate = parseInvoiceDate(inv.invoiceDate);
        if (!invoiceDate) return false;
        invoiceDate.setHours(0, 0, 0, 0);
        return invoiceDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((inv) => {
        const invoiceDate = parseInvoiceDate(inv.invoiceDate);
        if (!invoiceDate) return false;
        invoiceDate.setHours(23, 59, 59, 999);
        return invoiceDate <= toDate;
      });
    }

    return filtered;
  }, [invoices, searchQuery, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleInvoiceSelection = (id: string) => {
    setSelectedInvoices((prev) => {
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
    if (selectedInvoices.size === paginatedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(paginatedInvoices.map((inv) => inv.id)));
    }
  };

  const isAllSelected =
    paginatedInvoices.length > 0 && selectedInvoices.size === paginatedInvoices.length;
  const isIndeterminate =
    selectedInvoices.size > 0 && selectedInvoices.size < paginatedInvoices.length;

  const handleDelete = async (id: string) => {
    try {
      // Delete invoice (API will handle updating orders)
      await SupabaseService.deleteInvoice(id);
      
      // Reload invoices
      const updatedInvoices = await SupabaseService.getInvoices();
      setInvoices(updatedInvoices);
      
      setSelectedInvoices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedInvoices);
    
    try {
      // Delete invoices (API will handle updating orders)
      await SupabaseService.deleteInvoices(ids);
      
      // Reload invoices
      const updatedInvoices = await SupabaseService.getInvoices();
      setInvoices(updatedInvoices);
      setSelectedInvoices(new Set());
      
      toast({
        title: 'Success',
        description: `${ids.length} invoice(s) deleted successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete invoices',
        variant: 'destructive',
      });
    }
  };


  const handlePreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleInvoicesReady = useCallback(
    async (generatedInvoices: InvoiceData[]) => {
      try {
        // Create orders from invoices (invoices are already created during CSV import)
        const newOrders = generatedInvoices.map(invoiceDataToOrder);
        await SupabaseService.createOrders(newOrders);
        
        // Reload invoices to show the newly created ones
        const updatedInvoices = await SupabaseService.getInvoices();
        setInvoices(updatedInvoices);
        setShowUpload(false);
        
        toast({
          title: 'Success',
          description: `${generatedInvoices.length} invoice(s) generated and ready!`,
        });
      } catch (error) {
        console.error('Error importing invoices:', error);
        toast({
          title: 'Error',
          description: 'Failed to import invoices',
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

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Invoices
              {invoices.length > 0 && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  ({invoices.length})
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">
              Import orders, generate invoices, preview, download, and print
            </p>
          </div>
          <div>
            <Button onClick={() => setShowUpload(!showUpload)}>
              <Upload className="h-4 w-4 mr-2" />
              {showUpload ? 'Hide Import' : 'Import Orders'}
            </Button>
          </div>
        </div>

        {/* CSV Upload Section */}
        {showUpload && (
          <div className="border rounded-lg p-6 bg-muted/50">
            <h2 className="text-lg font-semibold mb-4">Import Orders from CSV</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a CSV file to automatically generate invoices. Invoices will be created and ready to preview, download, and print.
            </p>
            <CSVProcessor
              onInvoicesReady={handleInvoicesReady}
              onError={handleError}
            />
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedInvoices.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedInvoices.size} invoice(s) selected
            </span>
            <div className="flex gap-2">
              <BatchPDFButton
                invoices={invoices
                  .filter((inv) => selectedInvoices.has(inv.id) && inv.invoiceData && inv.invoiceData.metadata)
                  .map((inv) => inv.invoiceData)}
                mode="merged"
                size="sm"
                variant="outline"
              />
              <BatchPDFButton
                invoices={invoices
                  .filter((inv) => selectedInvoices.has(inv.id) && inv.invoiceData && inv.invoiceData.metadata)
                  .map((inv) => inv.invoiceData)}
                mode="zip"
                size="sm"
                variant="outline"
              />
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Search and Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number, customer name, or order number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">Date Range:</span>
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

        {/* Invoices Table */}
        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              {invoices.length === 0
                ? 'Import orders from CSV to automatically generate invoices'
                : 'No invoices match your search'}
            </p>
            {invoices.length === 0 && (
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Orders
              </Button>
            )}
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
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => {
                    const isSelected = selectedInvoices.has(invoice.id);
                    return (
                      <TableRow
                        key={invoice.id}
                        className={isSelected ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => handlePreview(invoice)}
                            className="hover:underline text-primary"
                          >
                            {invoice.invoiceNumber}
                          </button>
                        </TableCell>
                        <TableCell>{invoice.invoiceDate}</TableCell>
                        <TableCell className="font-medium">
                          {invoice.orderNumber}
                        </TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.invoiceData && invoice.invoiceData.metadata ? (
                              <>
                                <PDFButton invoice={invoice.invoiceData} size="sm" variant="ghost" />
                                <PrintButton invoice={invoice.invoiceData} />
                              </>
                            ) : (
                              <span 
                                className="text-xs text-red-600 cursor-help" 
                                title="Invoice data is incomplete. Please regenerate this invoice from the Orders page."
                              >
                                Incomplete
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(invoice.id)}
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

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="mt-4">
              {previewInvoice.invoiceData && previewInvoice.invoiceData.metadata ? (
                <>
                  <InvoicePreview invoices={[previewInvoice.invoiceData]} />
                  <div className="flex gap-4 mt-6 justify-end">
                    <PDFButton invoice={previewInvoice.invoiceData} />
                    <PrintButton invoice={previewInvoice.invoiceData} />
                    <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-red-600 font-semibold mb-2">Invoice data is incomplete</p>
                  <p className="text-muted-foreground mb-4">
                    This invoice was created with incomplete data. Please delete and re-import the order from CSV.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <p>Loading invoices...</p>
          </div>
        </div>
      </div>
    }>
      <InvoicesContent />
    </Suspense>
  );
}

