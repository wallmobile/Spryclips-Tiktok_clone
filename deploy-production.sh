#!/bin/bash

# Production Deployment Script for TikTok Clone
# Run this script on the SSH server after pulling latest code

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() { echo -e "${GREEN}==>${NC} $1"; }
print_warn() { echo -e "${YELLOW}WARNING:${NC} $1"; }
print_error() { echo -e "${RED}ERROR:${NC} $1"; exit 1; }

# ============================================
# CONFIGURATION
# ============================================
BACKEND_DIR="$HOME/Tiktok_clone/backend"
FRONTEND_DIR="$HOME/Tiktok_clone/frontend"
WEB_ROOT="/var/www/spryclips"
PM2_APP_NAME="spryclips-backend"
NGINX_CONFIG="/etc/nginx/sites-available/default"

# ============================================
# DEPLOYMENT STEPS
# ============================================

print_step "Starting production deployment..."

# Navigate to project root
cd ~/Tiktok_clone || print_error "Project directory not found"

# Configure git credentials (using credential helper to avoid repeated prompts)
print_step "Configuring git credentials..."
git config --global credential.helper store 2>/dev/null || true

# Pull latest code from intial-code branch
print_step "Pulling latest code from git..."
git fetch origin || print_warn "Git fetch failed"
git checkout intial-code || print_warn "Failed to checkout intial-code branch"
git pull origin intial-code || print_warn "Git pull failed"

# Clean and redeploy backend
print_step "Cleaning backend..."
cd "$BACKEND_DIR" || print_error "Backend directory not found"

print_step "Stopping and deleting PM2 process..."
pm2 stop $PM2_APP_NAME 2>/dev/null || true
pm2 delete $PM2_APP_NAME 2>/dev/null || true

print_step "Cleaning backend node_modules and cache..."
rm -rf node_modules package-lock.json
npm cache clean --force 2>/dev/null || true

print_step "Installing backend dependencies..."
npm install --production || print_error "Backend npm install failed"

print_step "Starting backend with PM2..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production || print_error "PM2 start with ecosystem failed"
else
    pm2 start npm --name $PM2_APP_NAME -- run start || print_error "PM2 start failed"
fi
pm2 save

# Clean and rebuild frontend
print_step "Cleaning frontend..."
cd "$FRONTEND_DIR" || print_error "Frontend directory not found"

print_step "Removing old build and node_modules..."
rm -rf build node_modules package-lock.json
npm cache clean --force 2>/dev/null || true

print_step "Installing frontend dependencies..."
npm install || print_error "Frontend npm install failed"

print_step "Building React app..."
npm run build || print_error "Frontend build failed"

print_step "Cleaning web root..."
sudo rm -rf "$WEB_ROOT"
sudo mkdir -p "$WEB_ROOT" || print_error "Failed to create web root"

print_step "Deploying frontend to web root..."
sudo cp -r build/* "$WEB_ROOT/" || print_error "Failed to copy build files"
sudo chown -R www-data:www-data "$WEB_ROOT" || print_warn "Failed to set ownership (continuing anyway)"
sudo chmod -R 755 "$WEB_ROOT" || print_warn "Failed to set permissions (continuing anyway)"

# Verify config.js was updated
print_step "Verifying frontend config..."
if [ -f "$WEB_ROOT/config.js" ]; then
    echo "Config.js contents:"
    cat "$WEB_ROOT/config.js"
else
    print_warn "config.js not found in web root"
fi

# Configure nginx
print_step "Configuring nginx..."
sudo bash -c "cat > $NGINX_CONFIG" << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name spryclips.com www.spryclips.com spryclip.com www.spryclip.com;

    root /var/www/spryclips;
    index index.html;

    access_log /var/log/nginx/spryclips.access.log;
    error_log /var/log/nginx/spryclips.error.log warn;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        allow all;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    # React SPA - catch all
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static file caching
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|eot|json|map)$ {
        try_files $uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # API proxy - preserve /api path
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 500M;
        proxy_buffering off;
        proxy_connect_timeout 60s;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }

    # WebSocket / Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}
NGINX_EOF

print_step "Testing and restarting nginx..."
sudo nginx -t || print_error "Nginx config test failed"
sudo systemctl restart nginx || print_error "Nginx restart failed"

# Check status
print_step "Checking service status..."
pm2 status
echo ""
sudo systemctl status nginx --no-pager -l | head -n 10

# Test endpoints
print_step "Testing endpoints..."
echo ""
echo "Testing backend directly:"
curl -I http://127.0.0.1:5000/api/health 2>/dev/null | head -n 5
echo ""
echo "Testing backend via nginx:"
curl -I http://localhost/api/health 2>/dev/null | head -n 5
echo ""
echo "Testing frontend:"
curl -I http://localhost/ 2>/dev/null | head -n 5

print_step "✓ Deployment complete!"
echo ""
echo "Frontend: https://www.spryclips.com"
echo "Backend API: https://www.spryclips.com/api/health"
echo ""
echo "Check logs:"
echo "  Backend: pm2 logs $PM2_APP_NAME"
echo "  Nginx Error: sudo tail -f /var/log/nginx/spryclips.error.log"
echo "  Nginx Access: sudo tail -f /var/log/nginx/spryclips.access.log"
