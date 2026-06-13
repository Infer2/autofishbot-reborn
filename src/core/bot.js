'use strict';

const { Client } = require('discord.js-selfbot-v13');
const { TOKEN, CHANNEL_ID } = require('../config');
const { checkEmbed } = require('../handlers/fishing');
const { setupStdin } = require('../utils/helpers');
const { setClient } = require('../utils/discord');
const {
    getEmbedText,
    parseBalance,
    parseShopRods,
    parseShopBoats,
    parseCooldown,
    getRequiredRodsShopPage
} = require('../utils/economy');
const { updateState, loadState } = require('../utils/state');

const client = new Client({ checkUpdate: false });

setClient(client);

let started = false;

client.on('ready', async () => {
    console.log(`\n[Bot] ✅  Logged in as ${client.user.tag}`);
    console.log(`[Bot] Type "continue" at any time to skip the current sleep/rest.\n`);

    if (!started) {
        started = true;
        await checkEmbed(client);
    }
});

client.on('error', err => {
    console.error('[Bot] ⚠  Client error:', err.message);
});

function parseCurrentPage(text) {
    const match = text.match(/page\s*\*?\*?(\d+)\/(\d+)\*?\*?/i);
    if (match) {
        return {
            current: parseInt(match[1], 10),
            total: parseInt(match[2], 10)
        };
    }
    return null;
}

// Sync local state with game messages and embeds
function handleIncomingMessage(message) {
    if (message.channel.id !== CHANNEL_ID) return;

    if (message.author.bot || message.author.id === '574652751745777665') {
        updateState(s => { s.applicationId = message.author.id; });

        const text = message.embeds && message.embeds.length > 0 ?
            getEmbedText(message.embeds[0]) :
            (message.content || '');

        if (text.toLowerCase().includes('you may now continue')) {
            console.log('[Captcha] 🎉 Captcha resolved.');
            setTimeout(async () => {
                try {
                    const { markCaptchaResolved, checkEmbed } = require('../handlers/fishingChecker');
                    markCaptchaResolved();
                    await checkEmbed(client);
                } catch (err) {
                    console.error('[Captcha] Error resuming after resolution:', err.message);
                }
            }, 2000);
            return;
        }

        if (message.embeds && message.embeds.length > 0) {
            const embed = message.embeds[0];

            // Sync Rods and Balance
            if (text.includes('Your balance:') && text.toLowerCase().includes('rod')) {
                const balance = parseBalance(text);
                const { ownedRods } = parseShopRods(text);

                updateState(s => {
                    if (balance !== null) s.balance = balance;
                    if (ownedRods.length > 0) {
                        for (const r of ownedRods) {
                            if (!s.ownedRods.includes(r)) s.ownedRods.push(r);
                        }
                    }
                });

                const pageInfo = parseCurrentPage(text);
                if (pageInfo) {
                    const state = loadState();
                    const requiredPage = getRequiredRodsShopPage(state);
                    if (pageInfo.current < requiredPage && pageInfo.current < pageInfo.total) {
                        const row = message.components && message.components[0];
                        const button = row && row.components && row.components[1];
                        if (button && button.type === 'BUTTON') {
                            setTimeout(async () => {
                                try {
                                    await message.clickButton(button.customId);
                                } catch (clickErr) {
                                    console.error('[Economy] Failed to navigate shop:', clickErr.message);
                                }
                            }, 1500);
                        }
                    }
                }
            }

            // Sync Boats and Balance
            if (text.includes('Your balance:') && (text.toLowerCase().includes('boat') || text.toLowerCase().includes('rowboat'))) {
                const balance = parseBalance(text);
                const { ownedBoats } = parseShopBoats(text);

                updateState(s => {
                    if (balance !== null) s.balance = balance;
                    if (ownedBoats.length > 0) {
                        for (const b of ownedBoats) {
                            if (!s.ownedBoats.includes(b)) s.ownedBoats.push(b);
                        }
                    }
                });
            }

            // Sync Cooldowns
            if (text.includes('Fishing cooldown:')) {
                const cooldownMs = parseCooldown(text);
                if (cooldownMs !== null) {
                    updateState(s => { s.sleepMs = cooldownMs; });
                }
            }

            // Sync Current Rod
            const switchMatch = text.match(/switched to the \*\*(?:<:\w+:\d+>\s*)?([^*]+)\*\*/i);
            if (switchMatch) {
                const rodName = switchMatch[1].trim();
                updateState(s => {
                    if (!s.ownedRods.includes(rodName)) s.ownedRods.push(rodName);
                    s.currentRod = rodName;
                });
            }
        }
    }
}

client.on('messageCreate', handleIncomingMessage);
client.on('messageUpdate', (oldMsg, newMsg) => {
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
        console.log('[Bot] Client destroyed.');
    }
}

module.exports = { start, stop };
