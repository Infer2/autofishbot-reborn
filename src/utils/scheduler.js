'use strict';

const { interruptibleSleep, randomBetween, weightedPick } = require('./helpers');
const { loadState, updateState } = require('./state');

const REST_TYPES = [
    { type: 'break', label: 'Break', emoji: '☕', minGapMs: 2700000, maxGapMs: 7200000, minDurMs: 300000, maxDurMs: 1200000, weight: 0.60 },
    { type: 'meal', label: 'Meal break', emoji: '🍽', minGapMs: 10800000, maxGapMs: 21600000, minDurMs: 1200000, maxDurMs: 3600000, weight: 0.30 },
    { type: 'sleep', label: 'Sleep', emoji: '😴', minGapMs: 43200000, maxGapMs: 72000000, minDurMs: 18000000, maxDurMs: 32400000, weight: 0.10 }
];

function scheduleNextRest() {
    const rt = weightedPick(REST_TYPES);
    const now = Date.now();
    const gap = randomBetween(rt.minGapMs, rt.maxGapMs);
    const dur = randomBetween(rt.minDurMs, rt.maxDurMs);

    updateState(s => {
        s.nextRestStart = now + gap;
        s.nextRestEnd = now + gap + dur;
        s.restType = rt.type;
    });
}

// Check if a scheduled rest is active and sleep if necessary
async function checkAndDoRest() {
    let state = loadState();
    if (!state || state.nextRestStart === 0) return scheduleNextRest();

    const now = Date.now();
    if (now >= state.nextRestEnd) return scheduleNextRest();

    if (now >= state.nextRestStart) {
        const remaining = state.nextRestEnd - now;
        const rt = REST_TYPES.find(r => r.type === state.restType) || REST_TYPES[0];
        
        console.log(`[Rest] ${rt.emoji} ${rt.label} active until ${new Date(state.nextRestEnd).toLocaleTimeString()}`);
        await interruptibleSleep(remaining);
        scheduleNextRest();
    }
}

module.exports = { checkAndDoRest, scheduleNextRest };
