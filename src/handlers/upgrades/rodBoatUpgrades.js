"use strict";

const {
  getNextRodUpgrade,
  getNextBoatUpgrade,
  getUpgradeEta,
  getEmbedText,
} = require("../../utils/economy");
const { updateState, loadState } = require("../../utils/state");
const { SLEEP_MS } = require("../../config");

async function checkAndBuyRods(channel) {
  const state = loadState();
  const botId = state.applicationId;
  if (!botId) {
    console.warn(
      "[buyRod] No bot application ID found in state; cannot send slash commands.",
    );
    return false;
  }

  const nextRod = getNextRodUpgrade(state);

  if (nextRod && state.balance >= nextRod.price) {
    console.log(
      `\n[buyRod] 💎 Afforded Rod Upgrade: ${nextRod.name} ($${nextRod.price.toLocaleString()})`,
    );
    console.log(`[buyRod] Sending Slash Command: "/buy ${nextRod.name}"...`);

    try {
      const response = await channel.sendSlash(botId, "buy", nextRod.name);

      let alreadyOwned = false;
      if (response) {
        const contentText = (response.content || "").toLowerCase();
        const embedText =
          response.embeds && response.embeds.length > 0
            ? getEmbedText(response.embeds[0]).toLowerCase()
            : "";
        const combinedText = `${contentText}\n${embedText}`;
        if (
          combinedText.includes("already own") ||
          combinedText.includes("already purchased")
        ) {
          alreadyOwned = true;
          console.log(
            `[buyRod] Game reported: already owned ${nextRod.name}. Syncing state without deducting balance.`,
          );
        }
      }

      updateState((s) => {
        if (!alreadyOwned) {
          s.balance -= nextRod.price;
          s.totalSpending += nextRod.price;
        }
        if (!s.ownedRods.includes(nextRod.name)) {
          s.ownedRods.push(nextRod.name);
        }
        s.currentRod = nextRod.name;
      });

      console.log(
        `[buyRod] Purchase recorded. Waiting 2 seconds before equipping...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`[buyRod] Sending Slash Command: "/rod ${nextRod.name}"...`);
      await channel.sendSlash(botId, "rod", nextRod.name);

      console.log(
        `[buyRod] ✅ Successfully purchased and equipped ${nextRod.name}!\n`,
      );
      return true;
    } catch (err) {
      console.error(
        "[buyRod] Error executing rod purchase/equip slash commands:",
        err.message,
      );
      return false;
    }
  }

  let etaMs = Infinity;
  if (nextRod) {
    const sleepMs = state.sleepMs || SLEEP_MS;
    const etaInfo = getUpgradeEta(state, sleepMs);
    if (etaInfo) {
      etaMs = etaInfo.etaMs;
    }
  }

  if (etaMs > 5 * 60 * 1000) {
    const nextBoat = getNextBoatUpgrade(state);
    if (nextBoat && state.balance >= nextBoat.price) {
      console.log(
        `\n[buyRod] 🛥️ Next rod ETA is ${nextRod ? (etaMs / 1000 / 60).toFixed(1) : "N/A"} mins (> 5 mins).`,
      );
      console.log(
        `[buyRod] Afforded Boat Upgrade: ${nextBoat.name} ($${nextBoat.price.toLocaleString()})`,
      );
      console.log(`[buyRod] Sending Slash Command: "/buy ${nextBoat.name}"...`);

      try {
        const response = await channel.sendSlash(botId, "buy", nextBoat.name);

        let alreadyOwned = false;
        if (response) {
          const contentText = (response.content || "").toLowerCase();
          const embedText =
            response.embeds && response.embeds.length > 0
              ? getEmbedText(response.embeds[0]).toLowerCase()
              : "";
          const combinedText = `${contentText}\n${embedText}`;
          if (
            combinedText.includes("already own") ||
            combinedText.includes("already purchased")
          ) {
            alreadyOwned = true;
            console.log(
              `[buyRod] Game reported: already owned ${nextBoat.name}. Syncing state without deducting balance.`,
            );
          }
        }

        updateState((s) => {
          if (!alreadyOwned) {
            s.balance -= nextBoat.price;
            s.totalSpending += nextBoat.price;
          }
          if (!s.ownedBoats.includes(nextBoat.name)) {
            s.ownedBoats.push(nextBoat.name);
          }
          s.currentBoat = nextBoat.name;
        });

        console.log(
          `[buyRod] ✅ Successfully purchased boat ${nextBoat.name}!\n`,
        );

        console.log(`[buyRod] Syncing buffs to update sleep delay...`);
        try {
          const { syncBuffs } = require("./boostUpgrades");
          await syncBuffs(channel);
        } catch (buffErr) {
          console.error("[buyRod] Failed to sync buffs:", buffErr.message);
        }

        return true;
      } catch (err) {
        console.error(
          "[buyRod] Error executing boat purchase slash command:",
          err.message,
        );
        return false;
      }
    }
  }

  return false;
}

async function syncRodsWithShop(channel) {
  const state = loadState();
  const botId = state.applicationId;
  if (!botId) return;

  console.log(
    '[buyRod] Syncing state with shop (rods). Sending "/shop rods"...',
  );
  try {
    await channel.sendSlash(botId, "shop rods");
  } catch (err) {
    console.error("[buyRod] Error sending /shop rods:", err.message);
  }
}

async function syncBoatsWithShop(channel) {
  const state = loadState();
  const botId = state.applicationId;
  if (!botId) return;

  console.log(
    '[buyRod] Syncing state with shop (boats). Sending "/shop boats"...',
  );
  try {
    await channel.sendSlash(botId, "shop boats");
  } catch (err) {
    console.error("[buyRod] Error sending /shop boats:", err.message);
  }
}

module.exports = {
  checkAndBuyRods,
  syncRodsWithShop,
  syncBoatsWithShop,
};
