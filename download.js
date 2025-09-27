const express = require('express');
const router = express.Router();
const fs = require('fs');
const downloader = require('../services/downloader');

// Get video info
router.post('/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const info = await downloader.getVideoInfo(url);
    res.json(info);
  } catch (error) {
    console.error('Video info error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch video info' });
  }
});

// Download video/audio
router.post('/', async (req, res) => {
  try {
    const { url, quality, format } = req.body;
    if (!url || !quality || !format) return res.status(400).json({ error: 'Missing parameters' });

    const { filepath, filename } = await downloader.downloadVideo(url, quality, format);

    // Check if file exists before streaming
    if (!fs.existsSync(filepath)) {
      console.error('File not found:', filepath);
      return res.status(500).json({ error: 'Download failed, file not found.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('close', () => fs.unlink(filepath, () => {}));
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).json({ error: 'Failed to stream video file.' });
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Failed to download video' });
  }
});


module.exports = router;


