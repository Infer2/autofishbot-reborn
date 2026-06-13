'use strict';

require('./utils/discord');
require('./utils/tui');

const { signal } = require('./utils/helpers');
const { start, stop } = require('./core/bot');

// Handle hot-reloading/restarts by clearing module cache
signal.on('restart', async () => {
    console.log('[System] 🔄  Rebooting bot...');

    try {
        stop();

        const modulesToPurge = [
            './config',
            './core/bot',
            './handlers/fishing',
            './handlers/fishingClicker',
            './handlers/fishingChecker',
            './handlers/upgrades',
            './handlers/captcha',
            './utils/economy',
            './utils/economyParser',
            './utils/economyCalculator',
            './utils/helpers',
            './utils/discord',
            './utils/state',
            './utils/scheduler',
            './utils/tui'
        ];

        for (const mod of modulesToPurge) {
            try {
                const resolved = require.resolve(mod);
                delete require.cache[resolved];
            } catch (e) {}
        }

        console.log('[System] 🧹 Module cache cleared.');

        require('./utils/tui');
        const freshBot = require('./core/bot');
        freshBot.start();

        console.log('[System] 🚀 Bot restarted successfully!');
    } catch (err) {
        console.error('[System] ❌ Error during restart:', err.message);
    }
});

start();
