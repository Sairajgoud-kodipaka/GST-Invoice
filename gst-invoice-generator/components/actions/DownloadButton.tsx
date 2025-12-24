'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceData } from '@/app/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface DownloadButtonProps {
  invoices: InvoiceData[];
  single?: boolean;
}

// Sanitize filename to remove invalid characters
function sanitizeFilename(filename: string): string {
  // Replace invalid filename characters with underscore
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}

export function DownloadButton({ invoices, single }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!invoices || invoices.length === 0) {
      toast({
        title: 'Error',
        description: 'No invoices to download',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    let downloadUrl: string | null = null;
    let downloadElement: HTMLAnchorElement | null = null;

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoices,
          single: single || invoices.length === 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      downloadUrl = window.URL.createObjectURL(blob);
      downloadElement = document.createElement('a');
      downloadElement.href = downloadUrl;
      downloadElement.style.display = 'none';

      if (single || invoices.length === 1) {
        const invoice = invoices[0];
        const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
        const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
        downloadElement.download = `Invoice_${invoiceNo}_${orderNo}.pdf`;
      } else {
        downloadElement.download = 'invoices.zip';
      }

      document.body.appendChild(downloadElement);
      downloadElement.click();
      
      // Clean up after a short delay to ensure download starts
      setTimeout(() => {
        if (downloadUrl) {
          window.URL.revokeObjectURL(downloadUrl);
        }
        if (downloadElement && downloadElement.parentNode) {
          document.body.removeChild(downloadElement);
        }
      }, 100);

      toast({
        title: 'Success',
        description: `Invoice${invoices.length > 1 ? 's' : ''} downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      variant="default"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download {invoices.length > 1 ? 'All' : 'Invoice'}
        </>
      )}
    </Button>
  );
}










