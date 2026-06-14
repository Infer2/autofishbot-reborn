"use strict";

const { loadState } = require("../state");
const { getNextUpgradeDetails } = require("../economy");
const { SLEEP_MS } = require("../../config");
const { logBuffer, MAX_LOGS } = require("./consoleHook");

process.stdout.write("\x1Bc");

function getVisibleLength(str) {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    "",
  ).length;
}

function centerText(text, width) {
  const len = getVisibleLength(text);
  if (len >= width) {
    let visibleCount = 0;
    let physicalIdx = 0;
    let inEscape = false;
    while (visibleCount < width && physicalIdx < text.length) {
      if (text[physicalIdx] === "\x1B") {
        inEscape = true;
      }
      if (!inEscape) {
        visibleCount++;
      }
      if (inEscape && text[physicalIdx] === "m") {
        inEscape = false;
      }
      physicalIdx++;
    }
    return text.substring(0, physicalIdx) + "\x1B[0m";
  }
  const left = Math.floor((width - len) / 2);
  const right = width - len - left;
  return " ".repeat(left) + text + " ".repeat(right);
}

function padText(text, width) {
  const len = getVisibleLength(text);
  if (len >= width) {
    let visibleCount = 0;
    let physicalIdx = 0;
    let inEscape = false;
    while (visibleCount < width && physicalIdx < text.length) {
      if (text[physicalIdx] === "\x1B") {
        inEscape = true;
      }
      if (!inEscape) {
        visibleCount++;
      }
      if (inEscape && text[physicalIdx] === "m") {
        inEscape = false;
      }
      physicalIdx++;
    }
    return text.substring(0, physicalIdx) + "\x1B[0m";
  }
  return text + " ".repeat(width - len);
}

function drawTUI() {
  const state = loadState();
  const width = 60;

  let out = [];

  out.push("\x1B[2J\x1B[H");

  out.push("\x1B[1;36m┌" + "─".repeat(width - 2) + "┐\x1B[0m");
  out.push(
    "\x1B[1;36m│\x1B[0m" +
      centerText("\x1B[1;36m🎣 VIRTUAL FISHER AUTO-BOT\x1B[0m", width - 2) +
      "\x1B[1;36m│\x1B[0m",
  );
  out.push("\x1B[1;36m└" + "─".repeat(width - 2) + "┘\x1B[0m");

  let botStatus = "\x1B[1;32mACTIVE\x1B[0m";
  const now = Date.now();
  if (
    state.nextRestStart &&
    state.nextRestEnd &&
    now >= state.nextRestStart &&
    now <= state.nextRestEnd
  ) {
    botStatus = `\x1B[1;33mRESTING (${state.restType || "break"})\x1B[0m`;
  }
  const currentSleep = state.sleepMs || SLEEP_MS;

  let boostStatus = "\x1B[1;30mNone\x1B[0m";
  if (state.boostsExpiry && now < state.boostsExpiry) {
    const diffSec = Math.ceil((state.boostsExpiry - now) / 1000);
    const min = Math.floor(diffSec / 60);
    const sec = diffSec % 60;
    boostStatus = `\x1B[1;32mActive (${min}m ${sec}s)\x1B[0m`;
  }

  out.push(
    "\x1B[1;34m┌" +
      "─".repeat(16) +
      " Status " +
      "─".repeat(width - 26) +
      "┐\x1B[0m",
  );
  out.push(
    "\x1B[1;34m│\x1B[0m" +
      padText(` • Status:   ${botStatus}`, width - 2) +
      "\x1B[1;34m│\x1B[0m",
  );
  out.push(
    "\x1B[1;34m│\x1B[0m" +
      padText(` • Cooldown: ${(currentSleep / 1000).toFixed(1)}s`, width - 2) +
      "\x1B[1;34m│\x1B[0m",
  );
  out.push(
    "\x1B[1;34m│\x1B[0m" +
      padText(` • Boosts:   ${boostStatus}`, width - 2) +
      "\x1B[1;34m│\x1B[0m",
  );
  if (state.nextRestStart && state.nextRestStart > now) {
    const diffMin = Math.round((state.nextRestStart - now) / 60000);
    out.push(
      "\x1B[1;34m│\x1B[0m" +
        padText(
          ` • Next Rest: in ${diffMin}m (${state.restType || "break"})`,
          width - 2,
        ) +
        "\x1B[1;34m│\x1B[0m",
    );
  }
  out.push("\x1B[1;34m└" + "─".repeat(width - 2) + "┘\x1B[0m");

  out.push(
    "\x1B[1;35m┌" +
      "─".repeat(18) +
      " Gear " +
      "─".repeat(width - 26) +
      "┐\x1B[0m",
  );
  out.push(
    "\x1B[1;35m│\x1B[0m" +
      padText(
        ` • Rod:  \x1B[1;35m${state.currentRod || "Plastic Rod"}\x1B[0m`,
        width - 2,
      ) +
      "\x1B[1;35m│\x1B[0m",
  );
  out.push(
    "\x1B[1;35m│\x1B[0m" +
      padText(
        ` • Boat: \x1B[1;34m${state.currentBoat || "Rowboat"}\x1B[0m`,
        width - 2,
      ) +
      "\x1B[1;34m│\x1B[0m",
  );
  out.push("\x1B[1;35m└" + "─".repeat(width - 2) + "┘\x1B[0m");

  out.push(
    "\x1B[1;32m┌" +
      "─".repeat(15) +
      " Economy " +
      "─".repeat(width - 26) +
      "┐\x1B[0m",
  );
  out.push(
    "\x1B[1;32m│\x1B[0m" +
      padText(
        ` • Balance:    \x1B[1;32m$${(state.balance || 0).toLocaleString()}\x1B[0m`,
        width - 2,
      ) +
      "\x1B[1;32m│\x1B[0m",
  );
  out.push(
    "\x1B[1;32m│\x1B[0m" +
      padText(
        ` • Cash/Click: \x1B[1;32m$${(state.cashPerClick || 0).toFixed(2)}\x1B[0m`,
        width - 2,
      ) +
      "\x1B[1;32m│\x1B[0m",
  );
  out.push(
    "\x1B[1;32m│\x1B[0m" +
      padText(
        ` • Clicks:     ${state.clicks || 0} / ${state.sellThreshold || 20} to sell`,
        width - 2,
      ) +
      "\x1B[1;32m│\x1B[0m",
  );
  out.push("\x1B[1;32m└" + "─".repeat(width - 2) + "┘\x1B[0m");

  out.push(
    "\x1B[1;33m┌" +
      "─".repeat(12) +
      " Next Upgrade " +
      "─".repeat(width - 28) +
      "┐\x1B[0m",
  );
  const upgrade = getNextUpgradeDetails(state, currentSleep);
  if (upgrade) {
    out.push(
      "\x1B[1;33m│\x1B[0m" +
        padText(
          ` • Target:     \x1B[1m${upgrade.target}\x1B[0m (${upgrade.type})`,
          width - 2,
        ) +
        "\x1B[1;33m│\x1B[0m",
    );
    out.push(
      "\x1B[1;33m│\x1B[0m" +
        padText(` • Price:      $${upgrade.cost.toLocaleString()}`, width - 2) +
        "\x1B[1;33m│\x1B[0m",
    );
    out.push(
      "\x1B[1;33m│\x1B[0m" +
        padText(
          ` • Remaining:  $${upgrade.remainingCost.toLocaleString()}`,
          width - 2,
        ) +
        "\x1B[1;33m│\x1B[0m",
    );
    out.push(
      "\x1B[1;33m│\x1B[0m" +
        padText(` • Est Clicks: ${upgrade.estClicks} clicks`, width - 2) +
        "\x1B[1;33m│\x1B[0m",
    );
    out.push(
      "\x1B[1;33m│\x1B[0m" +
        padText(` • ETA:        ${upgrade.etaStr}`, width - 2) +
        "\x1B[1;33m│\x1B[0m",
    );
  } else {
    out.push(
      "\x1B[1;33m│\x1B[0m" +
        padText(
          ` • Target:     \x1B[1;33mMAX UPGRADES REACHED!\x1B[0m`,
          width - 2,
        ) +
        "\x1B[1;33m│\x1B[0m",
    );
  }
  out.push("\x1B[1;33m└" + "─".repeat(width - 2) + "┘\x1B[0m");

  out.push(
    "\x1B[1;90m┌" +
      "─".repeat(14) +
      " Activity Log " +
      "─".repeat(width - 30) +
      "┐\x1B[0m",
  );
  for (let i = 0; i < MAX_LOGS; i++) {
    const logLine = logBuffer[i] || "";
    const cleanLogLine = logLine.substring(0, 150);
    out.push(
      "\x1B[1;90m│\x1B[0m " +
        padText(cleanLogLine, width - 4) +
        " \x1B[1;90m│\x1B[0m",
    );
  }
  out.push("\x1B[1;90m└" + "─".repeat(width - 2) + "┘\x1B[0m");

  out.push(
    "\x1B[1;36m┌" +
      "─".repeat(16) +
      " Quick Actions " +
      "─".repeat(width - 26) +
      "┐\x1B[0m",
  );

  const options = ["CONTINUE", "RESTART", "KILL"];
  const selected = state.selectedAction || 0;

  let menuLine = "   ";
  for (let i = 0; i < options.length; i++) {
    if (i === selected) {
      menuLine += `\x1B[1;36m❯\x1B[1;7;36m ${options[i]} \x1B[27m❮\x1B[0m`;
    } else {
      menuLine += `\x1B[1;30m[ ${options[i]} ]\x1B[0m`;
    }
    if (i < options.length - 1) {
      menuLine += "      ";
    }
  }

  out.push(
    "\x1B[1;36m│\x1B[0m" + padText(menuLine, width - 2) + "\x1B[1;36m│\x1B[0m",
  );
  out.push("\x1B[1;36m└" + "─".repeat(width - 2) + "┘\x1B[0m");

  const originalLog = global.originalConsole
    ? global.originalConsole.log
    : console.log;
  originalLog(out.join("\n"));
}

if (process.stdout.isTTY) {
  process.stdout.removeAllListeners("resize");
  process.stdout.on("resize", () => {
    drawTUI();
  });
}

module.exports = {
  drawTUI,
};
