'use client';

import { useState, useCallback } from 'react';
import { parseCSV } from '@/app/lib/csv-parser';
import { mapCSVToInvoice, mapMultipleOrders } from '@/app/lib/field-mapper';
import { numberToWords } from '@/app/lib/invoice-formatter';
import { calculateInvoiceTotals } from '@/app/lib/invoice-calculator';
import { ParsedCSVData, InvoiceData } from '@/app/types/invoice';
import { CSVUploadZone } from './CSVUploadZone';
import { ImportStatusIndicator } from './ImportStatusIndicator';

interface CSVProcessorProps {
  onInvoicesReady: (invoices: InvoiceData[]) => void;
  onError: (error: string) => void;
}

export function CSVProcessor({ onInvoicesReady, onError }: CSVProcessorProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'complete'>('upload');
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback(async (files: File[]) => {
    setCsvFiles(files);
    setStep('processing');
    setProgress(0);

    const allInvoices: InvoiceData[] = [];
    const totalFiles = files.length;
    const processedFiles: { name: string; success: boolean; error?: string; invoiceCount: number }[] = [];

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const fileProgressStart = (fileIndex / totalFiles) * 100;
      const fileProgressEnd = ((fileIndex + 1) / totalFiles) * 100;
      const fileProgressRange = fileProgressEnd - fileProgressStart;

      try {
        // Parse CSV
        setProgress(fileProgressStart + fileProgressRange * 0.2);
        const data = await parseCSV(file, {
          onProgress: (p: number) => {
            setProgress(fileProgressStart + fileProgressRange * (0.2 + p * 0.3));
          },
        });

        setProgress(fileProgressStart + fileProgressRange * 0.6);

        // Validate required fields before processing
        const validationErrors: string[] = [];
        
        // Check for required columns
        const hasOrderNumber = data.headers.some(h => 
          /order\s*(number|no|id)/i.test(h)
        );
        const hasCustomerName = data.headers.some(h => 
          /(billing\s*name|customer\s*name|name)/i.test(h)
        );
        const hasLineItem = data.headers.some(h => 
          /(lineitem\s*name|product\s*name|item\s*name)/i.test(h)
        );
        const hasPrice = data.headers.some(h => 
          /(lineitem\s*price|price|unit\s*price)/i.test(h)
        );
        const hasQuantity = data.headers.some(h => 
          /(lineitem\s*quantity|quantity|qty)/i.test(h)
        );

        if (!hasOrderNumber && !hasCustomerName) {
          validationErrors.push('Missing required field: Order Number or Customer Name');
        }
        if (!hasLineItem) {
          validationErrors.push('Missing required field: Line Item Name (Product Name)');
        }
        if (!hasPrice) {
          validationErrors.push('Missing required field: Price');
        }
        if (!hasQuantity) {
          validationErrors.push('Missing required field: Quantity');
        }

        // Check if CSV has any data rows
        if (data.rows.length === 0) {
          validationErrors.push('CSV file contains no data rows');
        }

        // Check if at least one row has required data
        if (data.rows.length > 0) {
          const firstRow = data.rows[0];
          let hasValidData = false;
          
          // Check if we have at least customer name or order number
          const customerNameCol = data.headers.find(h => 
            /(billing\s*name|customer\s*name|name)/i.test(h)
          );
          const orderNumberCol = data.headers.find(h => 
            /order\s*(number|no|id)/i.test(h)
          );
          
          if (customerNameCol && firstRow[customerNameCol] && String(firstRow[customerNameCol]).trim()) {
            hasValidData = true;
          } else if (orderNumberCol && firstRow[orderNumberCol] && String(firstRow[orderNumberCol]).trim()) {
            hasValidData = true;
          }
          
          if (!hasValidData) {
            validationErrors.push('CSV file does not contain valid customer or order data');
          }
        }

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed for ${file.name}: ${validationErrors.join('; ')}`);
        }

        // Map CSV to invoices
        let rawInvoices: InvoiceData[];
        try {
          rawInvoices = data.rows.length === 1
            ? [mapCSVToInvoice(data, 0)]
            : mapMultipleOrders(data);
        } catch (mappingError) {
          throw new Error(`Failed to map CSV data: ${mappingError instanceof Error ? mappingError.message : 'Unknown mapping error'}`);
        }

        setProgress(fileProgressStart + fileProgressRange * 0.7);

        // Recalculate all totals using proper GST calculations
        // This ensures line items, taxes, and totals are all consistent
        const calculatedInvoices = rawInvoices.map(calculateInvoiceTotals);

        setProgress(fileProgressStart + fileProgressRange * 0.8);

        // Add amount in words (use calculated total)
        const finalInvoices = calculatedInvoices.map((invoice: InvoiceData) => {
          return {
            ...invoice,
            amountInWords: numberToWords(invoice.taxSummary.totalAmountAfterTax),
          };
        });

        allInvoices.push(...finalInvoices);
        processedFiles.push({
          name: file.name,
          success: true,
          invoiceCount: finalInvoices.length,
        });
        setProgress(fileProgressStart + fileProgressRange * 0.9);
      } catch (error) {
        // Continue processing other files even if one fails
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        processedFiles.push({
          name: file.name,
          success: false,
          error: errorMessage,
          invoiceCount: 0,
        });
        // Still update progress for failed file
        setProgress(fileProgressStart + fileProgressRange * 0.9);
      }
    }

    setProgress(100);
    setStep('complete');

    // Report results
    const successfulFiles = processedFiles.filter(f => f.success).length;
    const failedFiles = processedFiles.filter(f => !f.success);
    const totalInvoices = allInvoices.length;

    if (failedFiles.length > 0) {
      // Partial success - show warning with details
      const failedFileNames = failedFiles.map(f => f.name).join(', ');
      const errorMessage = failedFiles.length === totalFiles
        ? `All files failed to process. ${failedFiles[0]?.error || 'Unknown error'}`
        : `${failedFiles.length} file(s) failed: ${failedFileNames}. ${successfulFiles} file(s) processed successfully with ${totalInvoices} invoice(s).`;
      
      if (totalInvoices > 0) {
        // Partial success - still call onInvoicesReady but also show error
        onInvoicesReady(allInvoices);
        onError(errorMessage);
      } else {
        // Complete failure
        onError(errorMessage);
        setStep('upload');
      }
    } else {
      // Complete success
      if (totalInvoices > 0) {
        onInvoicesReady(allInvoices);
      } else {
        onError('No invoices were generated from the uploaded files.');
        setStep('upload');
      }
    }
  }, [onError, onInvoicesReady]);

  return (
    <>
      <ImportStatusIndicator 
        step={step === 'complete' ? 'complete' : step === 'processing' ? 'processing' : 'upload'} 
        progress={progress} 
        fileName={csvFiles.length === 1 ? csvFiles[0]?.name : csvFiles.length > 1 ? `${csvFiles.length} files` : undefined}
      />
      
      {step === 'upload' && (
        <CSVUploadZone onFileSelect={handleFileSelect} />
      )}
    </>
  );
}

