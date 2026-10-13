const express = require('express');
const router = express.Router();

// Import all v1 routes
router.use('/auth', require('../auth'));
router.use('/users', require('../users'));
router.use('/videos', require('../videos'));
router.use('/comments', require('../comments'));
router.use('/upload', require('../upload'));
router.use('/process', require('../process-video'));
router.use('/collections', require('../collections'));
router.use('/products', require('../products'));
router.use('/creator-academy', require('../creator-academy'));
router.use('/moderation', require('../moderation'));
router.use('/video-features', require('../video-features'));
router.use('/music', require('../music'));
router.use('/search', require('../search'));
router.use('/analytics', require('../analytics'));
router.use('/notifications', require('../notifications'));
router.use('/messages', require('../messages'));
router.use('/drafts', require('../drafts'));
router.use('/video-interactions', require('../video-interactions'));
router.use('/recommendations', require('../recommendations'));
router.use('/monetization', require('../monetization'));
router.use('/live', require('../live'));
router.use('/stories', require('../stories'));
router.use('/hashtags', require('../hashtags'));
router.use('/verification', require('../verification'));
router.use('/2fa', require('../2fa'));
router.use('/effects', require('../effects'));
router.use('/video-qa', require('../video-qa'));
router.use('/collaborations', require('../collaborations'));

module.exports = router;

