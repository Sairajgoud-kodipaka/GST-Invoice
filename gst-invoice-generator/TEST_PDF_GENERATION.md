# How to Test PDF Generation (Not 405 Error)

## ✅ 405 Error is Normal!

**HTTP 405 = "Method Not Allowed"**

When you visit `/api/generate-pdf` directly in the browser, you're making a **GET request**, but the route only accepts **POST requests**. This is expected behavior!

## 🎯 How to Test PDF Generation Properly

### Don't Test by Visiting the URL!

Instead, test from your app:

1. **Go to your deployed app:**
   - `https://gst-invoice-dre8.vercel.app/invoices`

2. **Create or select an invoice**

3. **Click "Download" or "Generate PDF" button**

4. **Check for errors:**
   - Open browser DevTools (F12)
   - Go to **Console** tab - look for errors
   - Go to **Network** tab - find the `/api/generate-pdf` request
   - Click it to see the response

5. **Check Vercel Logs:**
   - Vercel Dashboard → Your Project → **Logs**
   - Look for Puppeteer errors or timeouts

## 🔍 What to Look For

### If PDF Generation Works:
- ✅ PDF downloads successfully
- ✅ No errors in browser console
- ✅ No errors in Vercel logs

### If PDF Generation Fails:

**Check Vercel Logs for:**
- "Browser launch timeout"
- "Failed to launch browser"
- "Function timeout" (if on Hobby plan)
- Any Puppeteer-related errors

## 🚀 Puppeteer Configuration Updated

I've updated your Puppeteer config with better Vercel-compatible settings:
- Added `--disable-dev-shm-usage`
- Added `--single-process` (required for Vercel)
- Added `--disable-gpu`
- And other optimizations

## 📋 Next Steps

1. **Commit the Puppeteer fix:**
   ```bash
   git add app/api/generate-pdf/route.ts
   git commit -m "Improve Puppeteer config for Vercel"
   git push
   ```

2. **Test from the app:**
   - Go to `/invoices` page
   - Click "Download" button
   - Check if PDF downloads

3. **If still failing:**
   - Check Vercel Logs for specific error
   - Consider upgrading to Vercel Pro (60s timeout vs 10s)

---

**Remember:** The 405 error when visiting the URL directly is normal. Test from your app's UI! 🎯


