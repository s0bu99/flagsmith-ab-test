// Shared experiment logic. Used by the landing page (browser) AND the traffic
// simulator (Node), so simulated visits run the exact same Flagsmith code path.

export const FLAG_KEY = 'hero_cta'; // multivariate flag, control value = "control"
export const CONVERSION_EVENT = 'cta_click'; // metric event name in Flagsmith

export const HYPOTHESIS =
  'Outcome-framed copy ("Get paid 2x faster") gets more visitors to click the CTA than feature-framed copy ("Automated invoice reminders").';

export const VARIANTS = {
  control: {
    headline: 'Automated invoice reminders for freelancers',
    sub: 'Lumen sends scheduled reminder emails for unpaid invoices.',
    cta: 'Sign up',
  },
  outcome: {
    headline: 'Get paid 2x faster. Skip the awkward emails.',
    sub: 'Lumen politely chases late invoices so you never have to.',
    cta: 'Get paid faster →',
  },
};

/**
 * Initialise a Flagsmith client for one visitor and enrol them in the experiment.
 * Returns { variant, copy }. getExperimentFlag() records the $flag_exposure event.
 */
export async function enrol(flagsmith, { environmentID, api, eventsApiUrl, visitorId }) {
  await flagsmith.init({
    environmentID,
    ...(api && { api }),
    enableEvents: true,
    ...(eventsApiUrl && { eventProcessorConfig: { eventsApiUrl } }),
    identity: visitorId,
    cacheFlags: false,
    enableAnalytics: false,
  });
  const flag = flagsmith.getExperimentFlag(FLAG_KEY);
  const variant = VARIANTS[flag?.value] ? flag.value : 'control';
  return { variant, copy: VARIANTS[variant], inExperiment: !!flag?.experiment?.inExperiment };
}

/** Record the primary metric. */
export function trackCtaClick(flagsmith) {
  flagsmith.trackEvent(CONVERSION_EVENT);
}
