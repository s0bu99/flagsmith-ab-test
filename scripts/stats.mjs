// Two-proportion comparison for the A/B test report. Dependency-free.
// a = control, b = outcome (or any baseline / treatment pair): { visits, clicks }.

// Standard normal CDF via the Abramowitz & Stegun 7.1.26 erf approximation
// (absolute error < 1.5e-7, plenty for reporting p-values).
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * Compare two conversion rates.
 * Returns pA, pB, lift (relative, b vs a), diff (pB - pA), ci95 ([lo, hi] absolute
 * difference, unpooled SE), z and pValue (pooled two-proportion z-test, two-sided),
 * and significant (pValue < 0.05). Zero visits yields nulls and significant: false.
 */
export function compare(a, b) {
  const nA = a.visits, cA = a.clicks, nB = b.visits, cB = b.clicks;
  const pA = nA > 0 ? cA / nA : null;
  const pB = nB > 0 ? cB / nB : null;
  if (pA === null || pB === null) {
    return { pA, pB, lift: null, diff: null, ci95: null, z: null, pValue: null, significant: false };
  }

  const diff = pB - pA;
  const lift = pA > 0 ? diff / pA : null;

  // 95% CI for the absolute difference, unpooled standard error.
  const seU = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
  const ci95 = [diff - 1.96 * seU, diff + 1.96 * seU];

  // Pooled two-proportion z-test under H0: pA = pB.
  const pooled = (cA + cB) / (nA + nB);
  const seP = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  let z = 0, pValue = 1;
  if (seP > 0) {
    z = diff / seP;
    pValue = Math.min(1, Math.max(0, 2 * (1 - normCdf(Math.abs(z)))));
  }

  return { pA, pB, lift, diff, ci95, z, pValue, significant: pValue < 0.05 };
}
