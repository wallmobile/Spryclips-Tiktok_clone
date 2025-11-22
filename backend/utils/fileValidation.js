const fs = require('fs');
const path = require('path');

// Magic bytes for file type detection
const FILE_SIGNATURES = {
  // Images
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
  
  // Videos
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // Standard MP4
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]  // Common variant
  ],
  'video/quicktime': [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // QuickTime
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
  'video/avi': [0x52, 0x49, 0x46, 0x46], // RIFF (AVI)
  'video/x-msvideo': [0x52, 0x49, 0x46, 0x46], // AVI
  
  // Documents
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
};

/**
 * Read first bytes of file to check magic bytes
 */
const readFileHeader = (filePath, length = 8) => {
  try {
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, length, 0);
    fs.closeSync(fd);
    return Array.from(buffer);
  } catch (error) {
    return null;
  }
};

/**
 * Validate file by checking magic bytes
 */
const validateFileType = (filePath, expectedMimeType) => {
  const header = readFileHeader(filePath, 12);
  if (!header) return false;

  const signatures = FILE_SIGNATURES[expectedMimeType];
  if (!signatures) return false; // Unknown type

  // Check if header matches any signature for this MIME type
  if (Array.isArray(signatures[0])) {
    // Multiple possible signatures
    return signatures.some(sig => {
      return sig.every((byte, index) => header[index] === byte);
    });
  } else {
    // Single signature
    return signatures.every((byte, index) => header[index] === byte);
  }
};

/**
 * Sanitize filename to prevent path traversal
 */
const sanitizeFilename = (filename) => {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove dangerous characters
    .trim()
    .substring(0, 255); // Limit length
};

/**
 * Get file extension from filename
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().replace('.', '');
};

/**
 * Validate file size
 */
const validateFileSize = (fileSize, maxSize) => {
  return fileSize <= maxSize;
};

/**
 * Check if file extension matches allowed types
 */
const validateExtension = (filename, allowedExtensions) => {
  const ext = getFileExtension(filename);
  return allowedExtensions.includes(ext);
};

/**
 * Comprehensive file validation
 */
const validateFile = async (file, options = {}) => {
  const {
    allowedMimeTypes = [],
    allowedExtensions = [],
    maxSize = 100 * 1024 * 1024, // 100MB default
    requireMagicBytes = true
  } = options;

  const errors = [];

  // Check file exists
  if (!file || !file.path) {
    errors.push('File is required');
    return { valid: false, errors };
  }

  // Validate file size
  if (!validateFileSize(file.size, maxSize)) {
    errors.push(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
  }

  // Validate extension
  if (allowedExtensions.length > 0 && !validateExtension(file.originalname, allowedExtensions)) {
    errors.push(`File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`);
  }

  // Validate MIME type with magic bytes
  if (requireMagicBytes && allowedMimeTypes.length > 0) {
    const isValidType = allowedMimeTypes.some(mimeType => {
      return validateFileType(file.path, mimeType);
    });

    if (!isValidType) {
      errors.push('File type validation failed. File content does not match declared type.');
    }
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.originalname);
  if (sanitizedFilename !== file.originalname) {
    file.originalname = sanitizedFilename;
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedFilename
  };
};

module.exports = {
  validateFile,
  validateFileType,
  sanitizeFilename,
  validateFileSize,
  validateExtension,
  getFileExtension
};

