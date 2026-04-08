const { buildSolrUrl } = require('./url');

function createSolrClient({ baseUrl, username, password, httpGet }) {
  if (!httpGet) throw new Error('httpGet is required');

  async function fetchSolrText(contentId) {
    const url = buildSolrUrl(baseUrl, contentId);
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const res = await httpGet(url, { headers: { Authorization: `Basic ${auth}` } });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  }

  return { fetchSolrText };
}

module.exports = { createSolrClient };
