"use strict";

const { RODS, BOATS } = require("../../config");

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getEmbedText(embed) {
  if (!embed) return "";
  let parts = [];
  if (embed.title) parts.push(embed.title);
  if (embed.description) parts.push(embed.description);
  if (embed.fields && Array.isArray(embed.fields)) {
    for (const field of embed.fields) {
      if (field.name) parts.push(field.name);
      if (field.value) parts.push(field.value);
    }
  }
  if (embed.footer && embed.footer.text) parts.push(embed.footer.text);
  if (embed.author && embed.author.name) parts.push(embed.author.name);
  return parts.join("\n");
}

function parseBalance(text) {
  let match = text.match(/you now have\s*\*\*\$([\d,]+)\*\*/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""), 10);
  }
  match = text.match(/your balance:?\s*\*\*\$([\d,]+)\*\*/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""), 10);
  }
  return null;
}

function parseShopRods(text) {
  const ownedRods = [];
  const prices = {};

  for (const rod of RODS) {
    const ownedRegex = new RegExp(
      `${escapeRegExp(rod.name)}(?:\\*\\*)?\\s*-\\s*OWNED`,
      "i",
    );
    if (ownedRegex.test(text)) {
      ownedRods.push(rod.name);
    }

    const priceRegex = new RegExp(
      `${escapeRegExp(rod.name)}(?:\\*\\*)?\\s*-\\s*\\$([\\d,]+)`,
      "i",
    );
    const match = text.match(priceRegex);
    if (match) {
      prices[rod.name] = parseInt(match[1].replace(/,/g, ""), 10);
    }
  }

  return { ownedRods, prices };
}

function parseShopBoats(text) {
  const ownedBoats = [];
  const prices = {};

  for (const boat of BOATS) {
    const ownedRegex = new RegExp(
      `${escapeRegExp(boat.name)}(?:\\*\\*)?\\s*-\\s*OWNED`,
      "i",
    );
    if (ownedRegex.test(text)) {
      ownedBoats.push(boat.name);
    }

    const priceRegex = new RegExp(
      `${escapeRegExp(boat.name)}(?:\\*\\*)?\\s*-\\s*\\$([\\d,]+)`,
      "i",
    );
    const match = text.match(priceRegex);
    if (match) {
      prices[boat.name] = parseInt(match[1].replace(/,/g, ""), 10);
    }
  }

  return { ownedBoats, prices };
}

function parseCooldown(text) {
  const match = text.match(
    /fishing cooldown:?\s*(?:\*\*)?([\d.]+)\s*s(?:\*\*)?/i,
  );
  if (match) {
    const seconds = parseFloat(match[1]);
    return Math.round(seconds * 1000);
  }
  return null;
}

function parseShopBoosts(text) {
  let goldFish = 0;
  let emeraldFish = 0;

  const goldMatch = text.match(/\*\*(\d+)\*\*\s*<:[^>]*gold/i);
  if (goldMatch) {
    goldFish = parseInt(goldMatch[1], 10);
  }

  const emeraldMatch = text.match(
    /\*\*(\d+)\*\*\s*<:[^>]*(?:emerald|elemrald)/i,
  );
  if (emeraldMatch) {
    emeraldFish = parseInt(emeraldMatch[1], 10);
  }

  return { goldFish, emeraldFish };
}

module.exports = {
  getEmbedText,
  parseBalance,
  parseShopRods,
  parseShopBoats,
  parseCooldown,
  parseShopBoosts,
};
