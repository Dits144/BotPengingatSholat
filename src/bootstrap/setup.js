const fs = require('fs');

function ensureDir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
    console.log(`[setup] Folder dibuat: ${path}`);
  }
}

function runInitialSetup() {
  ensureDir('data');
  ensureDir('cache');
  ensureDir('auth');
  ensureDir('logs');
  console.log('[setup] Initial setup selesai.');
}

module.exports = { runInitialSetup };
