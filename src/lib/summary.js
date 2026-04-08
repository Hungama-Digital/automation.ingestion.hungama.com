function createSummary(total) {
  return {
    total,
    success: 0,
    missingMedia: 0,
    missingToken: 0,
    missingMdn: 0,
    missingFilename: 0,
    error: 0,
    unknown: 0
  };
}

function updateSummary(summary, statuses) {
  for (const status of statuses) {
    switch (status) {
      case 'SUCCESS':
        summary.success += 1;
        break;
      case 'MISSING_MEDIA_STRING':
        summary.missingMedia += 1;
        break;
      case 'MISSING_TOKEN':
        summary.missingToken += 1;
        break;
      case 'MISSING_MDN_URL':
        summary.missingMdn += 1;
        break;
      case 'MISSING_FILENAME':
        summary.missingFilename += 1;
        break;
      case 'ERROR':
        summary.error += 1;
        break;
      default:
        summary.unknown += 1;
        break;
    }
  }
}

function formatRunHeader(totalRows, totalBatches, batchSize) {
  return `Loaded ${totalRows} rows across ${totalBatches} lots of ${batchSize}.`;
}

function formatRunSummary(summary) {
  return `Run complete. Total rows: ${summary.total} | Success: ${summary.success} | Missing media: ${summary.missingMedia} | Missing token: ${summary.missingToken} | Missing mdn: ${summary.missingMdn} | Missing filename: ${summary.missingFilename} | Errors: ${summary.error} | Unknown: ${summary.unknown}`;
}

module.exports = { createSummary, updateSummary, formatRunHeader, formatRunSummary };
