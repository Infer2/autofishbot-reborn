'use strict';

const { EventEmitter } = require('events');
const readline = require('readline');

const signal = new EventEmitter();
signal.setMaxListeners(100);

let stdinReady = false;

// Setup terminal input listeners for manual control
function setupStdin() {
    if (stdinReady) return;
    stdinReady = true;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });

    rl.on('line', raw => {
        const cmd = raw.trim().toLowerCase();
        if (cmd === 'continue') {
            signal.emit('continue');
        } else if (cmd === 'restart') {
            signal.emit('restart');
        } else if (cmd === 'kill') {
            process.exit(0);
        }
    });
}

// Sleep that can be bypassed by the "continue" command
function interruptibleSleep(ms) {
    return new Promise(resolve => {
        let timer;
        const onContinue = () => {
            clearTimeout(timer);
            resolve(true);
        };
        timer = setTimeout(() => {
            signal.removeListener('continue', onContinue);
            resolve(false);
        }, ms);
        signal.once('continue', onContinue);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return items[items.length - 1];
}

// Adds a small random delay to simulate human reaction time
async function maybeHumanDelay() {
    if (Math.random() > 0.35) return;
    const ms = randomBetween(200, 2800);
    await interruptibleSleep(ms);
}

module.exports = {
    signal,
    setupStdin,
    interruptibleSleep,
    sleep,
    randomBetween,
    weightedPick,
    maybeHumanDelay
};
