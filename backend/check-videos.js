const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');

const main = async () => {
	const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
	await mongoose.connect(uri);

	const total = await Video.countDocuments({});
	const readyPublic = await Video.countDocuments({ status: 'ready', isPrivate: false });
	const google = await Video.countDocuments({ url: /commondatastorage\.googleapis\.com/i });
	const readyPublicGoogle = await Video.countDocuments({
		status: 'ready',
		isPrivate: false,
		url: /commondatastorage\.googleapis\.com/i,
	});

	const hasUser = await Video.countDocuments({ user: { $exists: true, $ne: null } });

	const activeUsers = await User.find({ accountStatus: 'active' }).select('_id').lean();
	const activeUserIds = activeUsers.map((u) => u._id);
	const videosWithActiveUser = await Video.countDocuments({ user: { $in: activeUserIds } });
	const googleWithActiveUser = await Video.countDocuments({
		url: /commondatastorage\.googleapis\.com/i,
		user: { $in: activeUserIds },
	});

	const inactiveUserVideos = await Video.find({ user: { $nin: activeUserIds } })
		.select('url user status isPrivate')
		.limit(20)
		.lean();

	console.log(
		JSON.stringify(
			{
				mongoUri: uri,
				total,
				readyPublic,
				google,
				readyPublicGoogle,
				hasUser,
				activeUsers: activeUsers.length,
				videosWithActiveUser,
				googleWithActiveUser,
				inactiveUserVideosCount: inactiveUserVideos.length,
			},
			null,
			2
		)
	);

	if (inactiveUserVideos.length > 0) {
		console.log('Videos not linked to active users (sample):', inactiveUserVideos);
	}

	const sample = await Video.find({ url: /commondatastorage\.googleapis\.com/i })
		.select('url user status isPrivate')
		.limit(5)
		.lean();
	console.log('Sample google videos:', sample);

	const sampleUserIds = [...new Set(sample.map((v) => String(v.user)))];
	const sampleUsers = await User.find({ _id: { $in: sampleUserIds } })
		.select('_id email username accountStatus')
		.lean();
	console.log('Sample google video users:', sampleUsers);
};

main()
	.catch((err) => {
		console.error('check-videos failed:', err);
		process.exitCode = 1;
	})
	.finally(async () => {
		try {
			await mongoose.disconnect();
		} catch {
			// ignore
		}
	});
