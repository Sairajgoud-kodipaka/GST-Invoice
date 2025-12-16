# Software Requirements Specification (SRS)
## GST Invoice Generator - Next.js Application

**Version:** 1.0  
**Date:** December 10, 2025  
**Project:** Standalone GST-Compliant Invoice Generator

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for a standalone Next.js web application that generates GST-compliant invoices from CSV files exported from Shopify Admin. The application processes order data and generates invoices matching the Pearls by Mangalore format.

### 1.2 Scope
The application will:
- Accept CSV file uploads (drag-and-drop interface)
- Parse order data with all metafields and values
- Generate GST-compliant invoices in PDF format
- Follow the exact invoice template format (Pearls by Mangalore)
- Calculate accurate GST amounts without rounding adjustments
- Provide download functionality for generated invoices

### 1.3 Definitions and Acronyms
- **GST**: Goods and Services Tax
- **CGST**: Central Goods and Services Tax
- **SGST**: State Goods and Services Tax
- **IGST**: Integrated Goods and Services Tax
- **HSN**: Harmonized System of Nomenclature
- **CSV**: Comma-Separated Values
- **PDF**: Portable Document Format

---

## 2. Overall Description

### 2.1 Product Perspective
A standalone web application built with Next.js that operates independently of Shopify's app ecosystem. It processes exported CSV files from Shopify Admin and generates invoices client-side or server-side.

### 2.2 Product Functions
1. CSV file upload via drag-and-drop interface
2. Parse CSV with order details, line items, and metafields
3. Calculate GST breakdown (CGST/SGST/IGST)
4. Generate invoice PDF matching template format
5. Download generated invoice

### 2.3 User Characteristics
- **Primary Users**: Store administrators, accounting teams
- **Technical Expertise**: Basic computer literacy, familiarity with CSV exports
- **Use Case**: Bulk invoice generation from Shopify order exports

### 2.4 Constraints
- No Shopify API integration (standalone app)
- CSV format must match Shopify Admin export structure
- Invoice format must exactly match Pearls by Mangalore template
- No database required (stateless processing)
- Must handle large CSV files (100+ orders)

---

## 3. Functional Requirements

### 3.1 CSV Upload Module

#### FR-1.1: Drag-and-Drop Interface
**Priority:** High  
**Description:** Users can drag and drop CSV files into a designated drop zone.

**Acceptance Criteria:**
- Drop zone visible with clear instructions
- Accepts only `.csv` file format
- Visual feedback during drag (highlight drop zone)
- Error message for non-CSV files
- Support for multiple file upload (batch processing)

#### FR-1.2: CSV Validation
**Priority:** High  
**Description:** Validate CSV structure before processing.

**Required CSV Columns:**
- Order Number
- Order Date
- Customer Name
- Customer Email
- Billing Address (Street, City, State, Pincode)
- Shipping Address (Street, City, State, Pincode)
- Line Items (Product Name, SKU, Quantity, Price, HSN Code, GST Rate)
- Payment Method
- Total Amount

**Acceptance Criteria:**
- Check for required columns
- Validate data types (dates, numbers)
- Display clear error messages for missing/invalid data
- Show preview of parsed data before processing

### 3.2 Invoice Generation Module

#### FR-2.1: Invoice Template Compliance
**Priority:** Critical  
**Description:** Generate invoices matching the exact format of Pearls by Mangalore template.

**Template Elements:**
- **Header:** Business logo, name, address, GSTIN
- **Tax Invoice Label:** "TAX INVOICE" (top-right)
- **PAN & CIN:** Business registration numbers
- **Invoice Metadata:**
  - Invoice No
  - Order No
  - Invoice Date
  - Order Date
  - Place of Supply
  - Transport Mode
  
- **Party Details:**
  - **Bill to Party:** Customer billing details
  - **Ship to Party / Delivery Address:** Shipping details
  
- **Buyer/Seller Details Table:**
  - Buyer/Consignee Bank & GST detail
  - Mother Dispatched From (warehouse)
  - Seller/Consignor Bank & GST detail
  - Mother Dispatched To (destination)

- **Line Items Table:**
  - Columns: S.No, Item/SKU, QTY, Rate per Item (₹/Unit), Discount (₹/Unit), Taxable (Item) (₹), GSA, GST (₹), CESS (₹), Total (₹)
  
- **Tax Summary:**
  - Payment Method
  - Total Invoice Before Tax (₹)
  - Discount %
  - Discount (₹)
  - Total taxable amount (after discount) (₹)
  - IGST % / CGST % / SGST %
  - Total tax amount (₹)
  - **Total amount after Tax (₹)** ← Final amount
  
- **Footer:**
  - Terms and conditions
  - Bank details
  - Authorized signatory
  - QR code (optional)
  - Page numbering

**Acceptance Criteria:**
- Invoice layout matches template pixel-perfect
- All sections populated correctly
- GST breakdown accurate
- Professional print-ready quality

#### FR-2.2: GST Calculation Rules
**Priority:** Critical  
**Description:** Calculate GST amounts with exact precision (no rounding errors).

**Calculation Logic:**
1. **Line Item Taxable Amount:**
   - Taxable Amount = (Price × Quantity) - Discount
   
2. **GST Calculation (per line item):**
   - For **Intra-State** (same state as seller):
     - CGST = (Taxable Amount × GST Rate%) / 2
     - SGST = (Taxable Amount × GST Rate%) / 2
   - For **Inter-State** (different state):
     - IGST = Taxable Amount × GST Rate%
   
3. **Invoice Totals:**
   - Subtotal = Sum of all Taxable Amounts
   - Total Tax = Sum of all (CGST + SGST) or IGST
   - **Total Amount After Tax (₹) = Subtotal + Total Tax**

**CRITICAL REQUIREMENT:**
- **NO "Round Off" row in invoice**
- **NO rounding adjustment line items**
- Display final total as calculated (e.g., ₹4,222.50)
- Use decimal precision (2 decimal places) for all amounts
- Accounting team requirement: Exact amounts for reconciliation

**Acceptance Criteria:**
- GST calculated to 2 decimal places (paise precision)
- Correct CGST/SGST vs IGST determination based on state
- Subtotal + Tax = Final Total (no additional adjustments)
- No "Round Off" field in invoice template
- All amounts display with ₹ symbol and 2 decimal places

#### FR-2.3: State-Based GST Logic
**Priority:** High  
**Description:** Determine CGST/SGST vs IGST based on seller and buyer states.

**Rules:**
- **Same State:** Apply CGST + SGST (each = GST Rate / 2)
- **Different State:** Apply IGST (= GST Rate)

**Acceptance Criteria:**
- Correctly identify seller state from business settings
- Correctly identify buyer state from shipping address
- Apply appropriate tax breakdown
- Display tax type in invoice (CGST+SGST or IGST)

### 3.3 PDF Generation Module

#### FR-3.1: PDF Export
**Priority:** High  
**Description:** Generate downloadable PDF matching invoice template.

**Technical Approach:**
- Use server-side PDF generation (Puppeteer or jsPDF)
- Render HTML template to PDF
- A4 page size (portrait)
- Print-ready quality (300 DPI)

**Acceptance Criteria:**
- PDF matches visual template exactly
- All text readable and properly formatted
- GST summary table aligned correctly
- No rounding row visible in PDF
- File naming: `Invoice_[InvoiceNo]_[OrderNo].pdf`

#### FR-3.2: Batch Processing
**Priority:** Medium  
**Description:** Generate multiple invoices from CSV with multiple orders.

**Acceptance Criteria:**
- Process CSV with 100+ rows efficiently
- Generate individual PDF per order
- Option to download as ZIP file (all invoices)
- Progress indicator during batch processing
- Error handling for failed invoice generation

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-1.1:** CSV parsing completes within 3 seconds for files up to 10MB
- **NFR-1.2:** PDF generation completes within 5 seconds per invoice
- **NFR-1.3:** Batch processing handles 100 invoices within 2 minutes

### 4.2 Usability
- **NFR-2.1:** Intuitive drag-and-drop interface (no training required)
- **NFR-2.2:** Clear error messages with actionable guidance
- **NFR-2.3:** Mobile-responsive design (tablet-friendly)

### 4.3 Reliability
- **NFR-3.1:** 99% uptime for hosted version
- **NFR-3.2:** Graceful error handling (no crashes)
- **NFR-3.3:** Data validation prevents incorrect invoices

### 4.4 Security
- **NFR-4.1:** CSV files processed client-side or deleted after processing
- **NFR-4.2:** No persistent storage of customer data
- **NFR-4.3:** HTTPS encryption for hosted version

### 4.5 Compatibility
- **NFR-5.1:** Works on Chrome, Firefox, Safari, Edge (latest versions)
- **NFR-5.2:** Supports Windows, macOS, Linux
- **NFR-5.3:** PDF readable on all standard PDF viewers

---

## 5. System Architecture

### 5.1 Technology Stack
- **Frontend:** Next.js 14+ (React), TypeScript
- **UI Library:** Tailwind CSS, shadcn/ui components
- **CSV Parsing:** PapaParse
- **PDF Generation:** Puppeteer (server-side) or jsPDF (client-side)
- **Deployment:** Vercel, Netlify, or self-hosted

### 5.2 Application Flow
1. User uploads CSV file
2. App parses CSV and validates data
3. User reviews parsed data (preview screen)
4. User clicks "Generate Invoices"
5. App processes each order:
   - Calculate GST breakdown
   - Render invoice HTML
   - Convert to PDF
6. Download individual PDF or ZIP (batch)

### 5.3 Data Flow Diagram
```
CSV Upload → CSV Parser → Data Validator → Invoice Generator → PDF Renderer → Download
                                ↓
                        Error Handler (validation failures)
```

---

## 6. CSV Data Structure

### 6.1 Required Columns (Example)
```csv
Name	Email	Financial Status	Paid at	Fulfillment Status	Fulfilled at	Accepts Marketing	Currency	Subtotal	Shipping	Taxes	Total	Discount Code	Discount Amount	Shipping Method	Created at	Lineitem quantity	Lineitem name	Lineitem price	Lineitem compare at price	Lineitem sku	Lineitem requires shipping	Lineitem taxable	Lineitem fulfillment status	Billing Name	Billing Street	Billing Address1	Billing Address2	Billing Company	Billing City	Billing Zip	Billing Province	Billing Country	Billing Phone	Shipping Name	Shipping Street	Shipping Address1	Shipping Address2	Shipping Company	Shipping City	Shipping Zip	Shipping Province	Shipping Country	Shipping Phone	Notes	Note Attributes	Cancelled at	Payment Method	Payment Reference	Refunded Amount	Vendor	Id	Tags	Risk Level	Source	Lineitem discount	Tax 1 Name	Tax 1 Value	Tax 2 Name	Tax 2 Value	Tax 3 Name	Tax 3 Value	Tax 4 Name	Tax 4 Value	Tax 5 Name	Tax 5 Value	Phone	Receipt Number	Duties	Billing Province Name	Shipping Province Name	Payment ID	Payment Terms Name	Next Payment Due At	Payment References

```

### 6.2 Metafields (Optional Columns)
- Business Name
- Business GSTIN
- Business PAN
- Business Address
- Bank Details
- Custom Notes

---
