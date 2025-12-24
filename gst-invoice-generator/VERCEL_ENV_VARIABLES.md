# Vercel Environment Variables Guide

## ✅ Required: NONE

**No environment variables are required!** The API endpoint works out of the box on Vercel.

## 🔄 Automatically Set by Vercel

Vercel automatically provides these environment variables (you don't need to set them):

| Variable | Description | Example |
|----------|-------------|---------|
| `VERCEL` | Always `"1"` on Vercel | `"1"` |
| `VERCEL_ENV` | Environment type | `"production"`, `"preview"`, or `"development"` |
| `VERCEL_URL` | Deployment URL | `"your-app-abc123.vercel.app"` |

These are used by the code to:
- Detect Vercel environment
- Load the correct Puppeteer configuration
- Construct the base URL for invoice rendering

## 🎯 Optional: Custom Domain Support

If you're using a **custom domain** (e.g., `invoice.yourdomain.com`), you can optionally set:

### Option 1: Use Custom Domain (Recommended)
Set this in **Vercel Dashboard → Settings → Environment Variables**:

```
NEXT_PUBLIC_APP_URL=https://invoice.yourdomain.com
```

Then update the code to use it (if needed for other features).

### Option 2: Let It Auto-Detect
The current code automatically uses:
1. `VERCEL_URL` (if available) - works for all deployments
2. Request headers (`x-forwarded-proto`, `host`) - works with custom domains
3. Falls back to `localhost:3000` for local development

**So even with a custom domain, no configuration is needed!**

## 📋 Verification Checklist

After deployment, verify these work:

1. ✅ **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for: `"Base URL for invoice rendering: https://..."`
   - Should show your deployment URL

2. ✅ **Test PDF Generation:**
   - Go to `/invoices` page
   - Click "Generate PDF"
   - Should work without errors

3. ✅ **Check Function Logs:**
   - Vercel Dashboard → Functions → `api/generate-pdf`
   - Should see successful Puppeteer launches

## 🚨 Troubleshooting

### Issue: "Failed to load invoice page"

**Check:**
1. Vercel Logs → Look for the `baseUrl` being used
2. Verify the URL is accessible (try opening it in browser)
3. Make sure `/invoice-render` route is deployed

**Solution:**
- The code already handles this with fallbacks
- If using custom domain, ensure DNS is configured correctly

### Issue: "Browser launch timeout"

**This is NOT an environment variable issue:**
- Vercel Hobby plan: 10-second timeout
- Vercel Pro plan: 60-second timeout (recommended)
- Your `vercel.json` already sets `maxDuration: 60`

## 📝 Summary

**For the API endpoint to work:**
- ✅ **No environment variables needed**
- ✅ Vercel automatically provides everything
- ✅ Code has proper fallbacks
- ✅ Works with custom domains automatically

**Just deploy and it works!** 🚀

