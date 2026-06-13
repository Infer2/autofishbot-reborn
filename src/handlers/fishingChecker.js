'use strict';

const { CHANNEL_ID } = require('../config');
const { captchaLevel1 } = require('./captcha');
const { checkAndDoRest } = require('../utils/scheduler');
const { maybeHumanDelay } = require('../utils/helpers');
const { loadState } = require('../utils/state');
const { getEmbedText } = require('../utils/economy');
const { isCaptcha, clickButton } = require('./fishingClicker');

let startupSyncDone = false;
let captchaJustResolved = false;

function markCaptchaResolved() {
    captchaJustResolved = true;
}

// Main loop checker: ensures we are on a fishing embed and handles edge cases
async function checkEmbed(client) {
    await checkAndDoRest();
    await maybeHumanDelay();

    const channel = await client.channels.fetch(CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 1 });
    const lastMessage = messages.first();

    const state = loadState();
    const botId = state.applicationId || '574652751745777665';

    if (!lastMessage) {
        await channel.sendSlash(botId, 'fish');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await checkEmbed(client);
        return;
    }

    const isFromBot = lastMessage.author.id === botId || lastMessage.author.bot;
    const embed = lastMessage.embeds[0];
    const embedText = embed ? getEmbedText(embed) : '';

    if (embed && isCaptcha(embedText)) {
        if (captchaJustResolved) {
            captchaJustResolved = false;
            console.log('[checkEmbed] Resuming after captcha...');
            await channel.sendSlash(botId, 'fish');
            await new Promise(resolve => setTimeout(resolve, 3000));
            await checkEmbed(client);
            return;
        }
        await captchaLevel1(channel, botId, embed);
        return;
    }

    // Initial sync with shop on startup
    if (!startupSyncDone) {
        try {
            const { syncRodsWithShop, syncBoatsWithShop, syncBuffs, checkAndBuyBoosts } = require('./upgrades');
            await syncRodsWithShop(channel);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await syncBoatsWithShop(channel);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await syncBuffs(channel);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await checkAndBuyBoosts(channel);
            await new Promise(resolve => setTimeout(resolve, 3000));
            startupSyncDone = true;
        } catch (err) {
            console.error('[checkEmbed] Startup sync failed:', err.message);
        }
    }

    const lowerText = embedText.toLowerCase();
    const isShop = lowerText.includes('your balance') && (lowerText.includes('rod') || lowerText.includes('boat') || lowerText.includes('rowboat'));

    const hasButtons = lastMessage.components && lastMessage.components.length > 0 &&
        lastMessage.components.some(row => row.components && row.components.some(c => c.type === 'BUTTON'));

    if (!isFromBot || !embed || isShop || !hasButtons) {
        try {
            await channel.sendSlash(botId, 'fish');
        } catch (err) {
            console.error('[checkEmbed] Failed to send /fish:', err.message);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
        await checkEmbed(client);
        return;
    }

    const firstButton = lastMessage.components[0].components[0];
    const customId = firstButton.customId || '';
    if (customId.includes('shop') || customId.includes('buy') || customId.includes('nav')) {
        await channel.sendSlash(botId, 'fish');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await checkEmbed(client);
        return;
    }

    await clickButton(lastMessage, client);
}

module.exports = { checkEmbed, markCaptchaResolved };
