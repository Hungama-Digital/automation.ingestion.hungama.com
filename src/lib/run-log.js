const path = require('node:path');

function formatLogTimestamp(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

function buildRunLogPath(logDir, date = new Date()) {
  const stamp = formatLogTimestamp(date);
  return path.join(logDir, `missing_entries_${stamp}.log`);
}

module.exports = { formatLogTimestamp, buildRunLogPath };
