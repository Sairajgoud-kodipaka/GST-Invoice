# Fix: "No Next.js version detected" Error

## 🔍 Problem

Vercel is showing this error:
```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". Also check your Root Directory setting matches the directory of your package.json file.
```

## ✅ Solution

### Option 1: Check Vercel Root Directory Setting (MOST LIKELY FIX)

1. **Go to Vercel Dashboard:**
   - Your Project → Settings → General

2. **Check "Root Directory" setting:**
   - Should be **EMPTY** (leave blank)
   - If it's set to anything (like `app`, `src`, etc.), **clear it**

3. **Save and Redeploy**

### Option 2: Verify package.json Has "next"

Your `package.json` should have:
```json
{
  "dependencies": {
    "next": "^15.5.7",
    ...
  }
}
```

**Verify:** Check that `next` is in `dependencies` (not just `devDependencies`).

### Option 3: Check Git Repository Structure

If your `package.json` is in a subdirectory:

1. **Vercel Dashboard → Settings → General**
2. **Set Root Directory** to the folder containing `package.json`
   - Example: If `package.json` is in `gst-invoice-generator/`, set Root Directory to `gst-invoice-generator`
   - But usually it should be **EMPTY** if `package.json` is in the repo root

## 🚀 Quick Fix Steps

1. **Vercel Dashboard → Project → Settings → General**
2. **Find "Root Directory" field**
3. **Clear it** (make it empty/blank)
4. **Save**
5. **Redeploy**

## ✅ Expected Result

After fix, you should see:
```
Installing dependencies...
✓ Dependencies installed
Running "npm run build"
✓ Compiled successfully
```

Instead of:
```
Error: No Next.js version detected
```

## 🔍 Verify package.json Location

Your `package.json` should be at the **root** of your Git repository:
```
your-repo/
├── package.json  ← Should be here
├── next.config.ts
├── app/
├── components/
└── ...
```

If it's in a subdirectory, set Root Directory to that subdirectory in Vercel.

---

**Most likely fix:** Clear the "Root Directory" setting in Vercel Dashboard! 🎯







