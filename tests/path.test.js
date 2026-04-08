const test = require('node:test');
const assert = require('node:assert/strict');
const { expandHome } = require('../src/lib/path');

test('expandHome expands leading ~', () => {
  const out = expandHome('~/Downloads');
  assert.ok(out.includes('/Downloads'));
});
