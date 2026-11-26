import flagsmith from '@flagsmith/flagsmith';
import { enrol, trackCtaClick, FLAG_KEY, HYPOTHESIS, VARIANTS } from './experiment.js';

const KEY = 'lumen_visitor_id';
const $ = (s) => document.getElementById(s);
const put = (id, text) => { const el = $(id); if (el) el.textContent = text; };
const envKey = import.meta.env.VITE_FLAGSMITH_ENV_KEY;

function visitorId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) { id = 'web_' + crypto.randomUUID(); localStorage.setItem(KEY, id); }
    return id;
  } catch { return 'web_' + crypto.randomUUID(); }
}

function log(text) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toTimeString().slice(0, 8)} ${text}`;
  $('xp-events')?.append(li);
}

const id = visitorId();
const STATUS = { enrolled: 'enrolled', out: 'not enrolled', offline: 'offline · control' };
let result = { variant: 'control', copy: VARIANTS.control, inExperiment: false };
let state = 'offline';

if (envKey) {
  try {
    result = await enrol(flagsmith, {
      environmentID: envKey,
      api: import.meta.env.VITE_FLAGSMITH_API_URL,
      eventsApiUrl: import.meta.env.VITE_FLAGSMITH_EVENTS_URL,
      visitorId: id,
    });
    state = result.inExperiment ? 'enrolled' : 'out';
    log(`identify ${id}`);
    if (result.inExperiment) log(`$flag_exposure ${FLAG_KEY}=${result.variant}`);
  } catch (e) {
    console.error('Flagsmith init failed, showing control', e);
  }
}

const { variant, copy } = result;
const hero = document.querySelector('.hero');
if (hero) hero.dataset.variant = variant;
put('headline', copy.headline);
put('sub', copy.sub);
put('cta', copy.cta);
const cta = $('cta');
if (cta) cta.disabled = false;

$('xp')?.setAttribute('data-state', state);
if ($('xp') && matchMedia('(max-width: 640px)').matches) $('xp').open = false; // don't cover the page on phones
const xpStatus = $('xp-status');
if (xpStatus) { xpStatus.textContent = STATUS[state]; xpStatus.dataset.state = state; }
put('xp-hypothesis', HYPOTHESIS);
put('xp-flag', FLAG_KEY);
const visitor = $('xp-visitor');
if (visitor) { visitor.textContent = id.slice(0, 13) + '…'; visitor.title = id; }
const variantEl = $('xp-variant');
if (variantEl) { variantEl.textContent = variant; variantEl.dataset.variant = variant; }

$('xp-reset')?.addEventListener('click', () => {
  try { localStorage.removeItem(KEY); } catch { /* storage blocked: reload anyway */ }
  location.reload();
});

cta?.addEventListener('click', async () => {
  try {
    if (state === 'offline') log('cta_click (offline, not sent)');
    else { trackCtaClick(flagsmith); await flagsmith.flushEvents(); log('cta_click → flushed'); }
  } catch (e) {
    console.warn('CTA tracking failed', e);
  }
  cta.hidden = true;
  const thanks = $('thanks');
  if (thanks) thanks.hidden = false;
});

addEventListener('pagehide', () => {
  if (envKey) flagsmith.flushEvents();
});
