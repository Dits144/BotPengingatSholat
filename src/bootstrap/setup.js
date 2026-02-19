const fs = require('fs');

function runInitialSetup() {
  const folders = ['data', 'cache', 'auth', 'logs'];
  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      console.log(`[setup] Membuat folder: ${folder}`);
    }
  }
  console.log('[setup] Initial setup selesai.');
}

module.exports = { runInitialSetup };
