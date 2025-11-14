const Queue = require('bull');
const Video = require('../models/Video');
const { processVideo } = require('../utils/videoProcessor');
const path = require('path');
const fs = require('fs');

const isTestEnv = process.env.NODE_ENV === 'test';

let videoQueue;
let queueDisabled = false;

if (isTestEnv) {
  const noop = async () => {};
  videoQueue = {
    add: noop,
    process: noop,
    on: noop,
    close: noop,
    isDisabled: true
  };
  queueDisabled = true;
} else {
  // Default to disabled if Redis is not explicitly enabled
  // Set USE_REDIS=true in .env to enable Redis
  queueDisabled = process.env.USE_REDIS !== 'true';

  const redisUrl = process.env.REDIS_URL;
  // If Redis URL is provided as string, convert to object with retry config
  let redisConfig;
  if (redisUrl) {
    // Parse URL and add retry configuration
    try {
      const url = new URL(redisUrl);
      redisConfig = {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 6379,
        password: url.password || undefined,
        maxRetriesPerRequest: null, // Disable automatic retries to prevent unhandled rejections
        retryStrategy: (times) => {
          if (times > 3) {
            // Don't log here - error handler will log it
            queueDisabled = true;
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
        enableOfflineQueue: false, // Don't queue commands when offline
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 5000, // 5 second timeout
        enableReadyCheck: false // Disable ready check to prevent hanging
      };
    } catch (e) {
      // If URL parsing fails, use as-is but it might not work
      redisConfig = redisUrl;
    }
  } else {
    redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // Disable automatic retries to prevent unhandled rejections
      retryStrategy: (times) => {
        if (times > 3) {
          // Don't log here - error handler will log it
          queueDisabled = true;
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000); // Exponential backoff
      },
      enableOfflineQueue: false, // Don't queue commands when offline
      lazyConnect: true, // Don't connect immediately
      connectTimeout: 5000, // 5 second timeout
      enableReadyCheck: false // Disable ready check to prevent hanging
    };
  }

  // Create video processing queue without Redis when disabled
  if (queueDisabled) {
    // Only log if Redis was explicitly requested
    if (process.env.USE_REDIS === 'true') {
      console.warn('⚠️ Redis is disabled. Ensure Redis is running to enable video processing queue.');
    }
    const noop = async () => {};
    videoQueue = {
      add: noop,
      process: noop,
      on: noop,
      close: noop,
      isDisabled: true
    };
  } else {
    try {
      videoQueue = new Queue('video processing', {
        redis: redisConfig
      });

      // Handle Redis connection errors gracefully - suppress all connection errors
      let errorLogged = false;
      videoQueue.on('error', (error) => {
        // Suppress error logging if already disabled
        if (queueDisabled || errorLogged) return;
        
        const errorMsg = error?.message || String(error) || '';
        const errorName = error?.name || '';
        const errorCode = error?.code || '';
        
        // Check for connection errors - suppress all of them
        const isConnectionError = 
          errorName === 'AggregateError' || 
          errorMsg.includes('ECONNREFUSED') || 
          errorMsg.includes('max retries') ||
          errorMsg.includes('Connection refused') ||
          errorCode === 'ECONNREFUSED' ||
          errorCode === 'ENOTFOUND';
        
        if (isConnectionError) {
          // Silently disable - don't log anything
          queueDisabled = true;
          errorLogged = true;
          return;
        }
        // Only log non-connection errors
        console.warn('Redis/Bull queue error:', errorMsg || errorName);
      });

      // Handle Redis client errors (from ioredis) - suppress connection errors
      let clientErrorLogged = false;
      if (videoQueue.client) {
        videoQueue.client.on('error', (error) => {
          if (queueDisabled || clientErrorLogged) return;
          
          const errorMsg = error?.message || String(error) || '';
          const errorCode = error?.code || '';
          
          if (errorCode === 'ECONNREFUSED' || errorMsg.includes('ECONNREFUSED')) {
            // Already logged by queue error handler, just mark as logged
            clientErrorLogged = true;
            queueDisabled = true;
            return;
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to create Redis queue:', error.message);
      console.warn('💡 Video processing queue disabled. Set USE_REDIS=false in .env to suppress this warning.');
      queueDisabled = true;
      const noop = async () => {};
      videoQueue = {
        add: noop,
        process: noop,
        on: noop,
        close: noop,
        isDisabled: true
      };
    }

    // Only process jobs if queue is not disabled
    if (!queueDisabled && videoQueue && !videoQueue.isDisabled) {
      // Process video job
      videoQueue.process(async (job) => {
        const { videoId, videoPath } = job.data;
        
        try {
          // Update video status to processing
          await Video.findByIdAndUpdate(videoId, { status: 'processing' });

          const videoDoc = await Video.findById(videoId).lean();

          const processingOptions = {
            trimStart: Number.isFinite(videoDoc?.cropSettings?.startTime) ? videoDoc.cropSettings.startTime : 0,
            trimEnd: Number.isFinite(videoDoc?.cropSettings?.endTime) ? videoDoc.cropSettings.endTime : undefined,
            originalDuration: Number.isFinite(videoDoc?.metadataSnapshot?.duration)
              ? videoDoc.metadataSnapshot.duration
              : undefined,
            filter: videoDoc?.filter,
            speed: Number.isFinite(videoDoc?.speed) && videoDoc.speed > 0 ? videoDoc.speed : 1
          };

          const outputDir = path.join(__dirname, '../processed');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          // Process video
          const result = await processVideo(videoPath, videoId, outputDir, processingOptions);

          // Update video with processed data
          await Video.findByIdAndUpdate(videoId, {
            status: 'ready',
            thumbnail: result.thumbnail,
            metadata: result.metadata,
            processedVideos: result.videos
          });

          return { success: true, videoId, result };
        } catch (error) {
          // Update video status to failed
          await Video.findByIdAndUpdate(videoId, { 
            status: 'failed',
            processingError: error.message
          });
          throw error;
        }
      });

      // Job event handlers
      videoQueue.on('completed', (job, result) => {
        console.log(`Video processing job ${job.id} completed:`, result.videoId);
      });

      videoQueue.on('failed', (job, err) => {
        console.error(`Video processing job ${job.id} failed:`, err);
      });
      videoQueue.isDisabled = false;
    }
  }
}

module.exports = videoQueue;
module.exports.queueDisabled = queueDisabled;

