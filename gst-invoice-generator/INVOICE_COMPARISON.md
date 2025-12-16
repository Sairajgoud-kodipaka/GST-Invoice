# Invoice Comparison Analysis

## Overview
Comparing two invoices generated from the same order (MAN-25-5776) showing significant discrepancies.

---

## Invoice 1 (First Image)
**Invoice No:** O-3111  
**Date:** 10-12-2025  
**Transport Mode:** Bluedart

### Line Items:
| Item | Rate | Discount | Taxable | GST% | IGST | Total |
|------|------|----------|---------|------|------|-------|
| Heirloom Pearl Flowers - PT 141 | 1,225.00 | **94.59** | 1,097.49 | **3%** | 32.92 | 1,130.41 |
| Timeless Petal Studs - PT 145 | 1,225.00 | **94.58** | 1,097.50 | **3%** | 32.92 | 1,130.42 |
| Lily Pearl Studs - PT 126 | 1,225.00 | **94.58** | 1,097.50 | **3%** | 32.92 | 1,130.42 |

### Summary:
- **Total before Tax:** ₹3,391.25
- **Total Tax:** ₹98.77
- **Discount:** ₹283.75 (7.72%)
- **Total after Tax:** ₹3,391.25
- **Round Off:** (-)₹0.25
- **FINAL TOTAL:** ₹3,391.00

---

## Invoice 2 (Second Image)
**Invoice No:** C-MAN-25-57756  
**Date:** 11-12-2025

### Line Items:
| Item | Rate | Discount | Taxable | GST% | IGST | Total |
|------|------|----------|---------|------|------|-------|
| Heirloom Pearl Flowers - PT 141 | 1,225.00 | **0.00** | 1,130.42 | **3%** | 33.91 | 1,164.33 |
| Timeless Petal Studs - PT 145 | 1,225.00 | **0.00** | 1,130.42 | **0%** | - | 1,130.42 |
| Lily Pearl Studs - PT 126 | 1,225.00 | **0.00** | 1,130.42 | **0%** | - | 1,130.42 |

### Summary:
- **Total before Tax:** ₹3,391.26
- **Total Tax:** ₹33.91
- **Discount:** ₹283.75 (7.72%)
- **Total after Tax:** ₹3,425.17
- **Round Off:** ₹0.00
- **FINAL TOTAL:** ₹3,425.17

---

## Critical Discrepancies

### 1. **Discount Display** ❌
- **Invoice 1:** Shows discount per item (₹94.59, ₹94.58, ₹94.58) = ₹283.75 total
- **Invoice 2:** Shows ₹0.00 discount per item, but still shows ₹283.75 total discount
- **Problem:** Invoice 2 hides the discount distribution, making it impossible to verify calculations

### 2. **GST Rates** ❌
- **Invoice 1:** All 3 items have **3% GST** (consistent)
- **Invoice 2:** Only first item has **3% GST**, other 2 have **0% GST**
- **Problem:** CSV shows "IGST 3%" for the order, but Invoice 2 applies different rates per item
- **Impact:** Tax calculation is completely wrong in Invoice 2

### 3. **Taxable Amounts** ❌
- **Invoice 1:** 1,097.49 + 1,097.50 + 1,097.50 = **3,292.49** (before tax)
- **Invoice 2:** 1,130.42 + 1,130.42 + 1,130.42 = **3,391.26** (before tax)
- **Problem:** Invoice 2's taxable amounts already include the discount reduction, but discount column shows 0.00

### 4. **Total Tax Amount** ❌
- **Invoice 1:** ₹98.77 (32.92 × 3 items)
- **Invoice 2:** ₹33.91 (only from first item)
- **Problem:** Invoice 2 is missing tax on 2 items (should be ₹98.77 total)

### 5. **Final Totals** ❌
- **Invoice 1:** ₹3,391.00 (after -0.25 round off)
- **Invoice 2:** ₹3,425.17
- **Difference:** ₹34.17 more in Invoice 2
- **Problem:** Invoice 2 doesn't match the CSV total of ₹3,391.25

### 6. **Mathematical Consistency** ❌
- **Invoice 1:** 
  - Line item totals: 1,130.41 + 1,130.42 + 1,130.42 = 3,391.25 ✓
  - Taxable + Tax: 3,292.49 + 98.77 = 3,391.26 (close to 3,391.25) ✓
  
- **Invoice 2:**
  - Line item totals: 1,164.33 + 1,130.42 + 1,130.42 = 3,425.17 ✓
  - But taxable amounts don't match discount logic: 1,225 - 0 = 1,225, not 1,130.42 ❌
  - Tax calculation incomplete: Only 1 item taxed instead of 3 ❌

---

## Root Cause Analysis

### CSV Data Shows:
- **Subtotal:** ₹3,391.25
- **Taxes:** ₹98.77 (IGST 3%)
- **Total:** ₹3,391.25
- **Discount Amount:** ₹283.75
- **All items:** Same price (₹1,225.00), same tax treatment

### What Should Happen:
1. **Discount Distribution:** ₹283.75 ÷ 3 = ₹94.58 per item (with rounding)
2. **Taxable per item:** ₹1,225.00 - ₹94.58 = ₹1,130.42
3. **Tax per item:** ₹1,130.42 × 3% = ₹33.91
4. **Total tax:** ₹33.91 × 3 = ₹101.73 (but CSV shows ₹98.77, suggesting different calculation)

### What Invoice 1 Does:
✅ Correctly shows discount per item  
✅ Applies 3% GST to all items  
✅ Totals are close to CSV values  

### What Invoice 2 Does:
❌ Hides discount per item (shows 0.00)  
❌ Applies 3% GST to only 1 item  
❌ Taxable amounts are wrong (should be 1,225 - discount, not pre-calculated)  
❌ Final total doesn't match CSV  

---

## Recommendations

1. **Fix Discount Display:** Always show discount per item when order-level discount exists
2. **Fix GST Application:** Apply the same GST rate to all items when CSV indicates uniform tax treatment
3. **Fix Tax Calculation:** Ensure all taxable items are taxed, not just the first one
4. **Fix Taxable Amount Calculation:** Taxable = Rate - Discount, not pre-calculated values
5. **Verify Totals:** Final total must match CSV "Total" column (₹3,391.25)

---

## Expected Correct Invoice

Based on CSV data (₹3,391.25 total, ₹98.77 tax, ₹283.75 discount):

| Item | Rate | Discount | Taxable | GST% | IGST | Total |
|------|------|----------|---------|------|------|-------|
| Item 1 | 1,225.00 | ~94.58 | ~1,130.42 | 3% | ~33.91 | ~1,164.33 |
| Item 2 | 1,225.00 | ~94.58 | ~1,130.42 | 3% | ~33.91 | ~1,164.33 |
| Item 3 | 1,225.00 | ~94.59 | ~1,130.41 | 3% | ~33.95 | ~1,164.36 |

**Total:** ₹3,391.25 (matching CSV)






