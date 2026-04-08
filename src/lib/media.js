function selectMediaString(text, prefix, suffixes) {
  if (!text || !prefix || !suffixes || suffixes.length === 0) return null;
  for (const suffix of suffixes) {
    const regex = new RegExp(`(\\d+\\|${escapeRegExp(prefix)}[^\\s"']*${escapeRegExp(suffix)})`);
    const match = text.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
}

function extractToken(mediaString) {
  if (!mediaString) return null;
  const match = mediaString.match(/(\d+)\|https:/);
  return match ? match[1] : null;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

module.exports = { selectMediaString, extractToken };
