# Monetization View Tracking Solution

## Problem
If view counts are not working on the user side for videos, monetization on the admin side will be inaccurate because:
- Admin monetization calculations rely on `video.views` field
- If views aren't being tracked, earnings will be incorrect
- Analytics and reporting will show wrong data

## Solution
Created a **dedicated view tracking system** that works independently of the regular view counting mechanism.

### 1. **VideoView Model** (`backend/models/VideoView.js`)
- Tracks individual video views with detailed metadata
- Prevents duplicate views from same user/IP within 24 hours
- Stores watch time and completion rate
- Auto-expires after 1 year for data cleanup

### 2. **View Tracking API** (`backend/routes/video-views.js`)
- `POST /api/video-views/track` - Track a video view
- `GET /api/video-views/stats/:videoId` - Get view statistics
- `GET /api/video-views/history` - Get user's view history

### 3. **Admin Monetization Routes** (`backend/routes/admin-monetization.js`)
- `GET /api/admin/monetization/calculate-earnings` - Calculate earnings based on tracked views
- `GET /api/admin/monetization/stats` - Get monetization statistics
- `POST /api/admin/monetization/sync-views` - Sync video.views with tracked views

### 4. **Updated Monetization** (`backend/routes/monetization.js`)
- Now uses `VideoView` model for accurate view tracking
- Falls back to `video.views` if tracked views aren't available
- Provides discrepancy reporting

## How It Works

### For Users (Frontend)
1. When a video is played, call `trackVideoView(videoId, watchTime, completionRate)`
2. This creates a `VideoView` record in the database
3. The video's `views` count is also incremented (for backward compatibility)

### For Admin
1. Monetization calculations use `VideoView` model for accurate counts
2. Admin can see:
   - Tracked views (accurate)
   - Video.views (may be inaccurate)
   - Discrepancy between the two
3. Admin can sync `video.views` with tracked views if needed

## Benefits

1. **Accurate Monetization**: Uses tracked views instead of potentially broken view counting
2. **Duplicate Prevention**: Prevents same user/IP from counting multiple views in 24 hours
3. **Detailed Analytics**: Tracks watch time, completion rate, and user info
4. **Backward Compatible**: Still increments `video.views` for existing code
5. **Admin Tools**: Provides tools to compare and sync view counts

## Usage

### Frontend (Track Views)
```javascript
import { trackVideoView } from './api/videos';

// When video starts playing
trackVideoView(videoId);

// When video ends (with watch time)
trackVideoView(videoId, watchTimeInSeconds, completionPercentage);
```

### Admin (Calculate Earnings)
```javascript
// Get earnings based on tracked views
GET /api/admin/monetization/calculate-earnings?userId=123&startDate=2024-01-01

// Get monetization statistics
GET /api/admin/monetization/stats?startDate=2024-01-01&endDate=2024-12-31

// Sync video.views with tracked views
POST /api/admin/monetization/sync-views
Body: { videoId: "123" } or { userId: "456" }
```

## Next Steps

1. **Update VideoCard Component**: Call `trackVideoView()` when video is played
2. **Update Admin Panel**: Use new monetization endpoints for accurate calculations
3. **Monitor Discrepancies**: Check if tracked views differ from video.views
4. **Sync if Needed**: Use sync endpoint to update video.views with tracked counts

## Important Notes

- **VideoView is the source of truth** for monetization
- `video.views` is kept for backward compatibility
- Admin should use tracked views for all monetization calculations
- The system prevents duplicate views automatically

