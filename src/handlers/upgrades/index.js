"use strict";

const rodBoatUpgrades = require("./rodBoatUpgrades");
const boostUpgrades = require("./boostUpgrades");

module.exports = {
  ...rodBoatUpgrades,
  ...boostUpgrades,
};
