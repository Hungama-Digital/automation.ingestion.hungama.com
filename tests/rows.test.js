const test = require('node:test');
const assert = require('node:assert/strict');
const { mapRows } = require('../src/lib/rows');

test('mapRows maps and filters empty ids', () => {
  const input = [
    { track_content_id: '123', 'File rename': 'song1' },
    { track_content_id: '', 'File rename': 'song2' }
  ];
  const rows = mapRows(input);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { trackContentId: '123', fileRename: 'song1' });
});
