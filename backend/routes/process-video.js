const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Create uploads and processed directories
const uploadsDir = path.join(__dirname, '../uploads');
const processedDir = path.join(__dirname, '../uploads/processed');
[uploadsDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Process video with TikTok-style filters
router.post('/apply-filters', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const { 
      brightness = 0.05, 
      contrast = 1.15, 
      saturation = 1.2, 
      vignette = 0.45, 
      grain = 0.08,
      useMultiprocessing = false,
      numWorkers = null
    } = req.body;

    const inputPath = req.file.path;
    const outputFilename = 'processed-' + req.file.filename;
    const outputPath = path.join(processedDir, outputFilename);

    // Build Python command
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, '../utils/apply_filter.py');
    
    let command = `${pythonPath} "${scriptPath}" "${inputPath}" "${outputPath}"`;
    command += ` --brightness ${brightness}`;
    command += ` --contrast ${contrast}`;
    command += ` --saturation ${saturation}`;
    command += ` --vignette ${vignette}`;
    command += ` --grain ${grain}`;
    
    if (useMultiprocessing === 'true' || useMultiprocessing === true) {
      command += ' --multiprocessing';
      if (numWorkers) {
        command += ` --workers ${numWorkers}`;
      }
    }

    // Check for hardware acceleration
    if (process.env.USE_HARDWARE_ACCEL === 'true') {
      command += ' --hardware-accel';
    }

    console.log('Processing video with command:', command);

    // Execute Python script
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Processing error:', stderr);
        // Clean up input file
        fs.unlinkSync(inputPath);
        return res.status(500).json({ 
          message: 'Video processing failed',
          error: error.message 
        });
      }

      if (!fs.existsSync(outputPath)) {
        // Clean up input file
        fs.unlinkSync(inputPath);
        return res.status(500).json({ message: 'Processed video not found' });
      }

      // Save video to database
      Video.create({
        user: req.user._id,
        url: `/uploads/processed/${outputFilename}`,
        thumbnail: `/uploads/${req.file.filename}`,
        description: req.body.description || '',
        hashtags: req.body.hashtags ? req.body.hashtags.split(',').map(tag => tag.trim()) : [],
        isPrivate: req.body.isPrivate === 'true',
        filter: 'tiktok-style',
        effects: ['brightness', 'contrast', 'saturation', 'vignette', 'grain'],
        status: 'ready'
      })
      .then(async (video) => {
        // Add video to user's videos
        await User.findByIdAndUpdate(req.user._id, {
          $push: { videos: video._id }
        });

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: 'Video processed successfully',
          video: video
        });
      })
      .catch(err => {
        console.error('Database error:', err);
        // Clean up files
        fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        res.status(500).json({ message: err.message });
      });
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get processing status (for long-running jobs)
router.get('/status/:jobId', authMiddleware, (req, res) => {
  // TODO: Implement job status tracking with Redis or similar
  res.json({ 
    success: true, 
    status: 'completed',
    message: 'Processing complete' 
  });
});

module.exports = router;

