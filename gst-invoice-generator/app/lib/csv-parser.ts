import Papa from 'papaparse';
import { CSVRow, ParsedCSVData } from '@/app/types/invoice';

// Re-export for convenience
export type { ParsedCSVData };

export interface ParseCSVOptions {
  onProgress?: (progress: number) => void;
}

export function parseCSV(
  file: File,
  options?: ParseCSVOptions
): Promise<ParsedCSVData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMessages = results.errors
            .map((e) => `${e.message} at row ${e.row}`)
            .join(', ');
          reject(new Error(`CSV parsing errors: ${errorMessages}`));
          return;
        }

        if (!results.data || results.data.length === 0) {
          reject(new Error('CSV file is empty or has no valid data'));
          return;
        }

        const headers = results.meta.fields || [];
        const rows = results.data as CSVRow[];

        // Identify metafields (columns that are not standard invoice fields)
        const standardFields = [
          'name',
          'email',
          'order number',
          'order no',
          'order id',
          'order date',
          'created at',
          'billing name',
          'billing street',
          'billing city',
          'billing zip',
          'billing province',
          'billing country',
          'billing phone',
          'shipping name',
          'shipping street',
          'shipping city',
          'shipping zip',
          'shipping province',
          'shipping country',
          'shipping phone',
          'lineitem name',
          'lineitem quantity',
          'lineitem price',
          'lineitem sku',
          'total',
          'subtotal',
          'tax',
          'discount',
          'payment method',
          'fulfillment status',
        ];

        const metafields = headers.filter(
          (header) =>
            !standardFields.some((field) =>
              header.toLowerCase().includes(field.toLowerCase())
            )
        );

        resolve({
          headers,
          rows,
          metafields,
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

// Validation removed - Shopify handles all validation

