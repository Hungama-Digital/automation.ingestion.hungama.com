const test = require('node:test');
const assert = require('node:assert/strict');
const { createConfig } = require('../src/lib/config');

test('createConfig applies defaults and parses suffixes', () => {
  const env = {
    EXCEL_PATH: './input/file.xlsx',
    SOLR_BASE_URL: 'http://solr',
    SOLR_USERNAME: 'u',
    SOLR_PASSWORD: 'p',
    MDN_BASE_URL: 'http://mdn',
    MDN_AUTH_HEADER: 'Basic abc'
  };
  const config = createConfig(env, { expandHome: (p) => `EXPAND:${p}` });
  assert.equal(config.batchSize, 100);
  assert.equal(config.concurrency, 5);
  assert.equal(config.missingLogDir, 'EXPAND:./logs');
  assert.deepEqual(config.mediaSuffixes, ['_320.mp3', '_256.mp3', '_128.mp3']);
  assert.ok(config.outputDir.startsWith('EXPAND:'));
  assert.ok(config.outputDir.endsWith('/Downloads'));
});

test('createConfig reads missing log dir from env', () => {
  const env = {
    EXCEL_PATH: './input/file.xlsx',
    SOLR_BASE_URL: 'http://solr',
    SOLR_USERNAME: 'u',
    SOLR_PASSWORD: 'p',
    MDN_BASE_URL: 'http://mdn',
    MDN_AUTH_HEADER: 'Basic abc',
    MISSING_LOG_DIR: './custom-logs'
  };
  const config = createConfig(env);
  assert.equal(config.missingLogDir, './custom-logs');
});
