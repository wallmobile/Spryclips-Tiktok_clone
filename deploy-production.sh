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

# ============================================
# DEPLOYMENT STEPS
# ============================================

print_step "Starting production deployment..."

# Navigate to project root
cd ~/Tiktok_clone || print_error "Project directory not found"

# Pull latest code from intial-code branch
print_step "Pulling latest code from git..."
git fetch origin || print_warn "Git fetch failed"
git checkout intial-code || print_warn "Failed to checkout intial-code branch"
git pull origin intial-code || print_warn "Git pull failed"

# Backend deployment
print_step "Deploying backend..."
cd "$BACKEND_DIR" || print_error "Backend directory not found"

print_step "Installing backend dependencies..."
npm ci --production || print_error "Backend npm install failed"

print_step "Restarting backend with PM2..."
pm2 restart $PM2_APP_NAME || pm2 start npm --name $PM2_APP_NAME -- run start || print_error "PM2 restart failed"
pm2 save

# Frontend deployment
print_step "Building frontend..."
cd "$FRONTEND_DIR" || print_error "Frontend directory not found"

print_step "Installing frontend dependencies..."
npm ci || print_error "Frontend npm install failed"

print_step "Building React app..."
npm run build || print_error "Frontend build failed"

print_step "Deploying frontend to web root..."
sudo mkdir -p "$WEB_ROOT" || print_error "Failed to create web root"
sudo rsync -av --delete build/ "$WEB_ROOT/" || print_error "Failed to copy build files"
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

# Reload nginx
print_step "Reloading nginx..."
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
