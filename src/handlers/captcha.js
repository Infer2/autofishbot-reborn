'use strict';

const { getEmbedText } = require('../utils/economy');

function extractCaptchaCode(text) {
    let match = text.match(/code:\s*(?:\*\*|`{1,3})?([A-Za-z0-9]+)(?:\*\*|`{1,3})?/i);
    if (match) return match[1];

    match = text.match(/\/verify\s*(?:`{1,3}|\*\*|\s)*([A-Za-z0-9]+)/i);
    if (match) return match[1];

    return null;
}

// Level 2 captcha handling (To-do)
async function captchaLevel2(channel, botId, embed) {
    console.warn('[captchaLevel2] ⚠  Level 2 Captcha detected — awaiting implementation.');
}

// Basic alphanumeric code verification
async function captchaLevel1(channel, botId, embed) {
    const embedText = getEmbedText(embed);
    const code = extractCaptchaCode(embedText);

    if (!code) {
        console.warn('[captchaLevel1] Code not found. Falling back to Level 2.');
        await captchaLevel2(channel, botId, embed);
        return;
    }

    console.log(`[captchaLevel1] 🔐 Code extracted: "${code}"`);
    try {
        await channel.sendSlash(botId, 'verify', code);
        console.log('[captchaLevel1] ✅ Verify command sent.');
    } catch (err) {
        console.error('[captchaLevel1] ❌ Verification failed:', err.message);
    }
}

module.exports = { captchaLevel1, captchaLevel2 };
