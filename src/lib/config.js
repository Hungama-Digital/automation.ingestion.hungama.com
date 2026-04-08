const os = require('node:os');
const path = require('node:path');
const { expandHome } = require('./path');

function createConfig(env, helpers = {}) {
  const expand = helpers.expandHome || expandHome;
  const home = helpers.homedir || os.homedir;
  const joinPath = helpers.joinPath || path.join;

  const mediaSuffixes = (env.MEDIA_SUFFIXES || '_320.mp3,_256.mp3,_128.mp3')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    excelPath: env.EXCEL_PATH,
    batchSize: Number(env.BATCH_SIZE || 100),
    concurrency: Number(env.CONCURRENCY || 5),
    solrBaseUrl: env.SOLR_BASE_URL,
    solrUser: env.SOLR_USERNAME,
    solrPass: env.SOLR_PASSWORD,
    mediaSuffixes,
    mediaPrefix: env.MEDIA_URL_PREFIX || 'https://media.hungama.co',
    mdnBaseUrl: env.MDN_BASE_URL,
    mdnAuthHeader: env.MDN_AUTH_HEADER,
    mdnQueryString: env.MDN_QUERY_STRING || 'duration=PT24H0M0S&cdn=s3&agent=application&cms=ms2&protocol=filedl',
    outputDir: expand(env.OUTPUT_DIR || joinPath(home(), 'Downloads')),
    outputExt: env.OUTPUT_EXT || 'wav',
    missingLogPath: expand(env.MISSING_LOG_PATH || joinPath(home(), 'Downloads', 'output.txt')),
    ffmpegPath: env.FFMPEG_PATH || 'ffmpeg',
    ffmpegArgs: (env.FFMPEG_ARGS || '-t 00:00:30.0 -ar 8000 -ac 1 -c:a pcm_alaw')
      .split(' ')
      .filter(Boolean)
  };
}

function validateConfig(config) {
  if (!config.excelPath) throw new Error('EXCEL_PATH is required');
  if (!config.solrBaseUrl) throw new Error('SOLR_BASE_URL is required');
  if (!config.solrUser || !config.solrPass) throw new Error('SOLR_USERNAME and SOLR_PASSWORD are required');
  if (!config.mdnBaseUrl) throw new Error('MDN_BASE_URL is required');
  if (!config.mdnAuthHeader) throw new Error('MDN_AUTH_HEADER is required');
}

module.exports = { createConfig, validateConfig };
