# Edge Cases Handled for Order Import

This document describes the 3 main edge cases that have been implemented to handle duplicate order imports and updates.

## Edge Case 1: Identical Order Import

**Scenario**: User imports the same order twice with no changes.

**Behavior**:
- System detects that the order already exists
- Compares all fields (order date, customer name, total amount, financial status, payment method, line items, etc.)
- If all fields are identical, the order is skipped
- User sees a message: **"This order already exists. Order {orderNo} has not changed."**

**Implementation**:
- `/api/orders/check` endpoint compares incoming order data with existing order
- Returns `isIdentical: true` if no differences found
- CSVProcessor skips the order and shows appropriate message

## Edge Case 2: Order with Changes (Update)

**Scenario**: User imports the same order, but some fields have changed (e.g., status changed from "pending" to "paid").

**Behavior**:
- System detects that the order exists
- Compares fields and identifies differences
- Updates the order in the database (via upsert)
- If the order has an invoice, updates the invoice data as well
- User sees a message showing what was updated:
  - **"{N} order(s) updated"**
  - Lists specific changes (e.g., "Status: pending → paid", "Amount: ₹1000 → ₹1200")

**Implementation**:
- `/api/orders/check` endpoint returns differences array
- CSVProcessor updates order via upsert in `/api/orders/bulk-create`
- If invoice exists, calls `/api/invoices/update` to update invoice data
- Shows detailed toast notification with all changes

## Edge Case 3: Order Already Has Invoice

**Scenario**: User tries to import an order that already has an invoice generated.

**Behavior**:
- System checks if order has an invoice
- If invoice exists and order is identical → skip with message
- If invoice exists and order has changes → update both order and invoice
- Prevents duplicate invoice generation

**Implementation**:
- `/api/invoices/check-order` endpoint checks for existing invoice
- CSVProcessor handles updates to both order and invoice when changes detected
- Invoice data is synchronized with order data

## Technical Details

### Database Changes

1. **Unique Constraint on `order_no`**:
   - Migration `004_add_order_no_unique_constraint.sql` adds unique constraint
   - Prevents duplicate orders at database level
   - Handles existing duplicates by keeping the oldest one

### API Endpoints

1. **`/api/orders/check`** (NEW):
   - Checks if order exists
   - Compares incoming data with existing data
   - Returns differences array
   - Returns `isIdentical` flag

2. **`/api/orders/bulk-create`** (UPDATED):
   - Now uses `upsert` instead of `insert`
   - Updates existing orders on conflict
   - Handles duplicate orders gracefully

3. **`/api/invoices/update`** (EXISTING):
   - Used to update invoice when order data changes
   - Updates invoice_data JSONB field
   - Updates total amount and customer name

### CSVProcessor Logic Flow

```
For each invoice in CSV:
  1. Check if order exists → /api/orders/check
     ├─ If exists and identical → Skip, show "order already exists"
     ├─ If exists and different → Update order + invoice, show changes
     └─ If doesn't exist → Continue to step 2
  
  2. Check if order has invoice → /api/invoices/check-order
     ├─ If has invoice → Skip (already handled in step 1)
     └─ If no invoice → Continue to step 3
  
  3. Check if invoice number exists → invoiceService.exists()
     ├─ If exists → Skip, show duplicate error
     └─ If doesn't exist → Create invoice
  
  4. Create invoice → invoiceService.create()
```

### Fields Compared for Changes

The system compares the following fields to detect changes:

1. **Order-level fields**:
   - `orderDate`
   - `customerName`
   - `totalAmount`

2. **Order data fields** (from JSONB):
   - `financialStatus` (pending → paid, etc.)
   - `paymentMethod`
   - `lineItemsCount`
   - `orderDataTotal` (total amount in invoice data)

### User Notifications

1. **Success Toast** (Green):
   - Shows number of orders updated
   - Lists specific changes for each order
   - Example: "2 order(s) updated - Order #123: Status: pending → paid, Amount: ₹1000 → ₹1200"

2. **Warning Toast** (Red):
   - Shows skipped orders
   - Explains why each order was skipped
   - Example: "This order already exists. Order #123 has not changed."

3. **Error Toast** (Red):
   - Shows errors during processing
   - Provides actionable error messages

## Testing Scenarios

### Test Case 1: Import Same Order Twice
1. Import CSV with order #123 (status: pending)
2. Import same CSV again
3. **Expected**: "This order already exists" message

### Test Case 2: Import Order with Status Change
1. Import CSV with order #123 (status: pending)
2. Update CSV: change status to "paid"
3. Import updated CSV
4. **Expected**: "1 order(s) updated - Order #123: Status: pending → paid"
5. **Verify**: Order and invoice updated in database

### Test Case 3: Import Order with Amount Change
1. Import CSV with order #123 (amount: ₹1000)
2. Update CSV: change amount to ₹1200
3. Import updated CSV
4. **Expected**: "1 order(s) updated - Order #123: Amount: ₹1000 → ₹1200"
5. **Verify**: Order and invoice amounts updated

### Test Case 4: Import Order with Multiple Changes
1. Import CSV with order #123
2. Update CSV: change status to "paid", amount to ₹1200, payment method to "card"
3. Import updated CSV
4. **Expected**: "1 order(s) updated - Order #123: Status: pending → paid, Amount: ₹1000 → ₹1200, Payment: cash → card"

## Migration Instructions

To apply these changes:

1. **Run the database migration**:
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/004_add_order_no_unique_constraint.sql
   ```

2. **Deploy the updated API endpoints**:
   - `/api/orders/check` (new)
   - `/api/orders/bulk-create` (updated)

3. **Deploy the updated CSVProcessor component**:
   - `components/upload/CSVProcessor.tsx` (updated)

## Notes

- The system maintains data integrity by preventing duplicate orders
- Invoice data is automatically synchronized when order data changes
- Users get clear feedback about what was updated or skipped
- All updates are logged for debugging purposes


