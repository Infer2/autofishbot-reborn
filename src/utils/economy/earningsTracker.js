"use strict";

const { updateState } = require("../state");

function updateStateAfterSell(newBalance) {
  updateState((state) => {
    const prevBalance = state.lastSellBalance || state.balance;
    const clicks = state.clicks || 1;
    const spending = state.totalSpending || 0;
    const earnings = Math.max(0, newBalance - (prevBalance - spending));
    const cpc = earnings / clicks;

    state.balance = newBalance;
    state.lastSellBalance = newBalance;
    state.clicks = 0;
    state.totalSpending = 0;

    if (state.cashPerClick > 0) {
      state.cashPerClick = parseFloat(
        (state.cashPerClick * 0.7 + cpc * 0.3).toFixed(2),
      );
    } else {
      state.cashPerClick = parseFloat(cpc.toFixed(2));
    }
  });
}

module.exports = {
  updateStateAfterSell,
};
