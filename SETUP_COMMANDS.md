# Project Setup Commands
## GST Invoice Generator - Quick Setup Guide

Copy and paste these commands in order:

---

## Step 1: Create and Navigate to Project Directory

```powershell
mkdir gst-invoice-generator
cd gst-invoice-generator
```

**OR** Create Next.js app directly in subdirectory (from webplanx root):

```powershell
npx create-next-app@latest gst-invoice-generator --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
cd gst-invoice-generator
```

---

## Step 2: Initialize Next.js Project (if using Step 1 method)

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

**Note:** The `--yes` flag auto-accepts all prompts. If you want to customize, remove `--yes` and answer prompts manually.

**When prompted:**
- ✅ Use TypeScript? **Yes**
- ✅ Use ESLint? **Yes**
- ✅ Use Tailwind CSS? **Yes**
- ✅ Use `src/` directory? **No**
- ✅ Use App Router? **Yes**
- ✅ Customize import alias? **Yes** → Use `@/*`

---

## Step 3: Install All Dependencies

```bash
npm install next@^15.1.0 react@^19.0.0 react-dom@^19.0.0 typescript@^5.7.0 tailwindcss@^3.4.17 autoprefixer@^10.4.20 postcss@^8.4.49 @radix-ui/react-dialog@^1.1.2 @radix-ui/react-progress@^1.1.0 @radix-ui/react-toast@^1.2.2 react-dropzone@^14.3.5 class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^2.5.5 lucide-react@^0.468.0 papaparse@^5.4.1 puppeteer@^23.11.0 jszip@^3.10.1 number-precision@^1.6.0 date-fns@^4.1.0
```

---

## Step 4: Install Dev Dependencies

```bash
npm install -D @types/node@^22.10.5 @types/react@^19.0.5 @types/react-dom@^19.0.2 @types/papaparse@^5.3.15 @types/puppeteer@^7.0.4 @types/jszip@^3.4.1 eslint@^9.17.0 eslint-config-next@^15.1.0 prettier@^3.4.2 prettier-plugin-tailwindcss@^0.6.9
```

---

## Step 5: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

**When prompted:**
- ✅ Which style would you like to use? **default**
- ✅ Which color would you like to use as base color? **slate**
- ✅ Where is your global CSS file? **app/globals.css**
- ✅ Would you like to use CSS variables for colors? **Yes**
- ✅ Where is your tailwind.config.js located? **tailwind.config.ts**
- ✅ Configure the import alias for components? **@/components**
- ✅ Configure the import alias for utils? **@/lib/utils**

---

## Step 6: Install shadcn/ui Components (Required)

```bash
npx shadcn@latest add dialog progress toast
```

---

## Step 7: Verify Installation

```bash
npm audit
```

```bash
npm run type-check
```

```bash
npm run lint
```

---

## Step 8: Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## Alternative: One-Line Install (All Dependencies)

If you prefer to install everything at once:

```bash
npm install next@^15.1.0 react@^19.0.0 react-dom@^19.0.0 typescript@^5.7.0 tailwindcss@^3.4.17 autoprefixer@^10.4.20 postcss@^8.4.49 @radix-ui/react-dialog@^1.1.2 @radix-ui/react-progress@^1.1.0 @radix-ui/react-toast@^1.2.2 react-dropzone@^14.3.5 class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^2.5.5 lucide-react@^0.468.0 papaparse@^5.4.1 puppeteer@^23.11.0 jszip@^3.10.1 number-precision@^1.6.0 date-fns@^4.1.0 @types/node@^22.10.5 @types/react@^19.0.5 @types/react-dom@^19.0.2 @types/papaparse@^5.3.15 @types/puppeteer@^7.0.4 @types/jszip@^3.4.1 eslint@^9.17.0 eslint-config-next@^15.1.0 prettier@^3.4.2 prettier-plugin-tailwindcss@^0.6.9
```

---

## ⚠️ Important Notes

- **DO NOT** use `--legacy-peer-deps` flag
- If you encounter peer dependency conflicts, update packages to compatible versions
- Ensure Node.js 20+ LTS is installed (`node --version`)
- All packages are latest stable and non-deprecated

---

## Troubleshooting

### If installation fails:
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again

### If peer dependency warnings appear:
- These are warnings, not errors
- The packages are compatible - you can proceed
- Do NOT use `--legacy-peer-deps`

---

**Ready to build! 🚀**

