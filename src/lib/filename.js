function buildOutputName(baseName, ext) {
  if (!baseName) return null;
  if (baseName.includes('.')) return baseName;
  return `${baseName}.${ext}`;
}

module.exports = { buildOutputName };
