# Quick Reference Guide

Quick commands and patterns for common development tasks.

## 🚀 Common Commands

### Development
```bash
# Install all dependencies
npm run install:all

# Start both servers
npm run dev

# Start backend only
npm run start:backend
cd backend && npm run dev

# Start frontend only
npm run start:frontend
cd frontend && npm start
```

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Watch mode
npm test -- --watch
```

### Docker
```bash
# Start all services
cd docker && docker-compose up

# Start specific services
docker-compose up mongodb redis

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
```

## 📝 Code Patterns

### Creating a New Route

1. **Create Route File** (`backend/routes/feature.js`)
```javascript
const express = require('express');
const router = express.Router();
const featureController = require('../controllers/featureController');
const authMiddleware = require('../middleware/auth');
const { validateCreate } = require('../validators/featureValidator');

router.post('/', authMiddleware, validateCreate, featureController.create);
router.get('/:id', featureController.getById);

module.exports = router;
```

2. **Create Controller** (`backend/controllers/featureController.js`)
```javascript
const { asyncHandler } = require('../utils/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');
const featureService = require('../services/featureService');

const create = asyncHandler(async (req, res) => {
  const result = await featureService.create(req.body, req.user._id);
  return sendSuccess(res, result, 201);
});

module.exports = { create, getById };
```

3. **Create Service** (`backend/services/featureService.js`)
```javascript
const Feature = require('../models/Feature');
const { AppError } = require('../utils/errorHandler');

const create = async (data, userId) => {
  const feature = new Feature({ ...data, userId });
  return await feature.save();
};

module.exports = { create };
```

4. **Create Validator** (`backend/validators/featureValidator.js`)
```javascript
const { body } = require('express-validator');

const validateCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
];

module.exports = { validateCreate };
```

5. **Register Route** (`backend/routes/index.js`)
```javascript
router.use('/features', require('./feature'));
```

### Error Handling Pattern

```javascript
// In Service
throw new AppError({
  message: 'User not found',
  statusCode: 404,
  code: 'USER_NOT_FOUND',
});

// In Controller (automatic via asyncHandler)
// Errors are automatically caught and formatted
```

### Logging Pattern

```javascript
const logger = require('../utils/logger');

logger.info('User created', { userId: user._id });
logger.error('Failed to create user', error, { email });
logger.debug('Processing request', { requestId: req.id });
```

## 🔍 File Locations

### Backend
- **Routes**: `backend/routes/`
- **Controllers**: `backend/controllers/`
- **Services**: `backend/services/`
- **Models**: `backend/models/`
- **Validators**: `backend/validators/`
- **Middleware**: `backend/middleware/`
- **Utils**: `backend/utils/`
- **Constants**: `backend/constants/`

### Frontend
- **Components**: `frontend/src/components/`
- **API**: `frontend/src/api/`
- **Hooks**: `frontend/src/hooks/`
- **Store**: `frontend/src/store/`
- **Utils**: `frontend/src/utils/`

## 🐛 Debugging

### Backend
```javascript
// Add breakpoint in VS Code
// Or use logger
logger.debug('Debug point', { data });
```

### Frontend
```javascript
// React DevTools
// Or console.log (remove before commit)
console.log('Debug:', data);
```

## 📚 Documentation Files

- **Project Structure**: `PROJECT_STRUCTURE.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Development**: `docs/DEVELOPMENT.md`
- **Restructure Summary**: `README_RESTRUCTURE.md`

## 🔗 Useful Links

- Backend API Docs: http://localhost:5000/api-docs
- Frontend: http://localhost:3000
- Backend Health: http://localhost:5000/api/health


