const test = require('node:test');
const assert = require('node:assert/strict');
const { mapWithConcurrency } = require('../src/lib/concurrency');

test('mapWithConcurrency respects limit', async () => {
  let inFlight = 0;
  let max = 0;
  const items = [1, 2, 3, 4, 5];
  const results = await mapWithConcurrency(items, 2, async (n) => {
    inFlight++;
    max = Math.max(max, inFlight);
    await new Promise((r) => setTimeout(r, 10));
    inFlight--;
    return n * 2;
  });
  assert.equal(max <= 2, true);
  assert.deepEqual(results, [2, 4, 6, 8, 10]);
});
