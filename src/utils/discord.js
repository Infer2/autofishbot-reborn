'use strict';

const { Message, TextChannel, DMChannel, NewsChannel, ThreadChannel } = require('discord.js-selfbot-v13');

let discordClient = null;

function setClient(client) {
    discordClient = client;
}

function getClient() {
    if (!discordClient) throw new Error('Discord client not set.');
    return discordClient;
}

// Global retry logic for common Discord API errors
async function retryOnNoResponse(originalFn, context, args, maxRetries = 3) {
    let attempt = 0;
    while (true) {
        try {
            return await originalFn.apply(context, args);
        } catch (err) {
            if (err?.message?.includes('No responsed from Application') && attempt < maxRetries) {
                attempt++;
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            throw err;
        }
    }
}

// Patch discord.js-selfbot-v13 prototypes to include automatic retries
if (Message.prototype.clickButton && !Message.prototype.clickButton.__isPatched) {
    const originalClickButton = Message.prototype.clickButton;
    Message.prototype.clickButton = function(...args) {
        return retryOnNoResponse(originalClickButton, this, args);
    };
    Message.prototype.clickButton.__isPatched = true;
}

const channelTypes = [TextChannel, DMChannel, NewsChannel, ThreadChannel];
for (const ChannelClass of channelTypes) {
    if (ChannelClass?.prototype?.sendSlash && !ChannelClass.prototype.sendSlash.__isPatched) {
        const originalSendSlash = ChannelClass.prototype.sendSlash;
        ChannelClass.prototype.sendSlash = function(...args) {
            return retryOnNoResponse(originalSendSlash, this, args);
        };
        ChannelClass.prototype.sendSlash.__isPatched = true;
    }
}

module.exports = { setClient, getClient };
