const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSolrUrl, buildMdnUrl } = require('../src/lib/url');

test('buildSolrUrl encodes q param', () => {
  const url = buildSolrUrl('http://solr.hungama.com/solr/music/select', '48616572');
  assert.ok(url.includes('q=id%3A48616572'));
});

test('buildMdnUrl builds path and query', () => {
  const url = buildMdnUrl('http://mdn.hungama.com/streaming', '48616572', '4', '763', 'duration=PT24H0M0S');
  assert.equal(url, 'http://mdn.hungama.com/streaming/48616572/4/763?duration=PT24H0M0S');
});
