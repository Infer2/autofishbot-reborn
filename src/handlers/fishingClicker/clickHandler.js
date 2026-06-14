"use strict";

const { CHANNEL_ID, SLEEP_MS } = require("../../config");
const { randomBetween, interruptibleSleep } = require("../../utils/helpers");
const { loadState, updateState } = require("../../utils/state");
const { sellFish } = require("./sellHandler");
const { checkAndBuyRods, checkAndBuyBoosts } = require("../upgrades");

let lastClickedCustomId = null;

function isCaptcha(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes("verify") ||
    lower.includes("captcha") ||
    lower.includes("human") ||
    lower.includes("anti-bot") ||
    lower.includes("type the") ||
    lower.includes("click the")
  );
}

async function clickButton(message, client) {
  const state = loadState();
  const clicks = state.clicks || 0;
  const threshold = state.sellThreshold || 20;

  const hasSellButton =
    message.components &&
    message.components[0] &&
    message.components[0].components &&
    message.components[0].components[1];

  let soldSuccessfully = false;

  if (hasSellButton && clicks >= threshold) {
    const sellButton = message.components[0].components[1];
    const customId = sellButton.customId;

    if (customId === lastClickedCustomId) {
      console.log(
        `[clickButton] Sell button customId "${customId}" was already clicked. Waiting for update...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const { checkEmbed } = require("../fishingChecker");
      await checkEmbed(client);
      return;
    }

    lastClickedCustomId = customId;
    console.log(
      `[clickButton] Click threshold reached (${clicks}/${threshold}) → Triggering Sell.`,
    );
    soldSuccessfully = await sellFish(message);

    try {
      await checkAndBuyRods(message.channel);
    } catch (err) {
      console.error("[clickButton] Failed to check/buy rods:", err.message);
    }

    try {
      await checkAndBuyBoosts(message.channel);
    } catch (err) {
      console.error("[clickButton] Failed to check/buy boosts:", err.message);
    }

    try {
      const state2 = loadState();
      const botId2 = state2.applicationId || "574652751745777665";
      console.log(
        '[clickButton] Post-sell: sending "/fish" to reset to fishing embed...',
      );
      await message.channel.sendSlash(botId2, "fish");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (err) {
      console.error(
        "[clickButton] Failed to send post-sell /fish command:",
        err.message,
      );
    }
  } else {
    const button = message.components[0].components[0];
    const customId = button.customId;

    if (customId === lastClickedCustomId) {
      console.log(
        `[clickButton] Fish button customId "${customId}" was already clicked. Waiting for update...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const { checkEmbed } = require("../fishingChecker");
      await checkEmbed(client);
      return;
    }

    lastClickedCustomId = customId;
    console.log(`[clickButton] Clicking X:0 Y:0"`);
    await message.clickButton(customId);

    updateState((s) => {
      s.clicks = (s.clicks || 0) + 1;
    });
  }

  const humanExtra = Math.random() < 0.4 ? randomBetween(100, 1500) : 0;

  const currentSleepMs = state.sleepMs || SLEEP_MS;
  const totalSleep = currentSleepMs + humanExtra;

  if (humanExtra > 0) {
    console.log(
      `[clickButton] Sleeping ${currentSleepMs} ms + ${humanExtra} ms human bonus `,
    );
  } else {
    console.log(`[clickButton] Sleeping ${currentSleepMs} ms`);
  }

  const skipped = await interruptibleSleep(totalSleep);
  if (skipped) {
    console.log("[clickButton] Sleep skipped — proceeding immediately.");
  }

  const { checkEmbed } = require("../fishingChecker");
  await checkEmbed(client);
}

module.exports = {
  isCaptcha,
  clickButton,
};
