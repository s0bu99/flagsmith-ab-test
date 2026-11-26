#!/usr/bin/env node
// Simulated traffic for the hero_cta experiment.
// Each simulated visitor gets its own Flagsmith client and goes through the same
// enrol() / trackCtaClick() code as the real landing page (src/experiment.js).
// The only simulated part is the human: whether they click, based on a per-variant
// click probability you set. Real users can hit the page at the same time.
//
//   node scripts/simulate.mjs --visitors 500
//   node scripts/simulate.mjs --rate 30 --forever          # 30 visitors/min until stopped
//   node scripts/simulate.mjs --visitors 2000 --dry-run    # no Flagsmith, sanity check only

import { parseArgs } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { createFlagsmithInstance } from '@flagsmith/flagsmith/isomorphic';
import { enrol, trackCtaClick, VARIANTS } from '../src/experiment.js';
import { loadEnv } from './env.mjs';

loadEnv();
const { values: o } = parseArgs({
  options: {
    visitors: { type: 'string', default: '200' },
    rate: { type: 'string' },                       // visitors per minute (paced mode)
    forever: { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '10' },
    'p-control': { type: 'string', default: process.env.SIM_P_CONTROL ?? '0.08' },
    'p-outcome': { type: 'string', default: process.env.SIM_P_OUTCOME ?? '0.11' },
    'dry-run': { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});

const P = { control: +o['p-control'], outcome: +o['p-outcome'] };
const env = {
  environmentID: process.env.FLAGSMITH_ENV_KEY || process.env.VITE_FLAGSMITH_ENV_KEY,
  api: process.env.FLAGSMITH_API_URL || process.env.VITE_FLAGSMITH_API_URL,
  eventsApiUrl: process.env.FLAGSMITH_EVENTS_URL || process.env.VITE_FLAGSMITH_EVENTS_URL,
};
if (!o['dry-run'] && !env.environmentID) {
  console.error('Missing FLAGSMITH_ENV_KEY (see .env.example), or pass --dry-run.');
  process.exit(1);
}

const stats = Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, { visits: 0, clicks: 0 }]));
let errors = 0, outside = 0;

async function visit() {
  const visitorId = 'sim_' + randomUUID();
  let variant, inExperiment = true, fs;
  if (o['dry-run']) {
    variant = createHash('md5').update(visitorId).digest()[0] % 2 ? 'outcome' : 'control';
  } else {
    fs = createFlagsmithInstance();
    ({ variant, inExperiment } = await enrol(fs, { ...env, visitorId }));
  }
  if (!inExperiment) outside++;
  stats[variant].visits++;
  // Think time before deciding (keeps events spread out like real visits).
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 1500));
  if (Math.random() < P[variant]) {
    stats[variant].clicks++;
    if (fs) trackCtaClick(fs);
  }
  if (fs) await fs.close(10000);
}

function report(final = false) {
  const rows = Object.entries(stats).map(([v, s]) =>
    `${v.padEnd(8)} visits ${String(s.visits).padStart(6)}  clicks ${String(s.clicks).padStart(5)}  CTR ${(s.visits ? (100 * s.clicks) / s.visits : 0).toFixed(2)}%`);
  console.log(`${final ? '\nDone.' : new Date().toISOString()}\n${rows.join('\n')}` +
    `\nerrors ${errors}${outside ? `  not-enrolled ${outside} (experiment not running or outside rollout %)` : ''}`);
}

async function guarded() {
  try { await visit(); } catch (e) { errors++; if (!o.quiet) console.error('visit failed:', e.message); }
}

const concurrency = +o.concurrency;
if (o.rate) {
  // Paced mode: N visitors per minute, optionally forever.
  const gap = 60000 / +o.rate;
  let launched = 0, inflight = 0;
  const total = o.forever ? Infinity : +o.visitors;
  const reportTimer = setInterval(report, 60000);
  await new Promise((done) => {
    const tick = setInterval(() => {
      if (launched >= total) { clearInterval(tick); const w = setInterval(() => { if (!inflight) { clearInterval(w); done(); } }, 200); return; }
      if (inflight >= concurrency * 5) return; // back off if Flagsmith is slow
      launched++; inflight++;
      guarded().finally(() => inflight--);
    }, gap);
    process.on('SIGINT', () => { clearInterval(tick); report(true); process.exit(0); });
  });
  clearInterval(reportTimer);
} else {
  // Burst mode: N visitors, `concurrency` at a time.
  let next = 0;
  const total = +o.visitors;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < total) { next++; await guarded(); }
  }));
}
report(true);
process.exit(0);
