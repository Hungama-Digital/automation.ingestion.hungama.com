# MP3 Batch Fetch + Transcode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js batch job that reads Excel content IDs, fetches media URLs via Solr/MDN, downloads audio, transcodes 30s PCM A-law, and writes outputs to `~/Downloads` with proper batching/concurrency and logging.

**Architecture:** A single CLI script (`src/main.js`) orchestrates the pipeline. Small helper modules in `src/lib/` handle parsing, URL selection, concurrency, downloads, and ffmpeg execution. Tests use Node's built-in test runner.

**Tech Stack:** Node.js (CommonJS), `xlsx`, `axios`, `dotenv`, Node `test` runner.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/package.json`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/.gitignore`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/.env.example`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/input/.gitkeep`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "automation.ingestion.hungama.com",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "start": "node src/main.js",
    "test": "node --test"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "dotenv": "^16.4.0",
    "xlsx": "^0.18.5"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.env
input/*.xlsx
.DS_Store
```

- [ ] **Step 3: Create `.env.example`**

```
EXCEL_PATH=./input/track_ids.xlsx
BATCH_SIZE=100
CONCURRENCY=5

SOLR_BASE_URL=http://solr.hungama.com/solr/music/select
SOLR_USERNAME=
SOLR_PASSWORD=
MEDIA_SUFFIXES=_320.mp3,_256.mp3,_128.mp3
MEDIA_URL_PREFIX=https://media.hungama.co

MDN_BASE_URL=http://mdn.hungama.com/streaming
MDN_AUTH_HEADER=Basic aHVuZ2FtYS5jb206aHVuZ2FtYS5jb20=
MDN_QUERY_STRING=duration=PT24H0M0S&cdn=s3&agent=application&cms=ms2&protocol=filedl

OUTPUT_DIR=~/Downloads
OUTPUT_EXT=wav
MISSING_LOG_PATH=~/Downloads/output.txt

FFMPEG_PATH=ffmpeg
FFMPEG_ARGS=-t 00:00:30.0 -ar 8000 -ac 1 -c:a pcm_alaw
```

- [ ] **Step 4: Create `input/.gitkeep`**

```

```

- [ ] **Step 5: Commit scaffolding**

```bash
git add /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/package.json /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/.gitignore /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/.env.example /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/input/.gitkeep
```

### Task 2: Pure Helpers (Selection, URLs, Ordinals)

**Files:**
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/lib/media.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/lib/ordinal.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/lib/url.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/tests/media.test.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/tests/ordinal.test.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/tests/url.test.js`

- [ ] **Step 1: Write failing tests for media selection**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { selectMediaString, extractToken } = require('../src/lib/media');

test('selectMediaString prefers 320 over 256 and 128', () => {
  const text = 'abc 111|https://media.hungama.co/x_256.mp3 xyz 222|https://media.hungama.co/y_320.mp3';
  const result = selectMediaString(text, 'https://media.hungama.co', ['_320.mp3','_256.mp3','_128.mp3']);
  assert.equal(result, '222|https://media.hungama.co/y_320.mp3');
});

test('selectMediaString returns null if no match', () => {
  const text = 'nothing here';
  const result = selectMediaString(text, 'https://media.hungama.co', ['_320.mp3']);
  assert.equal(result, null);
});

test('extractToken pulls numeric id before |https', () => {
  const token = extractToken('763|https://media.hungama.co/x_320.mp3');
  assert.equal(token, '763');
});
```

- [ ] **Step 2: Run tests to see failures**

```bash
npm test
```

- [ ] **Step 3: Implement `src/lib/media.js`**

```js
function selectMediaString(text, prefix, suffixes) {
  if (!text || !prefix || !suffixes || suffixes.length === 0) return null;
  for (const suffix of suffixes) {
    const regex = new RegExp(`(\\d+\\|${escapeRegExp(prefix)}[^\\s"']*${escapeRegExp(suffix)})`);
    const match = text.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
}

function extractToken(mediaString) {
  if (!mediaString) return null;
  const match = mediaString.match(/(\\d+)\\|https:/);
  return match ? match[1] : null;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

module.exports = { selectMediaString, extractToken };
```

- [ ] **Step 4: Re-run tests to verify green**

```bash
npm test
```

- [ ] **Step 5: Write failing tests for ordinals**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { lotLabel } = require('../src/lib/ordinal');

test('lotLabel formats first and second', () => {
  assert.equal(lotLabel(1, 100), "First lot of 100 content id's processed successfully");
  assert.equal(lotLabel(2, 100), "Second lot of 100 content id's processed successfully");
});
```

- [ ] **Step 6: Run tests to see failures**

```bash
npm test
```

- [ ] **Step 7: Implement `src/lib/ordinal.js`**

```js
const ORDINAL_WORDS = {
  1: 'First',
  2: 'Second',
  3: 'Third',
  4: 'Fourth',
  5: 'Fifth',
  6: 'Sixth',
  7: 'Seventh',
  8: 'Eighth',
  9: 'Ninth',
  10: 'Tenth'
};

function lotLabel(index, batchSize) {
  const word = ORDINAL_WORDS[index] || `${index}th`;
  return `${word} lot of ${batchSize} content id's processed successfully`;
}

module.exports = { lotLabel };
```

- [ ] **Step 8: Re-run tests to verify green**

```bash
npm test
```

- [ ] **Step 9: Write failing tests for URL builders**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSolrUrl, buildMdnUrl } = require('../src/lib/url');

test('buildSolrUrl encodes q param', () => {
  const url = buildSolrUrl('http://solr.hungama.com/solr/music/select', '48616572');
  assert.ok(url.includes('q=id%3A48616572'));
});

test('buildMdnUrl builds path and query', () => {
  const url = buildMdnUrl('http://mdn.hungama.com/streaming', '48616572', '4', '763', 'duration=PT24H0M0S');
  assert.equal(url, 'http://mdn.hungama.com/streaming/48616572/4/763?duration=PT24H0M0S');
});
```

- [ ] **Step 10: Run tests to see failures**

```bash
npm test
```

- [ ] **Step 11: Implement `src/lib/url.js`**

```js
function buildSolrUrl(baseUrl, contentId) {
  const url = new URL(baseUrl);
  url.searchParams.set('indent', 'true');
  url.searchParams.set('q.op', 'OR');
  url.searchParams.set('q', `id:${contentId}`);
  url.searchParams.set('useParams', '');
  return url.toString();
}

function buildMdnUrl(baseUrl, contentId, fixedSegment, token, queryString) {
  const cleanBase = baseUrl.replace(/\\/$/, '');
  const url = `${cleanBase}/${contentId}/${fixedSegment}/${token}`;
  return queryString ? `${url}?${queryString}` : url;
}

module.exports = { buildSolrUrl, buildMdnUrl };
```

- [ ] **Step 12: Re-run tests to verify green**

```bash
npm test
```

### Task 3: Concurrency + File/Path Helpers

**Files:**
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/lib/concurrency.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/lib/path.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/lib/filename.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/tests/concurrency.test.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/tests/path.test.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/tests/filename.test.js`

- [ ] **Step 1: Write failing tests for concurrency**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mapWithConcurrency } = require('../src/lib/concurrency');

test('mapWithConcurrency respects limit', async () => {
  let inFlight = 0;
  let max = 0;
  const items = [1,2,3,4,5];
  const results = await mapWithConcurrency(items, 2, async (n) => {
    inFlight++;
    max = Math.max(max, inFlight);
    await new Promise((r) => setTimeout(r, 10));
    inFlight--;
    return n * 2;
  });
  assert.equal(max <= 2, true);
  assert.deepEqual(results, [2,4,6,8,10]);
});
```

- [ ] **Step 2: Run tests to see failures**

```bash
npm test
```

- [ ] **Step 3: Implement `src/lib/concurrency.js`**

```js
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runNext() {
    const current = index++;
    if (current >= items.length) return;
    results[current] = await worker(items[current], current);
    await runNext();
  }

  const runners = [];
  const count = Math.min(limit, items.length);
  for (let i = 0; i < count; i++) runners.push(runNext());
  await Promise.all(runners);
  return results;
}

module.exports = { mapWithConcurrency };
```

- [ ] **Step 4: Re-run tests to verify green**

```bash
npm test
```

- [ ] **Step 5: Write failing tests for path expansion**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { expandHome } = require('../src/lib/path');

test('expandHome expands leading ~', () => {
  const out = expandHome('~/Downloads');
  assert.ok(out.includes('/Downloads'));
});
```

- [ ] **Step 6: Run tests to see failures**

```bash
npm test
```

- [ ] **Step 7: Implement `src/lib/path.js`**

```js
const os = require('node:os');
const path = require('node:path');

function expandHome(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

module.exports = { expandHome };
```

- [ ] **Step 8: Re-run tests to verify green**

```bash
npm test
```

- [ ] **Step 9: Write failing tests for output filename**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOutputName } = require('../src/lib/filename');

test('buildOutputName appends extension when missing', () => {
  assert.equal(buildOutputName('song', 'wav'), 'song.wav');
});

test('buildOutputName preserves extension when present', () => {
  assert.equal(buildOutputName('song.mp3', 'wav'), 'song.mp3');
});
```

- [ ] **Step 10: Run tests to see failures**

```bash
npm test
```

- [ ] **Step 11: Implement `src/lib/filename.js`**

```js
function buildOutputName(baseName, ext) {
  if (!baseName) return null;
  if (baseName.includes('.')) return baseName;
  return `${baseName}.${ext}`;
}

module.exports = { buildOutputName };
```

- [ ] **Step 12: Re-run tests to verify green**

```bash
npm test
```

### Task 4: Main Pipeline + Integration

**Files:**
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/main.js`
- Create: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src/lib/logger.js`

- [ ] **Step 1: Write failing integration test for lotLabel in main**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { formatLotLog } = require('../src/lib/logger');

test('formatLotLog wraps lotLabel', () => {
  assert.equal(formatLotLog(1, 100), "First lot of 100 content id's processed successfully");
});
```

- [ ] **Step 2: Run tests to see failures**

```bash
npm test
```

- [ ] **Step 3: Implement `src/lib/logger.js`**

```js
const { lotLabel } = require('./ordinal');

function formatLotLog(index, batchSize) {
  return lotLabel(index, batchSize);
}

function appendLog(filePath, line) {
  const fs = require('node:fs');
  fs.appendFileSync(filePath, line + '\n', 'utf8');
}

module.exports = { formatLotLog, appendLog };
```

- [ ] **Step 4: Re-run tests to verify green**

```bash
npm test
```

- [ ] **Step 5: Implement `src/main.js`**

```js
require('dotenv').config();
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const xlsx = require('xlsx');
const { selectMediaString, extractToken } = require('./lib/media');
const { buildSolrUrl, buildMdnUrl } = require('./lib/url');
const { mapWithConcurrency } = require('./lib/concurrency');
const { expandHome } = require('./lib/path');
const { buildOutputName } = require('./lib/filename');
const { formatLotLog, appendLog } = require('./lib/logger');

const CONFIG = {
  excelPath: process.env.EXCEL_PATH,
  batchSize: Number(process.env.BATCH_SIZE || 100),
  concurrency: Number(process.env.CONCURRENCY || 5),
  solrBaseUrl: process.env.SOLR_BASE_URL,
  solrUser: process.env.SOLR_USERNAME,
  solrPass: process.env.SOLR_PASSWORD,
  mediaSuffixes: (process.env.MEDIA_SUFFIXES || '_320.mp3,_256.mp3,_128.mp3').split(',').map((s) => s.trim()).filter(Boolean),
  mediaPrefix: process.env.MEDIA_URL_PREFIX || 'https://media.hungama.co',
  mdnBaseUrl: process.env.MDN_BASE_URL,
  mdnAuthHeader: process.env.MDN_AUTH_HEADER,
  mdnQueryString: process.env.MDN_QUERY_STRING || 'duration=PT24H0M0S&cdn=s3&agent=application&cms=ms2&protocol=filedl',
  outputDir: expandHome(process.env.OUTPUT_DIR || path.join(os.homedir(), 'Downloads')),
  outputExt: process.env.OUTPUT_EXT || 'wav',
  missingLogPath: expandHome(process.env.MISSING_LOG_PATH || path.join(os.homedir(), 'Downloads', 'output.txt')),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffmpegArgs: (process.env.FFMPEG_ARGS || '-t 00:00:30.0 -ar 8000 -ac 1 -c:a pcm_alaw').split(' ').filter(Boolean)
};

function requireConfig() {
  if (!CONFIG.excelPath) throw new Error('EXCEL_PATH is required');
  if (!CONFIG.solrBaseUrl) throw new Error('SOLR_BASE_URL is required');
  if (!CONFIG.solrUser || !CONFIG.solrPass) throw new Error('SOLR_USERNAME and SOLR_PASSWORD are required');
  if (!CONFIG.mdnBaseUrl) throw new Error('MDN_BASE_URL is required');
  if (!CONFIG.mdnAuthHeader) throw new Error('MDN_AUTH_HEADER is required');
}

function loadRows() {
  const workbook = xlsx.readFile(CONFIG.excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((row) => ({
    trackContentId: String(row.track_content_id || '').trim(),
    fileRename: String(row['File rename'] || '').trim()
  })).filter((row) => row.trackContentId);
}

async function fetchSolrText(contentId) {
  const url = buildSolrUrl(CONFIG.solrBaseUrl, contentId);
  const auth = Buffer.from(`${CONFIG.solrUser}:${CONFIG.solrPass}`).toString('base64');
  const res = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
}

function extractFirstUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s"']+/);
  return match ? match[0] : null;
}

async function fetchMdnUrl(contentId, token) {
  const url = buildMdnUrl(CONFIG.mdnBaseUrl, contentId, '4', token, CONFIG.mdnQueryString);
  const res = await axios.get(url, { headers: { Authorization: CONFIG.mdnAuthHeader } });
  const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  return extractFirstUrl(data);
}

async function downloadToTemp(url) {
  const tempPath = path.join(os.tmpdir(), `dl_${Date.now()}_${Math.random().toString(16).slice(2)}.mp3`);
  const response = await axios.get(url, { responseType: 'stream' });
  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(tempPath);
    response.data.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return tempPath;
}

async function transcodeToOutput(inputPath, outputPath) {
  const { spawn } = require('node:child_process');
  await new Promise((resolve, reject) => {
    const args = ['-y', '-i', inputPath, ...CONFIG.ffmpegArgs, outputPath];
    const proc = spawn(CONFIG.ffmpegPath, args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function processRow(row) {
  const { trackContentId, fileRename } = row;
  try {
    const solrText = await fetchSolrText(trackContentId);
    const media = selectMediaString(solrText, CONFIG.mediaPrefix, CONFIG.mediaSuffixes);
    if (!media) {
      appendLog(CONFIG.missingLogPath, `MISSING_MEDIA_STRING | content_id=${trackContentId} | file_name=${fileRename}`);
      return;
    }
    const token = extractToken(media);
    if (!token) {
      appendLog(CONFIG.missingLogPath, `MISSING_TOKEN | content_id=${trackContentId} | file_name=${fileRename}`);
      return;
    }
    const mdnUrl = await fetchMdnUrl(trackContentId, token);
    if (!mdnUrl) {
      appendLog(CONFIG.missingLogPath, `MISSING_MDN_URL | content_id=${trackContentId} | file_name=${fileRename}`);
      return;
    }

    const tempPath = await downloadToTemp(mdnUrl);
    try {
      const outName = buildOutputName(fileRename, CONFIG.outputExt);
      const outPath = path.join(CONFIG.outputDir, outName);
      await transcodeToOutput(tempPath, outPath);
    } finally {
      fs.unlinkSync(tempPath);
    }
  } catch (err) {
    appendLog(CONFIG.missingLogPath, `ERROR | content_id=${trackContentId} | file_name=${fileRename} | ${err.message}`);
  }
}

async function main() {
  requireConfig();
  if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  const rows = loadRows();
  const batches = [];
  for (let i = 0; i < rows.length; i += CONFIG.batchSize) {
    batches.push(rows.slice(i, i + CONFIG.batchSize));
  }

  let lot = 1;
  for (const batch of batches) {
    await mapWithConcurrency(batch, CONFIG.concurrency, processRow);
    console.log(formatLotLog(lot, CONFIG.batchSize));
    lot++;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 6: Run tests and verify green**

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git add /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/src /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/tests
```

### Task 5: README Usage

**Files:**
- Modify: `/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/README.md`

- [ ] **Step 1: Add usage instructions**

```
## Usage

1. Place your Excel at `input/track_ids.xlsx` (or update `EXCEL_PATH` in `.env`).
2. Copy `.env.example` to `.env` and fill auth values.
3. Install deps: `npm install`
4. Run: `npm start`

Outputs are written to `~/Downloads` and missing entries are logged to `~/Downloads/output.txt`.
```

- [ ] **Step 2: Commit**

```bash
git add /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/README.md
```
