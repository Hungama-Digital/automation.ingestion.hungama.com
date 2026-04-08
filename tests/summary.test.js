const test = require('node:test');
const assert = require('node:assert/strict');
const { createSummary, updateSummary, formatRunHeader, formatRunSummary } = require('../src/lib/summary');

test('updateSummary counts statuses', () => {
  const summary = createSummary(3);
  updateSummary(summary, ['SUCCESS', 'MISSING_MEDIA_STRING', 'ERROR', null]);
  assert.deepEqual(summary, {
    total: 3,
    success: 1,
    missingMedia: 1,
    missingToken: 0,
    missingMdn: 0,
    missingFilename: 0,
    error: 1,
    unknown: 1
  });
});

test('formatRunHeader includes totals', () => {
  const header = formatRunHeader(500, 5, 100);
  assert.equal(header, 'Loaded 500 rows across 5 lots of 100.');
});

test('formatRunSummary includes counts', () => {
  const summary = createSummary(2);
  summary.success = 1;
  summary.error = 1;
  const line = formatRunSummary(summary);
  assert.ok(line.includes('Total rows: 2'));
  assert.ok(line.includes('Success: 1'));
  assert.ok(line.includes('Errors: 1'));
});
