# Fix libnss3.so Error on Vercel

## 🔴 Error
```
Failed to launch the browser process!
/tmp/chromium: error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory
```

## ✅ Solution

### Step 1: Code is Already Fixed ✅
The code has been updated to properly use `@sparticuz/chromium`.

### Step 2: Add Environment Variable in Vercel (REQUIRED)

**You MUST add this environment variable in Vercel Dashboard:**

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add a new environment variable:
   - **Key:** `AWS_LAMBDA_JS_RUNTIME`
   - **Value:** `nodejs22.x`
   - **Environment:** Select **Production**, **Preview**, and **Development** (or just Production if you only deploy there)

3. Click **Save**

4. **Redeploy** your project:
   - Go to **Deployments** tab
   - Click **"..."** on the latest deployment
   - Click **Redeploy**

### Step 3: Verify Configuration

Your `vercel.json` should have:
```json
{
  "functions": {
    "app/api/generate-pdf/route.ts": {
      "maxDuration": 60,
      "memory": 2048,
      "includeFiles": "node_modules/@sparticuz/chromium/**"
    }
  }
}
```

✅ This is already correct in your project.

### Step 4: Verify Dependencies

Your `package.json` should have:
```json
{
  "dependencies": {
    "puppeteer-core": "^23.11.1",
    "@sparticuz/chromium": "^131.0.0"
  }
}
```

✅ This is already correct in your project.

## 🎯 Why This Works

1. **Code Fix:** Uses `@sparticuz/chromium.executablePath()` which provides a bundled Chromium with all libraries
2. **Environment Variable:** `AWS_LAMBDA_JS_RUNTIME=nodejs22.x` tells Vercel to use Node.js 22.x runtime which has better compatibility with Chromium
3. **Bundling:** `includeFiles` in `vercel.json` ensures Chromium files are included in the deployment

## 📋 After Adding Environment Variable

1. **Commit and push** the code changes:
   ```bash
   git add app/api/generate-pdf/route.ts vercel.json
   git commit -m "Fix Chromium libnss3.so error"
   git push
   ```

2. **Add the environment variable** in Vercel Dashboard (as described above)

3. **Redeploy** - Vercel will automatically redeploy when you push, or manually redeploy after adding the env var

4. **Test PDF generation** - The error should be resolved

## 🔍 If Still Not Working

1. Check Vercel logs for the exact error
2. Verify the environment variable is set correctly
3. Ensure you're using the latest versions:
   - `@sparticuz/chromium`: `^131.0.0` ✅
   - `puppeteer-core`: `^23.11.1` ✅

## 📚 Reference

- [Vercel Community Discussion](https://community.vercel.com/t/puppeteer-on-node-22-x-missing-libnspr4-so/23372)
- [@sparticuz/chromium GitHub](https://github.com/Sparticuz/chromium)





