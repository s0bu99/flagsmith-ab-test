import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enrol, trackCtaClick, VARIANTS, FLAG_KEY, CONVERSION_EVENT } from '../src/experiment.js';

function fakeFlagsmith(flag) {
  const calls = { init: [], getExperimentFlag: [], trackEvent: [] };
  return {
    calls,
    async init(options) {
      calls.init.push(options);
    },
    getExperimentFlag(key) {
      calls.getExperimentFlag.push(key);
      return flag;
    },
    trackEvent(name) {
      calls.trackEvent.push(name);
    },
  };
}

const opts = { environmentID: 'env_123', visitorId: 'visitor_abc' };

test('enrol: outcome variant, inExperiment true, init gets enableEvents and identity', async () => {
  const fs = fakeFlagsmith({ value: 'outcome', experiment: { inExperiment: true } });
  const result = await enrol(fs, opts);

  assert.equal(result.variant, 'outcome');
  assert.equal(result.inExperiment, true);
  assert.deepEqual(result.copy, VARIANTS.outcome);

  assert.equal(fs.calls.init.length, 1);
  const init = fs.calls.init[0];
  assert.equal(init.enableEvents, true);
  assert.equal(init.identity, 'visitor_abc');
  assert.equal(init.environmentID, 'env_123');

  assert.deepEqual(fs.calls.getExperimentFlag, [FLAG_KEY]);
});

test('enrol: unknown flag value falls back to control', async () => {
  const fs = fakeFlagsmith({ value: 'bogus', experiment: { inExperiment: true } });
  const result = await enrol(fs, opts);

  assert.equal(result.variant, 'control');
  assert.deepEqual(result.copy, VARIANTS.control);
});

test('enrol: null flag falls back to control and not in experiment', async () => {
  const fs = fakeFlagsmith(null);
  const result = await enrol(fs, opts);

  assert.equal(result.variant, 'control');
  assert.equal(result.inExperiment, false);
});

test('trackCtaClick sends the cta_click event', () => {
  const fs = fakeFlagsmith(null);
  trackCtaClick(fs);
  assert.deepEqual(fs.calls.trackEvent, ['cta_click']);
  assert.equal(CONVERSION_EVENT, 'cta_click');
});

test('VARIANTS has exactly control and outcome, each with headline, sub and cta strings', () => {
  assert.deepEqual(Object.keys(VARIANTS).sort(), ['control', 'outcome']);
  for (const name of ['control', 'outcome']) {
    const v = VARIANTS[name];
    for (const field of ['headline', 'sub', 'cta']) {
      assert.equal(typeof v[field], 'string', `${name}.${field} should be a string`);
      assert.ok(v[field].length > 0, `${name}.${field} should be non-empty`);
    }
  }
});
