# GST Invoice Generator

A modern, full-featured GST (Goods and Services Tax) invoice generation system built with Next.js, TypeScript, and Supabase. Generate professional invoices from CSV order data, preview, download as PDF, and manage your invoices efficiently.

## Features

- 📄 **Invoice Generation**: Automatically generate GST-compliant invoices from CSV order data
- 📊 **Batch Processing**: Generate multiple invoices at once (up to 10 per batch)
- 📥 **CSV Import**: Import orders from CSV files with automatic invoice creation
- 🔍 **Search & Filter**: Search invoices by invoice number, customer name, or order number
- 📅 **Date Range Filter**: Filter invoices by date range (from date, to date, or both)
- 📄 **PDF Export**: Download individual or batch invoices as PDF files
- 🖨️ **Print Support**: Print invoices directly from the browser
- 👁️ **Preview**: Preview invoices before downloading or printing
- 💾 **Supabase Integration**: Persistent storage with Supabase database
- 🎨 **Modern UI**: Clean, responsive interface built with shadcn/ui

## Recent Updates

### Performance & Reliability Improvements

- **Batch PDF Limit**: Limited to 10 invoices per batch to prevent timeout errors
- **Optimized PDF Generation**: Reduced wait times by ~70% for faster processing
- **Pagination**: Set to 10 invoices per page for better performance
- **Timeout Configuration**: Increased Vercel function timeout to 300 seconds (requires Pro plan)
- **Date Filter Enhancement**: Improved date range filtering logic
  - If only "from" date is selected: shows invoices from that date onwards
  - If only "to" date is selected: shows invoices up to that date
  - If both are selected: shows invoices in the date range

### Technical Improvements

- Optimized Puppeteer/Chromium rendering for faster PDF generation
- Reduced hydration wait times from 10s to 3s max
- Improved error handling for timeout scenarios
- Better client-side validation for batch operations

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account (for database)
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Sairajgoud-kodipaka/GST-Invoice.git
cd GST-Invoice
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run database migrations:
```bash
# Apply migrations from supabase/migrations/
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
├── app/
│   ├── api/              # API routes (PDF generation, invoices, orders)
│   ├── invoices/         # Invoices page
│   ├── orders/           # Orders page
│   ├── settings/         # Settings page
│   └── lib/              # Utility functions and services
├── components/
│   ├── actions/          # Action buttons (PDF, Print, Batch)
│   ├── invoice/          # Invoice components
│   ├── upload/           # CSV upload components
│   └── ui/               # UI components (shadcn/ui)
├── supabase/
│   └── migrations/       # Database migrations
└── public/               # Static assets

```

## Usage

### Importing Orders

1. Go to the **Invoices** page
2. Click **Import Orders**
3. Upload a CSV file with order data
4. Invoices will be automatically generated

### Generating PDFs

- **Single Invoice**: Click the PDF button on any invoice row
- **Batch (Merged)**: Select up to 10 invoices and click "Download X as PDF"
- **Batch (ZIP)**: Select up to 10 invoices and click "Download X as ZIP"

### Filtering Invoices

- Use the search bar to search by invoice number, customer name, or order number
- Use the date range filter to filter by date:
  - Select "From" date only: Shows all invoices from that date onwards
  - Select "To" date only: Shows all invoices up to that date
  - Select both: Shows invoices in the date range

## Deployment

### Deploy on Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

**Note**: For optimal performance, Vercel Pro plan is recommended (300s timeout, 3008MB memory for PDF generation).

## Configuration

### Vercel Configuration

The `vercel.json` file configures:
- Function timeout: 300 seconds (max for Enterprise plan)
- Memory: 3008MB
- Chromium binary inclusion for PDF generation

### Batch Limits

- Maximum 10 invoices per batch PDF generation
- 10 invoices per page in the invoices list

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **PDF Generation**: Puppeteer + Chromium
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## License

This project is private and proprietary.

## Support

For issues or questions, please check the project documentation or contact the development team.
