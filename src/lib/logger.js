const { lotLabel } = require('./ordinal');

function formatLotLog(index, batchSize) {
  return lotLabel(index, batchSize);
}

function appendLog(filePath, line) {
  const fs = require('node:fs');
  fs.appendFileSync(filePath, line + '\n', 'utf8');
}

module.exports = { formatLotLog, appendLog };
