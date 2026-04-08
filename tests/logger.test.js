const test = require('node:test');
const assert = require('node:assert/strict');
const { formatLotLog } = require('../src/lib/logger');

test('formatLotLog wraps lotLabel', () => {
  assert.equal(formatLotLog(1, 100), "First lot of 100 content id's processed successfully");
});
