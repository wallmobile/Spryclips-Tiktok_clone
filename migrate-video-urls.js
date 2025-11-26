#!/usr/bin/env node
/**
 * TikTok Clone - Database URL Migration Script
 * 
 * Migrates video URLs from relative paths to full public URLs
 * From: /uploads/video-xxx.mp4
 * To:   https://spryclips.com/uploads/video-xxx.mp4
 * 
 * Usage:
 *   node migrate-video-urls.js
 * 
 * Or with custom base URL:
 *   UPLOADS_BASE_URL=https://custom.com/uploads node migrate-video-urls.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
const UPLOADS_BASE_URL = process.env.UPLOADS_BASE_URL || 'https://spryclips.com/uploads';

console.log('🚀 TikTok Clone - Database URL Migration');
console.log('=========================================');
console.log(`📊 MongoDB URI: ${MONGODB_URI}`);
console.log(`🌐 Uploads Base URL: ${UPLOADS_BASE_URL}`);
console.log('');

// Video Schema (minimal for migration)
const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model('Video', videoSchema);

// Story Schema (minimal for migration)
const storySchema = new mongoose.Schema({}, { strict: false });
const Story = mongoose.model('Story', storySchema);

// Verification Schema (minimal for migration)
const verificationSchema = new mongoose.Schema({}, { strict: false });
const Verification = mongoose.model('Verification', verificationSchema);

/**
 * Migrate video URLs
 */
async function migrateVideoUrls() {
  console.log('📹 Migrating video URLs...');
  
  // Find all videos with relative paths
  const videos = await Video.find({
    $or: [
      { url: /^\/uploads\// },
      { thumbnail: /^\/processed\// },
      { thumbnail: /^\/uploads\/processed\// }
    ]
  });
  
  console.log(`Found ${videos.length} videos to migrate`);
  
  let migrated = 0;
  
  for (const video of videos) {
    let updated = false;
    
    // Update video URL
    if (video.url && video.url.startsWith('/uploads/')) {
      const filename = video.url.replace('/uploads/', '');
      video.url = `${UPLOADS_BASE_URL}/${filename}`;
      updated = true;
    }
    
    // Update thumbnail URL
    if (video.thumbnail && video.thumbnail.startsWith('/processed/')) {
      const filename = video.thumbnail.replace('/processed/', 'processed/');
      video.thumbnail = `${UPLOADS_BASE_URL}/${filename}`;
      updated = true;
    } else if (video.thumbnail && video.thumbnail.startsWith('/uploads/processed/')) {
      const filename = video.thumbnail.replace('/uploads/', '');
      video.thumbnail = `${UPLOADS_BASE_URL}/${filename}`;
      updated = true;
    }
    
    if (updated) {
      await video.save();
      migrated++;
      console.log(`  ✅ Migrated video: ${video._id}`);
    }
  }
  
  console.log(`✅ Migrated ${migrated} video URLs`);
  return migrated;
}

/**
 * Migrate story URLs
 */
async function migrateStoryUrls() {
  console.log('\n📱 Migrating story URLs...');
  
  const stories = await Story.find({
    $or: [
      { mediaUrl: /^\/uploads\/stories\// },
      { thumbnail: /^\/uploads\/stories\// }
    ]
  });
  
  console.log(`Found ${stories.length} stories to migrate`);
  
  let migrated = 0;
  
  for (const story of stories) {
    let updated = false;
    
    // Update media URL
    if (story.mediaUrl && story.mediaUrl.startsWith('/uploads/stories/')) {
      const filename = story.mediaUrl.replace('/uploads/', '');
      story.mediaUrl = `${UPLOADS_BASE_URL}/${filename}`;
      updated = true;
    }
    
    // Update thumbnail URL
    if (story.thumbnail && story.thumbnail.startsWith('/uploads/stories/')) {
      const filename = story.thumbnail.replace('/uploads/', '');
      story.thumbnail = `${UPLOADS_BASE_URL}/${filename}`;
      updated = true;
    }
    
    if (updated) {
      await story.save();
      migrated++;
      console.log(`  ✅ Migrated story: ${story._id}`);
    }
  }
  
  console.log(`✅ Migrated ${migrated} story URLs`);
  return migrated;
}

/**
 * Migrate verification document URLs
 */
async function migrateVerificationUrls() {
  console.log('\n📄 Migrating verification document URLs...');
  
  const verifications = await Verification.find({
    'documents.url': /^\/uploads\/verification\//
  });
  
  console.log(`Found ${verifications.length} verifications to migrate`);
  
  let migrated = 0;
  
  for (const verification of verifications) {
    let updated = false;
    
    if (verification.documents && Array.isArray(verification.documents)) {
      verification.documents.forEach((doc) => {
        if (doc.url && doc.url.startsWith('/uploads/verification/')) {
          const filename = doc.url.replace('/uploads/', '');
          doc.url = `${UPLOADS_BASE_URL}/${filename}`;
          updated = true;
        }
      });
    }
    
    if (updated) {
      await verification.save();
      migrated++;
      console.log(`  ✅ Migrated verification: ${verification._id}`);
    }
  }
  
  console.log(`✅ Migrated ${migrated} verification URLs`);
  return migrated;
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Run migrations
    const videoCount = await migrateVideoUrls();
    const storyCount = await migrateStoryUrls();
    const verificationCount = await migrateVerificationUrls();
    
    // Summary
    console.log('\n=========================================');
    console.log('🎉 Migration Complete!');
    console.log('=========================================');
    console.log(`📹 Videos migrated: ${videoCount}`);
    console.log(`📱 Stories migrated: ${storyCount}`);
    console.log(`📄 Verifications migrated: ${verificationCount}`);
    console.log(`📊 Total records migrated: ${videoCount + storyCount + verificationCount}`);
    console.log('');
    console.log(`🌐 All URLs now point to: ${UPLOADS_BASE_URL}`);
    console.log('');
    
    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
runMigration();
