# Supabase Setup Guide

This guide explains how to set up Supabase to prevent duplicate invoice numbers when multiple users access the app.

## Overview

The app uses Supabase to:
- Track invoice numbers globally across all users
- Prevent duplicate invoice numbers
- Start invoice numbering from 101 and auto-increment
- Provide real-time synchronization across devices

## Prerequisites

1. A Supabase account (free tier is sufficient)
2. A Supabase project created

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for the project to be provisioned (takes a few minutes)

### 2. Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_create_invoices_table.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **Run** to execute the migration

This creates:
- `invoices` table with UNIQUE constraint on `invoice_no`
- `get_next_invoice_number()` function (starts from Q-MAN-25-101)
- `invoice_exists()` function for checking duplicates
- Indexes for performance

### 3. Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

### 4. Configure Environment Variables

Create a `.env.local` file in the project root (if it doesn't exist):

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**For Vercel deployment:**

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

### 5. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 6. Verify the Setup

Run the verification script to check if everything is configured correctly:

```bash
npm run verify:supabase
```

This script will verify:
- ✅ Environment variables are set
- ✅ Supabase connection works
- ✅ Database tables and functions exist
- ✅ Invoice creation works correctly

### 7. Test the Setup

1. Start your development server: `npm run dev`
2. Upload a CSV file with orders
3. Check that invoices are created with sequential numbers starting from Q-MAN-25-101
4. Try creating the same invoice number twice - you should see an error message

## How It Works

### Invoice Number Generation

1. When a user uploads a CSV, the app calls `/api/invoices/next`
2. This calls the `get_next_invoice_number()` function in Supabase
3. The function:
   - Finds the last invoice number (e.g., Q-MAN-25-105)
   - Extracts the number (105)
   - Returns the next number (Q-MAN-25-106)
   - If no invoices exist, returns Q-MAN-25-101

### Duplicate Prevention

1. Before creating an invoice, the app checks if the number exists
2. If it exists, the app:
   - Shows an error message with details
   - Suggests the next available number
   - Allows the user to use the next number or cancel

### Database Schema

```sql
invoices (
  id UUID PRIMARY KEY
  invoice_no TEXT UNIQUE NOT NULL  -- Prevents duplicates
  order_no TEXT
  invoice_date TEXT
  customer_name TEXT
  total_amount NUMERIC
  invoice_data JSONB
  created_at TIMESTAMPTZ
  created_by TEXT
)
```

## Fallback Behavior

If Supabase is not configured:
- The app falls back to localStorage
- Invoice numbers are stored locally (per browser)
- **Warning**: This does NOT prevent duplicates across users/devices

## Troubleshooting

### "Supabase not configured" error

- Check that environment variables are set correctly
- Restart your development server after adding environment variables
- For Vercel, ensure environment variables are set in project settings

### "Failed to get next invoice number"

- Check that the migration was run successfully
- Verify the `get_next_invoice_number()` function exists in Supabase
- Check Supabase logs for errors

### Invoice numbers not incrementing

- Check that invoices are being created in Supabase
- Verify the `invoice_no` column has the UNIQUE constraint
- Check browser console for errors

### Duplicate invoice numbers still occurring

- Ensure Supabase is properly configured (not using localStorage fallback)
- Check that the UNIQUE constraint is active on `invoice_no`
- Verify API routes are working (`/api/invoices/next`, `/api/invoices/create`)

## API Endpoints

### GET `/api/invoices/next`
Returns the next available invoice number.

**Response:**
```json
{
  "invoiceNo": "Q-MAN-25-101"
}
```

### POST `/api/invoices/exists`
Checks if an invoice number already exists.

**Request:**
```json
{
  "invoiceNo": "Q-MAN-25-101"
}
```

**Response:**
```json
{
  "exists": false
}
```

or

```json
{
  "exists": true,
  "invoice": {
    "invoiceNo": "Q-MAN-25-101",
    "orderNo": "MAN-25-5982",
    "createdAt": "2024-01-01T10:00:00Z",
    "createdBy": "system"
  }
}
```

### POST `/api/invoices/create`
Creates a new invoice with duplicate checking.

**Request:**
```json
{
  "invoiceNo": "Q-MAN-25-101",
  "orderNo": "MAN-25-5982",
  "invoiceDate": "01-01-2024",
  "orderDate": "01-01-2024",
  "customerName": "John Doe",
  "totalAmount": 1000.00,
  "invoiceData": { ... }
}
```

**Response (Success):**
```json
{
  "success": true,
  "invoice": { ... }
}
```

**Response (Conflict - Duplicate):**
```json
{
  "error": "Invoice number already exists",
  "exists": true,
  "existingInvoice": {
    "invoiceNo": "Q-MAN-25-101",
    "orderNo": "MAN-25-5982",
    "createdAt": "2024-01-01T10:00:00Z",
    "createdBy": "system"
  }
}
```

## Security Notes

- The `anon` key is safe to use in client-side code
- Row Level Security (RLS) is not enabled by default - consider enabling it for production
- The `created_by` field currently defaults to 'system' - can be enhanced to track actual users

## Next Steps

1. **Enable RLS** (Row Level Security) for production use
2. **Add user tracking** - update `created_by` to track actual users
3. **Add invoice history** - query all invoices created by a user
4. **Add invoice search** - search invoices by number, order, customer, etc.

