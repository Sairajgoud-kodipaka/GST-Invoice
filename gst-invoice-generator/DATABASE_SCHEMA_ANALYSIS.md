# Database Schema Analysis

## Table Roles and Relationships

### 1. **`invoice_settings` Table** (Configuration/Singleton Table)

**Role**: Stores application-wide configuration for invoice generation
- **Type**: Singleton table (only one row should exist)
- **Purpose**: Configuration storage, not transactional data
- **Relationship**: ❌ **NO foreign key relationships** (by design)

**Why no foreign key?**
- This is a **configuration table**, not a transactional table
- It stores **global settings** that apply to all invoices/orders
- It's accessed via database functions (`get_invoice_settings()`, `save_invoice_settings()`)
- It's a **singleton pattern** - only one row exists

**Fields**:
- `prefix`: Invoice number prefix (e.g., "O-/", "Q-MAN-25-")
- `starting_number`: Starting invoice number
- `auto_increment`: Whether to auto-increment invoice numbers
- `default_payment_terms`: Default payment terms in days
- `default_payment_method`: Default payment method
- `starting_order_number`: For order-to-invoice mapping
- `starting_invoice_number`: Corresponding invoice number for mapping

**Backend Usage**: ✅ **ACTIVELY USED**
- `/api/invoice-settings` endpoint (GET/POST)
- `app/lib/storage.ts` - `invoiceSettingsStorage.get()` and `save()`
- `app/settings/page.tsx` - Settings page uses it
- `app/lib/field-mapper.ts` - Uses settings to generate invoice numbers
- `app/lib/invoice-service.ts` - Uses settings for invoice generation
- Database functions: `get_invoice_settings()`, `save_invoice_settings()`, `get_invoice_number_from_order()`

**How it works**:
1. User configures settings in Settings page
2. Settings saved to `invoice_settings` table via `/api/invoice-settings` POST
3. When generating invoices, app reads settings via `/api/invoice-settings` GET
4. Settings used to determine invoice number format and defaults

---

### 2. **`invoices` Table** (Transactional Table)

**Role**: Stores actual invoice records
- **Type**: Transactional table (many rows)
- **Purpose**: Invoice data storage
- **Relationship**: ✅ **Has relationship with `orders`**

**Fields**:
- `id`: Primary key (UUID)
- `invoice_no`: Unique invoice number (UNIQUE constraint)
- `order_no`: Order number this invoice belongs to
- `invoice_date`, `order_date`: Dates
- `customer_name`, `total_amount`: Invoice details
- `invoice_data`: Full invoice JSONB data
- `created_at`, `updated_at`: Timestamps

**Backend Usage**: ✅ **ACTIVELY USED**
- `/api/invoices/*` endpoints (create, update, delete, list, check)
- `app/lib/invoice-service.ts` - Invoice service layer
- `components/invoice/*` - Invoice components
- `app/invoices/page.tsx` - Invoices page

---

### 3. **`orders` Table** (Transactional Table)

**Role**: Stores order records from CSV imports
- **Type**: Transactional table (many rows)
- **Purpose**: Order data storage
- **Relationship**: ✅ **Has foreign key to `invoices`**

**Fields**:
- `id`: Primary key (UUID)
- `order_no`: Unique order number (UNIQUE constraint - from migration 004)
- `order_date`, `customer_name`, `total_amount`: Order details
- `has_invoice`: Boolean flag indicating if invoice exists
- `invoice_id`: **Foreign key** → `invoices.id` (ON DELETE SET NULL)
- `order_data`: Full order JSONB data
- `created_at`, `updated_at`: Timestamps

**Backend Usage**: ✅ **ACTIVELY USED**
- `/api/orders/*` endpoints (create, update, delete, list, bulk-create, check)
- `app/lib/supabase-service.ts` - Order service layer
- `app/orders/page.tsx` - Orders page
- `components/upload/CSVProcessor.tsx` - CSV import uses orders

**Relationship Details**:
```
orders.invoice_id → invoices.id
```
- **Type**: Many-to-One (many orders can reference one invoice, but typically one order = one invoice)
- **Constraint**: `ON DELETE SET NULL` - if invoice is deleted, order.invoice_id becomes NULL
- **Purpose**: Links orders to their generated invoices

---

## Relationship Diagram

```
┌─────────────────────┐
│  invoice_settings   │  (Configuration - No relationships)
│  (Singleton)        │
│  - prefix           │
│  - starting_number  │
│  - auto_increment   │
└─────────────────────┘
         │
         │ (Used by application logic)
         │
         ▼
┌─────────────────────┐         ┌─────────────────────┐
│      invoices        │◄────────│      orders         │
│  - id (PK)          │         │  - invoice_id (FK)  │
│  - invoice_no       │         │  - order_no          │
│  - order_no         │         │  - has_invoice       │
│  - invoice_data     │         │  - order_data        │
└─────────────────────┘         └─────────────────────┘
         ▲
         │
         │ Foreign Key: orders.invoice_id → invoices.id
         │
```

---

## Verification: Are Tables Working?

### ✅ `invoice_settings` - WORKING
**Evidence**:
1. API endpoint exists: `/api/invoice-settings` (GET/POST)
2. Database functions exist: `get_invoice_settings()`, `save_invoice_settings()`
3. Frontend uses it: `app/settings/page.tsx` loads and saves settings
4. Invoice generation uses it: `app/lib/field-mapper.ts` uses settings for invoice numbers

**Test**: Go to Settings page → Change invoice prefix → Save → Should persist

### ✅ `invoices` - WORKING
**Evidence**:
1. API endpoints exist: `/api/invoices/*` (create, update, delete, list, check)
2. Frontend uses it: `app/invoices/page.tsx` displays invoices
3. Invoice generation creates records in this table

**Test**: Import CSV → Generate invoice → Check invoices page → Should see invoice

### ✅ `orders` - WORKING
**Evidence**:
1. API endpoints exist: `/api/orders/*` (create, update, delete, list, bulk-create, check)
2. Frontend uses it: `app/orders/page.tsx` displays orders
3. CSV import creates records in this table
4. Foreign key relationship exists: `orders.invoice_id → invoices.id`

**Test**: Import CSV → Check orders page → Should see orders → Generate invoice → `has_invoice` should become true

---

## Why No Relationship Between `invoice_settings` and Other Tables?

**Answer**: `invoice_settings` is a **configuration table**, not a transactional table. It doesn't need foreign keys because:

1. **It's a singleton**: Only one row exists (application-wide settings)
2. **It's not transactional**: It doesn't store business data, just configuration
3. **It's accessed via functions**: Database functions handle the singleton pattern
4. **It's used by application logic**: The app reads settings and applies them when generating invoices

**Analogy**: Think of it like a `config.json` file - it doesn't have relationships with other data, it just provides configuration that the application uses.

---

## Summary

| Table | Type | Relationships | Status | Purpose |
|-------|------|---------------|--------|---------|
| `invoice_settings` | Configuration (Singleton) | ❌ None (by design) | ✅ Working | Stores invoice generation settings |
| `invoices` | Transactional | ✅ Referenced by `orders` | ✅ Working | Stores invoice records |
| `orders` | Transactional | ✅ References `invoices` | ✅ Working | Stores order records |

**All tables are working correctly!** The lack of foreign key from `invoice_settings` is intentional - it's a configuration table, not a transactional table.


