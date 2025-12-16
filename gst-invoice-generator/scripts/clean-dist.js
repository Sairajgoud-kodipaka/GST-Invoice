const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist-electron');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteFolderRecursive(folderPath, retries = 3) {
  if (!fs.existsSync(folderPath)) {
    return true;
  }

  for (let i = 0; i < retries; i++) {
    try {
      // Try to rename first to break file locks
      const renamedPath = folderPath + '_old_' + Date.now();
      try {
        if (fs.existsSync(folderPath)) {
          fs.renameSync(folderPath, renamedPath);
          folderPath = renamedPath;
        }
      } catch (e) {
        // If rename fails, continue with original path
      }

      // Wait a bit for file handles to release
      await sleep(500);

      if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
          const curPath = path.join(folderPath, file);
          try {
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteFolderRecursive(curPath, 1);
            } else {
              fs.unlinkSync(curPath);
            }
          } catch (e) {
            // Ignore errors, will retry
          }
        });
        
        try {
          fs.rmdirSync(folderPath);
          return true;
        } catch (e) {
          if (i < retries - 1) {
            await sleep(1000);
            continue;
          }
        }
      } else {
        return true;
      }
    } catch (e) {
      if (i < retries - 1) {
        await sleep(1000);
        continue;
      }
      console.warn(`Could not delete ${folderPath}: ${e.message}`);
    }
  }
  return false;
}

async function main() {
  console.log('Cleaning dist-electron folder...');
  const winUnpackedPath = path.join(distPath, 'win-unpacked');
  
  // Try to delete win-unpacked specifically first
  if (fs.existsSync(winUnpackedPath)) {
    await deleteFolderRecursive(winUnpackedPath, 5);
  }
  
  // Then clean the rest
  await deleteFolderRecursive(distPath, 3);
  console.log('Cleanup complete.');
}

main().catch(console.error);

