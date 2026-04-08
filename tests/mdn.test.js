const test = require('node:test');
const assert = require('node:assert/strict');
const { createMdnClient } = require('../src/lib/mdn');
const { extractFirstUrl } = require('../src/lib/extract');

test('createMdnClient returns first url and uses auth header', async () => {
  const calls = [];
  const httpGet = async (url, options) => {
    calls.push({ url, options });
    return { data: 'abc https://media.hungama.com/x.mp3 def' };
  };

  const client = createMdnClient({
    baseUrl: 'http://mdn.hungama.com/streaming',
    authHeader: 'Basic test',
    queryString: 'duration=PT24H0M0S',
    httpGet,
    extractFirstUrl
  });

  const url = await client.fetchMdnUrl('48616572', '763');
  assert.equal(url, 'https://media.hungama.com/x.mp3');
  assert.equal(calls[0].options.headers.Authorization, 'Basic test');
  assert.equal(calls[0].url, 'http://mdn.hungama.com/streaming/48616572/4/763?duration=PT24H0M0S');
});
