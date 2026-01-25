/**
 * Regenerate missing video thumbnails
 * SAFE: Only generates thumbnails that do NOT exist
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const mongoose = require("mongoose");

// ================= CONFIG =================
const UPLOAD_ROOT = "/home/reactmaster/uploads";
const VIDEO_DIR = UPLOAD_ROOT; // search recursively from uploads root
const THUMB_DIR = `${UPLOAD_ROOT}/processed`;

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:tR0hD8ODPxICuafh@cluster0.q6qrciv.mongodb.net/spryclips?retryWrites=true&w=majority";

// ================= DB CONNECT =================
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

// ================= MODEL =================
const Video = require("../models/Video");

// ================= HELPERS =================
function findVideoFile(dir, videoId) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const found = findVideoFile(fullPath, videoId);
      if (found) return found;
    }

    if (
      entry.isFile() &&
      entry.name.includes(videoId) &&
      entry.name.endsWith(".mp4")
    ) {
      return fullPath;
    }
  }

  return null;
}

// ================= ENSURE DIR =================
if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

// ================= MAIN =================
(async () => {
  console.log("🔍 Scanning videos for missing thumbnails...");

  const videos = await Video.find({});

  let generated = 0;
  let skipped = 0;
  let missingVideo = 0;

  for (const video of videos) {
    const videoId = video._id.toString();
    const thumbPath = path.join(THUMB_DIR, `${videoId}-thumbnail.jpg`);

    // Skip if thumbnail already exists
    if (fs.existsSync(thumbPath)) {
      skipped++;
      continue;
    }

    // Find video anywhere under uploads/
    const videoPath = findVideoFile(VIDEO_DIR, videoId);

    if (!videoPath) {
      console.warn(`⚠️ Video file not found for ${videoId}`);
      missingVideo++;
      continue;
    }

    console.log(`🎞 Generating thumbnail for ${videoId}`);

    const cmd = `ffmpeg -y -i "${videoPath}" -ss 00:00:01 -vframes 1 "${thumbPath}"`;

    await new Promise((resolve) => {
      exec(cmd, (err) => {
        if (err) {
          console.error(`❌ Thumbnail failed for ${videoId}`);
        } else {
          generated++;
        }
        resolve();
      });
    });
  }

  console.log("\n✅ Thumbnail regeneration complete");
  console.log(`✔ Generated           : ${generated}`);
  console.log(`⏭ Skipped (existing)  : ${skipped}`);
  console.log(`⚠️ Missing video file : ${missingVideo}`);

  process.exit(0);
})();

