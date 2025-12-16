# Software Project Management (SPM) Document
## GST Invoice Generator - Implementation Summary

**Project:** GST Invoice Generator  
**Version:** 1.0  
**Date:** December 2025  
**Status:** Implementation Complete

---

## Project Overview

A standalone Next.js application that generates GST-compliant invoices from CSV files. The application processes Shopify export CSV files (or custom CSV formats), maps fields automatically, calculates GST with exact precision (no rounding), and generates PDF invoices matching the Pearls by Mangatrai template.

---

## Deliverables

### 1. Invoice Generation
✅ **Status:** Complete

- PDF generation matching invoice template exactly
- All CSV metafields included in invoice data
- Exact GST calculations (no round off)
- Support for both intra-state (CGST+SGST) and inter-state (IGST) transactions
- Professional print-ready quality

**Key Files:**
- `app/components/invoice/InvoiceTemplate.tsx` - Invoice HTML template
- `app/api/generate-pdf/route.ts` - Puppeteer PDF generation API
- `app/lib/invoice-calculator.ts` - GST calculation logic
- `app/lib/invoice-formatter.ts` - Amount formatting and number-to-words

### 2. CSV Processing with Micro-Interactions
✅ **Status:** Complete

- Drag-and-drop CSV upload interface
- Field-by-field mapping with animated checkmarks (ticks)
- Support for single order and multiple orders
- Automatic field detection and mapping
- Metafields extraction and display

**Key Files:**
- `app/components/upload/CSVUploadZone.tsx` - Drag-drop interface
- `app/components/invoice/InvoiceFieldMapper.tsx` - Field mapping with animations
- `app/components/upload/CSVProcessor.tsx` - CSV processing orchestration
- `app/lib/csv-parser.ts` - CSV parsing utilities
- `app/lib/field-mapper.ts` - CSV to invoice field mapping

### 3. Preview & Actions
✅ **Status:** Complete

- Invoice preview before generation
- Download PDF (single or ZIP for multiple)
- Print invoice functionality
- Share invoice (copy to clipboard)

**Key Files:**
- `app/components/invoice/InvoicePreview.tsx` - Preview component
- `app/components/actions/DownloadButton.tsx` - PDF download
- `app/components/actions/PrintButton.tsx` - Print functionality
- `app/components/actions/ShareButton.tsx` - Share functionality

---

## Architecture

### Technology Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **CSV Parsing:** PapaParse
- **PDF Generation:** Puppeteer (server-side)
- **File Handling:** react-dropzone
- **ZIP Generation:** jszip
- **Precision Math:** number-precision

### File Structure

```
gst-invoice-generator/
├── app/
│   ├── api/
│   │   └── generate-pdf/
│   │       └── route.ts          # PDF generation API
│   ├── components/
│   │   ├── invoice/
│   │   │   ├── InvoiceTemplate.tsx
│   │   │   ├── InvoicePreview.tsx
│   │   │   └── InvoiceFieldMapper.tsx
│   │   ├── upload/
│   │   │   ├── CSVUploadZone.tsx
│   │   │   └── CSVProcessor.tsx
│   │   └── actions/
│   │       ├── DownloadButton.tsx
│   │       ├── PrintButton.tsx
│   │       └── ShareButton.tsx
│   ├── lib/
│   │   ├── csv-parser.ts
│   │   ├── invoice-calculator.ts
│   │   ├── invoice-formatter.ts
│   │   └── field-mapper.ts
│   ├── types/
│   │   └── invoice.ts
│   └── page.tsx                  # Main application
```

---

## Key Features Implemented

### 1. CSV Upload & Processing
- Drag-and-drop interface with visual feedback
- CSV validation and error handling
- Automatic field detection (flexible column name matching)
- Support for Shopify export format and custom formats
- Metafields extraction (all additional columns)

### 2. Field Mapping Animation
- Sequential field mapping with animated checkmarks
- Real-time progress indication
- Visual feedback for each mapped field
- Display of unmapped metafields

### 3. GST Calculation
- Exact precision calculations (no rounding)
- State-based tax determination:
  - Same state: CGST + SGST (each = GST Rate / 2)
  - Different state: IGST (= GST Rate)
- Line item and invoice-level totals
- **NO Round Off row** (as per requirements)

### 4. Invoice Template
- Pixel-perfect match to Pearls by Mangatrai template
- All required sections:
  - Business header with GSTIN/CIN
  - Invoice metadata
  - Bill To Party / Ship To Party
  - Line items table
  - Tax summary (without round off)
  - Amount in words
  - Footer with terms

### 5. PDF Generation
- Server-side PDF generation using Puppeteer
- A4 format, print-ready quality
- Single PDF or ZIP (for multiple invoices)
- Proper file naming: `Invoice_[InvoiceNo]_[OrderNo].pdf`

### 6. User Actions
- Preview before generation
- Download PDF(s)
- Print invoice
- Share invoice details

---

## Data Flow

```
CSV Upload
    ↓
CSV Parsing (PapaParse)
    ↓
Field Mapping (with animated ticks)
    ↓
Invoice Data Generation
    ↓
GST Calculation (exact precision)
    ↓
Preview
    ↓
PDF Generation (Puppeteer)
    ↓
Download/Print/Share
```

---

## Implementation Details

### GST Calculation Logic

```typescript
// Line item taxable amount
taxableAmount = (Price × Quantity) - Discount

// State-based tax
if (same state) {
  CGST = (Taxable × GST%) / 2
  SGST = (Taxable × GST%) / 2
} else {
  IGST = Taxable × GST%
}

// Invoice totals
subtotal = Sum of all taxable amounts
totalTax = Sum of all (CGST+SGST) or IGST
finalTotal = subtotal + totalTax  // NO ROUND OFF
```

### Field Mapping

- Flexible column name matching (case-insensitive)
- Supports common variations:
  - Order Number: "Order Number", "Order No", "Order ID"
  - Customer: "Billing Name", "Customer Name", "Name"
  - Line Items: "Lineitem name", "Product", "Item"
- All unmapped columns treated as metafields

### Invoice Template Matching

- Exact layout from PDF template
- Two-column header (business info + "TAX INVOICE")
- Side-by-side Bill To / Ship To sections
- Comprehensive line items table
- Tax summary without "Round Off" row
- Amount in words conversion

---

## Testing Considerations

### Test Scenarios

1. **Single Order CSV**
   - Upload CSV with one order
   - Verify field mapping
   - Check GST calculations
   - Generate and download PDF

2. **Multiple Orders CSV**
   - Upload CSV with multiple orders
   - Verify batch processing
   - Check ZIP generation
   - Verify all invoices generated correctly

3. **GST Calculations**
   - Test intra-state (CGST+SGST)
   - Test inter-state (IGST)
   - Verify no round off in final total
   - Check decimal precision (2 places)

4. **Field Mapping**
   - Test with Shopify export format
   - Test with custom CSV format
   - Verify metafields extraction
   - Check error handling for missing fields

5. **PDF Generation**
   - Verify template matching
   - Check print quality
   - Test single and batch generation
   - Verify file naming

---

## Known Limitations & Future Enhancements

### Current Limitations
- Business details are hardcoded (can be made configurable)
- No persistent storage (stateless processing)
- PDF generation requires server (Puppeteer)

### Future Enhancements
- Business details configuration UI
- Invoice number sequence management
- Email invoice functionality
- Invoice history/storage
- Custom invoice templates
- Multi-language support

---

## Deployment

### Prerequisites
- Node.js 20+ LTS
- npm or yarn

### Build Commands
```bash
npm install
npm run build
npm start
```

### Environment Considerations
- Puppeteer requires Chromium (included in node_modules)
- For production, consider using `puppeteer-core` with external Chrome
- Ensure sufficient memory for PDF generation (especially batch)

---

## Project Status

✅ **All deliverables completed:**
1. ✅ Invoice generation with exact template matching
2. ✅ CSV processing with micro-interactions
3. ✅ Preview and action buttons (download/print/share)

**Ready for testing and deployment.**

---

## Notes

- All calculations use `number-precision` library for exact decimal handling
- No rounding adjustments in invoice totals (as per requirements)
- Template matches PDF exactly (no round off row)
- Supports both single and multiple order processing
- All metafields from CSV are preserved in invoice data










