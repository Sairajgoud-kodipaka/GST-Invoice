# Quick Build Guide

## Building Windows Installer (.exe)

### Option 1: Using Batch Script (Windows)

Simply double-click or run:
```bash
build-windows.bat
```

This will:
1. Install all dependencies
2. Build the Next.js application
3. Create the Windows installer

### Option 2: Using npm commands

```bash
# Install dependencies (first time only)
npm install

# Build the Windows installer
npm run electron:build:win
```

## Output

After building, you'll find the installer at:
```
dist-electron/GST Invoice Generator Setup 0.1.0.exe
```

## Testing the App (Before Building Installer)

To test the Electron app without creating an installer:

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

## Requirements

- Node.js 18+ installed
- Windows 10/11
- At least 2GB free disk space

## Troubleshooting

### "npm: command not found"
Install Node.js from https://nodejs.org/

### Build fails with "port already in use"
Close any applications using port 3000, or modify the PORT in `electron/main.js`

### "electron-builder: command not found"
Run `npm install` to install all dependencies








