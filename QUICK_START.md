# Quick Start Guide - TikTok Clone

This is a quick reference guide for getting the application up and running.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 2: Setup Environment

1. Copy `ENV_TEMPLATE.txt` to `.env` in project root
2. Update MongoDB URI (if needed)
3. Update JWT_SECRET (generate a random string)

### Step 3: Start MongoDB

**Windows:**
```bash
net start MongoDB
```

**Linux/Mac:**
```bash
sudo systemctl start mongod
```

### Step 4: Run Application

**Option A: Use Batch Files (Windows)**
```bash
RUN_BOTH_SERVERS.bat
```

**Option B: Manual Start**

Terminal 1 - Backend:
```bash
cd backend
npm start
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

### Step 5: Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Admin Panel:** http://localhost:3000/admin

---

## 📝 Common Commands

### Backend Commands
```bash
cd backend
npm start          # Start server
npm run dev       # Start with auto-reload
```

### Frontend Commands
```bash
cd frontend
npm start         # Start development server
npm run build     # Build for production
```

### Database Commands
```bash
# Connect to MongoDB
mongosh

# Or use MongoDB Compass GUI
```

---

## ⚠️ Troubleshooting

### Port 5000 Already in Use
```bash
# Windows
taskkill /F /IM node.exe

# Linux/Mac
pkill node
```

### MongoDB Not Running
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# Mac
brew services start mongodb-community
```

### Dependencies Issues
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Next Steps

- Read [README.md](./README.md) for complete documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- See [PORT_5000_ERROR_SOLUTION.txt](./PORT_5000_ERROR_SOLUTION.txt) for port issues

---

**Need Help?** Check the main README.md file for detailed instructions.

