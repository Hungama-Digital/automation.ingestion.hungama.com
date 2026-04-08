const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOutputName } = require('../src/lib/filename');

test('buildOutputName appends extension when missing', () => {
  assert.equal(buildOutputName('song', 'wav'), 'song.wav');
});

test('buildOutputName preserves extension when present', () => {
  assert.equal(buildOutputName('song.mp3', 'wav'), 'song.mp3');
});
