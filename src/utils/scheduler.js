"use strict";

const {
  interruptibleSleep,
  randomBetween,
  weightedPick,
} = require("./helpers");
const { loadState, updateState } = require("./state");

const REST_TYPES = [
  {
    type: "break",
    label: "Break",
    emoji: "☕",
    minGapMs: 45 * 60 * 1000,
    maxGapMs: 120 * 60 * 1000,
    minDurMs: 5 * 60 * 1000,
    maxDurMs: 20 * 60 * 1000,
    weight: 0.6,
  },
  {
    type: "meal",
    label: "Meal break",
    emoji: "🍽",
    minGapMs: 180 * 60 * 1000,
    maxGapMs: 360 * 60 * 1000,
    minDurMs: 20 * 60 * 1000,
    maxDurMs: 60 * 60 * 1000,
    weight: 0.3,
  },
  {
    type: "sleep",
    label: "Sleep",
    emoji: "😴",
    minGapMs: 720 * 60 * 1000,
    maxGapMs: 1200 * 60 * 1000,
    minDurMs: 300 * 60 * 1000,
    maxDurMs: 540 * 60 * 1000,
    weight: 0.1,
  },
];

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function fmtDateTime(ts) {
  return new Date(ts).toLocaleString();
}

function scheduleNextRest() {
  const rt = weightedPick(REST_TYPES);
  const now = Date.now();

  const gap = randomBetween(rt.minGapMs, rt.maxGapMs);
  const dur = randomBetween(rt.minDurMs, rt.maxDurMs);
  const nextRestStart = now + gap;
  const nextRestEnd = nextRestStart + dur;

  const state = updateState((s) => {
    s.nextRestStart = nextRestStart;
    s.nextRestEnd = nextRestEnd;
    s.restType = rt.type;
  });

  console.log(
    `[RestScheduler] ${rt.emoji}  Next rest scheduled → ` +
      `${rt.label} at ${fmtTime(nextRestStart)} ` +
      `(in ${fmtMs(gap)}, duration ${fmtMs(dur)})`,
  );

  return state;
}

async function checkAndDoRest() {
  let state = loadState();

  if (!state || state.nextRestStart === 0) {
    state = scheduleNextRest();
    return;
  }

  const now = Date.now();

  if (now >= state.nextRestEnd) {
    state = scheduleNextRest();
    return;
  }

  if (now >= state.nextRestStart) {
    const rt =
      REST_TYPES.find((r) => r.type === state.restType) ?? REST_TYPES[0];
    const remaining = state.nextRestEnd - now;

    console.log("");
    console.log(`[RestScheduler] ${rt.emoji}  ${rt.label} is active.`);
    console.log(
      `[RestScheduler]    Resumes at: ${fmtDateTime(state.nextRestEnd)}`,
    );
    console.log(`[RestScheduler]    Remaining:  ${fmtMs(remaining)}`);
    console.log(
      `[RestScheduler]    Type "continue" to skip this rest and resume now.`,
    );
    console.log("");

    const skipped = await interruptibleSleep(remaining);

    if (skipped) {
      console.log(
        `[RestScheduler] ${rt.emoji}  Rest skipped — resuming now.\n`,
      );
    } else {
      console.log(`[RestScheduler] ${rt.emoji}  Rest finished — resuming.\n`);
    }

    scheduleNextRest();
    return;
  }

  const timeUntil = state.nextRestStart - now;
  const rt = REST_TYPES.find((r) => r.type === state.restType) ?? REST_TYPES[0];

  if (timeUntil <= 5 * 60 * 1000) {
    console.log(
      `[RestScheduler] ⏰  ${rt.label} starting in ${fmtMs(timeUntil)} ` +
        `at ${fmtTime(state.nextRestStart)}.`,
    );
  }
}

module.exports = { checkAndDoRest, scheduleNextRest };
