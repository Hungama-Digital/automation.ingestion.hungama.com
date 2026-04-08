const test = require('node:test');
const assert = require('node:assert/strict');
const { createSolrClient } = require('../src/lib/solr');

test('createSolrClient builds auth header and stringifies data', async () => {
  const calls = [];
  const httpGet = async (url, options) => {
    calls.push({ url, options });
    return { data: { ok: true } };
  };

  const client = createSolrClient({
    baseUrl: 'http://solr.hungama.com/solr/music/select',
    username: 'u',
    password: 'p',
    httpGet
  });

  const text = await client.fetchSolrText('48616572');
  const expectedAuth = Buffer.from('u:p').toString('base64');

  assert.ok(text.includes('"ok":true'));
  assert.ok(calls[0].url.includes('q=id%3A48616572'));
  assert.equal(calls[0].options.headers.Authorization, `Basic ${expectedAuth}`);
});
