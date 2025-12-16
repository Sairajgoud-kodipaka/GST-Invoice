const fs = require('fs');
const path = require('path');

// Copy static files to standalone output
const standalonePath = path.join(__dirname, '../.next/standalone');
const staticPath = path.join(__dirname, '../.next/static');
const standaloneStaticPath = path.join(standalonePath, '.next/static');

// Create .next directory in standalone if it doesn't exist
const standaloneNextPath = path.join(standalonePath, '.next');
if (!fs.existsSync(standaloneNextPath)) {
  fs.mkdirSync(standaloneNextPath, { recursive: true });
}

// Copy static files
if (fs.existsSync(staticPath)) {
  if (fs.existsSync(standaloneStaticPath)) {
    fs.rmSync(standaloneStaticPath, { recursive: true, force: true });
  }
  fs.cpSync(staticPath, standaloneStaticPath, { recursive: true });
  console.log('✓ Copied static files to standalone output');
} else {
  console.warn('⚠ Static files not found, skipping copy');
}

// Copy public files to standalone
const publicPath = path.join(__dirname, '../public');
const standalonePublicPath = path.join(standalonePath, 'public');

if (fs.existsSync(publicPath)) {
  if (fs.existsSync(standalonePublicPath)) {
    fs.rmSync(standalonePublicPath, { recursive: true, force: true });
  }
  fs.cpSync(publicPath, standalonePublicPath, { recursive: true });
  console.log('✓ Copied public files to standalone output');
}

console.log('✓ Standalone build preparation complete');








