# Deployment Guide - TikTok Clone

This guide provides step-by-step instructions for deploying the TikTok Clone application to a production server.

---

## 📋 Table of Contents
- [Server Setup](#server-setup)
- [Application Deployment](#application-deployment)
- [Nginx Configuration](#nginx-configuration)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [PM2 Process Management](#pm2-process-management)
- [MongoDB Setup](#mongodb-setup)
- [Environment Configuration](#environment-configuration)
- [Post-Deployment](#post-deployment)

---

## 🖥️ Server Setup

### 1. Initial Server Configuration

**Update System:**
```bash
sudo apt update
sudo apt upgrade -y
```

**Install Essential Tools:**
```bash
sudo apt install -y curl wget git build-essential
```

### 2. Install Node.js

**Using NodeSource Repository:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Verify Installation:**
```bash
node --version
npm --version
```

### 3. Install MongoDB

**Import MongoDB GPG Key:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
```

**Add MongoDB Repository:**
```bash
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

**Install MongoDB:**
```bash
sudo apt update
sudo apt install -y mongodb-org
```

**Start MongoDB:**
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Verify MongoDB:**
```bash
sudo systemctl status mongod
```

### 4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 6. Install FFmpeg

```bash
sudo apt install -y ffmpeg
```

**Verify Installation:**
```bash
ffmpeg -version
```

### 7. Install Redis (Optional but Recommended)

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

---

## 📦 Application Deployment

### 1. Clone Repository

```bash
cd /var/www
sudo git clone <your-repository-url> tiktok-clone
sudo chown -R $USER:$USER /var/www/tiktok-clone
cd tiktok-clone
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install --production
```

**Frontend:**
```bash
cd ../frontend
npm install
npm run build
```

### 3. Create Environment Files

**Backend `.env` file:**
```bash
cd /var/www/tiktok-clone
sudo nano .env
```

Add the following (adjust values as needed):
```env
NODE_ENV=production
PORT=5000

MONGODB_URI=mongodb://localhost:27017/tiktok_clone_prod

JWT_SECRET=your-very-strong-secret-key-here
JWT_EXPIRE=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

FRONTEND_URL=https://yourdomain.com

REDIS_HOST=localhost
REDIS_PORT=6379

MAX_FILE_SIZE=104857600
UPLOAD_PATH=/var/www/tiktok-clone/backend/uploads
```

**Frontend `.env.production` file:**
```bash
cd /var/www/tiktok-clone/frontend
sudo nano .env.production
```

Add:
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_SOCKET_URL=https://api.yourdomain.com
```

### 4. Create Uploads Directory

```bash
mkdir -p /var/www/tiktok-clone/backend/uploads
chmod 755 /var/www/tiktok-clone/backend/uploads
```

---

## 🔧 PM2 Process Management

### 1. Create PM2 Ecosystem File

```bash
cd /var/www/tiktok-clone/backend
sudo nano ecosystem.config.js
```

Add the following:
```javascript
module.exports = {
  apps: [{
    name: 'tiktok-backend',
    script: './index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### 2. Create Logs Directory

```bash
mkdir -p /var/www/tiktok-clone/backend/logs
```

### 3. Start Application with PM2

```bash
cd /var/www/tiktok-clone/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**PM2 Commands:**
```bash
pm2 list              # View all processes
pm2 logs              # View logs
pm2 restart all       # Restart all processes
pm2 stop all          # Stop all processes
pm2 delete all        # Delete all processes
pm2 monit             # Monitor processes
```

---

## 🌐 Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/tiktok-clone
```

Add the following configuration:

```nginx
# Backend API Server
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for video uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Increase client body size for video uploads
    client_max_body_size 100M;
}

# Frontend Application
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/tiktok-clone/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/tiktok-clone /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL Certificate Setup

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 3. Auto-Renewal

Certbot automatically sets up auto-renewal. Test it:
```bash
sudo certbot renew --dry-run
```

---

## 🗄️ MongoDB Setup

### 1. Secure MongoDB

```bash
sudo nano /etc/mongod.conf
```

Enable authentication:
```yaml
security:
  authorization: enabled
```

### 2. Create Admin User

```bash
mongosh
```

In MongoDB shell:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})
```

### 3. Update MongoDB URI

Update `.env` file:
```env
MONGODB_URI=mongodb://admin:your-secure-password@localhost:27017/tiktok_clone_prod?authSource=admin
```

### 4. Restart MongoDB

```bash
sudo systemctl restart mongod
```

---

## 🔐 Firewall Configuration

### 1. Configure UFW

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Verify Firewall Status

```bash
sudo ufw status
```

---

## ✅ Post-Deployment

### 1. Verify Backend

```bash
curl http://localhost:5000/api/health
```

### 2. Check PM2 Status

```bash
pm2 status
pm2 logs tiktok-backend
```

### 3. Check Nginx Status

```bash
sudo systemctl status nginx
```

### 4. Test Frontend

Visit: `https://yourdomain.com`

### 5. Monitor Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

---

## 🔄 Updating Application

### 1. Pull Latest Changes

```bash
cd /var/www/tiktok-clone
git pull origin main
```

### 2. Update Dependencies

```bash
cd backend
npm install --production

cd ../frontend
npm install
npm run build
```

### 3. Restart Application

```bash
cd /var/www/tiktok-clone/backend
pm2 restart tiktok-backend
```

---

## 🛠️ Maintenance

### Daily Tasks
- Monitor PM2 processes: `pm2 monit`
- Check disk space: `df -h`
- Review error logs: `pm2 logs --err`

### Weekly Tasks
- Update system packages: `sudo apt update && sudo apt upgrade`
- Backup MongoDB database
- Review application logs

### Monthly Tasks
- Security updates
- Performance optimization
- Database cleanup

---

## 📞 Troubleshooting

### Application Not Starting
```bash
pm2 logs tiktok-backend --err
cd /var/www/tiktok-clone/backend
node index.js  # Run directly to see errors
```

### Nginx 502 Bad Gateway
- Check if backend is running: `pm2 status`
- Check backend logs: `pm2 logs`
- Verify port 5000 is accessible: `curl http://localhost:5000`

### MongoDB Connection Issues
- Check MongoDB status: `sudo systemctl status mongod`
- Verify connection string in `.env`
- Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

---

**Last Updated:** 2025-01-06

