"use strict";

const { getEmbedText, parseShopBoosts } = require("../../utils/economy");
const { updateState, loadState } = require("../../utils/state");
const { randomBetween } = require("../../utils/helpers");

async function syncBuffs(channel) {
  const state = loadState();
  const botId = state.applicationId;
  if (!botId) return;

  console.log('[buyRod] Syncing buffs. Sending "/buffs"...');
  try {
    await channel.sendSlash(botId, "buffs");
  } catch (err) {
    console.error("[buyRod] Error sending /buffs:", err.message);
  }
}

async function checkAndBuyBoosts(channel) {
  const state = loadState();
  const botId = state.applicationId;
  if (!botId) return;

  const now = Date.now();
  if (state.boostsExpiry && now < state.boostsExpiry) {
    return;
  }

  console.log(
    '[Boosts] Boost timer expired or not set. Checking inventory via "/shop boosts"...',
  );
  try {
    const response = await channel.sendSlash(botId, "shop boosts");
    if (!response) {
      console.warn('[Boosts] No response from "/shop boosts". Skipping.');
      return;
    }

    let embedText = "";
    if (response.embeds && response.embeds.length > 0) {
      embedText = getEmbedText(response.embeds[0]);
    }
    if (!embedText && response.content) {
      embedText = response.content;
    }

    console.log("[Boosts] Raw response text:", embedText.substring(0, 200));

    const { goldFish, emeraldFish } = parseShopBoosts(embedText);
    console.log(
      `[Boosts] Inventory parsed: Gold Fish = ${goldFish}, Emerald Fish = ${emeraldFish}`,
    );

    if (emeraldFish >= 12) {
      console.log(
        "[Boosts] ✅ Enough Emerald Fish. Purchasing Emerald boosts...",
      );

      console.log('[Boosts] Sending: "/buy item:Fish20m"...');
      await channel.sendSlash(botId, "buy", "Fish20m");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('[Boosts] Sending: "/buy item:Treasure20m"...');
      await channel.sendSlash(botId, "buy", "Treasure20m");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const durationMs = 20 * 60 * 1000;
      const extraSec = randomBetween(5, 10);
      const expiry = Date.now() + durationMs + extraSec * 1000;
      updateState((s) => {
        s.boostsExpiry = expiry;
      });
      console.log(
        `[Boosts] 🎉 Emerald boosts active! Expiry set for 20m ${extraSec}s from now.`,
      );
    } else if (goldFish >= 12) {
      console.log(
        "[Boosts] Enough Gold Fish (no Emerald). Purchasing Gold boosts...",
      );

      console.log('[Boosts] Sending: "/buy item:Fish5m"...');
      await channel.sendSlash(botId, "buy", "Fish5m");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('[Boosts] Sending: "/buy item:Treasure5m"...');
      await channel.sendSlash(botId, "buy", "Treasure5m");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const durationMs = 5 * 60 * 1000;
      const extraSec = randomBetween(5, 10);
      const expiry = Date.now() + durationMs + extraSec * 1000;
      updateState((s) => {
        s.boostsExpiry = expiry;
      });
      console.log(
        `[Boosts] 🎉 Gold boosts active! Expiry set for 5m ${extraSec}s from now.`,
      );
    } else {
      console.log(
        `[Boosts] Not enough fish to buy boosts (have ${emeraldFish} emerald, ${goldFish} gold; need 12). Skipping.`,
      );
    }
  } catch (err) {
    console.error("[Boosts] Error during boosts check/purchase:", err.message);
  }
}

module.exports = {
  syncBuffs,
  checkAndBuyBoosts,
};
