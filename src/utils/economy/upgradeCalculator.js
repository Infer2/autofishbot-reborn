"use strict";

const { RODS, BOATS } = require("../../config");

function getNextRodUpgrade(state) {
  const owned = state.ownedRods || ["Plastic Rod"];
  for (const rod of RODS) {
    if (!owned.includes(rod.name)) {
      return rod;
    }
  }
  return null;
}

function getNextBoatUpgrade(state) {
  const owned = state.ownedBoats || ["Rowboat"];
  for (const boat of BOATS) {
    if (!owned.includes(boat.name)) {
      return boat;
    }
  }
  return null;
}

function formatDuration(ms) {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

function getVirtualBalance(state) {
  return state.balance + (state.clicks || 0) * (state.cashPerClick || 0);
}

function getUpgradeEta(state, sleepMs = 3000) {
  const nextRod = getNextRodUpgrade(state);
  if (!nextRod) return null;

  const cost = nextRod.price;
  const balance = getVirtualBalance(state);
  const remainingCost = Math.max(0, cost - balance);

  if (remainingCost === 0) {
    return {
      target: nextRod.name,
      cost,
      remainingCost,
      estClicks: 0,
      etaMs: 0,
      etaStr: "Ready to buy!",
    };
  }

  const cpc = state.cashPerClick || 1;
  const estClicks = Math.ceil(remainingCost / cpc);

  const avgClickDuration = sleepMs + 320;
  const etaMs = estClicks * avgClickDuration;

  return {
    target: nextRod.name,
    cost,
    remainingCost,
    estClicks,
    etaMs,
    etaStr: formatDuration(etaMs),
  };
}

function getNextUpgradeEstClicks(state, sleepMs = 3000) {
  const nextRod = getNextRodUpgrade(state);
  const nextBoat = getNextBoatUpgrade(state);

  if (!nextRod && !nextBoat) {
    return null;
  }

  const cpc = state.cashPerClick || 1;
  const currentBalance = getVirtualBalance(state);

  if (nextRod && currentBalance >= nextRod.price) {
    return 0;
  }

  let rodEtaMs = Infinity;
  let rodEstClicks = Infinity;
  if (nextRod) {
    const remainingCost = Math.max(0, nextRod.price - currentBalance);
    rodEstClicks = Math.ceil(remainingCost / cpc);
    const avgClickDuration = sleepMs + 320;
    rodEtaMs = rodEstClicks * avgClickDuration;
  }

  const considerBoat =
    nextBoat && (!nextRod || nextRod.price >= 3 * nextBoat.price);

  if (rodEtaMs <= 5 * 60 * 1000) {
    return rodEstClicks;
  }

  if (considerBoat) {
    const remainingCost = Math.max(0, nextBoat.price - currentBalance);
    const boatEstClicks = Math.ceil(remainingCost / cpc);
    return boatEstClicks;
  }

  return rodEstClicks;
}

function getRequiredRodsShopPage(state) {
  const owned = state.ownedRods || ["Plastic Rod"];
  const page1Rods = [
    "Plastic Rod",
    "Improved Rod",
    "Steel Rod",
    "Fiberglass Rod",
    "Heavy Rod",
  ];
  const page2Rods = ["Alloy Rod", "Lava Rod", "Magma Rod"];
  const page3Rods = [
    "Oceanium Rod",
    "Golden Rod",
    "Superium Rod",
    "Infinity Rod",
  ];
  const page4Rods = ["Floating Rod", "Sky Rod"];
  const page5Rods = ["Meteor Rod", "Space Rod"];
  const page6Rods = ["Alien Rod"];

  const hasAllPage1 = page1Rods.every((r) => owned.includes(r));
  if (!hasAllPage1) {
    return 1;
  }

  const hasAllPage2 = page2Rods.every((r) => owned.includes(r));
  if (!hasAllPage2) {
    return 2;
  }

  const hasAllPage3 = page3Rods.every((r) => owned.includes(r));
  if (!hasAllPage3) {
    return 3;
  }

  const hasAllPage4 = page4Rods.every((r) => owned.includes(r));
  if (!hasAllPage4) {
    return 4;
  }

  const hasAllPage5 = page5Rods.every((r) => owned.includes(r));
  if (!hasAllPage5) {
    return 5;
  }

  const hasAllPage6 = page6Rods.every((r) => owned.includes(r));
  if (!hasAllPage6) {
    return 6;
  }

  return 6;
}

function getNextUpgradeDetails(state, sleepMs = 3000) {
  const nextRod = getNextRodUpgrade(state);
  const nextBoat = getNextBoatUpgrade(state);

  if (!nextRod && !nextBoat) {
    return null;
  }

  const cpc = state.cashPerClick || 1;
  const avgClickDuration = sleepMs + 320;
  const currentBalance = getVirtualBalance(state);

  let rodEtaMs = Infinity;
  let rodEstClicks = Infinity;
  if (nextRod) {
    const remainingCost = Math.max(0, nextRod.price - currentBalance);
    rodEstClicks = Math.ceil(remainingCost / cpc);
    rodEtaMs = rodEstClicks * avgClickDuration;
  }

  const considerBoat =
    nextBoat && (!nextRod || nextRod.price >= 3 * nextBoat.price);

  if (
    nextRod &&
    (currentBalance >= nextRod.price ||
      rodEtaMs <= 5 * 60 * 1000 ||
      !considerBoat)
  ) {
    return {
      type: "Rod",
      target: nextRod.name,
      cost: nextRod.price,
      remainingCost: Math.max(0, nextRod.price - currentBalance),
      estClicks: rodEstClicks,
      etaMs: rodEtaMs,
      etaStr: formatDuration(rodEtaMs),
    };
  }

  if (considerBoat) {
    const remainingCost = Math.max(0, nextBoat.price - currentBalance);
    const boatEstClicks = Math.ceil(remainingCost / cpc);
    const boatEtaMs = boatEstClicks * avgClickDuration;
    return {
      type: "Boat",
      target: nextBoat.name,
      cost: nextBoat.price,
      remainingCost: remainingCost,
      estClicks: boatEstClicks,
      etaMs: boatEtaMs,
      etaStr: formatDuration(boatEtaMs),
    };
  }

  if (nextRod) {
    return {
      type: "Rod",
      target: nextRod.name,
      cost: nextRod.price,
      remainingCost: Math.max(0, nextRod.price - currentBalance),
      estClicks: rodEstClicks,
      etaMs: rodEtaMs,
      etaStr: formatDuration(rodEtaMs),
    };
  }

  return null;
}

module.exports = {
  getNextRodUpgrade,
  getNextBoatUpgrade,
  formatDuration,
  getUpgradeEta,
  getNextUpgradeEstClicks,
  getRequiredRodsShopPage,
  getNextUpgradeDetails,
};
