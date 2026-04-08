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
    missingLogDir: expand(env.MISSING_LOG_DIR || './logs'),
    uploadProtocol: (env.UPLOAD_PROTOCOL || 'ftp').trim().toLowerCase(),
    uploadHost: env.FTP_HOST || env.SFTP_HOST,
    uploadPort: toPort(env.FTP_PORT || env.SFTP_PORT, 21),
    uploadUsername: env.FTP_USERNAME || env.SFTP_USERNAME,
    uploadPassword: env.FTP_PASSWORD || env.SFTP_PASSWORD,
    uploadRemoteDir: env.FTP_REMOTE_DIR || env.SFTP_REMOTE_DIR || '30 Sec Cut',
    ftpSecure: toBoolean(env.FTP_SECURE, true),
    ffmpegPath: env.FFMPEG_PATH || 'ffmpeg',
    ffmpegArgs: (env.FFMPEG_ARGS || '-t 00:00:30.0 -ar 8000 -ac 1 -c:a pcm_alaw')
      .split(' ')
      .filter(Boolean)
  };
}

function toPort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function validateConfig(config) {
  if (!config.excelPath) throw new Error('EXCEL_PATH is required');
  if (!config.solrBaseUrl) throw new Error('SOLR_BASE_URL is required');
  if (!config.solrUser || !config.solrPass) throw new Error('SOLR_USERNAME and SOLR_PASSWORD are required');
  if (!config.mdnBaseUrl) throw new Error('MDN_BASE_URL is required');
  if (!config.mdnAuthHeader) throw new Error('MDN_AUTH_HEADER is required');
  if (!['ftp', 'sftp'].includes(config.uploadProtocol)) throw new Error('UPLOAD_PROTOCOL must be ftp or sftp');
  if (!config.uploadHost) throw new Error('FTP_HOST/SFTP_HOST is required');
  if (!config.uploadUsername) throw new Error('FTP_USERNAME/SFTP_USERNAME is required');
  if (!config.uploadPassword) throw new Error('FTP_PASSWORD/SFTP_PASSWORD is required');
  if (!config.uploadRemoteDir) throw new Error('FTP_REMOTE_DIR/SFTP_REMOTE_DIR is required');
}

module.exports = { createConfig, validateConfig };
