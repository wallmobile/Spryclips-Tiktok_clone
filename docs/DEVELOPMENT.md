# Development Guide

This guide will help you set up and develop the TikTok Clone project.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 7.0+
- Redis (optional, for caching and queues)
- FFmpeg (for video processing)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Tiktok_clone
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up environment variables**
```bash
# Copy example file
cp .env.example .env

# Edit .env with your configuration
# At minimum, set:
# - MONGODB_URI
# - JWT_SECRET
# - JWT_REFRESH_SECRET
```

4. **Start MongoDB and Redis** (if using Docker)
```bash
docker-compose up -d mongodb redis
```

5. **Start development servers**
```bash
# Option 1: Run both together
npm run dev

# Option 2: Run separately
npm run start:backend  # Terminal 1
npm run start:frontend # Terminal 2
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

## 📁 Project Structure

See [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) for detailed structure.

## 🛠️ Development Workflow

### Adding a New Feature

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Follow the architecture layers**
   - Define route in `backend/routes/`
   - Create validator in `backend/validators/`
   - Create controller in `backend/controllers/`
   - Create service in `backend/services/`
   - Update/create model in `backend/models/` if needed

3. **Example: Adding a "Likes" feature**

**Step 1: Create Route**
```javascript
// backend/routes/likes.js
const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const authMiddleware = require('../middleware/auth');
const { validateLikeVideo } = require('../validators/likeValidator');

router.post('/videos/:videoId/like', 
  authMiddleware, 
  validateLikeVideo, 
  likeController.likeVideo
);

module.exports = router;
```

**Step 2: Create Validator**
```javascript
// backend/validators/likeValidator.js
const { param } = require('express-validator');

const validateLikeVideo = [
  param('videoId').isMongoId().withMessage('Invalid video ID'),
];

module.exports = { validateLikeVideo };
```

**Step 3: Create Controller**
```javascript
// backend/controllers/likeController.js
const { asyncHandler } = require('../utils/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');
const likeService = require('../services/likeService');

const likeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  const result = await likeService.toggleLike(videoId, userId);
  
  return sendSuccess(res, result);
});

module.exports = { likeVideo };
```

**Step 4: Create Service**
```javascript
// backend/services/likeService.js
const Like = require('../models/Like');
const Video = require('../models/Video');
const { AppError } = require('../utils/errorHandler');

const toggleLike = async (videoId, userId) => {
  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throw new AppError({
      message: 'Video not found',
      statusCode: 404,
      code: 'VIDEO_NOT_FOUND',
    });
  }

  // Check if already liked
  const existingLike = await Like.findOne({ videoId, userId });
  
  if (existingLike) {
    // Unlike
    await Like.deleteOne({ _id: existingLike._id });
    await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: -1 } });
    return { liked: false };
  } else {
    // Like
    await Like.create({ videoId, userId });
    await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: 1 } });
    return { liked: true };
  }
};

module.exports = { toggleLike };
```

**Step 5: Register Route**
```javascript
// backend/routes/index.js
router.use('/likes', require('./likes'));
```

4. **Write tests**
```javascript
// backend/tests/likes.test.js
describe('Likes API', () => {
  it('should like a video', async () => {
    // Test implementation
  });
});
```

5. **Test your feature**
```bash
npm test
```

6. **Commit and push**
```bash
git add .
git commit -m "feat: add video likes feature"
git push origin feature/your-feature-name
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Watch mode
npm test -- --watch
```

### Writing Tests

- **Unit Tests**: Test individual functions/services
- **Integration Tests**: Test API endpoints
- **E2E Tests**: Test complete user flows

## 🐛 Debugging

### Backend Debugging

1. **Use logger**
```javascript
const logger = require('../utils/logger');

logger.debug('Debug message', { data });
logger.info('Info message', { data });
logger.error('Error message', error, { context });
```

2. **Use VS Code debugger**
   - Set breakpoints
   - Use launch.json configuration

3. **Check logs**
```bash
tail -f backend/logs/app.log
```

### Frontend Debugging

1. **React DevTools**: Install browser extension
2. **Console logging**: Use `console.log` in development
3. **Network tab**: Check API requests/responses

## 📝 Code Style

### Backend

- Use ESLint configuration
- Follow existing code patterns
- Use async/await (not callbacks)
- Use `asyncHandler` for route handlers
- Use `AppError` for errors

### Frontend

- Use TypeScript where possible
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused

## 🔍 Code Review Checklist

- [ ] Code follows project structure
- [ ] Error handling is implemented
- [ ] Input validation is present
- [ ] Tests are written
- [ ] Documentation is updated
- [ ] No console.logs in production code
- [ ] Security considerations addressed
- [ ] Performance considerations addressed

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## 📚 Additional Resources

- [Architecture Guide](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Project Structure](../PROJECT_STRUCTURE.md)


