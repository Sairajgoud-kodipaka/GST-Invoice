# Deployment Guide

## 🚀 Deploying to Vercel (Web Version)

Your app is **production-ready** for Vercel! The Puppeteer-based PDF generation works perfectly on Vercel's serverless functions.

### Quick Deploy

#### Option 1: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

#### Option 2: Via GitHub (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js
   - Click "Deploy"

3. **Done!** Your app will be live in ~2 minutes

### What's Included

✅ **Puppeteer PDF Generation** - Works on Vercel  
✅ **All API Routes** - `/api/generate-pdf` ready  
✅ **Invoice Templates** - Fully functional  
✅ **No LaTeX Dependencies** - Clean and optimized  

### Environment Variables

**No environment variables needed!** The app works out of the box.

### Build Configuration

Vercel automatically:
- Detects Next.js
- Runs `npm run build`
- Optimizes the build
- Deploys serverless functions

### Testing After Deployment

1. **Test PDF Generation:**
   ```
   POST https://your-app.vercel.app/api/generate-pdf
   Body: { invoices: [...], single: true }
   ```

2. **Check Routes:**
   - `https://your-app.vercel.app/` - Home
   - `https://your-app.vercel.app/orders` - Orders
   - `https://your-app.vercel.app/invoices` - Invoices

### Vercel Plan Recommendations

**Hobby (Free):**
- ✅ Good for testing
- ⚠️ 10-second function timeout
- ⚠️ Limited bandwidth

**Pro ($20/month) - Recommended:**
- ✅ 60-second function timeout
- ✅ Better performance
- ✅ More bandwidth
- ✅ Better for production

### Troubleshooting

**Issue: Function timeout**
- Solution: Upgrade to Vercel Pro (60s timeout)
- Or: Optimize PDF generation code

**Issue: PDF generation fails**
- Check: Ensure `/invoice-render` route is accessible
- Verify: Logo exists at `public/logo-Photoroom.png`

**Issue: Browser launch timeout**
- Solution: Already configured with `--no-sandbox` flags
- If persists: Upgrade to Vercel Pro

## 📦 Building Electron App (Desktop Version)

For desktop app distribution:

```bash
# Build Windows installer
npm run electron:build:win

# Output: dist-electron/GST Invoice Generator Setup 0.1.0.exe
```

See `ELECTRON_SETUP.md` for detailed instructions.

## 🔄 Deployment Workflow

### For Web (Vercel):
1. Push code to GitHub
2. Vercel auto-deploys
3. Test on production URL
4. Done!

### For Desktop (Electron):
1. Run `npm run electron:build:win`
2. Test the installer
3. Distribute the `.exe` file
4. Done!

## 📊 Performance

**Expected Performance on Vercel:**
- PDF Generation: ~2-5 seconds per invoice
- Function Cold Start: ~1-2 seconds
- Total Time: ~3-7 seconds per PDF

**Optimization Tips:**
- Use batch mode for multiple invoices
- Consider caching if using external storage
- Monitor function execution time in Vercel dashboard

## ✅ Pre-Deployment Checklist

- [x] Removed LaTeX dependencies
- [x] Puppeteer configured for serverless
- [x] All routes tested locally
- [x] PDF generation works
- [x] Invoice template renders correctly
- [x] Logo file exists in `public/`
- [x] No hardcoded localhost URLs
- [x] Environment variables set (if any)

## 🎯 Next Steps

1. **Deploy to Vercel** (follow steps above)
2. **Test all features** on production URL
3. **Monitor performance** in Vercel dashboard
4. **Set up custom domain** (optional)
5. **Enjoy your production app!** 🎉

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Check `docs/VERCEL_DEPLOYMENT.md` for detailed guide

