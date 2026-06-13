'use strict';

const { updateState } = require('./state');
const { RODS, BOATS } = require('../config');

// Calculate earnings and update cash-per-click statistics after selling
function updateStateAfterSell(newBalance) {
    updateState(state => {
        const prevBalance = state.balance;
        const clicks = state.clicks || 1;
        const spending = state.totalSpending || 0;
        const earnings = Math.max(0, newBalance - (prevBalance - spending));
        const cpc = earnings / clicks;

        state.balance = newBalance;
        state.lastSellBalance = newBalance;
        state.clicks = 0;
        state.totalSpending = 0;

        state.cashPerClick = state.cashPerClick > 0 ?
            parseFloat((state.cashPerClick * 0.7 + cpc * 0.3).toFixed(2)) :
            parseFloat(cpc.toFixed(2));
    });
}

function getNextRodUpgrade(state) {
    const owned = state.ownedRods || ['Plastic Rod'];
    return RODS.find(rod => !owned.includes(rod.name)) || null;
}

function getNextBoatUpgrade(state) {
    const owned = state.ownedBoats || ['Rowboat'];
    return BOATS.find(boat => !owned.includes(boat.name)) || null;
}

function formatDuration(ms) {
    if (ms <= 0) return '0s';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

// Calculate ETA for the next rod upgrade
function getUpgradeEta(state, sleepMs = 3000) {
    const nextRod = getNextRodUpgrade(state);
    if (!nextRod) return null;

    const remainingCost = Math.max(0, nextRod.price - state.balance);
    if (remainingCost === 0) {
        return { target: nextRod.name, cost: nextRod.price, remainingCost, estClicks: 0, etaMs: 0, etaStr: 'Ready!' };
    }

    const estClicks = Math.ceil(remainingCost / (state.cashPerClick || 1));
    const etaMs = estClicks * (sleepMs + 320);

    return {
        target: nextRod.name,
        cost: nextRod.price,
        remainingCost,
        estClicks,
        etaMs,
        etaStr: formatDuration(etaMs)
    };
}

// Estimate how many clicks are needed for the next significant upgrade (rod or boat)
function getNextUpgradeEstClicks(state, sleepMs = 3000) {
    const nextRod = getNextRodUpgrade(state);
    const nextBoat = getNextBoatUpgrade(state);
    if (!nextRod && !nextBoat) return null;

    const cpc = state.cashPerClick || 1;
    if (nextRod && state.balance >= nextRod.price) return 0;

    let rodEstClicks = nextRod ? Math.ceil(Math.max(0, nextRod.price - state.balance) / cpc) : Infinity;
    let rodEtaMs = rodEstClicks * (sleepMs + 320);

    const considerBoat = nextBoat && (!nextRod || nextRod.price >= 3 * nextBoat.price);

    if (rodEtaMs <= 300000 || !considerBoat) return rodEstClicks;

    return Math.ceil(Math.max(0, nextBoat.price - state.balance) / cpc);
}

function getRequiredRodsShopPage(state) {
    const owned = state.ownedRods || ['Plastic Rod'];
    const p1 = ['Plastic Rod', 'Improved Rod', 'Steel Rod', 'Fiberglass Rod', 'Heavy Rod'];
    const p2 = ['Alloy Rod', 'Lava Rod', 'Magma Rod'];

    if (!p1.every(r => owned.includes(r))) return 1;
    if (!p2.every(r => owned.includes(r))) return 2;
    return 3;
}

// Get comprehensive details for the TUI display
function getNextUpgradeDetails(state, sleepMs = 3000) {
    const nextRod = getNextRodUpgrade(state);
    const nextBoat = getNextBoatUpgrade(state);
    if (!nextRod && !nextBoat) return null;

    const cpc = state.cashPerClick || 1;
    const avgDuration = sleepMs + 320;

    let rodEstClicks = nextRod ? Math.ceil(Math.max(0, nextRod.price - state.balance) / cpc) : Infinity;
    let rodEtaMs = rodEstClicks * avgDuration;

    const considerBoat = nextBoat && (!nextRod || nextRod.price >= 3 * nextBoat.price);

    if (nextRod && (state.balance >= nextRod.price || rodEtaMs <= 300000 || !considerBoat)) {
        return {
            type: 'Rod',
            target: nextRod.name,
            cost: nextRod.price,
            remainingCost: Math.max(0, nextRod.price - state.balance),
            estClicks: rodEstClicks,
            etaMs: rodEtaMs,
            etaStr: formatDuration(rodEtaMs)
        };
    }

    if (considerBoat) {
        const rem = Math.max(0, nextBoat.price - state.balance);
        const clicks = Math.ceil(rem / cpc);
        return {
            type: 'Boat',
            target: nextBoat.name,
            cost: nextBoat.price,
            remainingCost: rem,
            estClicks: clicks,
            etaMs: clicks * avgDuration,
            etaStr: formatDuration(clicks * avgDuration)
        };
    }

    return null;
}

module.exports = {
    updateStateAfterSell,
    getNextRodUpgrade,
    getNextBoatUpgrade,
    formatDuration,
    getUpgradeEta,
    getNextUpgradeEstClicks,
    getRequiredRodsShopPage,
    getNextUpgradeDetails
};
