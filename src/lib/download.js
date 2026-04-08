function createDownloader({ httpGetStream, fs, os, path }) {
  if (!httpGetStream) throw new Error('httpGetStream is required');
  if (!fs || !os || !path) throw new Error('fs, os, and path are required');

  async function downloadToTemp(url) {
    const tempPath = path.join(os.tmpdir(), `dl_${Date.now()}_${Math.random().toString(16).slice(2)}.mp3`);
    const stream = await httpGetStream(url);
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempPath);
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });
    return tempPath;
  }

  return { downloadToTemp };
}

module.exports = { createDownloader };
