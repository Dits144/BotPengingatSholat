const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "state.json");

const defaultState = {
  groups: {},
};

const ensureStorage = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState, null, 2));
  }
};

const loadState = () => {
  ensureStorage();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { ...defaultState };
  }
};

const saveState = (state) => {
  ensureStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
};

module.exports = {
  loadState,
  saveState,
};
