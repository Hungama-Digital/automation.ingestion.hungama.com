function buildSolrUrl(baseUrl, contentId) {
  const url = new URL(baseUrl);
  url.searchParams.set('indent', 'true');
  url.searchParams.set('q.op', 'OR');
  url.searchParams.set('q', `id:${contentId}`);
  url.searchParams.set('useParams', '');
  return url.toString();
}

function buildMdnUrl(baseUrl, contentId, fixedSegment, token, queryString) {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const url = `${cleanBase}/${contentId}/${fixedSegment}/${token}`;
  return queryString ? `${url}?${queryString}` : url;
}

module.exports = { buildSolrUrl, buildMdnUrl };
