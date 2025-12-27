# Troubleshooting 404 Error on Vercel

## Issue: 404 NOT_FOUND on Vercel Deployment

If you're seeing a 404 error on your Vercel deployment, follow these steps:

## ✅ Quick Fixes

### 1. Check Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check the "Build Logs" tab
4. Look for any build errors

**Common Build Errors:**
- Missing dependencies
- TypeScript errors
- Missing environment variables
- Build timeout

### 2. Verify File Structure

Ensure these files exist:
- ✅ `app/layout.tsx` - Root layout
- ✅ `app/page.tsx` - Home page
- ✅ `next.config.ts` - Next.js config
- ✅ `package.json` - Dependencies

### 3. Check Next.js Config

The `next.config.ts` should NOT have `output: 'standalone'` for Vercel:

```typescript
// ❌ Wrong for Vercel
const nextConfig = {
  output: 'standalone', // Remove this!
};

// ✅ Correct for Vercel
const nextConfig = {
  // No output setting needed
};
```

### 4. Remove Empty Directories

Empty API route directories can cause issues:

```bash
# Remove any empty directories
rm -rf app/api/generate-pdf-latex
```

### 5. Rebuild and Redeploy

1. **Clear Vercel cache:**
   - Vercel Dashboard → Settings → General
   - Click "Clear Build Cache"

2. **Redeploy:**
   ```bash
   git commit --allow-empty -m "Trigger rebuild"
   git push
   ```

## 🔍 Detailed Troubleshooting

### Check Deployment Settings

1. **Framework Preset:** Should be "Next.js"
2. **Build Command:** `npm run build`
3. **Output Directory:** (leave empty, auto-detected)
4. **Install Command:** `npm install`

### Verify Routes

Test these URLs after deployment:
- `https://your-app.vercel.app/` - Should show dashboard
- `https://your-app.vercel.app/orders` - Should show orders page
- `https://your-app.vercel.app/invoices` - Should show invoices page

### Check Console Errors

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

### Common Issues

#### Issue: "Module not found"
**Solution:** Ensure all dependencies are in `package.json`

#### Issue: "Build timeout"
**Solution:** 
- Upgrade to Vercel Pro (longer timeout)
- Optimize build process
- Remove unused dependencies

#### Issue: "TypeScript errors"
**Solution:**
- Fix all TypeScript errors locally first
- Run `npm run build` locally to verify
- Check `tsconfig.json` settings

## 🚀 Step-by-Step Fix

1. **Fix next.config.ts:**
   ```typescript
   // Remove 'standalone' output
   const nextConfig: NextConfig = {};
   ```

2. **Remove empty directories:**
   ```bash
   rm -rf app/api/generate-pdf-latex
   ```

3. **Test build locally:**
   ```bash
   npm run build
   ```

4. **Commit and push:**
   ```bash
   git add .
   git commit -m "Fix Vercel deployment"
   git push
   ```

5. **Check Vercel dashboard:**
   - Wait for build to complete
   - Check build logs for errors
   - Test the deployed URL

## 📋 Pre-Deployment Checklist

- [ ] `next.config.ts` doesn't have `output: 'standalone'`
- [ ] All TypeScript errors fixed
- [ ] `npm run build` succeeds locally
- [ ] No empty API route directories
- [ ] All dependencies in `package.json`
- [ ] `app/layout.tsx` exists
- [ ] `app/page.tsx` exists

## 🆘 Still Not Working?

1. **Check Vercel Function Logs:**
   - Vercel Dashboard → Functions tab
   - Look for runtime errors

2. **Verify Environment:**
   - Ensure you're on the correct branch
   - Check production vs preview deployment

3. **Contact Support:**
   - Vercel Support: https://vercel.com/support
   - Check Vercel Status: https://vercel-status.com

## ✅ Success Indicators

When deployment is successful, you should see:
- ✅ Build completes without errors
- ✅ Deployment shows "Ready" status
- ✅ Home page loads at root URL
- ✅ No 404 errors in console
- ✅ All routes accessible

---

**Quick Command Reference:**
```bash
# Test build locally
npm run build

# Start production server locally
npm run start

# Check for TypeScript errors
npx tsc --noEmit
```




