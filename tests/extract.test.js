const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFirstUrl } = require('../src/lib/extract');

test('extractFirstUrl returns first http url', () => {
  const text = 'abc https://example.com/file.mp3 def https://second.com/a';
  assert.equal(extractFirstUrl(text), 'https://example.com/file.mp3');
});

test('extractFirstUrl returns null when absent', () => {
  assert.equal(extractFirstUrl('no url here'), null);
});
