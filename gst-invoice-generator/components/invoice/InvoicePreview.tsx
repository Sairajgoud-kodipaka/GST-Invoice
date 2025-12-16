'use client';

import React, { useEffect } from 'react';
import { InvoiceData } from '@/app/types/invoice';
import { InvoiceTemplate } from './InvoiceTemplate';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InvoicePreviewProps {
  invoices: InvoiceData[];
  onGenerate?: () => void;
}

export function InvoicePreview({ invoices, onGenerate }: InvoicePreviewProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  // Safety check: ensure we have invoices and valid index
  if (!invoices || invoices.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm text-center text-muted-foreground">
        No invoices to preview
      </div>
    );
  }

  // Ensure currentIndex is within bounds
  const safeIndex = Math.min(currentIndex, invoices.length - 1);
  const currentInvoice = invoices[safeIndex];

  // Update index if it was out of bounds
  useEffect(() => {
    if (currentIndex >= invoices.length) {
      setCurrentIndex(Math.max(0, invoices.length - 1));
    }
  }, [currentIndex, invoices.length]);

  const hasMultiple = invoices.length > 1;

  return (
    <div className="space-y-6">
      {hasMultiple && (
        <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm font-medium">
            Invoice {currentIndex + 1} of {invoices.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((prev) => Math.min(invoices.length - 1, prev + 1))}
            disabled={currentIndex === invoices.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {currentInvoice ? (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <InvoiceTemplate invoice={currentInvoice} />
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-white shadow-sm text-center text-muted-foreground">
          Invalid invoice data
        </div>
      )}

      {onGenerate && (
        <div className="flex justify-center">
          <Button onClick={onGenerate} size="lg">
            Generate {invoices.length > 1 ? 'All Invoices' : 'Invoice'}
          </Button>
        </div>
      )}
    </div>
  );
}










