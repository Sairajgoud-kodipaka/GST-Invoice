'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceData } from '@/app/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface BatchPDFButtonProps {
  invoices: InvoiceData[];
  variant?: 'default' | 'outline' | 'ghost';
  mode?: 'merged' | 'zip'; // merged = single PDF, zip = multiple PDFs in ZIP
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function BatchPDFButton({ 
  invoices, 
  variant = 'default',
  mode = 'merged',
  size = 'default',
  className
}: BatchPDFButtonProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (invoices.length === 0) {
      toast({
        title: 'Error',
        description: 'No invoices selected',
        variant: 'destructive',
      });
      return;
    }

    // Validate all invoices have required data
    const invalidInvoices = invoices.filter(inv => !inv || !inv.metadata || !inv.metadata.invoiceNo);
    if (invalidInvoices.length > 0) {
      toast({
        title: 'Error',
        description: `${invalidInvoices.length} invoice(s) have incomplete data. Cannot generate PDFs.`,
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    
    try {
      // Call batch PDF API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices,
          batch: mode === 'merged',
          zip: mode === 'zip',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate PDFs';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            // Add helpful context for common errors
            if (errorMessage.includes('Vercel Deployment Protection')) {
              errorMessage = 'PDF generation is temporarily unavailable. Please contact support or try again later.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
              errorMessage = 'PDF generation timed out. The batch may be too large. Please try fewer invoices or try again.';
            }
          } else {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText.substring(0, 200);
            }
          }
        } catch {
          errorMessage = `Server error (${response.status}). Please try again.`;
        }
        throw new Error(errorMessage);
      }

      // Validate response content type
      const contentType = response.headers.get('content-type');
      const expectedType = mode === 'merged' ? 'application/pdf' : 'application/zip';
      if (!contentType || !contentType.includes(expectedType)) {
        throw new Error(`Server returned invalid file type. Expected ${expectedType}. Please try again.`);
      }

      // Download the file
      const blob = await response.blob();
      
      // Validate blob size
      if (blob.size === 0) {
        throw new Error('Generated file is empty. Please try again.');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      
      if (mode === 'merged') {
        link.download = `Invoices-Batch-${dateStr}.pdf`;
      } else {
        link.download = `Invoices-${dateStr}.zip`;
      }
      
      // Add link to DOM temporarily (required for some browsers)
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: 'Success',
        description: mode === 'merged' 
          ? `${invoices.length} invoice(s) merged into one PDF` 
          : `${invoices.length} invoice(s) downloaded as ZIP`,
      });

    } catch (error) {
      console.error('Batch PDF generation error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate PDFs. Please check your connection and try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={generating || invoices.length === 0}
      variant={variant}
      size={size}
      className={className}
    >
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating {invoices.length} PDF{invoices.length !== 1 ? 's' : ''}...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {mode === 'merged' 
            ? `Download ${invoices.length} as PDF` 
            : `Download ${invoices.length} as ZIP`}
        </>
      )}
    </Button>
  );
}




