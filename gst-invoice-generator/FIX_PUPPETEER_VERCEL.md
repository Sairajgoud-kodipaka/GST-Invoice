# Fix Puppeteer on Vercel - 405 Error

## ✅ Good News: Pages Work!

Your app pages are working:
- ✅ `/` - Dashboard works
- ✅ `/orders` - Orders page works  
- ✅ `/invoices` - Invoices page works

## 🔍 The Issue: 405 Error on `/api/generate-pdf`

**HTTP 405 = "Method Not Allowed"**

This happens when:
- You access the API endpoint directly in browser (GET request)
- But the route only accepts POST requests

**This is normal!** The API endpoint is meant to be called from your app, not accessed directly.

## 🎯 Real Issue: Puppeteer on Vercel

The actual problem is likely **Puppeteer not working on Vercel**. Here are the fixes:

### Fix 1: Add More Puppeteer Args for Vercel

Update your `app/api/generate-pdf/route.ts`:

```typescript
browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // ✅ Add this
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process', // ✅ Add this for Vercel
  ],
  timeout: 30000,
});
```

### Fix 2: Check Vercel Function Logs

1. **Vercel Dashboard → Your Project → Logs**
2. **Look for Puppeteer errors:**
   - "Browser launch timeout"
   - "Failed to launch browser"
   - Any Puppeteer-related errors

### Fix 3: Function Timeout

**Vercel Hobby Plan:** 10-second timeout (too short for PDF generation)
**Vercel Pro Plan:** 60-second timeout (recommended)

**If on Hobby plan:**
- PDF generation might timeout
- Consider upgrading to Pro
- Or optimize PDF generation (reduce wait times)

### Fix 4: Test PDF Generation from App

**Don't test by visiting the URL directly!** Instead:

1. **Go to your app:** `https://gst-invoice-dre8.vercel.app/invoices`
2. **Click "Generate PDF" or "Download" button**
3. **Check browser console** (F12) for errors
4. **Check Vercel logs** for server-side errors

## 🔧 Quick Fix to Apply

Let me update your Puppeteer configuration for better Vercel compatibility:


