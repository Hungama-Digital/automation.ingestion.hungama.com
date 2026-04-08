const test = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig } = require('../src/lib/config');

test('validateConfig throws when required fields missing', () => {
  assert.throws(() => validateConfig({}), /EXCEL_PATH/);
});
