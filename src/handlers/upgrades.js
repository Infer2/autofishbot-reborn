'use strict';

const {
    getNextRodUpgrade,
    getNextBoatUpgrade,
    getUpgradeEta,
    getEmbedText,
    parseShopBoosts
} = require('../utils/economy');
const { updateState, loadState } = require('../utils/state');
const { SLEEP_MS } = require('../config');
const { randomBetween } = require('../utils/helpers');

// Logic for purchasing and equipping rods and boats
async function checkAndBuyRods(channel) {
    const state = loadState();
    const botId = state.applicationId;
    if (!botId) return false;

    const nextRod = getNextRodUpgrade(state);

    if (nextRod && state.balance >= nextRod.price) {
        try {
            const response = await channel.sendSlash(botId, 'buy', nextRod.name);
            let alreadyOwned = false;
            if (response) {
                const combined = `${response.content}\n${getEmbedText(response.embeds?.[0])}`.toLowerCase();
                if (combined.includes('already own') || combined.includes('already purchased')) {
                    alreadyOwned = true;
                }
            }

            updateState(s => {
                if (!alreadyOwned) {
                    s.balance -= nextRod.price;
                    s.totalSpending += nextRod.price;
                }
                if (!s.ownedRods.includes(nextRod.name)) s.ownedRods.push(nextRod.name);
                s.currentRod = nextRod.name;
            });

            await new Promise(resolve => setTimeout(resolve, 2000));
            await channel.sendSlash(botId, 'rod', nextRod.name);
            return true;
        } catch (err) {
            console.error('[buyRod] Error:', err.message);
            return false;
        }
    }

    // Buy boat if next rod is far away
    const sleepMs = state.sleepMs || SLEEP_MS;
    const etaInfo = getUpgradeEta(state, sleepMs);
    const etaMs = etaInfo ? etaInfo.etaMs : Infinity;

    if (etaMs > 5 * 60 * 1000) {
        const nextBoat = getNextBoatUpgrade(state);
        if (nextBoat && state.balance >= nextBoat.price) {
            try {
                const response = await channel.sendSlash(botId, 'buy', nextBoat.name);
                let alreadyOwned = false;
                if (response) {
                    const combined = `${response.content}\n${getEmbedText(response.embeds?.[0])}`.toLowerCase();
                    if (combined.includes('already own') || combined.includes('already purchased')) {
                        alreadyOwned = true;
                    }
                }

                updateState(s => {
                    if (!alreadyOwned) {
                        s.balance -= nextBoat.price;
                        s.totalSpending += nextBoat.price;
                    }
                    if (!s.ownedBoats.includes(nextBoat.name)) s.ownedBoats.push(nextBoat.name);
                    s.currentBoat = nextBoat.name;
                });

                await syncBuffs(channel);
                return true;
            } catch (err) {
                console.error('[buyBoat] Error:', err.message);
            }
        }
    }

    return false;
}

async function syncRodsWithShop(channel) {
    const state = loadState();
    if (!state.applicationId) return;
    try { await channel.sendSlash(state.applicationId, 'shop rods'); } catch (e) {}
}

async function syncBoatsWithShop(channel) {
    const state = loadState();
    if (!state.applicationId) return;
    try { await channel.sendSlash(state.applicationId, 'shop boats'); } catch (e) {}
}

async function syncBuffs(channel) {
    const state = loadState();
    if (!state.applicationId) return;
    try { await channel.sendSlash(state.applicationId, 'buffs'); } catch (e) {}
}

// Logic for maintaining active boosts using rare fish
async function checkAndBuyBoosts(channel) {
    const state = loadState();
    const botId = state.applicationId;
    if (!botId || (state.boostsExpiry && Date.now() < state.boostsExpiry)) return;

    try {
        const response = await channel.sendSlash(botId, 'shop boosts');
        if (!response) return;

        const embedText = getEmbedText(response.embeds?.[0]) || response.content || '';
        const { goldFish, emeraldFish } = parseShopBoosts(embedText);

        if (emeraldFish >= 12) {
            await channel.sendSlash(botId, 'buy', 'Fish20m');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await channel.sendSlash(botId, 'buy', 'Treasure20m');
            const expiry = Date.now() + (20 * 60 * 1000) + (randomBetween(5, 10) * 1000);
            updateState(s => { s.boostsExpiry = expiry; });
        } else if (goldFish >= 12) {
            await channel.sendSlash(botId, 'buy', 'Fish5m');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await channel.sendSlash(botId, 'buy', 'Treasure5m');
            const expiry = Date.now() + (5 * 60 * 1000) + (randomBetween(5, 10) * 1000);
            updateState(s => { s.boostsExpiry = expiry; });
        }
    } catch (err) {
        console.error('[Boosts] Error:', err.message);
    }
}

module.exports = {
    checkAndBuyRods,
    syncRodsWithShop,
    syncBoatsWithShop,
    syncBuffs,
    checkAndBuyBoosts
};
