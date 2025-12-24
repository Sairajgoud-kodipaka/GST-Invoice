# Invoice Comparison Analysis - Order MAN-25-5982

## Source Data from CSV
- **Lineitem Price:** ₹4,550.00
- **Quantity:** 3
- **Subtotal (from CSV):** ₹12,867.50
- **Discount Amount:** ₹782.50
- **Tax (IGST 3%):** ₹374.78
- **Total (from CSV):** ₹12,867.50

## Calculation Breakdown

### Step 1: Calculate Total Before Discount
- 3 items × ₹4,550.00 = **₹13,650.00**

### Step 2: Apply Discount
- Discount: ₹782.50 (5.73% of ₹13,650.00)
- After discount: ₹13,650.00 - ₹782.50 = **₹12,867.50** ✓

---

## Shopify Invoice Values

| Field | Value |
|-------|-------|
| Total amount before Tax | ₹12,492.72 |
| Total Tax amount | ₹374.78 |
| Discount % | 5.73% |
| Discount (₹) | ₹782.50 |
| Total amount after Tax | ₹12,867.50 |
| Round Off | (+) ₹0.50 |
| **FINAL TOTAL** | **₹12,868.00** |

### Shopify Calculation Analysis:
- **Taxable Base for Tax:** ₹12,492.72
- **Tax (3% IGST):** ₹12,492.72 × 0.03 = ₹374.78 ✓ (matches)
- **Total:** ₹12,492.72 + ₹374.78 = ₹12,867.50
- **After Round Off:** ₹12,868.00

**Key Finding:** Shopify's "Total amount before Tax" (₹12,492.72) is **₹374.78 less** than the subtotal after discount (₹12,867.50). This suggests Shopify is calculating tax on a **pre-tax base amount** that excludes the tax component.

---

## Your App Invoice Values

| Field | Value |
|-------|-------|
| Total amount before Tax | ₹12,867.50 |
| Total Tax amount | ₹386.03 |
| Discount (5.73%) | ₹782.49 |
| Total amount after Tax | ₹13,253.53 |
| Round off | ₹0.00 |
| **TOTAL** | **₹13,253.53** |

### Your App Calculation Analysis:
- **Taxable Base:** ₹12,867.50 (subtotal after discount)
- **Tax (3% IGST):** ₹12,867.50 × 0.03 = ₹386.03
- **Total:** ₹12,867.50 + ₹386.03 = ₹13,253.53

**Key Finding:** Your app is calculating tax on the **full subtotal after discount** (₹12,867.50), which results in higher tax (₹386.03 vs ₹374.78).

---

## Discrepancies Identified

### 1. **Tax Calculation Base (CRITICAL)**
- **Shopify:** Calculates tax on ₹12,492.72 (lower base)
- **Your App:** Calculates tax on ₹12,867.50 (higher base)
- **Difference:** ₹374.78 (exactly equal to the tax amount!)

This suggests Shopify is using a **tax-exclusive calculation** where:
- Taxable amount = Subtotal - Tax component
- ₹12,867.50 - ₹374.78 = ₹12,492.72

### 2. **Tax Amount**
- **Shopify:** ₹374.78 (from CSV)
- **Your App:** ₹386.03 (calculated: ₹12,867.50 × 3%)
- **Difference:** ₹11.25

### 3. **Discount Amount**
- **Shopify:** ₹782.50
- **Your App:** ₹782.49
- **Difference:** ₹0.01 (rounding)

### 4. **Final Total**
- **Shopify:** ₹12,868.00
- **Your App:** ₹13,253.53
- **Difference:** ₹385.53

---

## Root Cause Analysis

### Shopify's Tax Calculation Method:
Shopify appears to be using a **reverse calculation** or **tax-inclusive pricing** approach:

1. Final amount after tax: ₹12,867.50
2. Tax rate: 3% IGST
3. Taxable base = Final amount ÷ (1 + tax rate)
   - ₹12,867.50 ÷ 1.03 = ₹12,492.72
4. Tax = Final amount - Taxable base
   - ₹12,867.50 - ₹12,492.72 = ₹374.78

OR

Shopify might be calculating:
- Taxable amount = Subtotal - Tax (reverse calculation)
- ₹12,867.50 - ₹374.78 = ₹12,492.72

### Your App's Tax Calculation Method:
Your app is using **standard tax calculation**:
1. Subtotal after discount: ₹12,867.50
2. Tax = Subtotal × Tax rate
   - ₹12,867.50 × 0.03 = ₹386.03
3. Total = Subtotal + Tax
   - ₹12,867.50 + ₹386.03 = ₹13,253.53

---

## CSV Data Interpretation Issue

The CSV shows:
- **Subtotal:** ₹12,867.50
- **Taxes:** ₹374.78
- **Total:** ₹12,867.50 ⚠️ (This is incorrect - should be ₹12,867.50 + ₹374.78 = ₹13,242.28)

This suggests the CSV "Total" field might actually represent the **final amount after tax** (₹12,867.50), not the sum of subtotal + tax.

---

## Recommended Fix

To match Shopify's calculation, you need to:

1. **Use tax-inclusive calculation** when CSV provides both subtotal and tax:
   - If CSV has `Subtotal` = ₹12,867.50 and `Taxes` = ₹374.78
   - Then: Taxable base = Subtotal - Tax = ₹12,492.72
   - Tax = ₹374.78 (use from CSV, don't recalculate)
   - Total = Subtotal = ₹12,867.50 (tax is already included)

2. **OR use reverse calculation**:
   - If final amount = ₹12,867.50 and tax rate = 3%
   - Taxable base = ₹12,867.50 ÷ 1.03 = ₹12,492.72
   - Tax = ₹12,867.50 - ₹12,492.72 = ₹374.78

3. **Check if tax is included in subtotal**:
   - When CSV provides both subtotal and tax, verify if tax is already included in the subtotal
   - If yes, use: Taxable base = Subtotal - Tax

---

## Action Items

1. ✅ Identify if Shopify uses tax-inclusive or tax-exclusive pricing
2. ✅ Update tax calculation logic to match Shopify's method
3. ✅ Handle CSV data where tax might be included in subtotal
4. ✅ Test with multiple orders to ensure consistency







