# Does outcome copy beat feature copy on a landing page? A Flagsmith A/B test

I built a small landing page for a made-up invoicing tool called Lumen, and I tested two versions of its hero headline with Flagsmith Experimentation. This is my entry for Track 1, "Test Something Real."

## The problem

Landing page copy usually gets picked by whoever argues loudest in the meeting. I wanted to know whether the wording of the headline changes how many visitors click the call to action, and I wanted the answer to come from a metric, not an opinion.

## Hypothesis

Outcome-framed copy ("Get paid 2x faster. Skip the awkward emails.") gets more visitors to click the CTA than feature-framed copy ("Automated invoice reminders for freelancers").

## Setup in Flagsmith

- **Flag:** `hero_cta`, a multivariate flag. Control value `control`, one variation `outcome`.
- **Exposure:** the page calls `getExperimentFlag('hero_cta')` on load, which records `$flag_exposure`.
- **Unit:** an anonymous visitor id stored in the browser and sent as the Flagsmith identity.
- **Metric:** event `cta_click`, aggregation Occurrence (did the visitor click at least once), direction increase.
- **Experiment:** on `hero_cta`, 100% rollout, split evenly, primary metric `cta_click`.

I picked Occurrence because it fires within seconds of a visit, so a few days of traffic is enough to read something.

## How the traffic was generated, and why it is honest

The traffic comes from a simulator in `scripts/simulate.mjs`. Each simulated visitor gets its own Flagsmith client and runs the same `enrol()` and `trackCtaClick()` functions the landing page uses, in `src/experiment.js`. So identities, exposures and click events go through the real Flagsmith events pipeline, and the flag is evaluated for real.

The one part that is simulated is the human decision: whether a visitor clicks. Clicks are drawn from a rate per variant. The defaults are 8% for control and 11% for outcome, and you can change them with environment variables.

I did it this way because I could not wait for strangers to click, and faking clicks on a live page would be worse. But this has a consequence. I set the click rates, so the lift in these results reflects my choice of rates. The results show that the plumbing works. They do not show how real visitors would react to the copy.

## Results

- Visits per variant: TODO (control) / TODO (outcome)
- Click-through rate: TODO% (control) / TODO% (outcome)
- Relative lift: TODO
- 95% confidence interval: TODO
- p-value and verdict: TODO
- Screenshot of the results page: TODO

## What I learned

TODO: Angle 1. Pick one: what surprised you in the setup (for example, exposure timing, event flushing on page hide, or warehouse lag), with one concrete example.

TODO: Angle 2. Pick one: what a simulated test can and cannot tell you, and what you would run next with real traffic.

## Links

- Repo: TODO
- Demo video: TODO
- Live page: TODO
