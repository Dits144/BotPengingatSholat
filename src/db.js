const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(
        {
          rentals: {},
          prayerStatus: {},
          pendingPrompts: {},
          scheduleCache: {},
          sentNotifications: {}
        },
        null,
        2
      )
    );
  }
}

function read() {
  ensure();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function write(db) {
  ensure();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function update(mutator) {
  const db = read();
  mutator(db);
  write(db);
  return db;
}

module.exports = { read, write, update, DB_PATH };
