const User = require('../models/User');
const Video = require('../models/Video');
const sampleData = require('../data/sampleVideos');

const isDevelopment = () =>
  process.env.NODE_ENV !== 'production' || process.env.SEED_SAMPLE_DATA === 'true';

const upsertSampleUser = async (userPayload) => {
  const { username, password, email, profile = {}, ...rest } = userPayload;

  // IMPORTANT: Do not delete & recreate users on every start.
  // That behavior breaks existing Video.user references (orphaned videos),
  // which makes the feed return only 1 video.
  let user = await User.findOne({ username }).exec();
  const isNewUser = !user;
  if (!user) {
    user = new User({ username });
  }

  user.email = email;
  // Only set password for brand-new users.
  // Resetting on every start can violate password-history rules and break seeding.
  if (isNewUser) {
    user.password = password;
  } else {
    try {
      const matches = await user.comparePassword(password);
      if (!matches) {
        console.warn(
          `⚠️ Sample user ${username} already exists with a different password; keeping existing password.`
        );
      }
    } catch {
      // ignore
    }
  }
  Object.assign(user, rest);
  user.authProvider = 'local';
  user.emailVerified = true;
  user.accountStatus = 'active';
  user.profile = {
    ...(user.profile || {}),
    displayName: profile.displayName || username,
    avatar: profile.avatar || '',
    bio: profile.bio || '',
    followers: profile.followers || 0,
    following: profile.following || 0,
    likes: user.profile?.likes || 0,
    isVerified: true,
  };

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

    // Repair orphaned seeded videos (caused by older delete-and-recreate behavior)
    if (process.env.NODE_ENV !== 'production') {
      const sampleUsers = await User.find({
        username: { $in: sampleData.map((entry) => entry.user.username) },
        accountStatus: 'active',
      })
        .select('_id username')
        .lean();

      if (sampleUsers.length > 0) {
        const adminUser = await User.findOne({ role: 'admin', accountStatus: 'active' })
          .select('_id username')
          .lean();
        const fallbackUser = adminUser || sampleUsers[0];

        const existingUserIds = await User.distinct('_id');

        const orphanedVideos = await Video.find({ user: { $nin: existingUserIds } })
          .select('_id')
          .lean();

        if (orphanedVideos.length > 0) {
          await Video.updateMany(
            { _id: { $in: orphanedVideos.map((v) => v._id) } },
            { $set: { user: fallbackUser._id } }
          ).exec();
          console.info(
            `🛠️ Re-linked ${orphanedVideos.length} orphaned videos to user ${fallbackUser.username}.`
          );
        }
      }
    }

    // Only seed sample videos if there are no videos present.
    // Never delete existing videos on server start.
    const totalVideos = await Video.countDocuments().exec();
    if (totalVideos > 0) {
      console.info(`✅ Found ${totalVideos} existing videos, skipping sample video creation.`);
      return;
    }

    console.info('🎬 No existing videos found — seeding sample videos for development...');
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

