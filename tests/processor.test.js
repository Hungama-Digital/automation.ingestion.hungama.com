const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
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

  await processRow({ trackContentId: '1', fileRename: 'song' });
  assert.equal(logs.length, 1);
  assert.ok(logs[0].startsWith('MISSING_MEDIA_STRING'));
});

test('processRow downloads, transcodes, and cleans up', async () => {
  const calls = { download: 0, transcode: 0, cleanup: 0 };
  const processRow = createProcessor(
    {
      mediaPrefix: 'https://media.hungama.co',
      mediaSuffixes: ['_320.mp3'],
      missingLogPath: '/tmp/output.txt',
      outputDir: '/tmp',
      outputExt: 'wav'
    },
    {
      fetchSolrText: async () => '763|https://media.hungama.co/x_320.mp3',
      selectMediaString: (text) => text,
      extractToken: () => '763',
      fetchMdnUrl: async () => 'https://media.hungama.com/file.mp3',
      downloadToTemp: async () => {
        calls.download++;
        return '/tmp/in.mp3';
      },
      transcodeToOutput: async (_in, out) => {
        calls.transcode++;
        assert.equal(out, path.join('/tmp', 'song.wav'));
      },
      cleanupTemp: () => {
        calls.cleanup++;
      },
      buildOutputName: () => 'song.wav',
      appendLog: () => null
    }
  );

  await processRow({ trackContentId: '1', fileRename: 'song' });
  assert.equal(calls.download, 1);
  assert.equal(calls.transcode, 1);
  assert.equal(calls.cleanup, 1);
});

test('processRow logs missing filename', async () => {
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
      fetchSolrText: async () => '763|https://media.hungama.co/x_320.mp3',
      selectMediaString: (text) => text,
      extractToken: () => '763',
      fetchMdnUrl: async () => 'https://media.hungama.com/file.mp3',
      downloadToTemp: async () => '/tmp/in.mp3',
      transcodeToOutput: async () => null,
      cleanupTemp: () => null,
      buildOutputName: () => null,
      appendLog: (_path, line) => logs.push(line)
    }
  );

  await processRow({ trackContentId: '1', fileRename: '' });
  assert.equal(logs.length, 1);
  assert.ok(logs[0].startsWith('MISSING_FILENAME'));
});
