"use strict";

const parser = require("./economyParser");
const upgradeCalculator = require("./upgradeCalculator");
const earningsTracker = require("./earningsTracker");

module.exports = {
  ...parser,
  ...upgradeCalculator,
  ...earningsTracker,
};
