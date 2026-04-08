const test = require('node:test');
const assert = require('node:assert/strict');
const { lotLabel } = require('../src/lib/ordinal');

test('lotLabel formats first and second', () => {
  assert.equal(lotLabel(1, 100), "First lot of 100 content id's processed successfully");
  assert.equal(lotLabel(2, 100), "Second lot of 100 content id's processed successfully");
});
