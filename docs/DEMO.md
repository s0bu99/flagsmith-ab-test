# Demo video script (2 minutes)

The demo shows one real experiment from start to finish: the flag, the page, a click, the traffic, and the result.

Tip: open `?preview=control` and `?preview=outcome` in two tabs to show both variants side by side without sending events.

## Pre-recording checklist

- [ ] Experiment `hero_cta` is launched in Flagsmith (running, 100% rollout, even split).
- [ ] Warehouse is connected for the environment (Environment Settings > Warehouse).
- [ ] `cta_click` metric exists and shows data.
- [ ] `.env` exists (copied from `.env.example`) with `VITE_FLAGSMITH_ENV_KEY` set.
- [ ] `npm install` has been run.
- [ ] Some traffic is already in the experiment, so the results page is not empty. Run the simulator for a while before recording, and check that both variants show visits. Warehouse data can lag, so check the day before.
- [ ] Browser zoom at 110%.
- [ ] Other tabs and windows closed. Notifications off.
- [ ] Terminal font enlarged and window sized so the simulator output is readable.
- [ ] Dev server running in its own terminal tab (`npm run dev`).

## Terminal commands

```bash
# Terminal 1: landing page (http://localhost:5173)
npm run dev

# Terminal 2: steady simulated traffic, 60 visitors per minute, until stopped
npm run simulate -- --rate 60 --forever
```

Stop the simulator with Ctrl+C. It prints a final summary before it exits.

## Shot list

| Time | On screen | Say |
|---|---|---|
| 0:00-0:15 | Lumen landing page, hero visible | "Does the wording of one headline change whether people click? I tested it with Flagsmith Experimentation." |
| 0:15-0:30 | Lumen page, zoom on the headline | "The question: feature-framed copy or outcome-framed copy. My bet is that outcome copy wins. That is the hypothesis." |
| 0:30-0:50 | Flagsmith: `hero_cta` flag, then the experiment and the `cta_click` metric | "One multivariate flag, two values, one experiment, one metric. The metric is whether a visitor clicked the button at least once." |
| 0:50-1:15 | Back to the page. Click "New visitor" until both variants appear | "Each visitor gets a stable id and a bucket. The New visitor button resets my identity so you can see both sides." |
| 1:15-1:30 | Click the CTA. Show the event log | "The click sends `cta_click`. The log shows identify, the exposure, and the click, in the order they happened." |
| 1:30-1:45 | Terminal 2 running the simulator | "This is simulated traffic. Each fake visitor runs the same code as the page. Only the decision to click is simulated." |
| 1:45-1:55 | Flagsmith experiment results page | "Here are the results so far. Visits and clicks per variant, and the lift with its confidence interval." |
| 1:55-2:00 | Results page, or title card | "The result: [one line, from the real numbers]. What I learned: [one line]. Code and the live page are linked below." |

The result line at the end should come from the real numbers on screen at the time of recording. Do not read a number from memory.

## Honesty note for the video

Say it once, out loud, in the simulator section: the clicks are simulated, while the flag, the exposures, the events and the results all go through the real Flagsmith pipeline. A viewer should never be left thinking the traffic came from real people.
