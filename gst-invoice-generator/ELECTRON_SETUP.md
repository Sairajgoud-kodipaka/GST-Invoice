# Electron Setup Guide

This guide explains how to build and distribute the GST Invoice Generator as a Windows desktop application.

## Prerequisites

1. Node.js (v18 or higher)
2. npm or yarn
3. Windows 10/11 (for building Windows installers)

## Installation

1. Install dependencies:
```bash
npm install
```

This will install:
- `electron` - The Electron framework
- `electron-builder` - For packaging and creating installers
- `cross-env` - For cross-platform environment variables

## Development

To run the app in development mode:

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Electron (in a new terminal)
npm run electron:dev
```

## Building for Production

### Step 1: Build Next.js Application

The Next.js app is configured to output a standalone build that includes all dependencies:

```bash
npm run build
```

This creates a `.next/standalone` directory with the server files.

### Step 2: Build Electron Application

#### Build Windows Installer (.exe with installer wizard):

```bash
npm run electron:build:win
```

This will:
1. Build the Next.js application
2. Package it with Electron
3. Create a Windows installer (.exe) in the `dist-electron` directory

The installer includes:
- Windows installation wizard
- Desktop shortcut option
- Start menu shortcut
- Uninstaller
- Custom installation directory selection

#### Build without installer (for testing):

```bash
npm run electron:pack
```

This creates an unpacked version in `dist-electron` without creating an installer.

## Output Files

After building, you'll find:

- **Windows Installer**: `dist-electron/GST Invoice Generator Setup 0.1.0.exe`
- **Unpacked App**: `dist-electron/win-unpacked/` (if using `electron:pack`)

## Configuration

### Electron Configuration

The Electron main process is in `electron/main.js`. It:
- Starts the Next.js server in production mode
- Creates the Electron window
- Handles app lifecycle events

### Build Configuration

Build settings are in `package.json` under the `build` section:
- App ID: `com.webplanx.gst-invoice-generator`
- Product Name: GST Invoice Generator
- Windows target: NSIS installer (x64)
- Custom installer options in `installer.nsh`

### Customizing the Installer

Edit `installer.nsh` to customize:
- Installer text
- Welcome page
- Finish page
- Additional installer behavior

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, the Electron app will fail to start. You can:
1. Change the PORT in `electron/main.js`
2. Close other applications using port 3000

### Build Fails

1. Ensure Next.js build completes successfully first
2. Check that `.next/standalone` directory exists
3. Verify all dependencies are installed
4. Check Windows Defender or antivirus isn't blocking the build

### App Won't Start

1. Check the console for errors
2. Verify the Next.js server starts correctly
3. Check that all static files are included in the build

## Distribution

The generated installer (`GST Invoice Generator Setup 0.1.0.exe`) can be distributed to end users. They can:
1. Download the installer
2. Run it to install the application
3. Launch from desktop shortcut or Start menu
4. Uninstall via Windows Settings or Control Panel

## Code Signing (Optional)

For production distribution, you may want to code sign the application. Add to `package.json` build config:

```json
"win": {
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "password"
}
```

## Notes

- The app runs a local Next.js server on `localhost:3000`
- All data is stored locally (no external server required)
- The app works offline after installation








