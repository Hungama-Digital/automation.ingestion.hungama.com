const { createFtpUploader } = require('./ftp-uploader');
const { createSftpUploader } = require('./sftp-uploader');

function createUploader(config, deps = {}) {
  const makeFtpUploader = deps.createFtpUploader || createFtpUploader;
  const makeSftpUploader = deps.createSftpUploader || createSftpUploader;

  if (config.uploadProtocol === 'ftp') {
    return makeFtpUploader({
      host: config.uploadHost,
      port: config.uploadPort,
      username: config.uploadUsername,
      password: config.uploadPassword,
      remoteDir: config.uploadRemoteDir,
      secure: config.ftpSecure
    });
  }

  if (config.uploadProtocol === 'sftp') {
    return makeSftpUploader({
      host: config.uploadHost,
      port: config.uploadPort,
      username: config.uploadUsername,
      password: config.uploadPassword,
      remoteDir: config.uploadRemoteDir
    });
  }

  throw new Error('UPLOAD_PROTOCOL must be ftp or sftp');
}

module.exports = { createUploader };
