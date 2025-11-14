const User = require('../models/User');
const Video = require('../models/Video');
const sampleData = require('../data/sampleVideos');

const isDevelopment = () =>
  process.env.NODE_ENV !== 'production' || process.env.SEED_SAMPLE_DATA === 'true';

const upsertSampleUser = async (userPayload) => {
  const { username, profile = {}, ...rest } = userPayload;

  let user = await User.findOne({ username }).exec();
  if (!user) {
    user = new User({
      username,
      ...rest,
      emailVerified: true,
      accountStatus: 'active',
      profile: {
        displayName: profile.displayName || username,
        avatar: profile.avatar || '',
        bio: profile.bio || '',
        followers: profile.followers || 0,
        following: profile.following || 0,
        likes: profile.likes || 0,
        isVerified: true
      }
    });
    await user.save();
    return user;
  }

  let updated = false;
  if (!user.profile.avatar && profile.avatar) {
    user.profile.avatar = profile.avatar;
    updated = true;
  }
  if (!user.profile.displayName && profile.displayName) {
    user.profile.displayName = profile.displayName;
    updated = true;
  }
  if (profile.bio && !user.profile.bio) {
    user.profile.bio = profile.bio;
    updated = true;
  }
  if (updated) {
    await user.save();
  }
  return user;
};

const createSampleVideo = async (user, videoPayload, index) => {
  const existing = await Video.findOne({ url: videoPayload.url }).exec();
  if (existing) {
    return existing;
  }

  const createdAt = new Date(Date.now() - index * 6 * 60 * 60 * 1000);

  const video = new Video({
    user: user._id,
    url: videoPayload.url,
    thumbnail: videoPayload.thumbnail || '',
    description: videoPayload.description || '',
    hashtags: videoPayload.hashtags || [],
    category: (videoPayload.category || 'general').toLowerCase(),
    likes: videoPayload.likes || 0,
    comments: videoPayload.comments || 0,
    shares: videoPayload.shares || 0,
    views: videoPayload.views || 0,
    status: 'ready',
    isPrivate: false,
    music: {
      name: videoPayload.music?.name || '',
      artist: videoPayload.music?.artist || '',
      duration: videoPayload.music?.duration || ''
    },
    createdAt,
    updatedAt: createdAt
  });

  await video.save();

  const alreadyLinked = user.videos?.some((id) => id.equals(video._id));
  if (!alreadyLinked) {
    user.videos = user.videos || [];
    user.videos.push(video._id);
  }
  if (typeof video.likes === 'number') {
    user.profile.likes = (user.profile.likes || 0) + video.likes;
  }
  await user.save();

  return video;
};

const seedSampleData = async () => {
  if (!isDevelopment()) {
    return;
  }

  try {
    const videoCount = await Video.countDocuments().exec();
    if (videoCount > 0) {
      return;
    }

    console.info('Seeding sample users and videos for development...');
    for (let index = 0; index < sampleData.length; index += 1) {
      const entry = sampleData[index];
      const user = await upsertSampleUser(entry.user);
      await createSampleVideo(user, entry.video, index);
    }
    console.info('Sample data ready.');
  } catch (error) {
    console.error('Failed to seed sample data:', error);
  }
};

module.exports = seedSampleData;

