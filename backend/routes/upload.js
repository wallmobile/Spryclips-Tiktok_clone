const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ===============================
// CONFIG
// ===============================
const UPLOADS_DIR = '/home/reactmaster/uploads';

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ===============================
// MULTER STORAGE (FIXED)
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    const prefix =
      file.fieldname === 'video'
        ? 'video'
        : file.fieldname === 'thumbnail'
        ? 'thumb'
        : 'file';

    const filename = `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`;
    const fullPath = path.join(UPLOADS_DIR, filename);

    // Let multer write the file
    cb(null, filename);

    // 🔥 CRITICAL FIX: force permissions immediately
    setTimeout(() => {
      fs.chmod(fullPath, 0o755, (err) => {
        if (err) {
          console.error('[UPLOAD] chmod failed:', fullPath, err.message);
        }
      });
    }, 50);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 500 // 500MB
  }
});

// ===============================
// ROUTES
// ===============================
router.post(
  '/upload',
  upload.single('video'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      res.json({
        success: true,
        message: 'Video uploaded successfully',
        file: {
          filename: req.file.filename,
          path: `/uploads/${req.file.filename}`
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
