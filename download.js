const express = require('express');
const router = express.Router();
const fs = require('fs');
const downloader = require('../services/downloader');

// Get video info
router.post('/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    const info = await downloader.getVideoInfo(url);

    // If downloader failed or returned non-JSON
    if (info.error) {
      console.error("Video info error:", info.error);
      return res.status(500).json({
        success: false,
        error: info.error,
        raw: info.raw || null
      });
    }

    res.json({
      success: true,
      ...info
    });
  } catch (error) {
    console.error('Video info route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch video info'
    });
  }
});

// Download video/audio
router.post('/', async (req, res) => {
  try {
    const { url, quality, format } = req.body;
    if (!url || !quality || !format) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const result = await downloader.downloadVideo(url, quality, format);

    if (result.error) {
      console.error("Download error:", result.error);
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    const { filepath, filename } = result;

    // Double-check file exists
    if (!fs.existsSync(filepath)) {
      console.error('File not found after download:', filepath);
      return res.status(500).json({
        success: false,
        error: 'Download failed, file not found.'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');

    const stream = fs.createReadStream(filepath);
    stream.pipe(res);

    stream.on('close', () => fs.unlink(filepath, () => {}));
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to stream video file.'
      });
    });
  } catch (error) {
    console.error('Download route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download video'
    });
  }
});

module.exports = router;
