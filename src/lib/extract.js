function extractFirstUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s"']+/);
  return match ? match[0] : null;
}

module.exports = { extractFirstUrl };
