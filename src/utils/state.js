"use strict";

const fs = require("fs");
const path = require("path");

const STATE_PATH = path.join(__dirname, "../../data/state.json");
const TEMP_PATH = STATE_PATH + ".tmp";

const DEFAULTS = {
  nextRestStart: 0,
  nextRestEnd: 0,
  restType: "break",
  balance: 0,
  ownedRods: ["Plastic Rod"],
  currentRod: "Plastic Rod",
  ownedBoats: ["Rowboat"],
  currentBoat: "Rowboat",
  sleepMs: 3200,
  clicks: 0,
  sellThreshold: 20,
  applicationId: "574652751745777665",
  cashPerClick: 0,
  totalSpending: 0,
  lastSellBalance: 0,
  boostsExpiry: 0,
  selectedAction: 0,
};

function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      saveState(DEFAULTS);
      return { ...DEFAULTS };
    }
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    if (!raw.trim()) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch (err) {
    console.error(
      "[StateManager] Failed to load state, using defaults:",
      err.message,
    );
    return { ...DEFAULTS };
  }
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TEMP_PATH, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(TEMP_PATH, STATE_PATH);
  } catch (err) {
    console.error("[StateManager] Failed to save state:", err.message);
  }
}

function updateState(updateFn) {
  const state = loadState();
  updateFn(state);
  saveState(state);
  return state;
}

module.exports = {
  loadState,
  saveState,
  updateState,
};
