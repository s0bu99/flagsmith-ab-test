import flagsmith from '@flagsmith/flagsmith';
import { enrol, trackCtaClick } from './experiment.js';

function visitorId() {
  const key = 'lumen_visitor_id';
  try {
    let id = localStorage.getItem(key);
    if (!id) { id = 'web_' + crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  } catch { return 'web_' + crypto.randomUUID(); }
}

const env = import.meta.env;
const id = visitorId();
const $ = (s) => document.getElementById(s);

let result;
try {
  result = await enrol(flagsmith, {
    environmentID: env.VITE_FLAGSMITH_ENV_KEY,
    api: env.VITE_FLAGSMITH_API_URL,
    eventsApiUrl: env.VITE_FLAGSMITH_EVENTS_URL,
    visitorId: id,
  });
} catch (e) {
  console.error('Flagsmith init failed, showing control', e);
  const { VARIANTS } = await import('./experiment.js');
  result = { variant: 'control', copy: VARIANTS.control, inExperiment: false };
}

document.querySelector('.hero').dataset.variant = result.variant;
$('headline').textContent = result.copy.headline;
$('sub').textContent = result.copy.sub;
$('cta').textContent = result.copy.cta;
$('cta').disabled = false;
$('debug').textContent = `visitor ${id} · variant ${result.variant}${result.inExperiment ? ' · enrolled' : ''}`;

$('cta').addEventListener('click', async () => {
  trackCtaClick(flagsmith);
  await flagsmith.flushEvents();
  $('cta').hidden = true;
  $('thanks').hidden = false;
});

addEventListener('pagehide', () => { flagsmith.flushEvents(); });
