"use strict";

const { CHANNEL_ID } = require("../config");
const { captchaLevel1 } = require("./captcha");
const { checkAndDoRest } = require("../utils/scheduler");
const { maybeHumanDelay, isNetworkError } = require("../utils/helpers");
const { loadState } = require("../utils/state");
const { getEmbedText } = require("../utils/economy");
const { isCaptcha, clickButton } = require("./fishingClicker");

let startupSyncDone = false;
let captchaJustResolved = false;

function markCaptchaResolved() {
  captchaJustResolved = true;
}

async function checkEmbed(client) {
  try {
    await checkAndDoRest();
    await maybeHumanDelay();

    const channel = await client.channels.fetch(CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 1 });
    const lastMessage = messages.first();

    const state = loadState();
    const botId = state.applicationId || "574652751745777665";

    if (!lastMessage) {
      console.log("[checkEmbed] No messages found. Starting fish command...");
      await channel.sendSlash(botId, "fish");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await checkEmbed(client);
      return;
    }

    const isFromBot = lastMessage.author.id === botId || lastMessage.author.bot;
    const embed = lastMessage.embeds[0];
    const embedText = embed ? getEmbedText(embed) : "";

    if (embed && isCaptcha(embedText)) {
      if (captchaJustResolved) {
        captchaJustResolved = false;
        console.log(
          '[checkEmbed] Captcha embed still visible but captcha was just resolved. Sending "/fish" to resume...',
        );
        try {
          await channel.sendSlash(botId, "fish");
        } catch (err) {
          console.error(
            '[checkEmbed] Failed to send "/fish" after captcha resolve:',
            err.message,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await checkEmbed(client);
        return;
      }
      console.log("[checkEmbed] ⚠ Captcha detected → captchaLevel1()");
      await captchaLevel1(channel, botId, embed);
      return;
    }

    if (!startupSyncDone) {
      console.log(
        "[checkEmbed] Verification embed check passed. Performing startup shop & buffs sync...",
      );
      try {
        const {
          syncRodsWithShop,
          syncBoatsWithShop,
          syncBuffs,
          checkAndBuyBoosts,
        } = require("./upgrades");

        await syncRodsWithShop(channel);
        console.log(
          "[checkEmbed] Waiting 2 seconds for rods shop sync to complete...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await syncBoatsWithShop(channel);
        console.log(
          "[checkEmbed] Waiting 2 seconds for boats shop sync to complete...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await syncBuffs(channel);
        console.log(
          "[checkEmbed] Waiting 2 seconds for buffs sync to complete...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await checkAndBuyBoosts(channel);
        console.log("[checkEmbed] Waiting 2 seconds for boosts check...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        startupSyncDone = true;
        console.log("[checkEmbed] ✅ Startup sync completed successfully!");
      } catch (err) {
        console.error(
          "[checkEmbed] Failed to perform startup sync:",
          err.message,
        );
      }
    }

    const lowerText = embedText.toLowerCase();
    const isShop =
      lowerText.includes("your balance") &&
      (lowerText.includes("rod") ||
        lowerText.includes("boat") ||
        lowerText.includes("rowboat"));

    const hasButtons =
      lastMessage.components &&
      lastMessage.components.length > 0 &&
      lastMessage.components.some(
        (row) =>
          row.components && row.components.some((c) => c.type === "BUTTON"),
      );

    if (!isFromBot || !embed || isShop || !hasButtons) {
      console.log(
        '[checkEmbed] Last message is not an active fishing embed. Sending "/fish"...',
      );
      try {
        await channel.sendSlash(botId, "fish");
      } catch (err) {
        console.error(
          '[checkEmbed] Failed to send "/fish" command:',
          err.message,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await checkEmbed(client);
      return;
    }

    const firstButton = lastMessage.components[0].components[0];
    const customId = firstButton.customId || "";
    if (
      customId.includes("shop") ||
      customId.includes("buy") ||
      customId.includes("nav")
    ) {
      console.log(
        '[checkEmbed] Last message has shop buttons. Sending "/fish" to start a new catch...',
      );
      try {
        await channel.sendSlash(botId, "fish");
      } catch (err) {
        console.error(
          '[checkEmbed] Failed to send "/fish" command:',
          err.message,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await checkEmbed(client);
      return;
    }

    await clickButton(lastMessage, client);
  } catch (err) {
    if (isNetworkError(err)) {
      console.warn(
        `[checkEmbed] ⚠ Network error: ${err.message}. Retrying silently and gracefully in 5 seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return checkEmbed(client);
    } else {
      throw err;
    }
  }
}

module.exports = {
  checkEmbed,
  markCaptchaResolved,
};
