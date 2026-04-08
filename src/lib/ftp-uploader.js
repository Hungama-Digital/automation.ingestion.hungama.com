const ftp = require('basic-ftp');

function createFtpUploader({ host, port, username, password, remoteDir, secure, client }) {
  const ftpClient = client || new ftp.Client();
  const cleanRemoteDir = String(remoteDir || '').replace(/\/+$/, '');

  async function connect() {
    await ftpClient.access({
      host,
      port,
      user: username,
      password,
      secure
    });
    await ftpClient.ensureDir(cleanRemoteDir);
  }

  async function uploadFile(localPath, remoteFileName) {
    await ftpClient.uploadFrom(localPath, remoteFileName);
  }

  async function close() {
    ftpClient.close();
  }

  return { connect, uploadFile, close };
}

module.exports = { createFtpUploader };
