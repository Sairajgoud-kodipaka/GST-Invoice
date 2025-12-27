'use client';

import { useState, useCallback } from 'react';
import { parseCSV } from '@/app/lib/csv-parser';
import { mapCSVToInvoice, mapMultipleOrders } from '@/app/lib/field-mapper';
import { numberToWords } from '@/app/lib/invoice-formatter';
import { calculateInvoiceTotals } from '@/app/lib/invoice-calculator';
import { ParsedCSVData, InvoiceData } from '@/app/types/invoice';
import { invoiceService } from '@/app/lib/invoice-service';
import { useToast } from '@/hooks/use-toast';
import { CSVUploadZone } from './CSVUploadZone';

interface CSVProcessorProps {
  onInvoicesReady: (invoices: InvoiceData[]) => void;
  onError: (error: string) => void;
}

export function CSVProcessor({ onInvoicesReady, onError }: CSVProcessorProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'complete'>('upload');
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

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

        // Map CSV to invoices (without invoice numbers first)
        let rawInvoices: InvoiceData[];
        try {
          rawInvoices = data.rows.length === 1
            ? [mapCSVToInvoice(data, 0)]
            : mapMultipleOrders(data);
        } catch (mappingError) {
          throw new Error(`Failed to map CSV data: ${mappingError instanceof Error ? mappingError.message : 'Unknown mapping error'}`);
        }

        setProgress(fileProgressStart + fileProgressRange * 0.5);

        // Use invoice numbers already set by field-mapper (which uses order-based mapping)
        // Check for duplicates and create invoices in Supabase
        const invoicesWithNumbers: InvoiceData[] = [];
        const skippedInvoices: Array<{ invoiceNo: string; reason: string; orderNo: string }> = [];
        
        for (const invoice of rawInvoices) {
          // Use the invoice number that was already set by the field-mapper
          // This respects the order-based mapping configured in settings
          const expectedInvoiceNo = invoice.metadata.invoiceNo;
          const orderNo = invoice.metadata.orderNo;
          
          // STRICT VALIDATION 1: Check if order already has an invoice (prevent regeneration)
          const orderCheckResponse = await fetch('/api/invoices/check-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNo }),
          });
          
          if (orderCheckResponse.ok) {
            const orderCheck = await orderCheckResponse.json();
            if (orderCheck.hasInvoice) {
              // Order already has an invoice - prevent regeneration
              skippedInvoices.push({
                invoiceNo: expectedInvoiceNo,
                reason: `Order ${orderNo} already has invoice ${orderCheck.invoice.invoiceNo}. Cannot regenerate invoices.`,
                orderNo: orderNo,
              });
              continue;
            }
          }
          
          // STRICT VALIDATION 2: Check if invoice number already exists (prevent duplicates)
          const invoiceExistsCheck = await invoiceService.exists(expectedInvoiceNo);
          if (invoiceExistsCheck.exists) {
            // Invoice number already exists - this is a duplicate, do NOT skip numbers
            skippedInvoices.push({
              invoiceNo: expectedInvoiceNo,
              reason: `Invoice ${expectedInvoiceNo} already exists for order ${invoiceExistsCheck.invoice?.orderNo || 'unknown'}. Cannot use duplicate invoice number.`,
              orderNo: orderNo,
            });
            continue;
          }
          
          // Invoice number is available and matches expected mapping - create it
          const createResult = await invoiceService.create(
            expectedInvoiceNo,
            orderNo,
            invoice.metadata.invoiceDate,
            {
              orderDate: invoice.metadata.orderDate,
              customerName: invoice.billToParty.name,
              totalAmount: invoice.taxSummary.totalAmountAfterTax,
              invoiceData: invoice,
            }
          );
          
          if (createResult.success) {
            // Successfully created with the expected invoice number
            invoice.metadata.invoiceNo = expectedInvoiceNo;
            invoicesWithNumbers.push(invoice);
          } else if (createResult.exists) {
            // Duplicate detected during creation (race condition)
            if (createResult.orderExists) {
              // Order already has an invoice - prevent regeneration
              skippedInvoices.push({
                invoiceNo: expectedInvoiceNo,
                reason: `Order ${orderNo} already has invoice ${createResult.existingInvoice?.invoiceNo || expectedInvoiceNo}. Cannot regenerate invoices.`,
                orderNo: orderNo,
              });
            } else {
              // Invoice number taken by different order - duplicate
              skippedInvoices.push({
                invoiceNo: expectedInvoiceNo,
                reason: `Invoice ${expectedInvoiceNo} already exists for order ${createResult.existingInvoice?.orderNo || 'unknown'}. Cannot use duplicate invoice number.`,
                orderNo: orderNo,
              });
            }
          } else {
            // Other error
            skippedInvoices.push({
              invoiceNo: expectedInvoiceNo,
              reason: createResult.error || 'Failed to create invoice',
              orderNo: orderNo,
            });
          }
        }

        setProgress(fileProgressStart + fileProgressRange * 0.7);

        // Recalculate all totals using proper GST calculations
        // This ensures line items, taxes, and totals are all consistent
        const calculatedInvoices = invoicesWithNumbers.map(calculateInvoiceTotals);

        setProgress(fileProgressStart + fileProgressRange * 0.8);

        // Add amount in words (use calculated total)
        const finalInvoices = calculatedInvoices.map((invoice: InvoiceData) => {
          return {
            ...invoice,
            amountInWords: numberToWords(invoice.taxSummary.totalAmountAfterTax),
          };
        });

        // Show warnings for skipped invoices
        if (skippedInvoices.length > 0) {
          const skippedDetails = skippedInvoices.map(s => 
            `Invoice ${s.invoiceNo} (Order: ${s.orderNo}): ${s.reason}`
          ).join('\n');
          
          toast({
            title: 'Some invoices were skipped',
            description: `${skippedInvoices.length} invoice(s) could not be created. ${skippedDetails}`,
            variant: 'destructive',
          });
        }

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
      {step === 'upload' && (
        <CSVUploadZone onFileSelect={handleFileSelect} />
      )}
    </>
  );
}

