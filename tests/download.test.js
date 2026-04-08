const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { createDownloader } = require('../src/lib/download');

test('downloadToTemp writes a temp file', async () => {
  const downloader = createDownloader({
    httpGetStream: async () => Readable.from(['data']),
    fs,
    os,
    path
  });

  const tempPath = await downloader.downloadToTemp('http://example.com/file');
  assert.ok(fs.existsSync(tempPath));
  fs.unlinkSync(tempPath);
});
