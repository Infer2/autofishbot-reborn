"use strict";

require("dotenv").config();

const RODS = [
  { name: "Plastic Rod", price: 0 },
  { name: "Improved Rod", price: 500 },
  { name: "Steel Rod", price: 8000 },
  { name: "Fiberglass Rod", price: 50000 },
  { name: "Heavy Rod", price: 100000 },
  { name: "Alloy Rod", price: 250000 },
  { name: "Lava Rod", price: 1000000 },
  { name: "Magma Rod", price: 10000000 },
  { name: "Oceanium Rod", price: 75000000 },
  { name: "Golden Rod", price: 120000000 },
  { name: "Superium Rod", price: 250000000 },
  { name: "Infinity Rod", price: 1000000000 },
  { name: "Floating Rod", price: 50000000000 },
  { name: "Sky Rod", price: 250000000000 },
  { name: "Meteor Rod", price: 500000000000 },
  { name: "Space Rod", price: 1000000000000 },
  { name: "Alien Rod", price: 5000000000000 },
];

const BOATS = [
  { name: "Rowboat", price: 0 },
  { name: "Fishing Boat", price: 25000 },
  { name: "Speedboat", price: 100000 },
  { name: "Pontoon", price: 250000 },
  { name: "Sailboat", price: 1000000 },
  { name: "Yacht", price: 20000000 },
];

module.exports = {
  TOKEN: process.env.TOKEN || "",
  CHANNEL_ID: process.env.CHANNEL_ID || "",
  SLEEP_MS: parseInt(process.env.SLEEP_MS) || 3000,
  RODS,
  BOATS,
};
