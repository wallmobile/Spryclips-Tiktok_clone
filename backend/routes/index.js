const express = require("express");
const router = express.Router();

// Import all route modules
router.use("/auth", require("./auth"));
router.use("/users", require("./users"));
router.use("/videos", require("./videos"));
router.use("/comments", require("./comments"));
router.use("/messages", require("./messages"));
router.use("/notifications", require("./notifications"));
router.use("/hashtags", require("./hashtags"));
router.use("/collections", require("./collections"));
router.use("/products", require("./products"));
router.use("/search", require("./search"));
router.use("/analytics", require("./analytics"));
router.use("/stories", require("./stories"));
router.use("/upload", require("./upload"));
router.use("/drafts", require("./drafts"));
router.use("/moderation", require("./moderation"));
router.use("/monetization", require("./monetization"));
router.use("/more", require("./more"));
router.use("/collaborations", require("./collaborations"));
router.use("/creator-academy", require("./creator-academy"));
router.use("/recommendations", require("./recommendations"));
router.use("/effects", require("./effects"));
router.use("/music", require("./music"));
router.use("/live", require("./live"));
router.use("/video-qa", require("./video-qa"));
router.use("/video-interactions", require("./video-interactions"));
router.use("/video-features", require("./video-features"));
router.use("/verification", require("./verification"));
router.use("/2fa", require("./2fa"));
router.use("/process-video", require("./process-video"));
router.use("/admin", require("./admin"));

// API versioning
router.use("/v1", require("./v1"));

module.exports = router;
