# Remaining Tasks - SRS Requirements

Based on the Software Requirements Specification (SRS), here are the tasks that still need to be completed:

---

## 🔴 Critical Missing Features (High Priority)

### 1. **Buyer/Seller Details Table** ❌
**SRS Section:** FR-2.1 (Template Elements)  
**Status:** NOT IMPLEMENTED

**Required Fields:**
- Buyer/Consignee Bank & GST detail
- Mother Dispatched From (warehouse location)
- Seller/Consignor Bank & GST detail  
- Mother Dispatched To (destination)

**Location in Template:** Should appear between "Bill To/Ship To" and "Line Items" sections

**Action Required:**
- Add new interface fields for bank details and warehouse info
- Create new table section in `InvoiceTemplate.tsx`
- Add fields to business settings page
- Map from CSV or use business settings defaults

---

### 2. **Line Items Table - Missing Columns** ⚠️
**SRS Section:** FR-2.1 (Line Items Table)  
**Status:** PARTIALLY IMPLEMENTED

**Current Columns:**
- ✅ S.No (#)
- ✅ Item/SKU
- ✅ QTY
- ✅ Rate per Item (₹)
- ✅ Discount (₹)
- ✅ Taxable (Item) (₹)
- ✅ HSN
- ✅ GST (%)
- ✅ IGST (₹) - but should show CGST/SGST when applicable
- ✅ Total (₹)

**Missing Columns:**
- ❌ **GSA** (Goods and Services Accounting Code)
- ❌ **CESS (₹)** (Compensation Cess amount)

**Action Required:**
- Add GSA column to line items table
- Add CESS calculation and column
- Update `InvoiceLineItem` interface
- Update GST calculation logic to include CESS

---

### 3. **Footer - Bank Details** ❌
**SRS Section:** FR-2.1 (Footer)  
**Status:** NOT IMPLEMENTED

**Current Footer Has:**
- ✅ E & O.E
- ✅ Status stamp (PAID/PENDING/etc.)
- ✅ Signature area
- ✅ Terms and conditions link

**Missing:**
- ❌ **Bank Details** (Account number, IFSC, Bank name, Branch)

**Action Required:**
- Add bank details section to footer
- Add bank details fields to business settings
- Display in invoice template footer

---

### 4. **QR Code** ❌
**SRS Section:** FR-2.1 (Footer - optional)  
**Status:** NOT IMPLEMENTED

**Note:** Marked as optional in SRS, but should be implemented for completeness

**Action Required:**
- Generate QR code (likely containing invoice details or payment link)
- Add QR code library (e.g., `qrcode`)
- Display QR code in footer area
- Make it configurable (optional)

---

### 5. **Page Numbering** ❌
**SRS Section:** FR-2.1 (Footer)  
**Status:** NOT IMPLEMENTED

**Action Required:**
- Add page numbers for multi-page invoices
- Format: "Page X of Y" or just "Page X"
- Display in footer

---

## 🟡 Medium Priority Tasks

### 6. **Date of Supply Field** ⚠️
**SRS Section:** FR-2.1 (Invoice Metadata)  
**Status:** FIELD EXISTS BUT EMPTY

**Current Status:** Field exists in template but is not populated

**Action Required:**
- Map "Date of Supply" from CSV or use order date
- Populate the field in invoice metadata
- Update field mapper to extract this value

---

### 7. **CGST/SGST Display in Line Items** ⚠️
**SRS Section:** FR-2.2 (GST Calculation)  
**Status:** PARTIALLY IMPLEMENTED

**Current Status:** 
- Line items table only shows "IGST (₹)" column
- CGST and SGST are calculated but not displayed separately in line items

**Action Required:**
- Update line items table to show:
  - CGST (₹) column (when intra-state)
  - SGST (₹) column (when intra-state)
  - IGST (₹) column (when inter-state)
- Or combine into single "GST (₹)" column that shows appropriate tax

---

### 8. **Electron Installation Issue** 🔴
**SRS Section:** N/A (Deployment)  
**Status:** BUG - NEEDS FIX

**Issue:** Installer shows error "GST Invoice Generator cannot be closed" when app is running

**Action Required:**
- Fix Electron builder configuration to handle running instances
- Add proper app closing logic before installation
- Test installation on clean system

---

## 🟢 Low Priority / Enhancement Tasks

### 9. **Mobile Responsive Design** ⚠️
**SRS Section:** NFR-2.3 (Usability)  
**Status:** PARTIALLY IMPLEMENTED

**Action Required:**
- Ensure all pages are mobile-friendly
- Test on tablet devices
- Optimize invoice template for mobile viewing

---

### 10. **Batch Processing Progress Indicator** ⚠️
**SRS Section:** FR-3.2 (Batch Processing)  
**Status:** PARTIALLY IMPLEMENTED

**Current Status:** Basic batch processing works, but could have better progress indication

**Action Required:**
- Add detailed progress bar for batch PDF generation
- Show "Processing invoice X of Y"
- Allow cancellation of batch process

---

### 11. **Error Handling Improvements** ⚠️
**SRS Section:** NFR-3.2 (Reliability)  
**Status:** BASIC IMPLEMENTATION

**Action Required:**
- More detailed error messages
- Better validation error display
- Graceful handling of edge cases

---

## 📋 Summary by Priority

### Critical (Must Have):
1. ✅ Buyer/Seller Details Table with Bank & Warehouse info
2. ✅ GSA and CESS columns in line items
3. ✅ Bank details in footer
4. ✅ Fix Electron installation issue

### High Priority:
5. ✅ Date of Supply field population
6. ✅ CGST/SGST display in line items
7. ✅ QR code (optional but recommended)

### Medium Priority:
8. ✅ Page numbering
9. ✅ Better batch processing UI
10. ✅ Enhanced error handling

### Low Priority:
11. ✅ Mobile responsive improvements
12. ✅ Additional validation

---

## 🎯 Recommended Implementation Order

1. **Fix Electron Installation Issue** (Blocks distribution)
2. **Add Bank Details to Footer** (Quick win, high value)
3. **Add Buyer/Seller Details Table** (Core SRS requirement)
4. **Add GSA and CESS columns** (Complete line items table)
5. **Fix CGST/SGST display** (Complete GST display)
6. **Add QR Code** (Enhancement)
7. **Add Page Numbering** (Polish)
8. **Populate Date of Supply** (Quick fix)

---

## 📝 Notes

- Most core functionality is complete ✅
- Template matching is mostly accurate ✅
- GST calculations are correct ✅
- The remaining tasks are primarily template completeness items
- Electron app works but has installation UX issue

---

**Last Updated:** December 2025  
**Status:** Ready for final polish phase

