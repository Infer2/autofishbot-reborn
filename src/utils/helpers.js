"use strict";

const { EventEmitter } = require("events");
const readline = require("readline");

const signal = global.botSignal || new EventEmitter();
if (!global.botSignal) {
  global.botSignal = signal;
}
signal.setMaxListeners(100);

let stdinReady = false;

function setupStdin() {
  if (stdinReady) return;
  stdinReady = true;

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  process.stdin.removeAllListeners("keypress");

  process.stdin.on("keypress", (str, key) => {
    if (!key) return;

    if (key.ctrl && key.name === "c") {
      process.exit(0);
    }

    const { loadState, updateState } = require("./state");
    const { drawTUI } = require("./tui");
    const state = loadState();
    let current = state.selectedAction || 0;

    if (key.name === "left" || key.name === "up") {
      current = (current - 1 + 3) % 3;
      updateState((s) => {
        s.selectedAction = current;
      });
      drawTUI();
    } else if (key.name === "right" || key.name === "down") {
      current = (current + 1) % 3;
      updateState((s) => {
        s.selectedAction = current;
      });
      drawTUI();
    } else if (key.name === "return" || key.name === "enter") {
      if (current === 0) {
        console.log('\n[Signal] ▶  "continue" action triggered.\n');
        signal.emit("continue");
      } else if (current === 1) {
        console.log(
          '\n[Signal] 🔄  "restart" action triggered — rebooting bot...\n',
        );
        signal.emit("restart");
      } else if (current === 2) {
        console.log(
          '\n[Signal] 🛑  "kill" action triggered — shutting down process immediately.\n',
        );
        process.exit(0);
      }
    }
  });
}

function interruptibleSleep(ms) {
  return new Promise((resolve) => {
    let timer;

    function onContinue() {
      clearTimeout(timer);
      resolve(true);
    }

    timer = setTimeout(() => {
      signal.removeListener("continue", onContinue);
      resolve(false);
    }, ms);

    signal.once("continue", onContinue);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

const CHANCE_MIN = 0.15;
const CHANCE_MAX = 0.45;
const DELAY_MIN_MS = 200;
const DELAY_MAX_MS = 2800;

async function maybeHumanDelay() {
  const threshold = CHANCE_MIN + Math.random() * (CHANCE_MAX - CHANCE_MIN);
  if (Math.random() > threshold) return;

  const ms = randomBetween(DELAY_MIN_MS, DELAY_MAX_MS);
  console.log(`[HumanDelay] ⏱  Micro-delay: ${ms} ms`);
  await interruptibleSleep(ms);
}

function isNetworkError(err) {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code;
  return (
    msg.includes("fetch failed") ||
    msg.includes("enotfound") ||
    msg.includes("etimedout") ||
    msg.includes("eai_again") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up") ||
    msg.includes("timeout") ||
    msg.includes("abort") ||
    msg.includes("network") ||
    msg.includes("disconnected") ||
    msg.includes("session_id") ||
    msg.includes("invalid form body") ||
    code === 50035
  );
}

module.exports = {
  signal,
  setupStdin,
  interruptibleSleep,
  sleep,
  randomBetween,
  weightedPick,
  maybeHumanDelay,
  isNetworkError,
};
