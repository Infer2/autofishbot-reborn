"use strict";

const logBuffer = [];
const MAX_LOGS = 30;

function addLog(type, args) {
  const msg = args
    .map((arg) => {
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ");

  const lines = msg
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cleanLine = line.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      "",
    );
    let prefix = "";
    if (type === "error") {
      prefix = "\x1B[1;31m[!] \x1B[0m";
    } else if (type === "warn") {
      prefix = "\x1B[1;33m[!] \x1B[0m";
    }
    logBuffer.push(`${prefix}${cleanLine}`);
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.shift();
    }
  }
}

if (!global.originalConsole) {
  global.originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };
} else {
  console.log = global.originalConsole.log;
  console.error = global.originalConsole.error;
  console.warn = global.originalConsole.warn;
}

console.log = function (...args) {
  addLog("log", args);
  const { drawTUI } = require("./tuiRenderer");
  drawTUI();
};
console.error = function (...args) {
  addLog("error", args);
  const { drawTUI } = require("./tuiRenderer");
  drawTUI();
};
console.warn = function (...args) {
  addLog("warn", args);
  const { drawTUI } = require("./tuiRenderer");
  drawTUI();
};

module.exports = {
  logBuffer,
  MAX_LOGS,
};
