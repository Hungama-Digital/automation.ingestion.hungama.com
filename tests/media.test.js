const test = require('node:test');
const assert = require('node:assert/strict');
const { selectMediaString, extractToken } = require('../src/lib/media');

test('selectMediaString prefers 320 over 256 and 128', () => {
  const text = 'abc 111|https://media.hungama.co/x_256.mp3 xyz 222|https://media.hungama.co/y_320.mp3';
  const result = selectMediaString(text, 'https://media.hungama.co', ['_320.mp3','_256.mp3','_128.mp3']);
  assert.equal(result, '222|https://media.hungama.co/y_320.mp3');
});

test('selectMediaString returns null if no match', () => {
  const text = 'nothing here';
  const result = selectMediaString(text, 'https://media.hungama.co', ['_320.mp3']);
  assert.equal(result, null);
});

test('extractToken pulls numeric id before |https', () => {
  const token = extractToken('763|https://media.hungama.co/x_320.mp3');
  assert.equal(token, '763');
});
