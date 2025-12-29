# Fix 500 Error on Vercel

## ✅ Good News: Deployment Successful!

Your app is deployed, but you're getting a **500 error** when trying to use it.

## 🔍 Common Causes of 500 Errors

### 1. Puppeteer on Vercel (Most Likely)

Puppeteer needs special configuration on Vercel. Check your `/api/generate-pdf` route.

### 2. Missing Environment Variables

Some features might need environment variables.

### 3. Serverless Function Timeout

Vercel Hobby plan has 10-second timeout. Pro has 60 seconds.

## 🔧 Quick Fixes

### Fix 1: Check Vercel Function Logs

1. **Go to Vercel Dashboard:**
   - Your Project → **Logs** tab
   - Or **Deployments** → Latest → **Function Logs**

2. **Look for error messages:**
   - This will tell you exactly what's failing

### Fix 2: Test Your Routes

Try accessing:
- `https://your-app.vercel.app/` - Should work (dashboard)
- `https://your-app.vercel.app/orders` - Should work
- `https://your-app.vercel.app/invoices` - Should work
- `https://your-app.vercel.app/api/generate-pdf` - Might fail (needs POST)

### Fix 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for error messages
4. Go to **Network** tab
5. Find the failed request (red)
6. Click it to see error details

## 🎯 Most Likely Issue: Puppeteer

If the 500 error is from `/api/generate-pdf`, it's likely Puppeteer configuration.

### Check Your Puppeteer Config

Your `app/api/generate-pdf/route.ts` should have:
```typescript
browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'], // ✅ Required for Vercel
  timeout: 30000,
});
```

## 📋 Debugging Steps

1. **Check Vercel Logs:**
   - Dashboard → Logs → Look for error stack traces

2. **Test Locally:**
   ```bash
   npm run build
   npm run start
   ```
   Then test the same functionality locally

3. **Check Network Tab:**
   - Which endpoint is returning 500?
   - What's the error message?

## 🆘 Share Error Details

To help debug, please share:
1. **Which page/action** causes the 500 error?
2. **Vercel Function Logs** (from Dashboard → Logs)
3. **Browser Console errors** (F12 → Console)
4. **Network tab** error details (F12 → Network → Failed request)

---

**The deployment is successful!** Now we just need to fix the runtime error. Check the Vercel logs to see what's failing! 🔍







