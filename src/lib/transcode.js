function createTranscoder({ spawn, ffmpegPath, ffmpegArgs }) {
  if (!spawn) throw new Error('spawn is required');
  if (!ffmpegPath) throw new Error('ffmpegPath is required');

  async function transcodeToOutput(inputPath, outputPath) {
    await new Promise((resolve, reject) => {
      const args = ['-y', '-i', inputPath, ...ffmpegArgs, outputPath];
      const proc = spawn(ffmpegPath, args, { stdio: 'inherit' });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });
  }

  return transcodeToOutput;
}

module.exports = { createTranscoder };
