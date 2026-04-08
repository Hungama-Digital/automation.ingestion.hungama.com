const test = require('node:test');
const assert = require('node:assert/strict');
const { createUploader } = require('../src/lib/uploader');

test('createUploader chooses ftp implementation', () => {
  const expected = { kind: 'ftp' };
  const uploader = createUploader(
    { uploadProtocol: 'ftp' },
    {
      createFtpUploader: () => expected,
      createSftpUploader: () => {
        throw new Error('should not call sftp');
      }
    }
  );
  assert.equal(uploader, expected);
});

test('createUploader chooses sftp implementation', () => {
  const expected = { kind: 'sftp' };
  const uploader = createUploader(
    { uploadProtocol: 'sftp' },
    {
      createFtpUploader: () => {
        throw new Error('should not call ftp');
      },
      createSftpUploader: () => expected
    }
  );
  assert.equal(uploader, expected);
});

test('createUploader throws on unsupported protocol', () => {
  assert.throws(() => createUploader({ uploadProtocol: 'smtp' }), /UPLOAD_PROTOCOL/);
});
