const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting build process with retry mechanism...\n');

  // Step 1: Clean dist folder
  console.log('Step 1: Cleaning dist-electron folder...');
  try {
    require('./clean-dist.js');
    await sleep(2000); // Wait for file handles to release
  } catch (e) {
    console.warn('Cleanup had some issues, continuing...');
  }

  // Step 2: Build Next.js
  console.log('\nStep 2: Building Next.js application...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (e) {
    console.error('Next.js build failed!');
    process.exit(1);
  }

  // Step 3: Copy standalone files
  console.log('\nStep 3: Copying standalone files...');
  try {
    require('./copy-standalone.js');
  } catch (e) {
    console.error('Copy standalone failed!');
    process.exit(1);
  }

  // Step 4: Build Electron (with retry)
  console.log('\nStep 4: Building Electron installer...');
  const retries = 3;
  let success = false;

  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.log(`\nRetry attempt ${i}...`);
        // Wait and clean again
        await sleep(5000);
        console.log('Cleaning before retry...');
        require('./clean-dist.js');
        await sleep(2000);
      }
      
      execSync('electron-builder --win', { stdio: 'inherit' });
      success = true;
      break;
    } catch (e) {
      console.error(`\nBuild attempt ${i + 1} failed.`);
      if (i < retries - 1) {
        console.log('Waiting 5 seconds before retry...');
        await sleep(5000);
        
        // Try to clean the problematic folder
        const distPath = path.join(__dirname, '..', 'dist-electron', 'win-unpacked');
        try {
          if (fs.existsSync(distPath)) {
            console.log('Attempting to remove locked folder...');
            // Rename it first to break the lock
            const renamedPath = distPath + '_old_' + Date.now();
            try {
              fs.renameSync(distPath, renamedPath);
              console.log('Renamed locked folder, will delete after delay...');
            } catch (renameErr) {
              console.warn('Could not rename folder:', renameErr.message);
            }
          }
        } catch (cleanErr) {
          // Ignore cleanup errors
        }
      } else {
        console.error('\n❌ Build failed after all retries.');
        console.error('\n📋 Possible solutions:');
        console.error('1. Add dist-electron folder to Windows Defender exclusions:');
        console.error('   - Open Windows Security → Virus & threat protection');
        console.error('   - Manage settings → Exclusions → Add folder');
        console.error('   - Add: D:\\webplanx\\gst-invoice-generator\\dist-electron');
        console.error('\n2. Temporarily disable antivirus real-time protection');
        console.error('\n3. Close any file explorer windows in dist-electron folder');
        console.error('\n4. Wait 10-15 seconds, manually delete dist-electron/win-unpacked, then run again');
        console.error('\n5. Try building in a different directory (modify output in package.json)');
        process.exit(1);
      }
    }
  }

  if (success) {
    console.log('\n✅ Build completed successfully!');
    console.log('📦 Installer location: dist-electron/GST Invoice Generator Setup 0.1.0.exe');
    console.log('\n💡 To install on another PC:');
    console.log('   1. Copy the .exe file to the target PC');
    console.log('   2. Run the installer');
    console.log('   3. Follow the installation wizard');
  }
}

main().catch(console.error);
