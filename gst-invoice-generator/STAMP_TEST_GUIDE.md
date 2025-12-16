# Stamp Test Guide

This document describes the test CSV files created to verify the conditional stamp logic.

## Test Files Overview

| File Name | Financial Status | Cancelled At | Expected Stamp | Stamp Color |
|-----------|-----------------|--------------|----------------|-------------|
| `test_cancelled.csv` | paid | ✅ Has value | **CANCELLED** | Red (#dc2626) |
| `test_pending.csv` | pending | ❌ Empty | **PENDING** | Orange (#f59e0b) |
| `test_partially_paid.csv` | partially_paid | ❌ Empty | **PENDING** | Orange (#f59e0b) |
| `test_unpaid.csv` | unpaid | ❌ Empty | **UNPAID** | Gray (#6b7280) |
| `test_voided.csv` | voided | ❌ Empty | **UNPAID** | Gray (#6b7280) |
| `test_refunded.csv` | refunded | ❌ Empty | **UNPAID** | Gray (#6b7280) |
| `test_no_status.csv` | ❌ Empty | ❌ Empty | **PAID** | Blue (#2563eb) |
| `orders_export (5).csv` | paid | ❌ Empty | **PAID** | Blue (#2563eb) |

## Test Scenarios

### 1. ✅ CANCELLED Stamp (test_cancelled.csv)
- **Financial Status:** `paid`
- **Cancelled At:** `2025-12-11 15:30:00 +0530`
- **Expected Result:** Red "CANCELLED" stamp
- **Priority:** Highest - Cancelled takes precedence over all other statuses

### 2. 🟠 PENDING Stamp (test_pending.csv)
- **Financial Status:** `pending`
- **Cancelled At:** Empty
- **Expected Result:** Orange "PENDING" stamp

### 3. 🟠 PENDING Stamp (test_partially_paid.csv)
- **Financial Status:** `partially_paid`
- **Cancelled At:** Empty
- **Expected Result:** Orange "PENDING" stamp
- **Note:** `partially_paid` is treated as pending

### 4. ⚫ UNPAID Stamp (test_unpaid.csv)
- **Financial Status:** `unpaid`
- **Cancelled At:** Empty
- **Expected Result:** Gray "UNPAID" stamp

### 5. ⚫ UNPAID Stamp (test_voided.csv)
- **Financial Status:** `voided`
- **Cancelled At:** Empty
- **Expected Result:** Gray "UNPAID" stamp
- **Note:** `voided` is treated as unpaid

### 6. ⚫ UNPAID Stamp (test_refunded.csv)
- **Financial Status:** `refunded`
- **Cancelled At:** Empty
- **Refunded Amount:** 1225.00
- **Expected Result:** Gray "UNPAID" stamp
- **Note:** `refunded` is treated as unpaid

### 7. 🔵 PAID Stamp (test_no_status.csv)
- **Financial Status:** Empty (no value)
- **Cancelled At:** Empty
- **Expected Result:** Blue "PAID" stamp
- **Note:** Default behavior for backward compatibility

### 8. 🔵 PAID Stamp (orders_export (5).csv)
- **Financial Status:** `paid`
- **Cancelled At:** Empty
- **Expected Result:** Blue "PAID" stamp
- **Note:** This is your original test file

## Testing Instructions

1. Upload each test CSV file to the invoice generator
2. Generate the invoice
3. Verify the stamp appears in the footer (bottom left)
4. Check the stamp text matches the expected value
5. Verify the stamp color matches the expected color

## Stamp Priority Logic

The stamp is determined by the following priority order:

1. **CANCELLED** (Red) - If `Cancelled At` has any value
2. **PAID** (Blue) - If `Financial Status = "paid"` AND `Cancelled At` is empty
3. **PENDING** (Orange) - If `Financial Status = "pending"` OR `"partially_paid"`
4. **UNPAID** (Gray) - If `Financial Status = "unpaid"`, `"voided"`, OR `"refunded"`
5. **PAID** (Blue) - Default if no `Financial Status` is provided (backward compatibility)

## Notes

- All test files use the same structure as your original CSV
- Order numbers are unique for easy identification (MAN-25-XXXX)
- All test files have valid billing/shipping addresses
- Tax calculations are included (IGST 3%)
- Each file has one line item for simplicity




