#!/usr/bin/env node
// Creates the hero_cta multivariate flag in Flagsmith via the Admin REST API.
// Request shapes checked against Flagsmith source: api/features/serializers.py
// (ListFeatureSerializer / CreateFeatureSerializer accept multivariate_options),
// api/environments/serializers.py (api_key), and paginated list responses.
//
//   node scripts/setup.mjs             # create the flag if missing
//   node scripts/setup.mjs --dry-run   # print the requests, no network

import { parseArgs } from 'node:util';
import { loadEnv } from './env.mjs';
import { FLAG_KEY, HYPOTHESIS } from '../src/experiment.js';

loadEnv();
const { values: o } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });
const cfg = {
  key: process.env.FLAGSMITH_ADMIN_KEY,
  project: process.env.FLAGSMITH_PROJECT_ID,
  base: process.env.FLAGSMITH_ADMIN_URL || 'https://api.flagsmith.com/api/v1/',
};

if (!cfg.key || !cfg.project) {
  console.error('Setup needs values in .env (copy from .env.example):\n');
  if (!cfg.key) console.error('  FLAGSMITH_ADMIN_KEY=<organisation API key>\n    Flagsmith > Organisation Settings > API Keys. Not the client-side environment key.\n');
  if (!cfg.project) console.error('  FLAGSMITH_PROJECT_ID=<numeric project id>\n    The number in your project URL: .../project/<id>/...\n');
  console.error('Self-hosted only: FLAGSMITH_ADMIN_URL=http://localhost:8000/api/v1/');
  process.exit(1);
}

const P = `projects/${cfg.project}`;
const headers = { Authorization: `Api-Key ${cfg.key}`, 'Content-Type': 'application/json' };

// Logs the request in dry-run mode, otherwise performs it. Throws with status and body on failure.
async function api(method, path, body) {
  const url = new URL(path, cfg.base).toString();
  if (o['dry-run']) {
    console.log(`${method} ${url}${body ? `\n${JSON.stringify(body, null, 2)}` : ''}`);
    return null;
  }
  const res = await fetch(url, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} failed: HTTP ${res.status}\n${text}`);
  return text ? JSON.parse(text) : null;
}

// List endpoints are paginated ({ results: [...] }); accept a bare array too.
const items = (data) => data?.results ?? data ?? [];

async function main() {
  const features = items(await api('GET', `${P}/features/?search=${FLAG_KEY}`));
  const existing = features.find((f) => f.name === FLAG_KEY);
  if (existing) {
    console.log(`Flag "${FLAG_KEY}" already exists (id ${existing.id}). Skipping.`);
  } else {
    const created = await api('POST', `${P}/features/`, {
      name: FLAG_KEY,
      type: 'MULTIVARIATE',
      initial_value: 'control',
      default_enabled: true,
      description: HYPOTHESIS,
      multivariate_options: [
        { type: 'unicode', string_value: 'outcome', default_percentage_allocation: 50 },
      ],
    });
    if (!o['dry-run']) console.log(`Created flag "${FLAG_KEY}" (id ${created?.id}).`);
  }

  const envs = items(await api('GET', `environments/?project=${cfg.project}`));
  if (!o['dry-run']) {
    console.log('\nEnvironment keys (client-side). Paste one into .env as VITE_FLAGSMITH_ENV_KEY:');
    for (const e of envs) console.log(`  ${e.name}: ${e.api_key}`);
  }

  console.log(`
Manual steps (Experimentation has no stable public API yet):
  1. Connect a warehouse: Environment Settings > Warehouse (the managed one is fine).
  2. Create metric "cta_click": event cta_click, aggregation Occurrence, direction increase.
  3. Create experiment on ${FLAG_KEY}: 100% rollout, split 50/50, primary metric cta_click. Launch it.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
