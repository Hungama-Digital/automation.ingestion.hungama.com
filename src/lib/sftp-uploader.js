const SftpClient = require('ssh2-sftp-client');

function createSftpUploader({ host, port, username, password, remoteDir, client }) {
  const sftp = client || new SftpClient();
  const cleanRemoteDir = String(remoteDir || '').replace(/\/+$/, '');

  async function connect() {
    await sftp.connect({
      host,
      port,
      username,
      password
    });

    const exists = await sftp.exists(cleanRemoteDir);
    if (!exists) {
      await sftp.mkdir(cleanRemoteDir, true);
    }
  }

  async function uploadFile(localPath, remoteFileName) {
    const remotePath = `${cleanRemoteDir}/${remoteFileName}`;
    await sftp.fastPut(localPath, remotePath);
  }

  async function close() {
    await sftp.end();
  }

  return { connect, uploadFile, close };
}

module.exports = { createSftpUploader };
