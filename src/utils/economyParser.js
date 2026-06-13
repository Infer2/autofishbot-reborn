'use strict';

const { RODS, BOATS } = require('../config');

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Extract all readable text from a Discord embed
function getEmbedText(embed) {
    if (!embed) return '';
    let parts = [embed.title, embed.description];
    if (embed.fields) embed.fields.forEach(f => parts.push(f.name, f.value));
    if (embed.footer?.text) parts.push(embed.footer.text);
    if (embed.author?.name) parts.push(embed.author.name);
    return parts.filter(Boolean).join('\n');
}

function parseBalance(text) {
    const match = text.match(/(?:you now have|your balance:?)\s*\*\*\$([\d,]+)\*\*/i);
    return match ? parseInt(match[1].replace(/,/g, ''), 10) : null;
}

function parseShopRods(text) {
    const ownedRods = [];
    const prices = {};
    for (const rod of RODS) {
        if (new RegExp(`${escapeRegExp(rod.name)}.*OWNED`, 'i').test(text)) ownedRods.push(rod.name);
        const match = text.match(new RegExp(`${escapeRegExp(rod.name)}.*\\$([\\d,]+)`, 'i'));
        if (match) prices[rod.name] = parseInt(match[1].replace(/,/g, ''), 10);
    }
    return { ownedRods, prices };
}

function parseShopBoats(text) {
    const ownedBoats = [];
    const prices = {};
    for (const boat of BOATS) {
        if (new RegExp(`${escapeRegExp(boat.name)}.*OWNED`, 'i').test(text)) ownedBoats.push(boat.name);
        const match = text.match(new RegExp(`${escapeRegExp(boat.name)}.*\\$([\\d,]+)`, 'i'));
        if (match) prices[boat.name] = parseInt(match[1].replace(/,/g, ''), 10);
    }
    return { ownedBoats, prices };
}

function parseCooldown(text) {
    const match = text.match(/fishing cooldown:?\s*(?:\*\*)?([\d.]+)\s*s(?:\*\*)?/i);
    return match ? Math.round(parseFloat(match[1]) * 1000) : null;
}

function parseShopBoosts(text) {
    const gold = text.match(/\*\*(\d+)\*\*\s*<:[^>]*gold/i);
    const emerald = text.match(/\*\*(\d+)\*\*\s*<:[^>]*(?:emerald|elemrald)/i);
    return {
        goldFish: gold ? parseInt(gold[1], 10) : 0,
        emeraldFish: emerald ? parseInt(emerald[1], 10) : 0
    };
}

module.exports = {
    getEmbedText,
    parseBalance,
    parseShopRods,
    parseShopBoats,
    parseCooldown,
    parseShopBoosts
};
