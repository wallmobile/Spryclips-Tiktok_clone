# TikTok Clone - Full-Featured Social Video Platform

A comprehensive TikTok clone built with React and Node.js, featuring a complete social media experience with video uploads, live streaming, messaging, analytics, monetization, and much more.

## 🚀 Features

### 🎬 Core Video Features
- **Vertical Video Feed** - TikTok-style infinite scroll with snap behavior
- **Video Upload** - Upload videos up to 100MB with advanced editing tools
- **Video Player** - Autoplay, pause, volume controls, and smooth playback
- **Video Editing** - Trim, crop, filters, text overlays, stickers, transitions, speed control
- **Smart Auto-Crop** - AI-powered face detection for automatic video cropping
- **Video Processing** - Server-side video processing and optimization
- **Video Collections** - Organize videos into collections and playlists
- **Video Drafts** - Save and edit video drafts before publishing
- **Video Scheduling** - Schedule videos for future publication
- **Video Analytics** - Detailed analytics for each video (views, engagement, demographics)
- **Video Interactions** - Like, comment, share, download, embed
- **Video Features** - Duet, Stitch, and other creative features
- **Video Q&A** - Q&A functionality for videos
- **Video Series** - Create and manage video series

### 👤 User Management
- **Authentication** - JWT-based authentication with secure password hashing
- **Registration & Login** - User registration and login system
- **Password Reset** - Forgot password and reset functionality
- **Password Change** - Change password functionality
- **Two-Factor Authentication (2FA)** - QR code-based 2FA for enhanced security
- **OIDC Integration** - OpenID Connect integration for Hub App authentication
- **Email Verification** - Email verification system (ready for implementation)
- **User Profiles** - Complete profile management with avatar, banner, bio, website
- **Follow System** - Follow/unfollow users with follow requests for private accounts
- **Block System** - Block/unblock users
- **Privacy Settings** - Public/private accounts, activity status, DM controls
- **Account Settings** - Comprehensive account management
- **User Verification** - Account verification system
- **Restricted Accounts** - Manage restricted accounts
- **Family Pairing** - Family pairing for parental controls

### 🎥 Content Discovery
- **For You Feed** - Personalized video feed with recommendation algorithm
- **Explore Page** - Discover trending videos, music, and hashtags
- **Following Feed** - Videos from users you follow
- **Search** - Global search for videos, users, hashtags, and music
- **Search History** - Track and manage search history
- **Trending Searches** - View trending search terms
- **Search Suggestions** - Auto-complete search suggestions
- **Hashtags** - Browse videos by hashtags
- **Trending Hashtags** - Discover trending hashtags
- **Music/Sounds** - Browse and search music library
- **Trending Sounds** - Discover trending sounds
- **Recommendations** - AI-powered video recommendations
- **Watch History** - Track and manage watch history

### 💬 Social Features
- **Comments System** - Add, edit, delete comments with replies
- **Comment Reactions** - React to comments with emojis
- **Pin Comments** - Pin important comments
- **Like Comments** - Like/unlike comments
- **Direct Messaging** - Private messaging between users
- **Message Center** - Centralized message management
- **Conversations** - Thread-based conversations
- **Live Chat** - Chat during live streams
- **Notifications** - Real-time notifications for likes, comments, follows, etc.
- **Notification Center** - Manage all notifications
- **Notification Settings** - Customize notification preferences
- **Collaborations** - Collaborate with other creators
- **Mentions** - Mention users in videos and comments

### 📺 Live Streaming
- **Live Stream Setup** - Create and configure live streams
- **Live Stream Player** - Watch live streams with chat
- **Live Stream Discovery** - Browse active live streams
- **Live Stream Categories** - Filter streams by category
- **Live Chat** - Real-time chat during streams
- **Live Analytics** - Analytics for live streams
- **Gift Leaderboard** - Leaderboard for live stream gifts

### 📊 Analytics & Insights
- **Creator Analytics** - Comprehensive analytics dashboard for creators
- **Video Analytics** - Detailed analytics for individual videos
- **Audience Analytics** - Audience demographics and insights
- **Engagement Metrics** - Track likes, comments, shares, views
- **Growth Analytics** - Follower growth and engagement trends
- **Top Performing Videos** - Identify top performing content
- **Demographics** - Audience demographics breakdown
- **Activity Metrics** - Audience activity patterns

### 💰 Monetization
- **Creator Monetization** - Monetization tools for creators
- **Products** - Product listings and management
- **TikTok Shop** - E-commerce integration
- **Balance** - View earnings and balance
- **Transactions** - Transaction history
- **Gifts** - Virtual gifts system
- **Promote Videos** - Promote videos for increased visibility

### 🎨 Creative Tools
- **Advanced Video Editor** - Professional video editing tools
- **Effects Marketplace** - Browse and use video effects
- **Create Effects** - Create custom TikTok effects
- **Filters** - Apply filters to videos
- **Text Overlays** - Add text overlays to videos
- **Stickers** - Add stickers to videos
- **Transitions** - Apply transitions between clips
- **Speed Control** - Adjust video playback speed
- **Voiceover** - Add voiceover to videos
- **Aspect Ratio** - Change video aspect ratio
- **Music Library** - Extensive music and sound library

### 📚 Creator Academy
- **Creator Academy** - Educational content for creators
- **Tutorials** - Video creation tutorials
- **Tips & Tricks** - Creator tips and best practices
- **Growth Tools** - Tools to grow your audience
- **Content Suggestions** - AI-powered content suggestions

### ⚙️ Settings & Preferences
- **Account Settings** - Manage account settings
- **Privacy Settings** - Configure privacy preferences
- **Notification Settings** - Customize notifications
- **App Settings** - App preferences and settings
- **Language Selection** - Multi-language support
- **Dark Mode** - Dark mode toggle
- **Theme Customization** - Customize app theme

### 🛡️ Moderation & Safety
- **Content Moderation** - Report inappropriate content
- **Age Verification** - Age verification system
- **Moderation Rules** - Admin moderation rules
- **Moderation Logs** - Track moderation actions
- **Content Reporting** - Report videos, comments, and users
- **Restricted Content** - Manage restricted content

### 🔧 Additional Features
- **Stories** - Create and view stories (24-hour content)
- **Video Collections** - Organize videos into collections
- **Playlists** - Create and manage playlists
- **Drafts** - Save video drafts
- **Hashtag Pages** - Dedicated pages for hashtags
- **User Verification** - Verified account badges
- **System Notifications** - System-wide notifications
- **Support Center** - Help and support center
- **Business Tools** - Tools for business accounts
- **Personal Tools** - Personal account tools
- **Get App** - Download mobile app
- **TikTok Studio** - Studio tools for creators

## 🏗️ Project Structure

```
tiktok-clone/
├── backend/                         # Backend API
│   ├── routes/                      # API routes
│   │   ├── auth.js                 # Authentication routes
│   │   ├── users.js                # User management routes
│   │   ├── videos.js               # Video routes
│   │   ├── upload.js               # Video upload routes
│   │   ├── comments.js             # Comment routes
│   │   ├── search.js               # Search routes
│   │   ├── analytics.js            # Analytics routes
│   │   ├── notifications.js        # Notification routes
│   │   ├── messages.js             # Messaging routes
│   │   ├── moderation.js           # Moderation routes
│   │   ├── music.js                # Music/Sound routes
│   │   ├── live.js                 # Live streaming routes
│   │   ├── stories.js              # Stories routes
│   │   ├── collections.js          # Collection routes
│   │   ├── drafts.js               # Draft routes
│   │   ├── hashtags.js             # Hashtag routes
│   │   ├── effects.js              # Effects routes
│   │   ├── products.js             # Product routes
│   │   ├── monetization.js         # Monetization routes
│   │   ├── recommendations.js      # Recommendation routes
│   │   ├── video-interactions.js   # Video interaction routes
│   │   ├── video-features.js       # Video feature routes
│   │   ├── creator-academy.js      # Creator academy routes
│   │   ├── video-qa.js             # Video Q&A routes
│   │   ├── collaborations.js       # Collaboration routes
│   │   ├── verification.js         # Verification routes
│   │   ├── 2fa.js                  # Two-factor auth routes
│   │   └── process-video.js        # Video processing routes
│   ├── models/                      # MongoDB models
│   │   ├── User.js                 # User model
│   │   ├── Video.js                # Video model
│   │   ├── Comment.js              # Comment model
│   │   ├── Notification.js         # Notification model
│   │   ├── Message.js              # Message model
│   │   ├── Conversation.js         # Conversation model
│   │   ├── Analytics.js            # Analytics model
│   │   ├── Sound.js                # Sound model
│   │   ├── LiveStream.js           # Live stream model
│   │   ├── Story.js                # Story model
│   │   ├── Collection.js           # Collection model
│   │   ├── Playlist.js             # Playlist model
│   │   ├── Product.js              # Product model
│   │   ├── Effect.js               # Effect model
│   │   ├── Gift.js                 # Gift model
│   │   ├── Transaction.js          # Transaction model
│   │   ├── SearchHistory.js        # Search history model
│   │   ├── PasswordReset.js        # Password reset model
│   │   ├── TwoFactorAuth.js        # 2FA model
│   │   ├── Verification.js         # Verification model
│   │   ├── ContentModeration.js    # Moderation model
│   │   ├── CreatorAcademy.js       # Creator academy model
│   │   ├── VideoSeries.js          # Video series model
│   │   ├── VideoQA.js              # Video Q&A model
│   │   └── Collaboration.js        # Collaboration model
│   ├── middleware/                  # Express middleware
│   │   └── auth.js                 # JWT authentication middleware
│   ├── config/                      # Configuration files
│   │   └── oidc.js                 # OIDC configuration
│   ├── uploads/                     # Uploaded video files
│   ├── processed/                   # Processed video files
│   ├── utils/                       # Utility functions
│   │   └── apply_filter.py         # Video filter utility
│   └── index.js                     # Express server entry point
├── frontend/                        # Frontend React app
│   ├── src/                         # Source code
│   │   ├── components/             # React components
│   │   ├── ForYouFeed.tsx          # Main video feed
│   │   ├── VideoPlayer.js          # Video player component
│   │   ├── VideoCard.tsx           # Video card component
│   │   ├── ActionBar.tsx           # Video action bar
│   │   ├── Navbar.js               # Navigation bar
│   │   ├── Sidebar.js              # Sidebar navigation
│   │   ├── Login.js                # Login component
│   │   ├── Signup.js               # Signup component
│   │   ├── Profile.js              # Profile page
│   │   ├── UploadPage.js           # Video upload page
│   │   ├── Explore.js              # Explore page
│   │   ├── Following.js            # Following feed
│   │   ├── LIVE.js                 # Live streaming page
│   │   ├── More.js                 # More settings page
│   │   ├── Search.js               # Search page
│   │   ├── CommentsModal.js        # Comments modal
│   │   ├── NotificationCenter.js   # Notification center
│   │   ├── MessageCenter.js        # Message center
│   │   ├── CreatorAnalytics.js     # Creator analytics
│   │   ├── CreatorMonetization.js  # Creator monetization
│   │   ├── CreatorTools.js         # Creator tools
│   │   ├── AccountSettings.js      # Account settings
│   │   ├── PrivacySettings.js      # Privacy settings
│   │   ├── NotificationSettings.js # Notification settings
│   │   ├── AppSettings.js          # App settings
│   │   ├── LiveStreamSetup.js      # Live stream setup
│   │   ├── LiveStreamPlayer.js     # Live stream player
│   │   ├── AdvancedVideoEditor.js  # Advanced video editor
│   │   ├── EffectsMarketplace.js   # Effects marketplace
│   │   ├── VideoCollections.js     # Video collections
│   │   ├── HashtagPage.js          # Hashtag page
│   │   ├── TrendingPage.js         # Trending page
│   │   ├── TrendingSoundsPage.js   # Trending sounds page
│   │   ├── DuetComponent.js        # Duet component
│   │   ├── StitchComponent.js      # Stitch component
│   │   ├── EnhancedShare.js        # Enhanced share component
│   │   ├── VolumeControl.tsx       # Volume control
│   │   ├── VideoPreview.js         # Video preview
│   │   ├── UserVerification.js     # User verification
│   │   ├── SupportCenter.js        # Support center
│   │   ├── BusinessTools.js        # Business tools
│   │   ├── PersonalTools.js        # Personal tools
│   │   ├── FamilyPairing.js        # Family pairing
│   │   ├── RestrictedAccounts.js   # Restricted accounts
│   │   └── Balance.js              # Balance page
│   │   ├── context/                # React contexts
│   │   ├── AuthContext.js          # Authentication context
│   │   ├── ThemeContext.js         # Theme context
│   │   ├── NotificationContext.js  # Notification context
│   │   ├── WatchHistoryContext.js  # Watch history context
│   │   └── RecommendationContext.js # Recommendation context
│   │   ├── api/                    # API client functions
│   │   ├── auth.js                 # Authentication API
│   │   ├── users.js                # User API
│   │   ├── videos.js               # Video API
│   │   ├── comments.js             # Comment API
│   │   ├── search.js               # Search API
│   │   ├── analytics.js            # Analytics API
│   │   ├── notifications.js        # Notification API
│   │   ├── messages.js             # Message API
│   │   ├── moderation.js           # Moderation API
│   │   ├── music.js                # Music API
│   │   ├── collections.js          # Collection API
│   │   ├── creator-academy.js      # Creator academy API
│   │   ├── drafts.js               # Draft API
│   │   ├── hashtags.js             # Hashtag API
│   │   ├── products.js             # Product API
│   │   ├── recommendations.js      # Recommendation API
│   │   ├── video-features.js       # Video features API
│   │   ├── video-interactions.js   # Video interactions API
│   │   └── index.js                # API index
│   │   ├── config/                 # Configuration
│   │   │   └── axios.js           # Axios configuration
│   │   ├── utils/                  # Utility functions
│   │   │   ├── faceDetection.js   # Face detection utility
│   │   │   └── idempotency.ts     # Idempotency utility
│   │   ├── data/                   # Sample data
│   │   │   └── sampleData.js      # Sample videos
│   │   ├── store/                  # State management
│   │   │   └── videoStore.ts      # Video store (Zustand)
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── App.js                  # Main App component
│   │   ├── App.css                 # App styles
│   │   ├── index.js                # React entry point
│   │   └── index.css              # Global styles
│   ├── public/                     # Public assets
│   │   ├── index.html              # HTML template
│   │   ├── manifest.json           # PWA manifest
│   │   └── service-worker.js       # Service worker
│   ├── package.json                # Frontend dependencies and scripts
│   └── tsconfig.json               # TypeScript configuration
├── backend/
│   └── package.json                # Backend dependencies and scripts
├── package.json                     # Root package.json (manages both frontend & backend)
├── .gitignore                       # Git ignore file
├── .env                             # Environment variables (create this file)
└── README.md                        # This file
```

## 📦 Installation & Setup

### Prerequisites
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (running locally or connection string) - [Download](https://www.mongodb.com/try/download/community)
- **npm** or **yarn** (comes with Node.js)
- **FFmpeg** (for video processing) - [Download](https://ffmpeg.org/download.html)
- **Redis** (optional, for job queues) - [Download](https://redis.io/download)
- **Python 3** (for video filter scripts) - [Download](https://www.python.org/downloads/)

### 1. Install Dependencies

```bash
# Option 1: Install all dependencies at once (recommended)
npm run install:all

# Option 2: Install separately
# Install root dependencies (concurrently for running both servers)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/tiktok-clone

# JWT Secret Key (Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Frontend URL
FRONTEND_URL=http://localhost:3000

# API URL
REACT_APP_API_URL=https://spryclips.com

# OIDC Configuration (Hub App)
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=http://localhost:3000/auth/callback

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# Email Configuration (for password reset, etc.)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-email-password
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows
net start MongoDB

# macOS/Linux
mongod
```

### 4. Run the Application

#### Option 1: Run Frontend and Backend Separately

```bash
# Terminal 1 - Backend (from root directory)
npm run start:backend
# OR
npm run server

# Terminal 2 - Frontend (from root directory)
npm run start:frontend
# OR from frontend directory
cd frontend
npm start
```

#### Option 2: Run Both Concurrently (Recommended)

```bash
# From root directory
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000) simultaneously.

The frontend will be available at `http://localhost:3000`
The backend API will be available at `https://spryclips.com`

## ✅ Frontend Quality Checklist
- **Dark Mode Ready** – Creator analytics, academy, and tools dashboards now respect `ThemeContext`, delivering balanced light/dark palettes and gradients.
- **Accessibility Pass** – Modals ship with `role="dialog"`, `aria-*` hooks, Escape-to-close listeners, and visible focus states for keyboard flows.
- **Responsive Polish** – Refined breakpoints keep academy grids, analytics tables, and tool cards legible from widescreen down to mobile.
- **Automated Coverage** – Added React Testing Library suites for `ThemeContext` toggling and Creator Academy learning flows. Run `cd frontend && npm test -- --watch=false`.
- **Contributor Notes** – Use this checklist to quickly validate production readiness after feature work.

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/oidc/login` - OIDC login (Hub App)
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email

### Users (`/api/users`)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/privacy` - Update privacy settings
- `POST /api/users/:id/follow` - Follow/Unfollow user
- `POST /api/users/:id/block` - Block/Unblock user
- `GET /api/users/blocked/list` - Get blocked users
- `POST /api/users/pin-video/:videoId` - Pin/Unpin video
- `GET /api/users/follow-requests` - Get follow requests
- `POST /api/users/follow-requests/:requestId/:action` - Accept/Reject follow request
- `GET /api/users/:id/videos` - Get user's videos

### Videos (`/api/videos`)
- `GET /api/videos` - Get all public videos (feed)
- `GET /api/videos/:id` - Get video by ID
- `POST /api/videos/:id/like` - Like/Unlike video
- `POST /api/videos/:id/share` - Share video
- `GET /api/videos/:id/comments` - Get video comments
- `GET /api/videos/:id/download` - Download video
- `GET /api/videos/:id/embed` - Get video embed code

### Upload (`/api/upload`)
- `POST /api/upload` - Upload video
- `GET /api/upload/my-videos` - Get user's uploaded videos
- `GET /api/upload/my-videos/:id` - Get single uploaded video
- `PUT /api/upload/my-videos/:id` - Update video details
- `DELETE /api/upload/my-videos/:id` - Delete video
- `GET /api/upload/my-videos/:id/analytics` - Get video analytics
- `GET /api/upload/my-videos/search/:query` - Search user's videos
- `POST /api/upload/my-videos/:id/promote` - Promote video

### Comments (`/api/comments`)
- `GET /api/comments/video/:videoId` - Get comments for video
- `POST /api/comments/video/:videoId` - Add comment
- `PUT /api/comments/:commentId` - Update comment
- `DELETE /api/comments/:commentId` - Delete comment
- `POST /api/comments/:commentId/like` - Like/Unlike comment
- `POST /api/comments/:commentId/pin` - Pin/Unpin comment
- `POST /api/comments/:commentId/react` - React to comment (emoji)
- `GET /api/comments/:commentId/replies` - Get comment replies
- `GET /api/comments/:commentId/reactions` - Get comment reactions

### Search (`/api/search`)
- `GET /api/search/:query` - Search everything (videos, users, hashtags, music)
- `GET /api/search/videos/:query` - Search videos only
- `GET /api/search/users/:query` - Search users only
- `GET /api/search/hashtags/:query` - Search hashtags only
- `GET /api/search/music/:query` - Search music/sounds
- `GET /api/search/trending` - Get trending searches
- `GET /api/search/suggestions/:query` - Get search suggestions
- `GET /api/search/history` - Get search history
- `DELETE /api/search/history` - Clear search history
- `DELETE /api/search/history/:searchId` - Delete search history item

### Analytics (`/api/analytics`)
- `GET /api/analytics/videos/:videoId` - Get video analytics
- `GET /api/analytics/videos/:videoId/summary` - Get video analytics summary
- `GET /api/analytics/videos/:videoId/engagement` - Get video engagement metrics
- `GET /api/analytics/videos/:videoId/demographics` - Get video demographics
- `GET /api/analytics/creator` - Get creator analytics overview
- `GET /api/analytics/creator/summary` - Get creator analytics summary
- `GET /api/analytics/videos` - Get all videos analytics
- `GET /api/analytics/videos/top` - Get top performing videos
- `GET /api/analytics/audience` - Get audience overview
- `GET /api/analytics/audience/growth` - Get follower growth
- `GET /api/analytics/audience/demographics` - Get audience demographics
- `GET /api/analytics/audience/activity` - Get audience activity

### Moderation (`/api/moderation`)
- `GET /api/moderation/rules` - Get moderation rules (admin)
- `POST /api/moderation/rules` - Create moderation rule (admin)
- `PUT /api/moderation/rules/:id` - Update moderation rule (admin)
- `DELETE /api/moderation/rules/:id` - Delete moderation rule (admin)
- `POST /api/moderation/report/video/:videoId` - Report video
- `POST /api/moderation/report/comment/:commentId` - Report comment
- `POST /api/moderation/report/user/:userId` - Report user
- `GET /api/moderation/reports/my` - Get my reports
- `GET /api/moderation/logs` - Get moderation logs (admin)
- `GET /api/moderation/logs/:id` - Get moderation log by ID (admin)
- `POST /api/moderation/age-verification` - Submit age verification
- `GET /api/moderation/age-verification` - Get age verification status

### Additional Routes
- `/api/notifications` - Notifications
- `/api/messages` - Direct messages
- `/api/live` - Live streaming
- `/api/stories` - Stories
- `/api/music` - Music/Sounds
- `/api/collections` - Video collections
- `/api/drafts` - Video drafts
- `/api/hashtags` - Hashtags
- `/api/effects` - Effects
- `/api/products` - Products
- `/api/monetization` - Monetization
- `/api/recommendations` - Recommendations
- `/api/video-interactions` - Video interactions
- `/api/video-features` - Video features (Duet, Stitch, etc.)
- `/api/creator-academy` - Creator academy
- `/api/video-qa` - Video Q&A
- `/api/collaborations` - Collaborations
- `/api/verification` - Account verification
- `/api/2fa` - Two-factor authentication

## 🗄️ Database Models

### User Model
```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed),
  authProvider: String ('local', 'oidc', etc.),
  profile: {
    displayName: String,
    bio: String,
    avatar: String,
    banner: String,
    website: String,
    followers: Number,
    following: Number
  },
  privacy: {
    accountType: String ('public', 'private'),
    showActivityStatus: Boolean,
    allowDirectMessages: String
  },
  videos: [ObjectId],
  likedVideos: [ObjectId],
  repostedVideos: [ObjectId],
  followedUsers: [ObjectId],
  followers: [ObjectId],
  blockedUsers: [ObjectId],
  collections: [ObjectId],
  playlists: [ObjectId],
  savedSounds: [ObjectId],
  isVerified: Boolean,
  twoFactorEnabled: Boolean
}
```

### Video Model
```javascript
{
  user: ObjectId (ref: User, required),
  url: String (required),
  thumbnail: String,
  description: String,
  hashtags: [String],
  mentions: [String],
  likes: Number,
  likedBy: [ObjectId],
  comments: Number,
  shares: Number,
  views: Number,
  isPrivate: Boolean,
  status: String ('processing', 'ready', 'failed'),
  music: ObjectId (ref: Sound),
  effects: [ObjectId],
  filters: String,
  allowComments: Boolean,
  allowDuet: Boolean,
  allowStitch: Boolean,
  location: String,
  scheduledAt: Date,
  isPinned: Boolean
}
```

### Comment Model
```javascript
{
  user: ObjectId (ref: User, required),
  video: ObjectId (ref: Video, required),
  text: String (required),
  likes: Number,
  likedBy: [ObjectId],
  parentComment: ObjectId (ref: Comment),
  replies: [ObjectId],
  reactions: [{
    emoji: String,
    users: [ObjectId]
  }],
  isPinned: Boolean
}
```

## 🛠️ Technologies Used

### Frontend
- **React 18** - UI library
- **React Router DOM** - Routing
- **Context API** - State management
- **Zustand** - Additional state management
- **Axios** - HTTP client
- **TypeScript** - Type safety (partial)
- **CSS3** - Styling with animations
- **Font Awesome** - Icons
- **Lucide React** - Additional icons
- **QRCode React** - QR code generation for 2FA

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **OpenID Client** - OIDC integration
- **Passport** - Authentication middleware
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

### Video Processing
- **Python** - Video processing scripts
- **FFmpeg** - Video manipulation (recommended)

## 📱 Usage

### Registering a User
1. Click "Sign Up" in the sidebar
2. Enter username, email, and password
3. Click "Sign Up" to create account

### Logging In
1. Click "Log In" in the sidebar
2. Enter email and password
3. Click "Log In"
4. Optionally enable 2FA for enhanced security

### Uploading a Video
1. Click "Upload" in the sidebar (requires login)
2. Select a video file (MP4, MOV, AVI, WebM, MKV)
3. Use advanced editing tools (trim, crop, filters, etc.)
4. Add description, hashtags, and mentions
5. Choose privacy settings
6. Click "Upload Video"

### Managing Profile
1. Click your avatar or "Profile" in the sidebar
2. Switch between tabs (Videos, Liked, Reposted, Drafts)
3. Edit profile information
4. Update privacy settings
5. View analytics
6. Manage collections and playlists

### Exploring Content
1. Click "Explore" in the sidebar
2. Browse trending videos, music, and hashtags
3. Use filters to find specific content
4. Search for videos, users, hashtags, or music

### Live Streaming
1. Click "LIVE" in the sidebar
2. Click "Go Live" to start a stream
3. Configure stream settings
4. Start broadcasting
5. Interact with viewers through live chat

### Direct Messaging
1. Click on a user's profile
2. Click "Message" button
3. Send private messages
4. View conversation history in Message Center

## 🔒 Security Features

- Password hashing using bcrypt
- JWT token authentication
- Two-factor authentication (2FA)
- CORS enabled for frontend
- File upload validation
- Input sanitization
- Protected API routes
- Rate limiting (recommended for production)
- Content moderation
- Age verification
- Account verification

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Use MongoDB Atlas or another cloud database
4. Configure CORS properly
5. Set up file storage (AWS S3, Cloudinary, etc.)
6. Enable HTTPS
7. Set up rate limiting
8. Configure email service for password reset
9. Set up monitoring and logging
10. Use a reverse proxy (nginx, etc.)
11. Set up CDN for static assets
12. Enable compression
13. Set up error tracking (Sentry, etc.)

## 📝 Scripts

### Root Level Scripts
- `npm run install:all` - Install all dependencies (root, frontend, backend)
- `npm run dev` - Run both frontend and backend servers concurrently
- `npm run start:frontend` - Start frontend development server
- `npm run start:backend` - Start backend server
- `npm run server` - Alias for `start:backend`
- `npm run build:frontend` - Build frontend for production
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier

### Backend Scripts (from `backend/` directory)
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run backend tests

### Frontend Scripts (from `frontend/` directory)
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run frontend tests
- `npm run eject` - Eject from Create React App (irreversible)

## 📄 License

MIT License - feel free to use this project for learning purposes!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔧 Troubleshooting

### Common Issues

#### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Make sure MongoDB is running on your system. Start it with:
- Windows: `net start MongoDB`
- macOS/Linux: `mongod` or `sudo systemctl start mongod`

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Either stop the process using the port or change the PORT in your `.env` file.

#### FFmpeg Not Found
```
Error: Cannot find ffmpeg
```
**Solution:** 
1. Install FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Add FFmpeg to your system PATH
3. Verify installation: `ffmpeg -version`

#### Module Not Found Errors
```
Error: Cannot find module 'xyz'
```
**Solution:** Run `npm run install:all` to install all dependencies.

#### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Make sure your `.env` file has the correct `FRONTEND_URL` and `REACT_APP_API_URL` values.

#### Video Upload Fails
**Solution:** 
1. Check file size (max 100MB)
2. Ensure video format is supported (MP4, MOV, AVI, WebM, MKV)
3. Check backend uploads directory permissions
4. Verify FFmpeg is installed for video processing

#### Redis Connection Errors (Non-Critical)
Redis is optional for job queues. If you see Redis connection errors, the app will still work but video processing jobs may not queue properly. To fix:
1. Install Redis: [redis.io/download](https://redis.io/download)
2. Start Redis server
3. Or remove Redis dependencies if not needed

### Getting Help

1. Check the [Issues](https://github.com/Ali-Raza-161/Tiktok_clone/issues) page
2. Review the error logs in `backend-dev.log` and `frontend-dev.log`
3. Ensure all prerequisites are installed
4. Verify your `.env` file is configured correctly

## 📧 Support

For support, please open an issue in the repository or contact the maintainers.

## 🎯 Quick Start Summary

```bash
# 1. Clone the repository
git clone git@github.com:Ali-Raza-161/Tiktok_clone.git
cd Tiktok_clone

# 2. Install all dependencies
npm run install:all

# 3. Create .env file (copy from .env.example if available)
# Add your MongoDB URI, JWT_SECRET, etc.

# 4. Start MongoDB
# Windows: net start MongoDB
# macOS/Linux: mongod

# 5. Run the application
npm run dev

# 6. Open browser
# Frontend: http://localhost:3000
# Backend API: https://spryclips.com
```

---

Built with ❤️ using React & Node.js
