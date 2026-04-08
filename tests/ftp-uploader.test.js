const test = require('node:test');
const assert = require('node:assert/strict');
const { createFtpUploader } = require('../src/lib/ftp-uploader');

test('ftp uploader connects, creates remote dir, and uploads file', async () => {
  const calls = [];
  const fakeClient = {
    access: async (opts) => calls.push(['access', opts]),
    ensureDir: async (remoteDir) => calls.push(['ensureDir', remoteDir]),
    uploadFrom: async (localPath, remoteName) => calls.push(['uploadFrom', localPath, remoteName]),
    close: () => calls.push(['close'])
  };

  const uploader = createFtpUploader({
    host: 'secureftp.hungamatech.com',
    port: 21,
    username: 'user',
    password: 'pass',
    remoteDir: '30 Sec Cut',
    secure: true,
    client: fakeClient
  });

  await uploader.connect();
  await uploader.uploadFile('/tmp/song.wav', 'song.wav');
  await uploader.close();

  assert.equal(calls[0][0], 'access');
  assert.equal(calls[1][0], 'ensureDir');
  assert.equal(calls[1][1], '30 Sec Cut');
  assert.equal(calls[2][0], 'uploadFrom');
  assert.equal(calls[2][1], '/tmp/song.wav');
  assert.equal(calls[2][2], 'song.wav');
  assert.equal(calls[3][0], 'close');
});
