# Fish Auto-Bot

A specialized Discord selfbot for Virtual Fisher, designed to automate fishing, manage upgrades, and provide a clean interface for mobile users.

## Features

- **Auto-Fishing**: Automatically detects fishing embeds and clicks the appropriate buttons to catch fish and sell them.
- **Economy Management**: Keeps track of your balance, cash per click, and total earnings.
- **Smart Upgrades**: Automatically purchases the next best rod or boat when affordable, prioritizing progression.
- **Boost Management**: Automatically uses Gold and Emerald fish to maintain active boosts.
- **Mobile-Optimized TUI**: A custom Terminal User Interface designed to fit perfectly on mobile screens (Termux/SSH).
- **Cooldown Manager**: Synchronizes with game cooldowns and includes human-like delays to reduce detection risk.
- **Upgrade ETAs**: Calculates the estimated time and number of clicks required to reach the next significant upgrade.
- **Captcha Handling**: Basic automated bypass for Level 1 captchas.

## Project Status

| Feature | Status |
|---------|--------|
| Auto-buy Rods | ✅ Done |
| Auto-buy Boats | ✅ Done |
| Auto-buy Boosts | ✅ Done |
| Fishing Cooldown Manager | ✅ Done |
| Upgrade ETA Calculations | ✅ Done |
| Auto-buy Bait | ❌ To-do |
| Auto-buy Upgrades | ❌ To-do |
| Auto Prestige | ❌ To-do |
| TUI | ⚠️ Partly done (Optimized for Mobile) |
| Captcha Bypass | ⚠️ Level 1 Only |

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your token and channel ID in `src/config/index.js`.
3. Start the bot:
   ```bash
   npm start
   ```

## Workflow

The bot operates in a cycle:
1. **Startup**: Syncs your current rods, boats, and buffs with the game shop.
2. **Fishing**: Sends the `/fish` command and monitors for embeds.
3. **Interacting**: Clicks the fishing buttons as they appear.
4. **Selling**: Automatically sells fish once the threshold is reached.
5. **Upgrading**: Checks if a new rod or boat can be purchased after selling.
6. **Resting**: Periodically takes breaks to simulate human behavior.

## Disclaimer

This is a selfbot. Use it at your own risk. Automating Discord accounts is against their Terms of Service and can lead to account suspension.
