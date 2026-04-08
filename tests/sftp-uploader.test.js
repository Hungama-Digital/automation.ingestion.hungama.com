const test = require('node:test');
const assert = require('node:assert/strict');
const { createSftpUploader } = require('../src/lib/sftp-uploader');

test('sftp uploader connects and creates remote directory if needed', async () => {
  const calls = [];
  const fakeClient = {
    connect: async (opts) => calls.push(['connect', opts]),
    exists: async (remoteDir) => {
      calls.push(['exists', remoteDir]);
      return false;
    },
    mkdir: async (remoteDir, recursive) => calls.push(['mkdir', remoteDir, recursive]),
    fastPut: async (localPath, remotePath) => calls.push(['fastPut', localPath, remotePath]),
    end: async () => calls.push(['end'])
  };

  const uploader = createSftpUploader({
    host: 'secureftp.hungamatech.com',
    port: 22,
    username: 'user',
    password: 'pass',
    remoteDir: '30 Sec Cut',
    client: fakeClient
  });

  await uploader.connect();
  await uploader.uploadFile('/tmp/song.wav', 'song.wav');
  await uploader.close();

  assert.equal(calls[0][0], 'connect');
  assert.equal(calls[1][0], 'exists');
  assert.equal(calls[2][0], 'mkdir');
  assert.equal(calls[3][0], 'fastPut');
  assert.equal(calls[3][2], '30 Sec Cut/song.wav');
  assert.equal(calls[4][0], 'end');
});
