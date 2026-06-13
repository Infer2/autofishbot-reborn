'use strict';

const parser = require('./economyParser');
const calculator = require('./economyCalculator');

module.exports = {
  ...parser,
  ...calculator
};
