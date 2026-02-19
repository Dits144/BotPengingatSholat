const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '..', 'src');
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

function removeDir(target) {
  if (!fs.existsSync(target)) return;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) removeDir(fullPath);
    else fs.unlinkSync(fullPath);
  }
  fs.rmdirSync(target);
}

function copyDir(source, destination) {
  if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

try {
  console.log('[build] Cleaning dist...');
  removeDir(DIST_DIR);
  console.log('[build] Copying src -> dist...');
  copyDir(SRC_DIR, DIST_DIR);
  console.log('[build] Done.');
} catch (error) {
  console.error('[build] Failed:', error);
  process.exit(1);
}
