# TikTok Clone - Complete Setup & Deployment Guide

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

This is a full-stack TikTok clone application built with:
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Video Processing**: FFmpeg

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **FFmpeg** (for video processing) - [Download](https://ffmpeg.org/download.html)
- **Git** - [Download](https://git-scm.com/)

### Optional but Recommended:
- **Redis** (for job queues and caching)
- **PM2** (for process management in production)

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Tiktok_clone
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ⚙️ Environment Setup

### Backend Environment Variables

1. Navigate to the project root directory
2. Create a `.env` file (or copy from `.env.example` if available)
3. Add the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/tiktok_clone
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tiktok_clone

# JWT Secret (Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Email Configuration (for password reset, verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@tiktokclone.com

# OAuth Configuration (Google, etc.)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Admin Configuration
ADMIN_EMAIL=admin@tiktokclone.com
ADMIN_PASSWORD=admin123
```

### Frontend Environment Variables

1. Navigate to `frontend` directory
2. Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

For production, create `.env.production`:

```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_SOCKET_URL=https://api.yourdomain.com
```

---

## 🏃 Running the Application

### Development Mode

#### Option 1: Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# OR for development with auto-reload:
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

#### Option 2: Run Both Together (Windows)

Use the provided batch files:
```bash
# Run both servers
RUN_BOTH_SERVERS.bat

# Or run individually
RUN_BACKEND.bat
RUN_FRONTEND.bat
```

### Production Build

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Start Backend (Production):**
```bash
cd backend
NODE_ENV=production npm start
```

---

## 📁 Project Structure

```
Tiktok_clone/
├── backend/
│   ├── config/          # Configuration files
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   ├── scripts/         # Utility scripts
│   ├── uploads/         # Uploaded files
│   └── index.js         # Entry point
│
├── frontend/
│   ├── public/          # Static files
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/      # React context
│   │   ├── api/          # API calls
│   │   ├── routes/       # Route components
│   │   └── config/       # Configuration
│   └── package.json
│
├── .env                  # Environment variables
├── README.md            # This file
└── DEPLOYMENT.md        # Deployment guide
```

---

## 🔌 API Documentation

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://api.yourdomain.com/api`

### Main Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Videos
- `GET /api/videos` - Get all videos
- `POST /api/videos` - Upload video
- `GET /api/videos/:id` - Get video by ID
- `DELETE /api/videos/:id` - Delete video

#### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

#### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - Get all users (admin)
- `GET /api/admin/videos` - Get all videos (admin)

For complete API documentation, visit: `http://localhost:5000/api-docs` (if Swagger is configured)

---

## 🚢 Deployment

### Prerequisites for Deployment

1. **Server Requirements:**
   - Ubuntu 20.04+ or similar Linux distribution
   - Node.js 16+ installed
   - MongoDB installed and running
   - Nginx (for reverse proxy)
   - PM2 (for process management)

2. **Domain & SSL:**
   - Domain name configured
   - SSL certificate (Let's Encrypt recommended)

### Deployment Steps

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deployment Checklist:**
- [ ] Set up server (Ubuntu/Debian)
- [ ] Install Node.js, MongoDB, Nginx
- [ ] Clone repository
- [ ] Configure environment variables
- [ ] Build frontend
- [ ] Set up PM2 for backend
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificate
- [ ] Configure firewall
- [ ] Test deployment

---

## 🐛 Troubleshooting

### Port 5000 Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
1. Find the process using port 5000:
   ```bash
   netstat -ano | findstr :5000
   ```
2. Kill the process:
   ```bash
   taskkill /PID <PID> /F
   ```
3. Or kill all Node processes:
   ```bash
   taskkill /F /IM node.exe
   ```

See [PORT_5000_ERROR_SOLUTION.txt](./PORT_5000_ERROR_SOLUTION.txt) for detailed steps.

### MongoDB Connection Error

**Error:** `MongooseError: connect ECONNREFUSED`

**Solution:**
1. Ensure MongoDB is running:
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/Mac
   sudo systemctl start mongod
   ```
2. Check MongoDB URI in `.env` file
3. Verify MongoDB is accessible on port 27017

### Frontend Build Errors

**Error:** Build fails or dependencies not found

**Solution:**
1. Delete `node_modules` and `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   ```
2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
3. Reinstall dependencies:
   ```bash
   npm install
   ```

### Video Upload/Processing Issues

**Error:** FFmpeg not found

**Solution:**
1. Install FFmpeg:
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Linux: `sudo apt-get install ffmpeg`
   - Mac: `brew install ffmpeg`
2. Verify installation:
   ```bash
   ffmpeg -version
   ```

---

## 📝 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Support

For issues and questions:
- Create an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

---

## 🔄 Version History

- **v1.0.0** - Initial release
  - User authentication
  - Video upload and playback
  - Admin panel
  - Real-time features

---

**Last Updated:** 2025-01-06

