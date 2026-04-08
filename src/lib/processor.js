const path = require('node:path');

function createProcessor(config, deps) {
  const {
    fetchSolrText,
    selectMediaString,
    extractToken,
    fetchMdnUrl,
    downloadToTemp,
    transcodeToOutput,
    cleanupTemp,
    buildOutputName,
    appendLog
  } = deps;

  return async function processRow(row) {
    const { trackContentId, fileRename } = row;
    try {
      const solrText = await fetchSolrText(trackContentId);
      const media = selectMediaString(solrText, config.mediaPrefix, config.mediaSuffixes);
      if (!media) {
        appendLog(config.missingLogPath, `MISSING_MEDIA_STRING | content_id=${trackContentId} | file_name=${fileRename}`);
        return;
      }

      const token = extractToken(media);
      if (!token) {
        appendLog(config.missingLogPath, `MISSING_TOKEN | content_id=${trackContentId} | file_name=${fileRename}`);
        return;
      }

      const mdnUrl = await fetchMdnUrl(trackContentId, token);
      if (!mdnUrl) {
        appendLog(config.missingLogPath, `MISSING_MDN_URL | content_id=${trackContentId} | file_name=${fileRename}`);
        return;
      }

      const outName = buildOutputName(fileRename, config.outputExt);
      if (!outName) {
        appendLog(config.missingLogPath, `MISSING_FILENAME | content_id=${trackContentId} | file_name=${fileRename}`);
        return;
      }

      const tempPath = await downloadToTemp(mdnUrl);
      try {
        const outPath = path.join(config.outputDir, outName);
        await transcodeToOutput(tempPath, outPath);
      } finally {
        cleanupTemp(tempPath);
      }
    } catch (err) {
      appendLog(config.missingLogPath, `ERROR | content_id=${trackContentId} | file_name=${fileRename} | ${err.message}`);
    }
  };
}

module.exports = { createProcessor };
