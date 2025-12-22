# Spryclips - Full Stack Application

A full-featured short video sharing platform built with React (Frontend) and Node.js/Express (Backend), featuring video uploads, live streaming, social interactions, and comprehensive admin panel.

**For an in-depth technical design, architecture, data model, and deployment guide, see [TECHNICAL.md](TECHNICAL.md).**

## 🚀 Product overview & Table of Contents

- Quick links: [Technical Guide](TECHNICAL.md) • [API Reference (high-level)](#api-highlights)

### Table of Contents
1. Product overview & functionality
2. Quick start
3. API highlights
4. Environment variables
5. Development workflows
6. Docker & production deployment
7. Testing & CI
8. Troubleshooting
9. Contributing & code style

---

### Functionality — Full Product Summary
- **Video Feed & Discovery**: Infinite, low-latency feed with adaptive preloading and personalized ranking signals. Supports autoplay, video looping, and recommendations hooks.
- **Uploads & Media Processing**: Resumable uploads, server-side validation, BB (bulletproof) job queue handling. FFmpeg-based transcoding to multiple resolutions, automatic thumbnail/poster generation, and optional S3 storage for production.
- **Authentication and User Profiles**: JWT-based access and refresh tokens, secure refresh flows, optional 2FA, password resets, email verification, and per-user privacy controls.
- **Social Interactions**: Likes, comments (with threading), replies, reposts, shares, bookmarks (watch-later), follows, direct messages, and notification center delivered via WebSocket.
- **Live Streaming**: RTMP ingestion and WebRTC client modes, live chat with moderation, live recording and conversion to VOD, and live metrics.
- **Creator Tools**: Inline trimming, basic effects, scheduling, analytics dashboards, and monetization features (creator fund, revenue reporting).
- **Admin Tools & Moderation**: Role-based admin UI, content takedown flows, automated moderation flags, manual review queues, server health, and logging dashboards.
- **Business & E-commerce**: Business accounts, ad management stub endpoints, product catalogs, and commerce integration hooks.

For detailed system architecture, deployment, data models, and API specs see [TECHNICAL.md](TECHNICAL.md).

---

### Quick start (developer)
1. Clone repo: `git clone https://github.com/wallmobile/Tiktok_clone.git`
2. Install: `npm run install:all` (or install in each subfolder)
3. Create `.env` in `backend/` (see Environment Variables below)
4. Start dependencies (MongoDB, Redis), then:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm start`
5. Visit `http://localhost:3000` (frontend) and `http://localhost:5000` (backend by default).

---

### API highlights
Below are representative examples. For a complete and versioned API reference see the `backend/routes/` files and the `/api-docs` swagger endpoint when running.

- Register

curl -X POST "http://localhost:5000/api/auth/register" -H "Content-Type: application/json" -d '{"username":"test","email":"test@example.com","password":"secret"}'

- Login (returns access + refresh tokens)

curl -X POST "http://localhost:5000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"secret"}'

- Upload video (multipart/form-data)

curl -X POST "http://localhost:5000/api/videos" -H "Authorization: Bearer <ACCESS_TOKEN>" -F "file=@./video.mp4" -F "title=My clip"

- Fetch feed

curl "http://localhost:5000/api/videos?page=1&limit=10"

---

### Environment variables (important)
Backend `.env` (summary):
- NODE_ENV (development|production)
- PORT (default 5000)
- MONGODB_URI
- JWT_SECRET
- JWT_REFRESH_SECRET
- REDIS_URL (redis://localhost:6379)
- EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
- FRONTEND_URL
- UPLOADS_DIR, PROCESSED_DIR

Add production variables in CI/CD or a secret manager (do NOT commit `.env` to source control).

---

### Docker & Production
- A Dockerfile and a sample `docker-compose.yml` can be used to run the stack locally. Replace local storage with a mounted volume or S3 in production.
- Use a process manager (PM2) or container orchestration (Kubernetes) for robust process management. Nginx is recommended to terminate TLS and proxy to the backend and frontend.

---

### Testing & CI
- Unit and integration tests live in `backend/tests/` and frontend `src/__tests__`.
- Run: `cd backend && npm test` and `cd frontend && npm test`.
- We recommend a CI job that runs tests, lint, and build steps (GitHub Actions or similar).

---

### Troubleshooting (quick)
- Port conflicts: change `PORT` in `.env`.
- Mongo connection errors: verify `MONGODB_URI` and that Mongo is running.
- FFmpeg issues: ensure `ffmpeg` binary is installed and available on PATH.

---

**For the full technical spec, API contract, data models, deployment recipes, and CI examples see [TECHNICAL.md](TECHNICAL.md).**

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

