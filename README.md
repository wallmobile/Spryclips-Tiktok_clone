# SpryClips

A full-featured short video sharing platform built with React and Node.js, inspired by TikTok. This project demonstrates modern web development practices with a professional architecture, real-time features, and comprehensive functionality.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

## 🎯 Features

### Core Features
- **Video Feed & Discovery**: Infinite scroll feed with personalized recommendations
- **Video Upload & Processing**: Resumable uploads with FFmpeg transcoding
- **User Authentication**: JWT-based auth with refresh tokens and 2FA support
- **Social Interactions**: Likes, comments, shares, follows, and direct messaging
- **Live Streaming**: RTMP ingestion with WebRTC support and live chat
- **Real-time Notifications**: WebSocket-based notification system

### Advanced Features
- **Creator Tools**: Analytics dashboard, monetization, and content management
- **Admin Panel**: Comprehensive admin interface with moderation tools
- **Content Moderation**: Automated and manual content review
- **Business Features**: Business accounts, ad management, and e-commerce integration
- **Search & Discovery**: Advanced search with hashtags and trending content

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - UI library
- **TypeScript** - Type safety
- **React Router** - Navigation
- **Zustand** - State management
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (Mongoose ODM)
- **Socket.io** - WebSocket server
- **JWT** - Authentication
- **FFmpeg** - Video processing
- **Redis** - Caching & job queues
- **Bull** - Job queue management
- **Multer** - File uploads

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Nginx** - Reverse proxy

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (v7.0 or higher) - Local or MongoDB Atlas
- **Redis** (optional, for caching and queues)
- **FFmpeg** (for video processing)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Tiktok_clone
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, frontend, and backend)
npm run install:all
```

Or install separately:
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 3. Environment Configuration

#### Backend Configuration

Create a `.env` file in the project root:

```env
# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
PUBLIC_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/tiktok-clone
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tiktok-clone

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Redis (Optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
RESEND_API_KEY=your-resend-api-key

# File Storage
UPLOADS_DIR=./backend/uploads
PROCESSED_DIR=./backend/processed
MAX_FILE_SIZE=500000000
```

#### Frontend Configuration

Create `frontend/public/config.js`:

```javascript
window.APP_CONFIG = {
  API_URL: 'http://localhost:5000',
  UPLOADS_BASE_URL: 'http://localhost:5000/uploads'
};
```

### 4. Start Development Servers

#### Option 1: Run Both Servers Together

```bash
npm run dev
```

#### Option 2: Run Separately

**Backend:**
```bash
npm run start:backend
# or
cd backend && npm run dev
```

**Frontend:**
```bash
npm run start:frontend
# or
cd frontend && npm start
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## 📁 Project Structure

```
Tiktok_clone/
├── backend/                 # Backend API Server
│   ├── config/             # Configuration files
│   ├── constants/          # Application constants
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── validators/         # Input validation
│   ├── utils/              # Utility functions
│   ├── jobs/               # Background jobs
│   ├── socket/             # WebSocket handlers
│   ├── scripts/            # Utility scripts
│   └── tests/              # Test files
│
├── frontend/               # React Frontend
│   ├── public/             # Static assets
│   └── src/
│       ├── api/            # API client
│       ├── components/     # React components
│       ├── context/        # React contexts
│       ├── hooks/          # Custom hooks
│       ├── store/          # State management
│       ├── routes/          # Route components
│       ├── utils/          # Utility functions
│       └── types/          # TypeScript types
│
├── docker/                 # Docker configuration
├── docs/                   # Documentation
├── scripts/                # Deployment scripts
└── .github/                # CI/CD workflows
```

For detailed structure, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## 🏗️ Architecture

The project follows a **layered architecture** pattern:

```
Routes → Controllers → Services → Models
```

- **Routes**: Define endpoints and apply middleware
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Models**: Data persistence

For detailed architecture information, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify` - Verify token

### Videos
- `GET /api/videos` - Get video feed (paginated)
- `POST /api/videos` - Upload video
- `GET /api/videos/:id` - Get video details
- `PUT /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video

### Users
- `GET /api/users/:username` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user

### Comments
- `GET /api/comments/:videoId` - Get video comments
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Live Streaming
- `GET /api/live/streams` - Get active streams
- `POST /api/live/start` - Start live stream
- `POST /api/live/end` - End live stream

For complete API documentation, visit `/api-docs` when the backend is running.

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Run All Tests

```bash
npm test
```

## 🐳 Docker

### Using Docker Compose

```bash
cd docker
docker-compose up
```

This will start:
- MongoDB
- Redis
- Backend API
- Frontend
- Nginx (optional)

### Build Individual Containers

```bash
# Backend
docker build -f docker/Dockerfile.backend -t tiktok-clone-backend .

# Frontend
docker build -f docker/Dockerfile.frontend -t tiktok-clone-frontend .
```

## 🚢 Deployment

### Production Build

```bash
# Build frontend
npm run build:frontend

# The build folder will be in frontend/build
```

### Environment Variables for Production

Update `.env` with production values:
- Set `NODE_ENV=production`
- Use production MongoDB URI
- Configure production email service
- Set secure JWT secrets
- Configure CDN URLs

For detailed deployment instructions, see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## 📚 Documentation

- [Project Structure](./PROJECT_STRUCTURE.md) - Detailed project structure
- [Architecture Guide](./docs/ARCHITECTURE.md) - Architecture and design patterns
- [Development Guide](./docs/DEVELOPMENT.md) - Development workflows
- [Quick Reference](./docs/QUICK_REFERENCE.md) - Quick commands and patterns

## 🛡️ Security

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Rate limiting
- Helmet.js for security headers
- XSS protection
- MongoDB injection prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Use ESLint and Prettier
- Write tests for new features
- Update documentation

## 📝 Scripts

### Root Level
- `npm run install:all` - Install all dependencies
- `npm run dev` - Run both servers in development
- `npm run start:backend` - Start backend server
- `npm run start:frontend` - Start frontend server
- `npm run build:frontend` - Build frontend for production
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

### Backend
- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm test` - Run tests

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - Change `PORT` in `.env` file
   - Or kill the process using the port

2. **MongoDB connection error**
   - Ensure MongoDB is running
   - Check `MONGODB_URI` in `.env`
   - Verify MongoDB Atlas IP whitelist (if using Atlas)

3. **Video processing fails**
   - Ensure FFmpeg is installed
   - Check file permissions for uploads directory

4. **Build errors**
   - Clear `node_modules` and reinstall
   - Check Node.js version compatibility

## 📄 License

This project is private and proprietary.

## 👥 Authors

- Development Team

## 🙏 Acknowledgments

- Built with React and Node.js
- Inspired by TikTok's user experience
- Uses various open-source libraries and tools

## 📞 Support

For support, create an issue in the repository or contact the development team.
