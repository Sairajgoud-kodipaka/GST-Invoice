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
import { DownloadButton } from '@/components/actions/DownloadButton';
import { PrintButton } from '@/components/actions/PrintButton';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { invoicesStorage, ordersStorage, Invoice } from '@/app/lib/storage';
import { formatCurrency } from '@/app/lib/invoice-formatter';
import { FileText, Search, Download, Trash2, Eye, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function InvoicesContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const loadInvoices = () => {
      const allInvoices = invoicesStorage.getAll();
      setInvoices(allInvoices);
    };

    loadInvoices();
    
    // Check for invoiceId in URL params
    const invoiceId = searchParams.get('invoiceId');
    if (invoiceId) {
      const invoice = invoicesStorage.getById(invoiceId);
      if (invoice) {
        setPreviewInvoice(invoice);
        setIsPreviewOpen(true);
      }
    }
    
    // Refresh every 5 seconds
    const interval = setInterval(loadInvoices, 5000);
    return () => clearInterval(interval);
  }, [searchParams]);

  // Filter invoices based on search
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;

    const query = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customerName.toLowerCase().includes(query) ||
        inv.orderNumber.toLowerCase().includes(query)
    );
  }, [invoices, searchQuery]);

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

  const handleDelete = (id: string) => {
    // Get invoice before deleting to find the order
    const invoice = invoicesStorage.getById(id);
    
    invoicesStorage.delete(id);
    
    // Update the corresponding order to mark it as not having an invoice
    if (invoice) {
      const allOrders = ordersStorage.getAll();
      const order = allOrders.find((o) => o.invoiceId === id);
      if (order) {
        ordersStorage.update(order.id, {
          hasInvoice: false,
          invoiceId: undefined,
        });
      }
    }
    
    setInvoices(invoicesStorage.getAll());
    setSelectedInvoices((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    toast({
      title: 'Success',
      description: 'Invoice deleted successfully',
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedInvoices);
    
    // Get invoices before deleting to find orders
    const invoicesToDelete = ids.map(id => invoicesStorage.getById(id)).filter(Boolean);
    
    invoicesStorage.deleteMany(ids);
    
    // Update corresponding orders
    const allOrders = ordersStorage.getAll();
    invoicesToDelete.forEach((invoice) => {
      if (invoice) {
        const order = allOrders.find((o) => o.invoiceId === invoice.id);
        if (order) {
          ordersStorage.update(order.id, {
            hasInvoice: false,
            invoiceId: undefined,
          });
        }
      }
    });
    
    setInvoices(invoicesStorage.getAll());
    setSelectedInvoices(new Set());
    toast({
      title: 'Success',
      description: `${ids.length} invoice(s) deleted successfully`,
    });
  };

  const handleBulkDownload = async () => {
    const selectedInvoiceData = invoices
      .filter((inv) => selectedInvoices.has(inv.id))
      .map((inv) => inv.invoiceData);

    if (selectedInvoiceData.length === 0) {
      toast({
        title: 'No invoices selected',
        description: 'Please select at least one invoice to download',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Download Started',
        description: `Generating PDF for ${selectedInvoiceData.length} invoice(s)...`,
      });

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoices: selectedInvoiceData,
          single: selectedInvoiceData.length === 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';

      // Sanitize filename to remove invalid characters
      const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

      if (selectedInvoiceData.length === 1) {
        const invoice = selectedInvoiceData[0];
        const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
        const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
        a.download = `Invoice_${invoiceNo}_${orderNo}.pdf`;
      } else {
        a.download = 'invoices.zip';
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
        description: `${selectedInvoiceData.length} invoice(s) downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download invoices',
        variant: 'destructive',
      });
    }
  };

  const handleBulkExport = async () => {
    const selectedInvoiceData = invoices
      .filter((inv) => selectedInvoices.has(inv.id))
      .map((inv) => inv.invoiceData);

    if (selectedInvoiceData.length === 0) {
      toast({
        title: 'No invoices selected',
        description: 'Please select at least one invoice to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Export Started',
        description: `Generating batch PDF for ${selectedInvoiceData.length} invoice(s)...`,
      });

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoices: selectedInvoiceData,
          batch: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate batch PDF');
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
        description: `Batch PDF with ${selectedInvoiceData.length} invoice(s) exported successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export batch PDF',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  };

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
              View, manage, download, and print invoices
            </p>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedInvoices.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedInvoices.size} invoice(s) selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkExport}>
                <FileText className="h-4 w-4 mr-2" />
                Export Complete Batch
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Selected
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-4">
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
        </div>

        {/* Invoices Table */}
        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              {invoices.length === 0
                ? 'Import orders and generate invoices to get started'
                : 'No invoices match your search'}
            </p>
            {invoices.length === 0 && (
              <Link href="/orders">
                <Button>
                  Go to Orders
                </Button>
              </Link>
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
                        <TableCell>
                          <Link
                            href={`/orders?orderId=${invoice.orderId}`}
                            className="hover:underline text-primary"
                          >
                            {invoice.orderNumber}
                          </Link>
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
                            <DownloadButton invoices={[invoice.invoiceData]} single />
                            <PrintButton invoice={invoice.invoiceData} />
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
              <InvoicePreview invoices={[previewInvoice.invoiceData]} />
              <div className="flex gap-4 mt-6 justify-end">
                <DownloadButton invoices={[previewInvoice.invoiceData]} single />
                <PrintButton invoice={previewInvoice.invoiceData} />
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
              </div>
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

