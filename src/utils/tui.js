'use strict';

const { loadState } = require('./state');
const { getNextUpgradeDetails } = require('./economy');
const { SLEEP_MS } = require('../config');

process.stdout.write('\x1Bc');

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const logBuffer = [];
const MAX_LOGS = 30;

function addLog(type, args) {
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const lines = msg.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
        const clean = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
        let prefix = type === 'error' ? '\x1B[1;31m[!] \x1B[0m' : (type === 'warn' ? '\x1B[1;33m[!] \x1B[0m' : '');
        logBuffer.push(`${prefix}${clean}`);
        if (logBuffer.length > MAX_LOGS) logBuffer.shift();
    }
}

console.log = (...args) => { addLog('log', args); drawTUI(); };
console.error = (...args) => { addLog('error', args); drawTUI(); };
console.warn = (...args) => { addLog('warn', args); drawTUI(); };

const getVisibleLength = (s) => s.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').length;

function pad(text, width, center = false) {
    const len = getVisibleLength(text);
    if (len >= width) return text.substring(0, width);
    if (!center) return text + ' '.repeat(width - len);
    const left = Math.floor((width - len) / 2);
    return ' '.repeat(left) + text + ' '.repeat(width - len - left);
}

// Terminal User Interface optimized for mobile displays
function drawTUI() {
    const state = loadState();
    const width = 60;
    let out = ['\x1B[2J\x1B[H'];

    out.push('\x1B[1;36m┌' + '─'.repeat(width - 2) + '┐\x1B[0m');
    out.push('\x1B[1;36m│\x1B[0m' + pad('\x1B[1;36m🎣 VIRTUAL FISHER AUTO-BOT\x1B[0m', width - 2, true) + '\x1B[1;36m│\x1B[0m');
    out.push('\x1B[1;36m└' + '─'.repeat(width - 2) + '┘\x1B[0m');

    const botStatus = (state.nextRestStart && Date.now() >= state.nextRestStart) ? `\x1B[1;33mRESTING\x1B[0m` : '\x1B[1;32mACTIVE\x1B[0m';
    out.push('\x1B[1;34m┌' + '─'.repeat(16) + ' Status ' + '─'.repeat(width - 26) + '┐\x1B[0m');
    out.push('\x1B[1;34m│\x1B[0m' + pad(` • Status:   ${botStatus}`, width - 2) + '\x1B[1;34m│\x1B[0m');
    out.push('\x1B[1;34m│\x1B[0m' + pad(` • Cooldown: ${((state.sleepMs || SLEEP_MS) / 1000).toFixed(1)}s`, width - 2) + '\x1B[1;34m│\x1B[0m');
    out.push('\x1B[1;34m└' + '─'.repeat(width - 2) + '┘\x1B[0m');

    out.push('\x1B[1;32m┌' + '─'.repeat(15) + ' Economy ' + '─'.repeat(width - 26) + '┐\x1B[0m');
    out.push('\x1B[1;32m│\x1B[0m' + pad(` • Balance:    \x1B[1;32m$${(state.balance || 0).toLocaleString()}\x1B[0m`, width - 2) + '\x1B[1;32m│\x1B[0m');
    out.push('\x1B[1;32m│\x1B[0m' + pad(` • Cash/Click: \x1B[1;32m$${(state.cashPerClick || 0).toFixed(2)}\x1B[0m`, width - 2) + '\x1B[1;32m│\x1B[0m');
    out.push('\x1B[1;32m└' + '─'.repeat(width - 2) + '┘\x1B[0m');

    const upgrade = getNextUpgradeDetails(state, state.sleepMs || SLEEP_MS);
    out.push('\x1B[1;33m┌' + '─'.repeat(12) + ' Next Upgrade ' + '─'.repeat(width - 28) + '┐\x1B[0m');
    if (upgrade) {
        out.push('\x1B[1;33m│\x1B[0m' + pad(` • Target:     \x1B[1m${upgrade.target}\x1B[0m`, width - 2) + '\x1B[1;33m│\x1B[0m');
        out.push('\x1B[1;33m│\x1B[0m' + pad(` • ETA:        ${upgrade.etaStr}`, width - 2) + '\x1B[1;33m│\x1B[0m');
    } else {
        out.push('\x1B[1;33m│\x1B[0m' + pad(` • MAX UPGRADES REACHED!`, width - 2) + '\x1B[1;33m│\x1B[0m');
    }
    out.push('\x1B[1;33m└' + '─'.repeat(width - 2) + '┘\x1B[0m');

    out.push('\x1B[1;90m┌' + '─'.repeat(14) + ' Activity Log ' + '─'.repeat(width - 30) + '┐\x1B[0m');
    for (let i = 0; i < MAX_LOGS; i++) out.push('\x1B[1;90m│\x1B[0m ' + pad(logBuffer[i] || '', width - 4) + ' \x1B[1;90m│\x1B[0m');
    out.push('\x1B[1;90m└' + '─'.repeat(width - 2) + '┘\x1B[0m');

    originalLog(out.join('\n'));
}

module.exports = { drawTUI };
