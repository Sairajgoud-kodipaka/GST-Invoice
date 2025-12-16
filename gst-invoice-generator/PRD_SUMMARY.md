# Product Requirements Document (PRD) Summary
## GST Invoice Generator

**Version:** 1.0  
**Last Updated:** December 2025  
**Status:** ✅ Core Features Complete | 🚀 Recent Enhancements Added

---

## 📋 Executive Summary

The **GST Invoice Generator** is a standalone Next.js web application designed to generate GST-compliant invoices from CSV files (primarily Shopify exports). The application automates the invoice generation process with automatic field mapping, precise GST calculations, and professional PDF output matching the Pearls by Mangatrai template format.

---

## 🎯 Project Objectives

1. **Automate Invoice Generation** - Convert CSV order data into professional GST invoices
2. **Ensure GST Compliance** - Accurate tax calculations (CGST/SGST/IGST) based on state rules
3. **Maintain Template Fidelity** - Match existing invoice template exactly
4. **Provide User-Friendly Interface** - Drag-and-drop CSV upload with visual field mapping
5. **Support Bulk Processing** - Handle multiple orders from single CSV file

---

## 🏗️ System Architecture

### Technology Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI Library:** React 19
- **Styling:** Tailwind CSS + shadcn/ui components
- **CSV Parsing:** PapaParse
- **PDF Generation:** Puppeteer (server-side)
- **Precision Math:** number-precision library
- **Storage:** LocalStorage (client-side persistence)
- **Desktop App:** Electron (optional standalone build)

### Application Structure
```
gst-invoice-generator/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (PDF generation)
│   ├── orders/             # Orders management page
│   ├── invoices/           # Invoices management page
│   ├── settings/           # Business settings page
│   ├── lib/                # Core business logic
│   └── types/              # TypeScript definitions
├── components/             # React components
│   ├── invoice/           # Invoice templates & preview
│   ├── upload/            # CSV upload & processing
│   └── ui/                # Reusable UI components
└── public/                 # Static assets
```

---

## 📊 Core Features

### 1. CSV Processing & Field Mapping ✅

**Purpose:** Import order data from CSV files with automatic field detection

**Features:**
- Drag-and-drop CSV upload interface
- Automatic field detection (flexible column name matching)
- Visual field mapping with animated checkmarks
- Support for Shopify export format and custom CSV formats
- Metafields extraction (all additional columns preserved)
- Single order and multiple orders support
- Real-time progress indication during mapping

**Key Components:**
- `CSVUploadZone.tsx` - Drag-drop interface
- `InvoiceFieldMapper.tsx` - Field mapping with animations
- `CSVProcessor.tsx` - Processing orchestration
- `field-mapper.ts` - CSV to invoice data transformation

---

### 2. GST Calculation Engine ✅

**Purpose:** Calculate accurate GST amounts based on Indian tax rules

**Features:**
- **Exact Precision Calculations** - No rounding (uses number-precision library)
- **State-Based Tax Logic:**
  - **Intra-State:** CGST + SGST (each = GST Rate / 2)
  - **Inter-State:** IGST (= GST Rate)
- **Line Item Calculations:**
  - Taxable Amount = (Price × Quantity) - Discount
  - Tax per item calculated separately
- **Invoice-Level Totals:**
  - Subtotal = Sum of all taxable amounts
  - Total Tax = Sum of all (CGST+SGST) or IGST
  - Final Total = Subtotal + Total Tax (NO ROUND OFF)

**Key Files:**
- `invoice-calculator.ts` - Core GST calculation logic
- `invoice-formatter.ts` - Amount formatting and number-to-words conversion

---

### 3. Invoice Template & Generation ✅

**Purpose:** Generate professional GST-compliant invoices matching template

**Features:**
- Pixel-perfect match to Pearls by Mangatrai template
- **Invoice Sections:**
  - Business header (GSTIN, CIN, PAN, Logo)
  - Invoice metadata (Invoice No, Order No, Dates, Transport Mode)
  - Bill To Party / Ship To Party (side-by-side)
  - Line items table (10 columns: #, Item-SKU, Qty, Rate, Discount, Taxable, HSN, GST%, IGST, Total)
  - Tax summary (without round off row)
  - Amount in words
  - Payment mode
  - Terms & conditions
  - Footer with E&O.E, Stamp, Signature area

**Key Components:**
- `InvoiceTemplate.tsx` - HTML invoice template
- `InvoicePreview.tsx` - Preview component
- `generate-pdf/route.ts` - Puppeteer PDF generation API

---

### 4. Conditional Status Stamps 🆕 (Recently Added)

**Purpose:** Display payment status stamps on invoices based on CSV data

**Features:**
- **Conditional Stamp Logic:**
  - **CANCELLED** (Red) - When `Cancelled at` field has value
  - **PAID** (Blue) - When `Financial Status = "paid"`
  - **PENDING** (Orange) - When `Financial Status = "pending"` or `"partially_paid"`
  - **UNPAID** (Gray) - When `Financial Status = "unpaid"`, `"voided"`, or `"refunded"`
  - **PAID** (Blue) - Default when no status provided (backward compatibility)

**CSV Fields Used:**
- `Financial Status` - Determines payment status
- `Cancelled at` - Determines if order is cancelled

**Priority Order:**
1. Cancelled (highest priority)
2. Paid
3. Pending
4. Unpaid
5. Default Paid (backward compatibility)

**Key Files:**
- `InvoiceTemplate.tsx` - Updated with conditional stamp rendering
- `field-mapper.ts` - Extracts Financial Status and Cancelled At
- `invoice.ts` - Added financialStatus and cancelledAt to metadata

---

### 5. PDF Generation ✅

**Purpose:** Generate print-ready PDF invoices

**Features:**
- Server-side PDF generation using Puppeteer
- A4 format (210mm × 297mm)
- Print-ready quality (300 DPI)
- Single PDF or ZIP (for multiple invoices)
- Proper file naming: `Invoice_[InvoiceNo]_[OrderNo].pdf`
- Professional formatting with proper margins

**Key Files:**
- `app/api/generate-pdf/route.ts` - PDF generation API endpoint

---

### 6. Order Management ✅

**Purpose:** Import, view, and manage orders

**Features:**
- Import orders from CSV
- Orders table with search and filter
- Status indicators (Pending Invoice / Has Invoice)
- Order details view
- Generate invoices from orders
- Bulk operations (select multiple orders)
- Pagination (20 orders per page)

**Key Files:**
- `app/orders/page.tsx` - Orders management page
- `app/lib/storage.ts` - Order storage (LocalStorage)

---

### 7. Invoice Management ✅

**Purpose:** View, download, and manage generated invoices

**Features:**
- Invoices list with search and filter
- Invoice preview (full template view)
- Download PDF (single or bulk as ZIP)
- Print invoice functionality
- Share invoice (copy details to clipboard)
- Delete invoices
- Link to source order

**Key Files:**
- `app/invoices/page.tsx` - Invoices management page
- `components/actions/DownloadButton.tsx` - PDF download
- `components/actions/PrintButton.tsx` - Print functionality

---

### 8. Business Settings ✅

**Purpose:** Configure business information for invoices

**Features:**
- Business details form:
  - Business Name, Legal Name
  - Address (Street, City, State, Pincode)
  - Email, Phone
  - GSTIN (with format validation)
  - PAN (optional, with format validation)
  - Logo upload (optional)
- Invoice settings:
  - Invoice number prefix
  - Starting number
  - Auto-increment toggle
- Data management:
  - Export orders/invoices
  - Clear data (with confirmation)

**Key Files:**
- `app/settings/page.tsx` - Settings page

---

### 9. Dashboard ✅

**Purpose:** Quick overview and access to common tasks

**Features:**
- Essential statistics:
  - Total Orders
  - Total Invoices
  - Pending Orders
  - Total Revenue
- Quick actions:
  - Import Orders
  - View Invoices
- Recent activity:
  - Last 5 orders
  - Last 5 invoices
- Empty state for first-time users

**Key Files:**
- `app/page.tsx` - Dashboard page

---

## 🔄 Data Flow

```
1. CSV Upload (Drag & Drop)
   ↓
2. CSV Parsing (PapaParse)
   ↓
3. Field Mapping (with animated ticks)
   - Extract Financial Status & Cancelled At
   - Map billing/shipping addresses
   - Map line items
   - Extract metafields
   ↓
4. Invoice Data Generation
   ↓
5. GST Calculation (exact precision)
   - Determine intra-state vs inter-state
   - Calculate CGST/SGST or IGST
   - Calculate totals (no round off)
   ↓
6. Preview (with conditional stamp)
   ↓
7. PDF Generation (Puppeteer)
   ↓
8. Download/Print/Share
```

---

## 📝 Implementation Status

### ✅ Completed Features

1. **Core Invoice Generation**
   - ✅ CSV upload and parsing
   - ✅ Field mapping with animations
   - ✅ GST calculation engine
   - ✅ Invoice template (matching PDF)
   - ✅ PDF generation (Puppeteer)
   - ✅ Preview functionality

2. **Order Management**
   - ✅ CSV import
   - ✅ Orders table
   - ✅ Search and filter
   - ✅ Generate invoices from orders
   - ✅ Order details view

3. **Invoice Management**
   - ✅ Invoices list
   - ✅ Invoice preview
   - ✅ Download PDF (single/ZIP)
   - ✅ Print functionality
   - ✅ Share functionality

4. **Business Settings**
   - ✅ Business details form
   - ✅ GSTIN/PAN validation
   - ✅ Logo upload
   - ✅ Invoice settings
   - ✅ Data export/clear

5. **Dashboard**
   - ✅ Statistics cards
   - ✅ Quick actions
   - ✅ Recent activity

6. **Recent Enhancements** 🆕
   - ✅ Conditional status stamps (PAID, PENDING, UNPAID, CANCELLED)
   - ✅ Financial Status extraction from CSV
   - ✅ Cancelled At field detection
   - ✅ Test CSV files for stamp validation

---

## 🧪 Testing

### Test Files Created
- `test_cancelled.csv` - Tests CANCELLED stamp (red)
- `test_pending.csv` - Tests PENDING stamp (orange)
- `test_partially_paid.csv` - Tests PENDING stamp (orange)
- `test_unpaid.csv` - Tests UNPAID stamp (gray)
- `test_voided.csv` - Tests UNPAID stamp (gray)
- `test_refunded.csv` - Tests UNPAID stamp (gray)
- `test_no_status.csv` - Tests default PAID stamp (blue)
- `STAMP_TEST_GUIDE.md` - Testing documentation

### Test Scenarios
1. ✅ Single order CSV processing
2. ✅ Multiple orders CSV processing
3. ✅ Intra-state GST (CGST+SGST)
4. ✅ Inter-state GST (IGST)
5. ✅ Conditional stamp logic (all statuses)
6. ✅ PDF generation (single and batch)
7. ✅ Field mapping (Shopify and custom formats)

---

## 📋 Requirements Compliance

### Functional Requirements ✅
- ✅ FR-1: CSV Upload & Parsing
- ✅ FR-2: GST Calculation (exact precision, no rounding)
- ✅ FR-3: PDF Generation (template matching)
- ✅ FR-4: Field Mapping (automatic detection)
- ✅ FR-5: Multiple Orders Support
- ✅ FR-6: Status Stamps (conditional based on CSV)

### Non-Functional Requirements ✅
- ✅ NFR-1: Performance (CSV parsing < 3s for 10MB)
- ✅ NFR-2: Accuracy (exact decimal precision)
- ✅ NFR-3: Usability (drag-drop, visual feedback)
- ✅ NFR-4: Compatibility (Shopify export format)

---

## 🚀 Recent Work Completed

### Conditional Status Stamps Feature (Latest)

**What Was Done:**
1. **Type System Updates**
   - Added `financialStatus` and `cancelledAt` to `InvoiceMetadata` interface
   - Support for: `'paid' | 'pending' | 'unpaid' | 'partially_paid' | 'refunded' | 'voided'`

2. **Field Mapper Enhancement**
   - Extracts `Financial Status` from CSV (case-insensitive)
   - Extracts `Cancelled at` from CSV
   - Normalizes status values to match type system

3. **Invoice Template Updates**
   - Replaced hardcoded "PAID" stamp with conditional logic
   - Color-coded stamps:
     - PAID: Blue (#2563eb)
     - PENDING: Orange (#f59e0b)
     - UNPAID: Gray (#6b7280)
     - CANCELLED: Red (#dc2626)
   - Backward compatibility (defaults to PAID if no status)

4. **Testing Infrastructure**
   - Created 7 test CSV files for all stamp scenarios
   - Created `STAMP_TEST_GUIDE.md` documentation

**Files Modified:**
- `app/types/invoice.ts` - Added financialStatus and cancelledAt
- `app/lib/field-mapper.ts` - Added status extraction logic
- `components/invoice/InvoiceTemplate.tsx` - Conditional stamp rendering

---

## 📚 Documentation

### Existing Documentation
- ✅ `SPM.md` - Software Project Management document
- ✅ `PAGE_STRUCTURE.md` - Page structure and UX guidelines
- ✅ `INVOICE_COMPARISON.md` - Invoice comparison analysis
- ✅ `STAMP_TEST_GUIDE.md` - Stamp testing guide
- ✅ `ELECTRON_SETUP.md` - Electron desktop app setup
- ✅ `QUICK_BUILD.md` - Quick build instructions

---

## 🔮 Future Enhancements (Not Implemented)

### Potential Features
- Email invoice functionality
- Invoice number sequence management
- Invoice history/storage (database)
- Custom invoice templates
- Multi-language support
- Advanced reporting/analytics
- Payment tracking
- User accounts/authentication

---

## 📊 Project Metrics

### Codebase Statistics
- **Framework:** Next.js 15
- **Language:** TypeScript
- **Components:** 20+ React components
- **API Routes:** 2 (PDF generation, invoice preview)
- **Pages:** 4 (Dashboard, Orders, Invoices, Settings)
- **Core Libraries:** 6 (PapaParse, Puppeteer, number-precision, etc.)

### Feature Completeness
- **Core Features:** 100% ✅
- **UI/UX:** 100% ✅
- **GST Compliance:** 100% ✅
- **Template Matching:** 100% ✅
- **Status Stamps:** 100% ✅ (Recently added)

---

## 🎯 Success Criteria

### ✅ Achieved
1. ✅ Generate GST-compliant invoices from CSV
2. ✅ Accurate GST calculations (exact precision)
3. ✅ Template matching (pixel-perfect)
4. ✅ User-friendly interface (drag-drop, visual feedback)
5. ✅ Bulk processing (multiple orders)
6. ✅ Conditional status stamps based on CSV data

---

## 📞 Support & Maintenance

### Key Files for Maintenance
- `app/lib/invoice-calculator.ts` - GST calculation logic
- `app/lib/field-mapper.ts` - CSV field mapping
- `components/invoice/InvoiceTemplate.tsx` - Invoice template
- `app/api/generate-pdf/route.ts` - PDF generation

### Common Customizations
- **Business Details:** Update in `app/lib/storage.ts` or Settings page
- **Invoice Template:** Modify `components/invoice/InvoiceTemplate.tsx`
- **GST Rates:** Update in line items (from CSV or hardcoded)
- **Stamp Colors:** Modify in `InvoiceTemplate.tsx` stamp rendering

---

## 📝 Notes

- All calculations use `number-precision` library for exact decimal handling
- No rounding adjustments in invoice totals (as per requirements)
- Template matches PDF exactly (no round off row)
- Supports both single and multiple order processing
- All metafields from CSV are preserved in invoice data
- Status stamps are conditionally rendered based on CSV `Financial Status` and `Cancelled at` fields
- Backward compatible: Defaults to PAID stamp if no status provided

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** ✅ Production Ready




