"use strict";

require("./utils/discord");
require("./utils/tui");

const { signal } = require("./utils/helpers");
const { start, stop } = require("./core/bot");

signal.on("restart", async () => {
  console.log("[System] 🔄  Rebooting bot...");

  try {
    stop();

    const modulesToPurge = [
      "./config",
      "./core/bot",
      "./handlers/fishing",
      "./handlers/fishingChecker",
      "./handlers/captcha",
      "./handlers/fishingClicker/index",
      "./handlers/fishingClicker/clickHandler",
      "./handlers/fishingClicker/sellHandler",
      "./handlers/upgrades/index",
      "./handlers/upgrades/rodBoatUpgrades",
      "./handlers/upgrades/boostUpgrades",
      "./utils/economy/index",
      "./utils/economy/economyParser",
      "./utils/economy/upgradeCalculator",
      "./utils/economy/earningsTracker",
      "./utils/helpers",
      "./utils/discord",
      "./utils/state",
      "./utils/scheduler",
      "./utils/tui/index",
      "./utils/tui/consoleHook",
      "./utils/tui/tuiRenderer",
    ];

    for (const mod of modulesToPurge) {
      try {
        const resolved = require.resolve(mod);
        delete require.cache[resolved];
      } catch (e) {}
    }

    console.log("[System] 🧹 Module cache cleared.");

    require("./utils/tui");
    const freshBot = require("./core/bot");
    freshBot.start();

    console.log("[System] 🚀 Bot restarted successfully!");
  } catch (err) {
    console.error("[System] ❌ Error during restart:", err.message);
  }
});

start();
