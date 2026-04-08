function mapRows(rows) {
  return rows
    .map((row) => ({
      trackContentId: String(row.track_content_id || '').trim(),
      fileRename: String(row['File rename'] || '').trim()
    }))
    .filter((row) => row.trackContentId);
}

module.exports = { mapRows };
