const { buildMdnUrl } = require('./url');

function createMdnClient({ baseUrl, authHeader, queryString, httpGet, extractFirstUrl }) {
  if (!httpGet) throw new Error('httpGet is required');
  if (!extractFirstUrl) throw new Error('extractFirstUrl is required');

  async function fetchMdnUrl(contentId, token) {
    const url = buildMdnUrl(baseUrl, contentId, '4', token, queryString);
    const res = await httpGet(url, { headers: { Authorization: authHeader } });
    const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return extractFirstUrl(data);
  }

  return { fetchMdnUrl };
}

module.exports = { createMdnClient };
