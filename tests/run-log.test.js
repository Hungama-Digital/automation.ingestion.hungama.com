const test = require('node:test');
const assert = require('node:assert/strict');
const { formatLogTimestamp, buildRunLogPath } = require('../src/lib/run-log');

test('formatLogTimestamp returns YYYYMMDD_HHMMSS', () => {
  const date = new Date(2026, 3, 8, 10, 20, 30);
  assert.equal(formatLogTimestamp(date), '20260408_102030');
});

test('buildRunLogPath uses timestamped filename', () => {
  const date = new Date(2026, 3, 8, 10, 20, 30);
  const out = buildRunLogPath('/tmp/logs', date);
  assert.equal(out, '/tmp/logs/missing_entries_20260408_102030.log');
});
