# GST Invoice Generator - Page Structure & User Experience

## Overview
This document outlines the balanced, practical structure for each page in the GST Invoice Generator application. Focused on essential features that provide real value without complexity.

---

## 🏠 Dashboard (`/`)

### Purpose
Quick overview and fast access to common tasks. Simple, not overwhelming.

### Key Features

#### 1. **Essential Statistics (4 Cards)**
- **Total Orders** (count with link to orders page)
- **Total Invoices** (count with link to invoices page)
- **Pending Orders** (orders without invoices - actionable)
- **Total Revenue** (sum of all invoice amounts)

#### 2. **Quick Actions**
- **Import Orders** (primary button - links to orders page with import modal)
- **View Invoices** (secondary button - links to invoices page)

#### 3. **Recent Activity (Simple List)**
- Last 5 orders imported (order number, date, customer)
- Last 5 invoices generated (invoice number, date, amount)
- Clickable to view details

#### 4. **Empty State (First-Time Users)**
- Welcome message
- "Get Started" button (links to settings for business setup)
- "Import Orders" button (links to orders page)
- Link to sample CSV template

---

## 📦 Orders Page (`/orders`)

### Purpose
Import, view, and manage orders. Generate invoices from orders.

### Key Features

#### 1. **Header Section**
- **Page Title**: "Orders" with count badge
- **Import Button**: "Import Orders" button (opens modal)
- **Bulk Actions Bar** (appears when orders selected):
  - "X selected" indicator
  - Generate Invoices button
  - Delete Selected button (with confirmation)

#### 2. **Search & Filter (Simple)**
- **Search Bar**: Search by order number or customer name
- **Status Filter**: Dropdown (All, Pending Invoice, Has Invoice)

#### 3. **Import Modal**
- **CSV Upload Zone**: Drag & drop or click to upload
- **Field Mapping**: Visual mapping (existing component)
- **Preview**: First 3 rows preview before import
- **Import Button**: Process and add to orders list
- **Success/Error Toast**: Show result after import

#### 4. **Orders Table**
- **Select All Checkbox**: In header row
- **Columns**:
  - Checkbox
  - Order Number (clickable - shows details)
  - Order Date
  - Customer Name
  - Total Amount
  - Status (Pending Invoice / Has Invoice badge)
  - Invoice Number (if exists, clickable link)
  - Actions (3-dot menu)
- **Row Actions Menu**:
  - Generate Invoice
  - View Details
  - Delete

#### 5. **Order Details (Modal/Dialog)**
When clicking order number:
- Order information
- Line items table
- Customer & shipping details
- Related invoice link (if exists)
- Action: Generate Invoice

#### 6. **Empty State**
- Icon
- "No orders yet"
- "Import Orders" button
- Link to CSV template

#### 7. **Simple Pagination**
- Show 20 orders per page
- Previous/Next buttons
- Page indicator (e.g., "Page 1 of 3")

---

## 🧾 Invoices Page (`/invoices`)

### Purpose
View, manage, download, and print invoices. All generated invoices are stored here.

### Key Features

#### 1. **Header Section**
- **Page Title**: "Invoices" with count badge
- **Bulk Actions Bar** (when invoices selected):
  - "X selected" indicator
  - Download Selected (PDFs as ZIP)
  - Delete Selected (with confirmation)

#### 2. **Search & Filter**
- **Search Bar**: Search by invoice number, customer name, or order number
- **Date Filter**: Simple date range picker (optional - can be basic)

#### 3. **Invoices Table**
- **Select All Checkbox**: In header
- **Columns**:
  - Checkbox
  - Invoice Number (clickable - opens preview)
  - Invoice Date
  - Order Number (link to order)
  - Customer Name
  - Amount
  - Actions (3-dot menu)
- **Row Actions Menu**:
  - View/Preview
  - Download PDF
  - Print
  - Delete

#### 4. **Invoice Preview/Detail (Modal)**
When clicking invoice number:
- **Full Invoice Display**: Professional layout (existing template)
- **Action Buttons**:
  - Download PDF
  - Print
  - Close
- **Related Info**: Link to source order

#### 5. **Empty State**
- Icon
- "No invoices yet"
- "Go to Orders" button (links to orders page)
- Brief explanation: "Import orders and generate invoices"

#### 6. **Simple Pagination**
- 20 invoices per page
- Previous/Next buttons
- Page indicator

---

## ⚙️ Settings Page (`/settings`)

### Purpose
Configure business information and invoice preferences. Essential settings only.

### Key Features

#### 1. **Business Information (Required)**
- **Company Details Form**:
  - Business Name *
  - Legal Name *
  - Address (Street, City, State, Pincode) *
  - Email *
  - Phone *
  - GSTIN * (with format validation)
  - PAN (optional, with format validation)
  - Logo Upload (optional - for invoices)
- **Save Button**: With success/error toast feedback
- **Validation**: Real-time validation for GSTIN (15 chars, format), PAN (10 chars)

#### 2. **Invoice Settings**
- **Invoice Numbering**:
  - Prefix (default: "INV-")
  - Starting number (default: 1)
  - Auto-increment (toggle, default: ON)
- **Default Payment Terms**:
  - Payment due days (default: 30)
  - Payment method (dropdown: Cash, Bank Transfer, UPI, etc.)

#### 3. **Data Management**
- **Export Data**:
  - Export All Orders (CSV download)
  - Export All Invoices (PDFs as ZIP)
- **Clear Data** (with confirmation dialog):
  - Clear All Orders
  - Clear All Invoices
  - Clear All Data (both)

#### 4. **Help Section**
- Link to CSV template download
- Brief instructions on CSV format
- Contact/Support information (if applicable)

---

## 🎨 Essential Design Principles

### Core UX Requirements

1. **Loading States**
   - Progress indicators for CSV processing
   - Loading spinners for PDF generation
   - Disable buttons during operations

2. **Error Handling**
   - Clear error messages (toast notifications)
   - Validation feedback on forms
   - Helpful error messages (e.g., "Invalid GSTIN format")

3. **Confirmation Dialogs**
   - For delete actions (orders, invoices, clear data)
   - Show count of items being deleted
   - "Cancel" and "Delete" buttons

4. **Feedback**
   - Success toasts for completed actions
   - Error toasts for failures
   - Brief, actionable messages

5. **Empty States**
   - Clear message
   - Primary action button
   - Helpful guidance

6. **Responsive Design**
   - Mobile-friendly (tablet and desktop priority)
   - Tables scroll horizontally on mobile
   - Touch-friendly button sizes

7. **Data Persistence** (LocalStorage)
   - Save business settings
   - Save orders and invoices (in-memory with localStorage backup)
   - Remember last selected filters

---

## 🔄 Navigation Flow

### User Journey

1. **First Time User**:
   - Dashboard → Settings (configure business) → Orders (import CSV) → Invoices (view generated)

2. **Regular User**:
   - Dashboard (quick stats) → Orders (import/manage) → Invoices (download/print)

3. **Quick Workflow**:
   - Orders → Select orders → Generate Invoices → Invoices (download/print)

---

## 📱 Sidebar Navigation

Simple navigation with 4 items:
- **Dashboard** (Home icon) - `/`
- **Orders** (ShoppingCart icon) - `/orders`
- **Invoices** (FileText icon) - `/invoices`
- **Settings** (Settings icon) - `/settings`

Active state: Highlighted background + icon color change
Optional: Badge on Orders showing pending count

---

## 🚀 Implementation Priority

### Must Have (MVP)
1. ✅ Settings page - Business info form with validation
2. ✅ Orders page - Import CSV, table view, generate invoices
3. ✅ Invoices page - List view, preview, download PDF, print
4. ✅ Dashboard - Basic stats and quick actions

### Nice to Have (Enhancements)
1. Bulk operations (select multiple, generate invoices)
2. Search and filter on Orders/Invoices
3. Recent activity on Dashboard
4. Export data functionality

---

## 📝 Key Decisions

### What We're NOT Including (To Keep It Simple)
- ❌ Email functionality (users can download and email manually)
- ❌ Complex charts/analytics (basic stats are enough)
- ❌ Multiple invoice templates (one professional template)
- ❌ Payment tracking (invoice status is sufficient)
- ❌ User accounts/auth (standalone app)
- ❌ Database (localStorage + in-memory state)
- ❌ Advanced reporting (export data for external analysis)

### What We ARE Including (Essential)
- ✅ CSV import with field mapping
- ✅ Order management
- ✅ Invoice generation (PDF)
- ✅ Business settings
- ✅ Download/Print invoices
- ✅ Bulk operations (select multiple)
- ✅ Search/filter basics

---

This balanced structure provides all essential features without complexity, keeping the app focused and user-friendly.

