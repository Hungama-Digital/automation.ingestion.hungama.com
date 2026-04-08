const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createTranscoder } = require('../src/lib/transcode');

test('transcodeToOutput calls ffmpeg with args', async () => {
  const calls = [];
  const spawn = (cmd, args) => {
    calls.push({ cmd, args });
    const emitter = new EventEmitter();
    process.nextTick(() => emitter.emit('close', 0));
    return emitter;
  };

  const transcodeToOutput = createTranscoder({
    spawn,
    ffmpegPath: 'ffmpeg',
    ffmpegArgs: ['-t', '00:00:30.0']
  });

  await transcodeToOutput('in.mp3', 'out.wav');
  assert.equal(calls[0].cmd, 'ffmpeg');
  assert.deepEqual(calls[0].args, ['-y', '-i', 'in.mp3', '-t', '00:00:30.0', 'out.wav']);
});
