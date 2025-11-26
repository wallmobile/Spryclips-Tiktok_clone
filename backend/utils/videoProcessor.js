const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * Generate thumbnail from video
 */
const generateThumbnail = async (videoPath, outputPath, timeOffset = 1) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeOffset],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x360'
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

/**
 * Get video metadata
 */
const getVideoMetadata = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bitrate,
          width: metadata.streams[0]?.width,
          height: metadata.streams[0]?.height,
          codec: metadata.streams[0]?.codec_name,
          format: metadata.format.format_name
        });
      }
    });
  });
};

/**
 * Transcode video to multiple qualities
 */
const FILTER_PRESETS = {
  none: null,
  vintage: 'curves=vintage',
  'black & white': 'hue=s=0',
  warm: 'colorbalance=rs=.2:bs=-.1',
  cool: 'colorbalance=rs=-.1:bs=.2',
  bright: 'eq=brightness=0.08:contrast=1.05',
  contrast: 'eq=contrast=1.3:brightness=-0.02'
};

const resolveFilter = (preset) => {
  if (!preset) {
    return null;
  }
  const key = String(preset).toLowerCase();
  return FILTER_PRESETS[key] || null;
};

const buildAtempoFilters = (speed) => {
  if (!speed || Math.abs(speed - 1) < 0.01) {
    return [];
  }

  const filters = [];
  let remaining = speed;

  // Handle speeds slower than 0.5 by stacking 0.5 filters
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }

  // Handle speeds faster than 2 by stacking 2.0 filters
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }

  const rounded = Number(remaining.toFixed(2));
  if (Math.abs(rounded - 1) > 0.01) {
    filters.push(`atempo=${rounded}`);
  }

  return filters;
};

const applyTrim = (command, options) => {
  if (!options) {
    return;
  }

  const startTime = Number.isFinite(options.trimStart) ? Math.max(0, options.trimStart) : 0;
  const endTime = Number.isFinite(options.trimEnd) ? options.trimEnd : null;
  const hasOriginalDuration = Number.isFinite(options.originalDuration);

  if (startTime > 0) {
    command.seekInput(startTime);
  }

  if (endTime !== null && endTime > startTime) {
    const duration = endTime - startTime;

    // Avoid forcing duration if it matches the original length
    if (!hasOriginalDuration || Math.abs(duration - options.originalDuration) > 0.05 || startTime > 0.05) {
      command.setDuration(duration);
    }
  }
};

const applyFilters = (command, options) => {
  if (!options) {
    return;
  }

  const filters = [];
  const resolvedFilter = resolveFilter(options.filter);

  if (resolvedFilter) {
    filters.push(resolvedFilter);
  }

  if (options.speed && Math.abs(options.speed - 1) > 0.01) {
    const setptsFactor = Number((1 / options.speed).toFixed(6));
    filters.push(`setpts=${setptsFactor}*PTS`);
  }

  if (filters.length > 0) {
    command.videoFilters(filters);
  }

  if (options.speed && Math.abs(options.speed - 1) > 0.01) {
    const audioFilters = buildAtempoFilters(options.speed);
    if (audioFilters.length > 0) {
      command.audioFilters(audioFilters);
    }
  }
};

const transcodeVideo = async (inputPath, outputDir, videoId, options = {}) => {
  const qualities = [
    { name: '360p', resolution: '640x360', bitrate: '500k' },
    { name: '720p', resolution: '1280x720', bitrate: '2500k' },
    { name: '1080p', resolution: '1920x1080', bitrate: '5000k' }
  ];

  const outputs = [];

  for (const quality of qualities) {
    const outputPath = path.join(outputDir, `${videoId}-${quality.name}.mp4`);
    
    await new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      applyTrim(command, options);

      command
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(quality.resolution)
        .videoBitrate(quality.bitrate);

      applyFilters(command, options);

      command
        .output(outputPath)
        .on('end', () => {
          outputs.push({
            quality: quality.name,
            path: outputPath,
            url: `/processed/${path.basename(outputPath)}`
          });
          resolve();
        })
        .on('error', (err) => {
          console.error(`Error transcoding ${quality.name}:`, err);
          reject(err);
        })
        .run();
    });
  }

  return outputs;
};

/**
 * Process video: generate thumbnail and transcode
 */
const processVideo = async (videoPath, videoId, outputDir, options = {}) => {
  try {
    // Get video metadata
    const metadata = await getVideoMetadata(videoPath);

    // Generate thumbnail (always generate for best quality at middle of video)
    const thumbnailPath = path.join(outputDir, `${videoId}-thumbnail.jpg`);
    await generateThumbnail(videoPath, thumbnailPath, metadata.duration / 2);

    // Transcode to multiple qualities
    const transcodedVideos = await transcodeVideo(videoPath, outputDir, videoId, {
      trimStart: Number.isFinite(options.trimStart) ? options.trimStart : 0,
      trimEnd: Number.isFinite(options.trimEnd) ? options.trimEnd : null,
      originalDuration: Number.isFinite(options.originalDuration) ? options.originalDuration : metadata.duration,
      filter: options.filter,
      speed: options.speed
    });

    return {
      metadata,
      thumbnail: `/processed/${path.basename(thumbnailPath)}`,
      videos: transcodedVideos
    };
  } catch (error) {
    console.error('Video processing error:', error);
    throw error;
  }
};

module.exports = {
  processVideo,
  generateThumbnail,
  getVideoMetadata,
  transcodeVideo
};

