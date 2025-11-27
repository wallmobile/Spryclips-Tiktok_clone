const User = require('../models/User');
const Video = require('../models/Video');
const sampleData = require('../data/sampleVideos');

const isDevelopment = () =>
  process.env.NODE_ENV !== 'production' || process.env.SEED_SAMPLE_DATA === 'true';

const upsertSampleUser = async (userPayload) => {
  const { username, password, email, profile = {}, ...rest } = userPayload;

  // Delete existing sample user and recreate to ensure password is correct
  await User.deleteOne({ username }).exec();
  
  const user = new User({
    username,
    email,
    password,
    ...rest,
    authProvider: 'local',
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
  console.log(`✅ Sample user ready: ${email}`);
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
    // Always ensure sample users exist with proper passwords (for login functionality)
    console.info('🔧 Checking sample users for development...');
    for (let index = 0; index < sampleData.length; index += 1) {
      const entry = sampleData[index];
      await upsertSampleUser(entry.user);
    }
    console.info('✅ Sample users ready. You can login with:');
    console.info('   Email: funnycat@example.com | Password: SampleCat1!');

    // Check if working sample videos exist (with external URLs like Google Cloud Storage)
    const workingSampleVideo = await Video.findOne({ 
      url: { $regex: /^https:\/\// } 
    }).exec();
    
    if (workingSampleVideo) {
      console.info('✅ Sample videos already exist with working URLs.');
      return;
    }

    // Delete ALL videos (they have broken local URLs) and seed fresh sample videos
    const totalVideos = await Video.countDocuments().exec();
    if (totalVideos > 0) {
      console.info(`🧹 Removing ${totalVideos} videos with broken/local URLs...`);
      await Video.deleteMany({}).exec();
    }

    console.info('🎬 Seeding sample videos for development...');
    for (let index = 0; index < sampleData.length; index += 1) {
      const entry = sampleData[index];
      const user = await User.findOne({ username: entry.user.username }).exec();
      if (user) {
        await createSampleVideo(user, entry.video, index);
        console.info(`   ✅ Created video: ${entry.video.description.substring(0, 30)}...`);
      }
    }
    console.info('✅ Sample videos ready with working external URLs!');
  } catch (error) {
    console.error('Failed to seed sample data:', error);
  }
};

module.exports = seedSampleData;

