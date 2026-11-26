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
//   node scripts/simulate.mjs --visitors 2000 --json out/sim.json  # also save final stats as JSON

import { parseArgs } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createFlagsmithInstance } from '@flagsmith/flagsmith/isomorphic';
import { enrol, trackCtaClick, VARIANTS } from '../src/experiment.js';
import { loadEnv } from './env.mjs';
import { compare } from './stats.mjs';

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
    json: { type: 'string' },                       // write final stats + compare() to this file
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

// Colors only on a real terminal, and never when NO_COLOR is set.
const useColor = !!process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s) => paint('32', s);
const yellow = (s) => paint('33', s);
const dim = (s) => paint('2', s);

const stats = Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, { visits: 0, clicks: 0 }]));
let errors = 0, outside = 0, done = 0;

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

const BAR_WIDTH = 30;
const ctrOf = (s) => (s.visits ? s.clicks / s.visits : 0);

function bar(ctr, maxCtr) {
  const filled = maxCtr > 0 ? Math.round((BAR_WIDTH * ctr) / maxCtr) : 0;
  return '█'.repeat(filled).padEnd(BAR_WIDTH);
}

const signed = (x, digits) => `${x >= 0 ? '+' : ''}${x.toFixed(digits)}`;

function comparisonLines() {
  const r = compare(stats.control, stats.outcome);
  if (r.pA === null || r.pB === null) return [dim('outcome vs control: waiting for visits in both variants')];
  const headline = r.lift === null
    ? 'outcome vs control: lift n/a'
    : `outcome vs control: ${signed(100 * r.lift, 1)}% lift`;
  const pText = r.pValue < 0.0001 ? 'p<0.0001' : `p=${r.pValue.toFixed(4)}`;
  const detail = `(diff ${signed(100 * r.diff, 1)}pp, 95% CI ${signed(100 * r.ci95[0], 1)}pp to ${signed(100 * r.ci95[1], 1)}pp)  ${pText}`;
  const verdict = r.significant ? green('✅ significant') : yellow('⏳ not significant yet');
  const color = r.significant ? green : yellow;
  return [`${color(headline)}  ${dim(detail)}  ${verdict}`];
}

// One plain-English sentence for the final report.
const label = (v) => VARIANTS[v].headline.split(/[.?!]/)[0].trim();

function plainWords() {
  const r = compare(stats.control, stats.outcome);
  if (r.pA === null || r.pB === null) return 'In plain words: not enough visits in both versions yet to call a winner. Keep the test running.';
  if (r.diff === 0) return 'In plain words: both versions got the same click rate so far. Keep the test running.';
  const better = r.diff > 0 ? 'outcome' : 'control';
  const hi = Math.max(r.pA, r.pB), lo = Math.min(r.pA, r.pB);
  const amount = lo > 0 ? `${Math.round(100 * (hi / lo - 1))}%` : `${(100 * (hi - lo)).toFixed(1)} percentage points`;
  const who = `visitors who saw “${label(better)}” clicked ${amount} more often`;
  if (!r.significant) return `In plain words: ${who}, but with this little traffic that could still be luck (p=${r.pValue.toFixed(2)}). Keep the test running.`;
  const chance = r.pValue < 0.001 ? 'less than 1 in 1,000' : `about 1 in ${Math.round(1 / r.pValue)}`;
  return `In plain words: ${who}. A gap this big would show up by chance ${chance} times, so ${better} wins.`;
}

function writeJson() {
  if (!o.json) return;
  mkdirSync(dirname(o.json), { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), stats, compare: compare(stats.control, stats.outcome) };
  writeFileSync(o.json, JSON.stringify(payload, null, 2) + '\n');
}

function report(final = false) {
  const names = Object.keys(stats);
  const maxCtr = Math.max(0, ...names.map((v) => ctrOf(stats[v])));
  const rows = names.map((v) => {
    const s = stats[v];
    return `${v.padEnd(8)} visits ${String(s.visits).padStart(6)}  clicks ${String(s.clicks).padStart(5)}  CTR ${(100 * ctrOf(s)).toFixed(2)}%  ${bar(ctrOf(s), maxCtr)}`;
  });
  console.log([
    final ? '\nDone.' : new Date().toISOString(),
    ...rows,
    '',
    ...comparisonLines(),
    ...(final ? [plainWords()] : []),
    `errors ${errors}${outside ? `  not-enrolled ${outside} (experiment not running or outside rollout %)` : ''}`,
  ].join('\n'));
}

async function guarded() {
  try { await visit(); } catch (e) { errors++; if (!o.quiet) console.error('visit failed:', e.message); }
  finally { done++; }
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
    process.on('SIGINT', () => { clearInterval(tick); report(true); writeJson(); process.exit(0); });
  });
  clearInterval(reportTimer);
} else {
  // Burst mode: N visitors, `concurrency` at a time.
  let next = 0;
  const total = +o.visitors;
  const showProgress = !!process.stdout.isTTY && !o.quiet;
  const progress = showProgress
    ? setInterval(() => process.stdout.write(`\r\x1b[K${dim(`${done}/${total} visitors · ${errors} errors`)}`), 250)
    : null;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < total) { next++; await guarded(); }
  }));
  if (progress) {
    clearInterval(progress);
    process.stdout.write('\r\x1b[K'); // clear the progress line before the report
  }
}
report(true);
writeJson();
process.exit(0);
