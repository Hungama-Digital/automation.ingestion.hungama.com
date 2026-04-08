const test = require('node:test');
const assert = require('node:assert/strict');
const { createProcessor } = require('../src/lib/processor');

test('processRow logs missing media and skips', async () => {
  const logs = [];
  const processRow = createProcessor(
    {
      mediaPrefix: 'https://media.hungama.co',
      mediaSuffixes: ['_320.mp3'],
      missingLogPath: '/tmp/output.txt',
      outputDir: '/tmp',
      outputExt: 'wav'
    },
    {
      fetchSolrText: async () => 'no match',
      selectMediaString: () => null,
      extractToken: () => null,
      fetchMdnUrl: async () => null,
      downloadToTemp: async () => null,
      transcodeToOutput: async () => null,
      cleanupTemp: () => null,
      buildOutputName: () => 'x.wav',
      appendLog: (_path, line) => logs.push(line)
    }
  );

  const status = await processRow({ trackContentId: '1', fileRename: 'song' });
  assert.equal(status, 'MISSING_MEDIA_STRING');
  assert.equal(logs.length, 1);
  assert.ok(logs[0].startsWith('MISSING_MEDIA_STRING'));
});

test('processRow downloads, transcodes, uploads, and cleans up', async () => {
  const calls = { download: 0, transcode: 0, upload: 0, cleanup: 0 };
  const processRow = createProcessor(
    {
      mediaPrefix: 'https://media.hungama.co',
      mediaSuffixes: ['_320.mp3'],
      missingLogPath: '/tmp/output.txt',
      outputExt: 'wav'
    },
    {
      fetchSolrText: async () => '763|https://media.hungama.co/x_320.mp3',
      selectMediaString: (text) => text,
      extractToken: () => '763',
      fetchMdnUrl: async () => 'https://media.hungama.com/file.mp3',
      downloadToTemp: async () => {
        calls.download++;
        return '/tmp/in_raw.mp3';
      },
      buildStagingPath: (outName) => `/tmp/staging_${outName}`,
      transcodeToOutput: async (_in, out) => {
        calls.transcode++;
        assert.equal(out, '/tmp/staging_song.wav');
      },
      uploadFile: async (localPath, remoteName) => {
        calls.upload++;
        assert.equal(localPath, '/tmp/staging_song.wav');
        assert.equal(remoteName, 'song.wav');
      },
      cleanupTemp: () => {
        calls.cleanup++;
      },
      buildOutputName: () => 'song.wav',
      appendLog: () => null
    }
  );

  const status = await processRow({ trackContentId: '1', fileRename: 'song' });
  assert.equal(status, 'SUCCESS');
  assert.equal(calls.download, 1);
  assert.equal(calls.transcode, 1);
  assert.equal(calls.upload, 1);
  assert.equal(calls.cleanup, 2);
});

test('processRow logs missing filename', async () => {
  const logs = [];
  const processRow = createProcessor(
    {
      mediaPrefix: 'https://media.hungama.co',
      mediaSuffixes: ['_320.mp3'],
      missingLogPath: '/tmp/output.txt',
      outputExt: 'wav'
    },
    {
      fetchSolrText: async () => '763|https://media.hungama.co/x_320.mp3',
      selectMediaString: (text) => text,
      extractToken: () => '763',
      fetchMdnUrl: async () => 'https://media.hungama.com/file.mp3',
      downloadToTemp: async () => '/tmp/in.mp3',
      buildStagingPath: () => '/tmp/staging.wav',
      transcodeToOutput: async () => null,
      uploadFile: async () => null,
      cleanupTemp: () => null,
      buildOutputName: () => null,
      appendLog: (_path, line) => logs.push(line)
    }
  );

  const status = await processRow({ trackContentId: '1', fileRename: '' });
  assert.equal(status, 'MISSING_FILENAME');
  assert.equal(logs.length, 1);
  assert.ok(logs[0].startsWith('MISSING_FILENAME'));
});
