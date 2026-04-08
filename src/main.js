require('dotenv').config();

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const xlsx = require('xlsx');

const { createConfig, validateConfig } = require('./lib/config');
const { mapRows } = require('./lib/rows');
const { createSolrClient } = require('./lib/solr');
const { createMdnClient } = require('./lib/mdn');
const { extractFirstUrl } = require('./lib/extract');
const { selectMediaString, extractToken } = require('./lib/media');
const { createDownloader } = require('./lib/download');
const { createTranscoder } = require('./lib/transcode');
const { createProcessor } = require('./lib/processor');
const { mapWithConcurrency } = require('./lib/concurrency');
const { buildOutputName } = require('./lib/filename');
const { formatLotLog, appendLog } = require('./lib/logger');

const config = createConfig(process.env);
validateConfig(config);

function loadRows(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  return mapRows(rows);
}

async function main() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const solrClient = createSolrClient({
    baseUrl: config.solrBaseUrl,
    username: config.solrUser,
    password: config.solrPass,
    httpGet: axios.get
  });

  const mdnClient = createMdnClient({
    baseUrl: config.mdnBaseUrl,
    authHeader: config.mdnAuthHeader,
    queryString: config.mdnQueryString,
    httpGet: axios.get,
    extractFirstUrl
  });

  const downloader = createDownloader({
    httpGetStream: async (url) => {
      const response = await axios.get(url, { responseType: 'stream' });
      return response.data;
    },
    fs,
    os,
    path
  });

  const transcodeToOutput = createTranscoder({
    spawn: require('node:child_process').spawn,
    ffmpegPath: config.ffmpegPath,
    ffmpegArgs: config.ffmpegArgs
  });

  const processRow = createProcessor(config, {
    fetchSolrText: solrClient.fetchSolrText,
    selectMediaString,
    extractToken,
    fetchMdnUrl: mdnClient.fetchMdnUrl,
    downloadToTemp: downloader.downloadToTemp,
    transcodeToOutput,
    cleanupTemp: (tempPath) => {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    },
    buildOutputName,
    appendLog
  });

  const rows = loadRows(config.excelPath);
  const batches = [];
  for (let i = 0; i < rows.length; i += config.batchSize) {
    batches.push(rows.slice(i, i + config.batchSize));
  }

  let lot = 1;
  for (const batch of batches) {
    await mapWithConcurrency(batch, config.concurrency, processRow);
    console.log(formatLotLog(lot, config.batchSize));
    lot++;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
