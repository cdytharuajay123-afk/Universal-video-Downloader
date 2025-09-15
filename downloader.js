const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Run yt-dlp with safe argument handling
function runYtDlpCommand(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { shell: false });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', data => { stdout += data.toString(); });
    proc.stderr.on('data', data => { stderr += data.toString(); });
    proc.on('close', code => {
      if (code !== 0) {
        console.error('yt-dlp stderr:', stderr);
        return reject(new Error(`yt-dlp failed (code ${code}):\n${stderr}`));
      }
      resolve(stdout);
    });
    proc.on('error', err => {
      reject(err);
    });
  });
}

// Get video info
async function getVideoInfo(url) {
  try {
    const output = await runYtDlpCommand(['--dump-json', url]);
    const info = JSON.parse(output);

    // Include ALL video formats (even if no audio, so 4K DASH is included)
    const formats = (info.formats || [])
      .filter(f => f.vcodec !== 'none' && f.ext && f.format_id && f.height)
      .map(f => ({
        id: f.format_id,
        display: `${f.format_note || f.height + 'p' || ''}${f.fps ? ` • ${f.fps}fps` : ''}`,
        type: `video/${f.ext}`,
        codec: f.vcodec,
        fps: f.fps,
        filesize: f.filesize,
        height: f.height
      }));

    // Add audio-only
    const audio = (info.formats || []).find(f => f.vcodec === 'none' && f.acodec !== 'none');
    if (audio) {
      formats.push({
        id: audio.format_id,
        display: 'Audio Only',
        type: `audio/${audio.ext}`,
        codec: audio.acodec,
        filesize: audio.filesize,
      });
    }

    return {
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      formats,
    };
  } catch (error) {
    console.error('getVideoInfo error:', error);
    throw new Error(error.stderr || error.message || 'yt-dlp failed');
  }
}

// Download video/audio
async function downloadVideo(url, formatId, ext) {
  const tempDir = os.tmpdir();
  const filename = `video_${Date.now()}.${ext}`;
  const filepath = path.join(tempDir, filename);

  try {
    // Always merge best audio with selected video (works for 4K DASH)
    await runYtDlpCommand(['-f', `${formatId}+bestaudio/best`, '-o', filepath, url]);

    // Ensure file was created
    if (!fs.existsSync(filepath)) {
      throw new Error('yt-dlp did not produce output file.');
    }

    return { filepath, filename };
  } catch (error) {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    console.error('downloadVideo error:', error);
    // Pass the full yt-dlp error to the frontend
    throw new Error(error.message || 'Failed to download video');
  }
}

module.exports = { getVideoInfo, downloadVideo };