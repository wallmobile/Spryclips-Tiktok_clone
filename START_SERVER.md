# How to Start Backend Server

## Quick Start (Easiest Method)

1. **Double-click** `start-backend.bat` file in the project root folder
2. A new window will open showing server logs
3. Wait until you see: `Server running on port 5000`
4. Keep this window open!

## Manual Method

1. Open **Command Prompt** (cmd) or **PowerShell**
2. Navigate to backend folder:
   ```bash
   cd C:\Users\Waqas\Desktop\Tiktok_clone\backend
   ```
3. Start the server:
   ```bash
   node index.js
   ```
4. Wait for: `Server running on port 5000`
5. **Keep the window open!** (Don't close it)

## Verify Server is Running

Open browser and go to: `http://localhost:5000/api/health`

You should see JSON response with `"status": "running"`

## Common Issues

### Server won't start?
- Check if port 5000 is already in use
- Check `.env` file exists in project root
- Check MongoDB connection string in `.env`

### Still getting ERR_CONNECTION_REFUSED?
- Make sure server window is still open
- Check server logs for errors
- Try restarting the server

## After Server Starts

1. Go to your frontend (http://localhost:3000)
2. Try forgot password feature
3. Check backend console for email sending logs

