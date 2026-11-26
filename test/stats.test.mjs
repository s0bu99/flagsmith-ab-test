import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../scripts/stats.mjs';

const numericFields = ['pA', 'pB', 'lift', 'diff', 'z', 'pValue'];

test('known values: 8% vs 11% on 1000 visits each is significant (p ~ 0.022)', () => {
  const r = compare({ visits: 1000, clicks: 80 }, { visits: 1000, clicks: 110 });
  assert.ok(Math.abs(r.pA - 0.08) < 1e-12);
  assert.ok(Math.abs(r.pB - 0.11) < 1e-12);
  assert.ok(Math.abs(r.pValue - 0.022) < 0.001, `pValue was ${r.pValue}`);
  assert.equal(r.significant, true);
});

test('equal rates give p ~ 1 and are not significant', () => {
  const r = compare({ visits: 1000, clicks: 100 }, { visits: 1000, clicks: 100 });
  assert.ok(Math.abs(r.pValue - 1) < 1e-6, `pValue was ${r.pValue}`);
  assert.equal(r.diff, 0);
  assert.equal(r.significant, false);
});

test('zero visits in either arm yields nulls and significant false', () => {
  for (const [a, b] of [
    [{ visits: 0, clicks: 0 }, { visits: 100, clicks: 5 }],
    [{ visits: 100, clicks: 5 }, { visits: 0, clicks: 0 }],
    [{ visits: 0, clicks: 0 }, { visits: 0, clicks: 0 }],
  ]) {
    const r = compare(a, b);
    assert.equal(r.pValue, null);
    assert.equal(r.lift, null);
    assert.equal(r.diff, null);
    assert.equal(r.ci95, null);
    assert.equal(r.significant, false);
  }
});

test('zero clicks in both arms produces no NaN', () => {
  const r = compare({ visits: 1000, clicks: 0 }, { visits: 1000, clicks: 0 });
  for (const key of numericFields) {
    if (r[key] !== null) assert.ok(!Number.isNaN(r[key]), `${key} is NaN`);
  }
  assert.ok(r.ci95.every((x) => !Number.isNaN(x)));
  assert.equal(r.lift, null);
  assert.equal(r.pValue, 1);
  assert.equal(r.significant, false);
});

test('ci95 contains the observed difference', () => {
  const r = compare({ visits: 1000, clicks: 80 }, { visits: 1000, clicks: 110 });
  assert.ok(r.ci95[0] < r.diff && r.diff < r.ci95[1]);
  assert.ok(Math.abs(r.diff - 0.03) < 1e-12);
});

test('lift sign follows b vs a', () => {
  const up = compare({ visits: 1000, clicks: 80 }, { visits: 1000, clicks: 110 });
  assert.ok(up.lift > 0);
  assert.ok(Math.abs(up.lift - 0.375) < 1e-9);

  const down = compare({ visits: 1000, clicks: 110 }, { visits: 1000, clicks: 80 });
  assert.ok(down.lift < 0);
});
