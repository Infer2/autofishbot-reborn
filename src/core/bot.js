"use strict";

const { Client } = require("discord.js-selfbot-v13");
const { TOKEN, CHANNEL_ID } = require("../config");
const { checkEmbed } = require("../handlers/fishing");
const { setupStdin } = require("../utils/helpers");
const { setClient } = require("../utils/discord");
const {
  getEmbedText,
  parseBalance,
  parseShopRods,
  parseShopBoats,
  parseCooldown,
  getRequiredRodsShopPage,
} = require("../utils/economy");
const { updateState, loadState } = require("../utils/state");

const client = new Client({ checkUpdate: false });

setClient(client);

let started = false;
let restarting = false;

client.on("ready", async () => {
  console.log(`\n[Bot] ✅  Logged in as ${client.user.tag}`);

  if (!started) {
    started = true;
    try {
      await checkEmbed(client);
    } catch (err) {
      console.error("[Bot] ⚠  Error in checkEmbed loop:", err.message);
      if (err.message && err.message.toLowerCase().includes("fetch failed")) {
        if (!restarting) {
          restarting = true;
          console.log(
            "[Bot] ⏳ Fetch failed in checkEmbed. Sleeping for 5 seconds and trying again...",
          );
          setTimeout(() => {
            const { signal } = require("../utils/helpers");
            signal.emit("restart");
          }, 5000);
        }
      }
    }
  }
});

client.on("error", (err) => {
  console.error("[Bot] ⚠  Client error:", err.message);
  if (err.message && err.message.toLowerCase().includes("fetch failed")) {
    if (!restarting) {
      restarting = true;
      console.log(
        "[Bot] ⏳ Fetch failed. Sleeping for 5 seconds and trying again...",
      );
      setTimeout(() => {
        const { signal } = require("../utils/helpers");
        signal.emit("restart");
      }, 5000);
    }
  }
});

function parseCurrentPage(text) {
  const match = text.match(/page\s*\*?\*?(\d+)\/(\d+)\*?\*?/i);
  if (match) {
    return {
      current: parseInt(match[1], 10),
      total: parseInt(match[2], 10),
    };
  }
  return null;
}

function handleIncomingMessage(message) {
  if (message.channel.id !== CHANNEL_ID) return;

  if (message.author.bot || message.author.id === "574652751745777665") {
    updateState((s) => {
      s.applicationId = message.author.id;
    });

    const text =
      message.embeds && message.embeds.length > 0
        ? getEmbedText(message.embeds[0])
        : message.content || "";

    if (text.toLowerCase().includes("you may now continue")) {
      console.log(
        '[Captcha] 🎉 Captcha resolved: "You may now continue." message detected.',
      );
      setTimeout(async () => {
        try {
          const {
            markCaptchaResolved,
            checkEmbed,
          } = require("../handlers/fishingChecker");
          markCaptchaResolved();
          await checkEmbed(client);
        } catch (err) {
          console.error(
            "[Captcha] Error calling checkEmbed after resolution:",
            err.message,
          );
        }
      }, 2000);
      return;
    }

    if (message.embeds && message.embeds.length > 0) {
      const embed = message.embeds[0];

      if (
        text.includes("Your balance:") &&
        text.toLowerCase().includes("rod")
      ) {
        const balance = parseBalance(text);
        const { ownedRods } = parseShopRods(text);

        updateState((s) => {
          if (balance !== null) {
            s.balance = balance;
            s.lastSellBalance = balance;
            s.totalSpending = 0;
          }
          if (ownedRods.length > 0) {
            for (const r of ownedRods) {
              if (!s.ownedRods.includes(r)) {
                s.ownedRods.push(r);
              }
            }
          }
        });

        console.log(
          `[Economy] 🔄 State synced from shop rods embed: Balance = $${(balance || 0).toLocaleString()}, ` +
            `Owned Rods = [${ownedRods.join(", ")}]`,
        );

        const pageInfo = parseCurrentPage(text);
        if (pageInfo) {
          const state = loadState();
          const requiredPage = getRequiredRodsShopPage(state);
          if (
            pageInfo.current < requiredPage &&
            pageInfo.current < pageInfo.total
          ) {
            const row = message.components && message.components[0];
            const button = row && row.components && row.components[1];
            if (button && button.type === "BUTTON") {
              console.log(
                `[Economy] 🔄 All page ${pageInfo.current} rods owned. Navigating to page ${pageInfo.current + 1}...`,
              );
              setTimeout(async () => {
                try {
                  await message.clickButton(button.customId);
                } catch (clickErr) {
                  console.error(
                    "[Economy] Failed to click next page button:",
                    clickErr.message,
                  );
                }
              }, 1500);
            }
          }
        }
      }

      if (
        text.includes("Your balance:") &&
        (text.toLowerCase().includes("boat") ||
          text.toLowerCase().includes("rowboat"))
      ) {
        const balance = parseBalance(text);
        const { ownedBoats } = parseShopBoats(text);

        updateState((s) => {
          if (balance !== null) {
            s.balance = balance;
            s.lastSellBalance = balance;
            s.totalSpending = 0;
          }
          if (ownedBoats.length > 0) {
            for (const b of ownedBoats) {
              if (!s.ownedBoats.includes(b)) {
                s.ownedBoats.push(b);
              }
            }
          }
        });

        console.log(
          `[Economy] 🔄 State synced from shop boats embed: Balance = $${(balance || 0).toLocaleString()}, ` +
            `Owned Boats = [${ownedBoats.join(", ")}]`,
        );
      }

      if (text.includes("Fishing cooldown:")) {
        const cooldownMs = parseCooldown(text);
        if (cooldownMs !== null) {
          updateState((s) => {
            s.sleepMs = cooldownMs;
          });
          console.log(
            `[Economy] 🔄 State synced from buffs: sleepMs = ${cooldownMs} ms`,
          );
        }
      }

      const switchMatch = text.match(
        /switched to the \*\*(?:<:\w+:\d+>\s*)?([^*]+)\*\*/i,
      );
      if (switchMatch) {
        const rodName = switchMatch[1].trim();
        updateState((s) => {
          if (!s.ownedRods.includes(rodName)) {
            s.ownedRods.push(rodName);
          }
          s.currentRod = rodName;
        });
        console.log(
          `[Economy] 🔄 State synced from switch message: Current Rod = "${rodName}"`,
        );
      }
    }
  }
}

client.on("messageCreate", handleIncomingMessage);
client.on("messageUpdate", (oldMsg, newMsg) => {
  if (newMsg.partial) {
    newMsg.fetch().then(handleIncomingMessage).catch(console.error);
  } else {
    handleIncomingMessage(newMsg);
  }
});

function start() {
  setupStdin();
  client.login(TOKEN);
}

function stop() {
  if (client) {
    client.destroy();
    console.log("[Bot] Client destroyed.");
  }
}

module.exports = { start, stop };
