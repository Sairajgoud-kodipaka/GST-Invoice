const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
const PORT = 3000;

function createWindow() {
  // Get icon path - handle both dev and packaged environments
  let iconPath;
  const fs = require('fs');
  if (app.isPackaged) {
    // In packaged app, public files are in resources/app/public
    iconPath = path.join(process.resourcesPath, 'app', 'public', 'app-icon.ico');
    // Fallback to png if ico doesn't exist
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.resourcesPath, 'app', 'public', 'logo-Photoroom.png');
    }
    // Final fallback to jpg
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.resourcesPath, 'app', 'public', 'logo.jpg');
    }
  } else {
    iconPath = path.join(__dirname, '../public/app-icon.ico');
    // Fallback to png if ico doesn't exist
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../public/logo-Photoroom.png');
    }
    // Final fallback to jpg
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../public/logo.jpg');
    }
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: iconPath,
    show: false,
    titleBarStyle: 'default',
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start Next.js server
  startNextServer();
}

// Removed findNodeExecutable - no longer needed since we run server in-process

function startNextServer() {
  if (isDev) {
    // In development, connect to existing Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    return;
  }

  // In production, run Next.js server directly in Electron's Node.js runtime
  // This way we don't need a separate Node.js installation
  const fs = require('fs');
  let appPath;
  let nextPath;
  let serverPath;
  
  try {
    if (app.isPackaged) {
      // In packaged app, files are in resources/app.asar or resources/app.asar.unpacked
      // electron-builder unpacks .next/standalone (due to asarUnpack), so it's in app.asar.unpacked
      appPath = process.resourcesPath;
      
      // Try possible locations in order of likelihood
      const possiblePaths = [
        // Most likely: extraResources (outside asar, in resources directory)
        path.join(appPath, '.next', 'standalone'),
        // Alternative: unpacked standalone directory (if asarUnpack worked)
        path.join(appPath, 'app.asar.unpacked', '.next', 'standalone'),
        // Alternative: if not unpacked, might be in app directory
        path.join(appPath, 'app', '.next', 'standalone'),
        // Fallback: relative to electron main.js
        path.join(__dirname, '..', '.next', 'standalone'),
      ];
      
      // Find the first existing path
      let found = false;
      for (const possiblePath of possiblePaths) {
        const testServerPath = path.join(possiblePath, 'server.js');
        if (fs.existsSync(testServerPath)) {
          nextPath = possiblePath;
          serverPath = testServerPath;
          console.log('Found Next.js server at:', serverPath);
          found = true;
          break;
        } else {
          console.log('Checked path (not found):', testServerPath);
        }
      }
      
      if (!found) {
        // Log all checked paths for debugging
        console.error('Available directories in resourcesPath:');
        try {
          const dirs = fs.readdirSync(appPath);
          console.error('Directories:', dirs);
        } catch (e) {
          console.error('Could not read resourcesPath:', e.message);
        }
        throw new Error(`Could not find Next.js server. Tried paths:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}`);
      }
    } else {
      // In development build (not packaged, but production mode)
      appPath = app.getAppPath();
      nextPath = path.join(appPath, '.next', 'standalone');
      serverPath = path.join(nextPath, 'server.js');
    }
    
    // Verify server.js exists
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server file not found at: ${serverPath}`);
    }
    
    // Verify node_modules exists in standalone directory
    const standaloneNodeModules = path.join(nextPath, 'node_modules');
    if (!fs.existsSync(standaloneNodeModules)) {
      throw new Error(`node_modules not found in standalone directory: ${standaloneNodeModules}`);
    }
    
    // Verify next module exists
    const nextModulePath = path.join(standaloneNodeModules, 'next');
    if (!fs.existsSync(nextModulePath)) {
      throw new Error(`next module not found at: ${nextModulePath}`);
    }
    console.log('Verified next module exists at:', nextModulePath);
    
    // Set environment variables for Next.js
    process.env.PORT = PORT.toString();
    process.env.HOSTNAME = 'localhost';
    process.env.NEXT_PUBLIC_BASE_PATH = '';
    process.env.NODE_ENV = 'production';
    
    // Set NODE_PATH to include the standalone's node_modules for module resolution
    const existingNodePath = process.env.NODE_PATH || '';
    process.env.NODE_PATH = existingNodePath 
      ? `${standaloneNodeModules}${path.delimiter}${existingNodePath}`
      : standaloneNodeModules;
    
    // Ensure Node.js can resolve modules from the standalone directory
    // Add the standalone directory to module.paths
    if (!module.paths.includes(standaloneNodeModules)) {
      module.paths.unshift(standaloneNodeModules);
    }
    if (!module.paths.includes(nextPath)) {
      module.paths.unshift(nextPath);
    }

    // Change to the Next.js standalone directory BEFORE setting up module paths
    // This ensures Node.js looks for modules relative to the standalone directory
    process.chdir(nextPath);
    console.log('Changed working directory to:', nextPath);
    
    // Verify we can resolve 'next' from the current location
    try {
      const testNextPath = require.resolve('next', { paths: [standaloneNodeModules] });
      console.log('Successfully resolved next module at:', testNextPath);
    } catch (testError) {
      console.warn('Warning: Could not pre-resolve next module:', testError.message);
      console.log('Will attempt to require server.js anyway - module resolution should work from cwd');
    }
    
    console.log('NODE_PATH set to:', process.env.NODE_PATH);
    console.log('Module paths (first 5):', module.paths.slice(0, 5).join(', '));

    // Run the Next.js server directly in the current Node.js process (Electron's runtime)
    // This eliminates the need for a separate Node.js installation
    // Clear the module cache to ensure fresh load
    if (require.cache[serverPath]) {
      delete require.cache[serverPath];
    }
    
    // Require and run the Next.js server directly
    // The server.js file will start the HTTP server in this process
    // Since we've changed to the standalone directory, require() should resolve
    // modules from ./node_modules relative to the current working directory
    console.log('Loading Next.js server from:', serverPath);
    try {
      require(serverPath);
    } catch (requireError) {
      // If require fails, provide detailed error information
      console.error('Failed to require server.js:', requireError);
      console.error('Error message:', requireError.message);
      console.error('Error stack:', requireError.stack);
      console.error('Current working directory:', process.cwd());
      console.error('Server path:', serverPath);
      console.error('Node modules path:', standaloneNodeModules);
      console.error('Module search paths:', module.paths.slice(0, 5));
      
      // Check if next module is actually accessible
      const nextPackageJson = path.join(standaloneNodeModules, 'next', 'package.json');
      if (fs.existsSync(nextPackageJson)) {
        console.error('next/package.json exists at:', nextPackageJson);
        const nextPkg = JSON.parse(fs.readFileSync(nextPackageJson, 'utf8'));
        console.error('next version:', nextPkg.version);
      } else {
        console.error('next/package.json NOT found at:', nextPackageJson);
      }
      
      throw new Error(`Failed to load Next.js server: ${requireError.message}\n\n` +
        `This usually means the 'next' module cannot be found.\n` +
        `Server path: ${serverPath}\n` +
        `Working directory: ${process.cwd()}\n` +
        `Node modules: ${standaloneNodeModules}\n` +
        `Please check that the standalone build includes all dependencies.`);
    }
    
    console.log('Next.js server starting in Electron process...');
    
    // Wait for server to be ready
    let attempts = 0;
    const maxAttempts = 30; // Increased timeout
    const checkServer = setInterval(() => {
      attempts++;
      const req = http.get(`http://localhost:${PORT}`, (res) => {
        clearInterval(checkServer);
        console.log('Next.js server is ready!');
        mainWindow.loadURL(`http://localhost:${PORT}`);
      });
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          clearInterval(checkServer);
          console.error('Failed to start Next.js server after', attempts, 'attempts');
          console.error('Error:', err.message);
          const { dialog } = require('electron');
          dialog.showErrorBox(
            'Server Start Error',
            `Failed to start the application server after ${attempts} attempts.\n\n` +
            `Error: ${err.message}\n\n` +
            `Server path: ${serverPath}\n` +
            `Working directory: ${nextPath}\n\n` +
            'Please check the console for more details.'
          );
        }
      });
      req.end();
    }, 500);
  } catch (error) {
    console.error('Error starting Next.js server:', error);
    console.error('Stack:', error.stack);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start the application:\n\n${error.message}\n\n` +
      `Path: ${serverPath || 'unknown'}\n\n` +
      'Please check the console for more details.'
    );
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

