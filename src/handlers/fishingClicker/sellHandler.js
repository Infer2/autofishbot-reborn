"use strict";

const { SLEEP_MS } = require("../../config");
const { loadState, updateState } = require("../../utils/state");
const {
  getEmbedText,
  parseBalance,
  updateStateAfterSell,
  getUpgradeEta,
  getNextUpgradeEstClicks,
} = require("../../utils/economy");

async function sellFish(message) {
  const hasSellButton =
    message.components &&
    message.components[0] &&
    message.components[0].components &&
    message.components[0].components[1];

  if (!hasSellButton) {
    console.log("[sellFish] Sell button (Y:0 X:1) not found on message.");
    return false;
  }

  const sellButton = message.components[0].components[1];
  const customId = sellButton.customId;

  console.log(
    `[sellFish] Clicking Sell Button (Y:0 X:1) — customId="${customId}"...`,
  );
  await message.clickButton(customId);
  console.log("[sellFish] Click sent. Waiting 1.5 seconds for embed edit...");

  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    const freshMessage = await message.channel.messages.fetch(message.id);
    const embed = freshMessage.embeds[0];
    if (!embed) {
      console.warn("[sellFish] No embed found in the updated message.");
      return false;
    }

    const text = getEmbedText(embed);
    const balance = parseBalance(text);

    if (balance !== null) {
      updateStateAfterSell(balance);

      const state = loadState();
      console.log(`\n[Economy] 💰 Sell successful!`);
      console.log(`[Economy]    Current Balance: $${balance.toLocaleString()}`);
      console.log(`[Economy]    Est. Cash/Click: $${state.cashPerClick}`);

      const sleepMs = state.sleepMs || SLEEP_MS;
      const etaInfo = getUpgradeEta(state, sleepMs);
      if (etaInfo) {
        console.log(
          `[Economy]    Next Rod Upgrade: ${etaInfo.target} ($${etaInfo.cost.toLocaleString()})`,
        );
        console.log(
          `[Economy]    Remaining Cost:   $${etaInfo.remainingCost.toLocaleString()}`,
        );
        console.log(
          `[Economy]    Est. Clicks:      ${etaInfo.estClicks} clicks`,
        );
        console.log(`[Economy]    ETA to upgrade:   ${etaInfo.etaStr}`);
      } else {
        console.log(`[Economy]    🎉 Maximum rod upgrades achieved!`);
      }
      console.log("");

      const estClicks = getNextUpgradeEstClicks(state, sleepMs);
      let nextThreshold;
      if (estClicks !== null) {
        const multiplier = 0.3 + Math.random() * 0.8;
        nextThreshold = Math.ceil(estClicks * multiplier);
        nextThreshold = Math.max(20, Math.min(nextThreshold, 100000));
        console.log(
          `[Economy]    Calculated sell threshold relative to next upgrade: ${nextThreshold} clicks (multiplier: ${multiplier.toFixed(2)}, estClicks: ${estClicks})`,
        );
      } else {
        nextThreshold = Math.floor(Math.random() * (40 - 15 + 1)) + 15;
        console.log(
          `[Economy]    No upgrades remaining. Set fallback sell threshold: ${nextThreshold} clicks`,
        );
      }

      updateState((s) => {
        s.sellThreshold = nextThreshold;
      });

      return true;
    } else {
      console.warn(
        "[sellFish] Could not parse balance from the updated embed. Text:",
      );
      console.warn(text);
      return false;
    }
  } catch (err) {
    console.error(
      "[sellFish] Error during message fetch or parsing:",
      err.message,
    );
    return false;
  }
}

module.exports = {
  sellFish,
};
