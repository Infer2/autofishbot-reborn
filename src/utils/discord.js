"use strict";

const {
  Message,
  TextChannel,
  DMChannel,
  NewsChannel,
  ThreadChannel,
} = require("discord.js-selfbot-v13");

let discordClient = null;

function setClient(client) {
  discordClient = client;
}

function getClient() {
  if (!discordClient) {
    throw new Error("[ClientHolder] Discord client has not been set yet.");
  }
  return discordClient;
}

async function retryOnNoResponse(originalFn, context, args, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await originalFn.apply(context, args);
    } catch (err) {
      const isNoResponseError =
        err &&
        err.message &&
        err.message.includes("No responsed from Application");
      if (isNoResponseError) {
        attempt++;
        if (attempt <= maxRetries) {
          console.warn(
            `[Bot] ⚠  Encountered "No responsed from Application". Sleeping 2 seconds and retrying (attempt ${attempt}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
      }
      throw err;
    }
  }
}

if (
  Message.prototype.clickButton &&
  !Message.prototype.clickButton.__isPatched
) {
  const originalClickButton = Message.prototype.clickButton;
  Message.prototype.clickButton = function (...args) {
    return retryOnNoResponse(originalClickButton, this, args);
  };
  Message.prototype.clickButton.__isPatched = true;
  console.log("[System] Patch applied: Message.prototype.clickButton");
}

const channelTypes = [TextChannel, DMChannel, NewsChannel, ThreadChannel];
for (const ChannelClass of channelTypes) {
  if (
    ChannelClass &&
    ChannelClass.prototype &&
    ChannelClass.prototype.sendSlash &&
    !ChannelClass.prototype.sendSlash.__isPatched
  ) {
    const originalSendSlash = ChannelClass.prototype.sendSlash;
    ChannelClass.prototype.sendSlash = function (...args) {
      return retryOnNoResponse(originalSendSlash, this, args);
    };
    ChannelClass.prototype.sendSlash.__isPatched = true;
    console.log(
      `[System] Patch applied: ${ChannelClass.name}.prototype.sendSlash`,
    );
  }
}

module.exports = {
  setClient,
  getClient,
};
