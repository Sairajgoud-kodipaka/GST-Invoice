# Complete Tools & Dependencies List
## GST Invoice Generator - Standalone Next.js App

**Last Updated:** December 10, 2025  
**Build Strategy:** AI-Assisted Development (Vibecoding) - **Estimated Time: 1-1.5 weeks** ⚡

---

## ⚠️ Dependency Rules

**CRITICAL REQUIREMENTS:**
- ✅ **NO deprecated packages** - All dependencies must be actively maintained
- ✅ **NO legacy peer deps** - Do NOT use `--legacy-peer-deps` flag
- ✅ **Latest stable versions only** - All versions must be current and stable
- ✅ **Peer dependency compatibility** - All packages must have compatible peer dependencies

**Installation:**
```bash
npm install
# DO NOT use: npm install --legacy-peer-deps
```

If you encounter peer dependency conflicts, update packages to compatible versions rather than bypassing checks.

---

## 🚀 Speed Boost: AI-Assisted Development

**YES!** With AI-assisted coding (like Cursor AI), we can significantly speed up development:
- **Traditional:** 2-3 weeks
- **AI-Assisted:** **1-1.5 weeks** (40-60% faster)
- **Why:** AI generates boilerplate, handles repetitive tasks, suggests implementations

---

## 📦 Core Framework & Runtime

### Required
```json
{
  "next": "^15.1.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.7.0"
}
```

**Why:**
- **Next.js 15+**: Latest App Router, Server Components, API Routes, React 19 support
- **React 19**: Latest features, concurrent rendering, improved performance
- **TypeScript 5.7+**: Latest type safety, better DX, improved performance

---

## 🎨 UI & Styling Libraries

### Required
```json
{
  "tailwindcss": "^3.4.17",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.49",
  "@radix-ui/react-dialog": "^1.1.2",
  "@radix-ui/react-progress": "^1.1.0",
  "@radix-ui/react-toast": "^1.2.2",
  "react-dropzone": "^14.3.5",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.5",
  "lucide-react": "^0.468.0"
}
```

**Why:**
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible, unstyled components (shadcn/ui base)
- **Lucide React**: Modern icon library
- **CVA + clsx + tailwind-merge**: Component variant management

### Optional (Enhanced UI)
```json
{
  "framer-motion": "^11.15.0"
}
```

**Why:**
- **Framer Motion**: Smooth animations

---

## 📄 CSV Processing

### Required
```json
{
  "papaparse": "^5.4.1",
  "@types/papaparse": "^5.3.15"
}
```

**Why:**
- **PapaParse**: Fast, reliable CSV parsing
- Handles large files (100+ orders)
- TypeScript support

---

## 📑 PDF Generation

### **RECOMMENDED: Server-Side (Puppeteer)**
```json
{
  "puppeteer": "^23.11.0",
  "@types/puppeteer": "^7.0.4"
}
```

**Why Puppeteer:**
- ✅ **Best quality**: Renders HTML exactly as browser
- ✅ **Print-ready**: 300 DPI support
- ✅ **Template matching**: Pixel-perfect invoice layout
- ✅ **Server-side**: No client performance impact
- ⚠️ **Note**: Requires Node.js server (Vercel/Netlify support)

### Alternative: Client-Side (jsPDF)
```json
{
  "jspdf": "^2.5.2",
  "html2canvas": "^1.4.1"
}
```

**Why jsPDF (if needed):**
- ✅ **Client-side**: No server required
- ✅ **Smaller bundle**: Lighter than Puppeteer
- ⚠️ **Limitation**: Lower quality, harder to match template exactly

**RECOMMENDATION:** Use **Puppeteer** for production quality.

---

## 🗜️ ZIP File Generation (Batch Downloads)

### Required
```json
{
  "jszip": "^3.10.1",
  "@types/jszip": "^3.4.1"
}
```

**Why:**
- Generate ZIP files for batch invoice downloads
- Client-side processing (no server needed)

---

## 🔢 Number & Currency Formatting

### Required
```json
{
  "number-precision": "^1.6.0"
}
```

**Why:**
- **Critical**: Exact GST calculations (no rounding errors)
- Handles decimal precision (2 decimal places)
- Prevents floating-point errors

### Alternative
```json
{
  "decimal.js": "^10.4.5"
}
```

**Why:**
- More robust for financial calculations
- Better precision control

---

## 📅 Date Formatting

### Required
```json
{
  "date-fns": "^4.1.0"
}
```

**Why:**
- Format invoice dates, order dates
- Lightweight, tree-shakeable
- TypeScript support

---

## 🛠️ Development Dependencies

### Required
```json
{
  "@types/node": "^22.10.5",
  "@types/react": "^19.0.5",
  "@types/react-dom": "^19.0.2",
  "eslint": "^9.17.0",
  "eslint-config-next": "^15.1.0",
  "prettier": "^3.4.2",
  "prettier-plugin-tailwindcss": "^0.6.9"
}
```

**Why:**
- TypeScript types
- Code quality (ESLint)
- Code formatting (Prettier)

### Testing (Optional but Recommended)
```json
{
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.3",
  "jest": "^30.1.0",
  "jest-environment-jsdom": "^30.1.0"
}
```

**Why:**
- Unit tests for GST calculations
- Component testing
- Integration tests

---

## 📋 Complete package.json Template

```json
{
  "name": "gst-invoice-generator",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.2",
    "react-dropzone": "^14.3.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "lucide-react": "^0.468.0",
    "papaparse": "^5.4.1",
    "puppeteer": "^23.11.0",
    "jszip": "^3.10.1",
    "number-precision": "^1.6.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.5",
    "@types/react-dom": "^19.0.2",
    "@types/papaparse": "^5.3.15",
    "@types/puppeteer": "^7.0.4",
    "@types/jszip": "^3.4.1",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.0",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.9"
  }
}
```

---

## 🏗️ Project Structure

```
gst-invoice-generator/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── api/
│   │   └── generate-pdf/
│   │       └── route.ts          # Puppeteer PDF generation
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── csv-uploader.tsx
│   │   ├── data-preview.tsx
│   │   └── invoice-preview.tsx
│   ├── lib/
│   │   ├── csv-parser.ts
│   │   ├── gst-calculator.ts     # CRITICAL: GST logic
│   │   ├── invoice-generator.ts
│   │   └── utils.ts
│   └── templates/
│       └── invoice-template.tsx   # Invoice HTML template
├── public/
│   └── logo.png                   # Business logo
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 🔧 Configuration Files Needed

### 1. `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 2. `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
```

### 3. `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For large CSV files
    },
  },
}

module.exports = nextConfig
```

---

## 🌐 Deployment Considerations

### Vercel (Recommended)
- ✅ **Zero config**: Automatic Next.js optimization
- ✅ **Puppeteer support**: Serverless functions
- ✅ **Free tier**: Good for MVP
- ⚠️ **Note**: May need to configure Puppeteer for serverless

### Netlify
- ✅ **Easy deployment**: Git-based
- ✅ **Serverless functions**: Support Puppeteer
- ⚠️ **Note**: May need custom build settings

### Self-Hosted
- ✅ **Full control**: VPS/Server
- ✅ **No limitations**: Full Puppeteer support
- ⚠️ **Note**: Requires server management

---

## ✅ Pre-Build Checklist

- [ ] Node.js 20+ LTS installed (recommended: Node.js 22 LTS)
- [ ] Git repository initialized
- [ ] All dependencies installed (`npm install` - **DO NOT use `--legacy-peer-deps`**)
- [ ] TypeScript configured
- [ ] Tailwind CSS configured
- [ ] shadcn/ui initialized (`npx shadcn-ui@latest init`)
- [ ] Business logo added to `/public`
- [ ] Invoice template reference available (for pixel-perfect matching)

---

## 🎯 Critical Dependencies Summary

### Must Have (Core Functionality)
1. ✅ **Next.js 15+** - Framework (latest stable)
2. ✅ **React 19** - UI library (latest stable)
3. ✅ **TypeScript 5.7+** - Type safety (latest stable)
4. ✅ **Tailwind CSS 3.4+** - Styling (latest stable)
5. ✅ **PapaParse** - CSV parsing
6. ✅ **Puppeteer 23+** - PDF generation (latest stable)
7. ✅ **number-precision** - Exact GST calculations
8. ✅ **jszip** - Batch downloads

### Should Have (UX)
1. ✅ **shadcn/ui** - UI components
2. ✅ **date-fns** - Date formatting
3. ✅ **lucide-react** - Icons

### Nice to Have (Enhancements)
1. ⚪ **Framer Motion** - Animations
2. ⚪ **Testing libraries** - Quality assurance

---

## 🚨 Important Notes

1. **NO Legacy Peer Dependencies**: Never use `--legacy-peer-deps`. All packages are selected for compatibility.

2. **NO Deprecated Packages**: All dependencies are actively maintained and non-deprecated.

3. **Puppeteer Size**: ~300MB download (Chromium). Consider using `puppeteer-core` with external Chrome for production.

4. **State Management**: No Redux/Zustand needed - React state + Context API sufficient for standalone app.

5. **No Database**: All processing in-memory. No Prisma/PostgreSQL needed.

6. **No Authentication**: Standalone app - no Auth0/NextAuth needed.

7. **File Storage**: No AWS S3/Cloudinary needed - files processed and deleted immediately.

8. **Version Updates**: Regularly check for updates using `npm outdated` and update to latest stable versions.

---

## 📊 Estimated Build Time with AI-Assisted Development

| Task | Traditional | AI-Assisted |
|------|------------|-------------|
| Project Setup | 4-6 hours | 1-2 hours |
| CSV Upload Module | 12-16 hours | 4-6 hours |
| Invoice Template | 30-40 hours | 12-18 hours |
| PDF Generation | 16-20 hours | 6-8 hours |
| Testing & Polish | 20-24 hours | 8-12 hours |
| **TOTAL** | **80-120 hours** | **35-50 hours** |

**Result: 1-1.5 weeks instead of 2-3 weeks!** ⚡

---

## 🎬 Next Steps

1. Initialize Next.js project: `npx create-next-app@latest`
2. Install all dependencies: `npm install` (**DO NOT use `--legacy-peer-deps`**)
3. Set up shadcn/ui: `npx shadcn-ui@latest init`
4. Verify no deprecated packages: `npm audit`
5. Start building with AI assistance!

---

**Ready to build? Let's start! 🚀**

