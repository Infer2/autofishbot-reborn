'use strict';

const { CHANNEL_ID, SLEEP_MS } = require('../config');
const { captchaLevel1 } = require('./captcha');
const { randomBetween, interruptibleSleep } = require('../utils/helpers');
const { loadState, updateState } = require('../utils/state');
const {
    getEmbedText,
    parseBalance,
    updateStateAfterSell,
    getUpgradeEta,
    getNextUpgradeEstClicks
} = require('../utils/economy');
const { checkAndBuyRods } = require('./upgrades');

let lastClickedCustomId = null;

function isCaptcha(text) {
    const lower = text.toLowerCase();
    return (
        lower.includes('verify') || lower.includes('captcha') ||
        lower.includes('human') || lower.includes('anti-bot') ||
        lower.includes('type the') || lower.includes('click the')
    );
}

// Logic for clicking the sell button and syncing state
async function sellFish(message) {
    const sellButton = message.components?.[0]?.components?.[1];
    if (!sellButton) return false;

    const customId = sellButton.customId;
    await message.clickButton(customId);
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        const freshMessage = await message.channel.messages.fetch(message.id);
        const embed = freshMessage.embeds[0];
        if (!embed) return false;

        const text = getEmbedText(embed);
        const balance = parseBalance(text);

        if (balance !== null) {
            updateStateAfterSell(balance);
            const state = loadState();
            const sleepMs = state.sleepMs || SLEEP_MS;

            // Recalculate sell threshold based on progression
            const estClicks = getNextUpgradeEstClicks(state, sleepMs);
            let nextThreshold;
            if (estClicks !== null) {
                const multiplier = 0.3 + Math.random() * 0.7;
                nextThreshold = Math.max(15, Math.min(Math.ceil(estClicks * multiplier), 100));
            } else {
                nextThreshold = randomBetween(15, 40);
            }

            updateState(s => { s.sellThreshold = nextThreshold; });
            return true;
        }
    } catch (err) {
        console.error('[sellFish] Error:', err.message);
    }
    return false;
}

// Handles the logic for whether to fish or sell
async function clickButton(message, client) {
    const state = loadState();
    const clicks = state.clicks || 0;
    const threshold = state.sellThreshold || 20;

    const hasSellButton = message.components?.[0]?.components?.[1];

    if (hasSellButton && clicks >= threshold) {
        const customId = hasSellButton.customId;
        if (customId === lastClickedCustomId) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const { checkEmbed } = require('./fishingChecker');
            await checkEmbed(client);
            return;
        }

        lastClickedCustomId = customId;
        await sellFish(message);

        // Check for upgrades and boosts after selling
        try {
            await checkAndBuyRods(message.channel);
            const { checkAndBuyBoosts } = require('./upgrades');
            await checkAndBuyBoosts(message.channel);
        } catch (e) {}

        try {
            const botId = loadState().applicationId || '574652751745777665';
            await message.channel.sendSlash(botId, 'fish');
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {}
    } else {
        const button = message.components[0].components[0];
        const customId = button.customId;

        if (customId === lastClickedCustomId) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const { checkEmbed } = require('./fishingChecker');
            await checkEmbed(client);
            return;
        }

        lastClickedCustomId = customId;
        await message.clickButton(customId);
        updateState(s => { s.clicks = (s.clicks || 0) + 1; });
    }

    const humanExtra = Math.random() < 0.40 ? randomBetween(100, 1500) : 0;
    const totalSleep = (state.sleepMs || SLEEP_MS) + humanExtra;

    await interruptibleSleep(totalSleep);

    const { checkEmbed } = require('./fishingChecker');
    await checkEmbed(client);
}

module.exports = { isCaptcha, clickButton };
