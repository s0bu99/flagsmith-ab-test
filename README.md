# Lumen: a real A/B test with Flagsmith Experimentation

A tiny landing page for a fictional invoicing tool, with two versions of the hero
section behind one Flagsmith multivariate flag, measured with Flagsmith
Experimentation. Built for the Flagsmith hackathon, Track 1 "Test Something Real".

## The experiment

| | |
|---|---|
| **Hypothesis** | Outcome-framed copy ("Get paid 2x faster") gets more visitors to click the CTA than feature-framed copy ("Automated invoice reminders"). |
| **Flag** | `hero_cta` (multivariate). Control value `control`, variation `outcome`. |
| **Primary metric** | `cta_click`, aggregation **Occurrence** (did the visitor click at least once), direction **increase**. |
| **Exposure** | `getExperimentFlag('hero_cta')` on page load records `$flag_exposure`. |
| **Unit** | Visitor (anonymous id stored in localStorage, sent as the Flagsmith identity). |

Why this metric: it fires within seconds of a visit, so a few days of traffic is enough to read a result.

## How it works

```
src/experiment.js   shared logic: enrol (identify + getExperimentFlag) and trackCtaClick
src/main.js         landing page: renders the variant, sends cta_click on click
scripts/simulate.mjs  simulated visitors that run the same experiment.js code
```

The simulator gives each fake visitor its own Flagsmith identity and client, so
exposures and conversions go through the real Flagsmith events pipeline. Only the
human decision (click or not) is simulated, using a per-variant click rate.

## Setup

1. **Flagsmith** (cloud, or self-hosted with `EXPERIMENTATION_ENABLED=true`):
   1. Connect a warehouse for the environment (Environment Settings > Warehouse). The managed Flagsmith warehouse is fine.
   2. Create the multivariate flag `hero_cta` with value `control` and one variation `outcome`.
   3. Create a metric: event `cta_click`, aggregation Occurrence, direction increase.
   4. Create the experiment on `hero_cta`: 100% rollout, split evenly, primary metric `cta_click`. Launch it.
2. **App**
   ```bash
   cp .env.example .env      # paste your client-side environment key
   npm install
   npm run dev               # http://localhost:5173
   ```
3. **Traffic**
   ```bash
   npm run simulate -- --visitors 500                 # one burst
   npm run simulate -- --rate 20 --forever            # steady 20 visitors/min
   npm run simulate -- --visitors 1000 --dry-run      # offline sanity check
   ```
   Tune the simulated effect with `SIM_P_CONTROL` / `SIM_P_OUTCOME` (default 8% vs 11%).

Requires `@flagsmith/flagsmith` 12.4.0 or later (events support).

## Self-hosted

Flagsmith docs say Experimentation works in the open source and enterprise editions with
no edition restriction. Set `EXPERIMENTATION_ENABLED=true` on the API. With the Flagsmith
database as the warehouse (PostgreSQL only, meant for evaluation), point the events URL
at your API: `VITE_FLAGSMITH_EVENTS_URL=https://<host>/api/`.

## License

MIT
