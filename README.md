# Spryclips - Full Stack Application

A full-featured short video sharing platform built with React (Frontend) and Node.js/Express (Backend), featuring video uploads, live streaming, social interactions, and comprehensive admin panel.

## 🚀 Features

### Core Features
- **Video Feed**: Infinite scroll video feed with auto-play
- **Video Upload**: Upload and process videos with thumbnail generation
- **User Authentication**: JWT-based authentication with 2FA support
- **Social Features**: Follow, Like, Comment, Share, Repost
- **Live Streaming**: Real-time live streaming with WebRTC support
- **Stories**: 24-hour disappearing stories
- **Search**: Search videos, users, hashtags, and music
- **Watch Later**: Save videos to watch later
- **Playlists**: Create and manage video playlists
- **Notifications**: Real-time notifications via WebSocket

### Creator Tools
- **Spryclips Studio**: Video editing and management
- **Creator Analytics**: Detailed analytics dashboard
- **Monetization**: Creator fund and earnings tracking
- **Effects Lab**: Video effects and filters
- **Growth Tools**: Content suggestions and optimization

### Business Features
- **Business Suite**: Business account management
- **Ad Manager**: Advertisement management
- **Product Catalog**: E-commerce integration
- **Business Messaging**: Customer communication tools

### Admin Panel
- **Dashboard**: Comprehensive admin dashboard
- **User Management**: User moderation and management
- **Content Moderation**: Video and comment moderation
- **Analytics**: Platform-wide analytics
- **System Monitoring**: Server health, CDN status, error logs
- **Support Center**: Ticket management system

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0**: UI library
- **TypeScript**: Type safety
- **React Router**: Navigation
- **Axios**: HTTP client
- **Socket.io Client**: Real-time communication
- **Zustand**: State management
- **Lucide React**: Icons

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database (Mongoose ODM)
- **Socket.io**: WebSocket server
- **JWT**: Authentication
- **Multer**: File uploads
- **FFmpeg**: Video processing
- **Redis**: Caching
- **Bull**: Job queue
- **Nodemailer/Resend**: Email service

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Redis (optional, for caching)
- FFmpeg (for video processing)

## 🔧 Installation

### 1. Clone the repository
```bash
git clone https://github.com/wallmobile/Tiktok_clone.git
cd Tiktok_clone
```

### 2. Install dependencies
```bash
# Install all dependencies (root, frontend, and backend)
npm run install:all

# Or install separately:
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 3. Environment Configuration

#### Backend (.env)
Create a `.env` file in the `backend` directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tiktok-clone
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
REDIS_URL=redis://localhost:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
FRONTEND_URL=http://localhost:3000
UPLOADS_DIR=./uploads
PROCESSED_DIR=./processed
```

#### Frontend (config.js)
Edit `frontend/public/config.js`:
```javascript
window.APP_CONFIG = {
  API_URL: 'http://localhost:5000',  // Backend URL
  UPLOADS_BASE_URL: 'http://localhost:5000/uploads'
};
```

## 🚀 Running the Application

### Development Mode

#### Option 1: Run both servers together
```bash
npm run dev
```

#### Option 2: Run separately

**Backend:**
```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

**Frontend:**
```bash
cd frontend
npm start
```

#### Option 3: Use batch scripts (Windows)
```bash
# Start backend only
start-backend.bat

# Start both (if available)
start-all.bat
```

### Production Build

```bash
# Build frontend
npm run build:frontend

# The build folder will be created in frontend/build
```

## 📁 Project Structure

```
Tiktok_clone/
├── backend/                 # Backend API server
│   ├── config/             # Configuration files
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── utils/              # Utility functions
│   ├── jobs/               # Background jobs
│   ├── socket/             # WebSocket handlers
│   ├── uploads/            # Uploaded files
│   └── index.js            # Entry point
│
├── frontend/               # React frontend
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/            # API calls
│   │   ├── context/        # React contexts
│   │   ├── routes/         # Route components
│   │   └── utils/          # Utility functions
│   └── package.json
│
└── README.md
```

## 🔐 Authentication

The application uses JWT-based authentication:
- Access tokens (short-lived)
- Refresh tokens (long-lived)
- Optional 2FA support
- Session management

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/verify` - Verify token

### Videos
- `GET /api/videos` - Get all videos
- `POST /api/videos` - Upload video
- `GET /api/videos/:id` - Get video details
- `DELETE /api/videos/:id` - Delete video

### Users
- `GET /api/users/:username` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user

### Live Streaming
- `GET /api/live/streams` - Get active streams
- `POST /api/live/start` - Start live stream
- `POST /api/live/end` - End live stream

For complete API documentation, check the Swagger UI at `/api-docs` when the backend is running.

## 🎨 Configuration

### Production Deployment

For production, update `frontend/public/config.js`:
```javascript
window.APP_CONFIG = {
  API_URL: '',  // Empty for Nginx proxy
  UPLOADS_BASE_URL: 'https://yourdomain.com/uploads'
};
```

### Nginx Configuration

A sample Nginx configuration is provided in `nginx.conf` for production deployment.

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - Backend: Change `PORT` in `.env`
   - Frontend: Set `PORT=3001` in environment

2. **MongoDB connection error**
   - Ensure MongoDB is running
   - Check `MONGODB_URI` in `.env`

3. **Video processing fails**
   - Ensure FFmpeg is installed
   - Check file permissions for uploads directory

4. **Build errors**
   - Clear `node_modules` and reinstall
   - Check Node.js version compatibility

## 📝 Scripts

### Root Level
- `npm run install:all` - Install all dependencies
- `npm run start:frontend` - Start frontend
- `npm run start:backend` - Start backend
- `npm run dev` - Run both in development
- `npm run build:frontend` - Build frontend for production

### Backend
- `npm start` - Start server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm test` - Run tests

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Authors

- Development Team

## 🙏 Acknowledgments

- Built with React and Node.js
- Inspired by TikTok's user experience
- Uses various open-source libraries and tools

## 📞 Support

For support, email support@yourdomain.com or create an issue in the repository.

---

**Note**: This is a clone project for educational purposes. Make sure to comply with all applicable laws and regulations when deploying.

