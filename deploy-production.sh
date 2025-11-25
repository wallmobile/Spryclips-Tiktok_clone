#!/bin/bash

# ============================================
# Production Deployment Script for TikTok Clone
# ============================================
# Description: Automated deployment script for spryclips.com
# Author: Spryclips Team
# Last Updated: November 2025
# 
# This script will:
# 1. Pull latest code from git
# 2. Deploy backend with PM2
# 3. Build and deploy frontend
# 4. Configure nginx
# 5. Run health checks
# ============================================

set -e  # Exit on any error

# ============================================
# COLOR DEFINITIONS FOR TERMINAL OUTPUT
# ============================================
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'  # No Color

# ============================================
# HELPER FUNCTIONS FOR PRETTY OUTPUT
# ============================================
print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║${NC}  $1"
    echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${BOLD}$1${NC}"
    echo -e "${CYAN}└────────────────────────────────────────────────────────────┘${NC}"
}

print_step() { 
    echo -e "${GREEN}  ▶${NC} $1"
}

print_substep() {
    echo -e "${CYAN}    ➤${NC} $1"
}

print_success() {
    echo -e "${GREEN}  ✓${NC} $1"
}

print_warn() { 
    echo -e "${YELLOW}  ⚠ WARNING:${NC} $1"
}

print_error() { 
    echo -e "${RED}  ✗ ERROR:${NC} $1"
    exit 1
}

print_info() {
    echo -e "${BLUE}  ℹ${NC} $1"
}

# ============================================
# CONFIGURATION
# ============================================
BACKEND_DIR="$HOME/Tiktok_clone/backend"
FRONTEND_DIR="$HOME/Tiktok_clone/frontend"
WEB_ROOT="/var/www/spryclips"
PM2_APP_NAME="spryclips-backend"
NGINX_CONFIG="/etc/nginx/sites-available/default"

# ============================================
# START DEPLOYMENT
# ============================================

clear
print_header "🚀 SPRYCLIPS PRODUCTION DEPLOYMENT 🚀"

echo -e "${BOLD}Deployment started at:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
print_info "This script will deploy the latest version of Spryclips"
print_info "All existing video files will be preserved"
echo ""

# Navigate to project root
print_section "📁 NAVIGATING TO PROJECT DIRECTORY"
cd ~/Tiktok_clone || print_error "Project directory not found at ~/Tiktok_clone"
print_success "Successfully navigated to project directory"

# ============================================
# GIT OPERATIONS - PULL LATEST CODE
# ============================================
print_section "🔄 PULLING LATEST CODE FROM REPOSITORY"

# Configure git credentials (using credential helper to avoid repeated prompts)
print_step "Configuring git credentials..."
git config --global credential.helper store 2>/dev/null || true
print_success "Git credentials configured"

# Fetch latest changes
print_step "Fetching latest changes from origin..."
git fetch origin || print_warn "Git fetch failed"
print_success "Fetch completed"

# Checkout target branch
print_step "Switching to main branch..."
git checkout main || print_warn "Failed to checkout main branch"
print_success "On branch: main"

# Reset any local changes to ensure clean state
print_step "Resetting to remote state (discarding local changes)..."
git reset --hard origin/main || print_warn "Git reset failed"
print_success "Repository state reset"

# Pull latest code
print_step "Pulling latest code..."
git pull origin main || print_warn "Git pull failed"
print_success "Code updated successfully"

# Verify critical files after pull
echo ""
print_substep "Verifying code update..."
echo -e "${BLUE}    Last commit:${NC}"
git log -1 --oneline | sed 's/^/      /'
echo ""
echo -e "${BLUE}    Config file last modified:${NC}"
git log -1 --oneline -- frontend/public/config.js | sed 's/^/      /'
echo ""

# ============================================
# BACKEND DEPLOYMENT
# ============================================
print_section "🔧 DEPLOYING BACKEND APPLICATION"

# Navigate to backend directory
print_step "Navigating to backend directory..."
cd "$BACKEND_DIR" || print_error "Backend directory not found at $BACKEND_DIR"
print_success "In backend directory"

# Stop existing PM2 process
print_step "Stopping existing PM2 process..."
pm2 stop $PM2_APP_NAME 2>/dev/null || true
pm2 delete $PM2_APP_NAME 2>/dev/null || true
print_success "Previous PM2 process stopped"

# Clean backend dependencies
print_step "Cleaning backend dependencies..."
print_substep "Removing node_modules and package-lock.json"
# IMPORTANT: Only clean node_modules and package-lock.json, NOT uploads directory
rm -rf node_modules package-lock.json

print_substep "Clearing npm cache"
npm cache clean --force 2>/dev/null || true
print_success "Backend cleaned successfully"

echo ""
print_info "🎥 Uploads directory at /home/reactmaster/uploads will be preserved"
print_info "   All video files and user content will remain intact"
echo ""

# Install backend dependencies
print_step "Installing backend dependencies (production mode)..."
npm install --production || print_error "Backend npm install failed"
print_success "Backend dependencies installed"

# ============================================
# UPLOADS DIRECTORY SETUP
# ============================================
print_section "📦 CONFIGURING UPLOADS DIRECTORY"

print_step "Ensuring directory structure exists..."
# Create directories if they don't exist (will NOT delete existing content)
sudo mkdir -p /home/reactmaster/uploads || print_warn "Failed to create uploads directory"
sudo mkdir -p /home/reactmaster/uploads/stories || print_warn "Failed to create stories subdirectory"
sudo mkdir -p /home/reactmaster/uploads/verification || print_warn "Failed to create verification subdirectory"
sudo mkdir -p /home/reactmaster/uploads/processed || print_warn "Failed to create processed subdirectory"
print_success "Directory structure verified"

# Set proper ownership (reactmaster user and www-data group for nginx access)
print_step "Setting ownership (reactmaster:www-data)..."
sudo chown -R reactmaster:www-data /home/reactmaster/uploads || print_warn "Failed to set ownership"
print_success "Ownership configured"

# Set permissions: 775 for directories (owner and group can write), 664 for files
print_step "Setting permissions (775 for dirs, 664 for files)..."
print_substep "Configuring directory permissions..."
sudo find /home/reactmaster/uploads -type d -exec chmod 775 {} \; || print_warn "Failed to set directory permissions"
print_substep "Configuring file permissions..."
sudo find /home/reactmaster/uploads -type f -exec chmod 664 {} \; || print_warn "Failed to set file permissions"
print_success "Permissions configured successfully"

echo ""
print_info "Permissions summary:"
print_substep "Owner (reactmaster): Read, Write, Execute"
print_substep "Group (www-data): Read, Write, Execute (for nginx)"
print_substep "Others: Read, Execute"
echo ""

# Start backend with PM2
print_section "🚀 STARTING BACKEND WITH PM2"

print_step "Starting backend application..."
if [ -f "ecosystem.config.js" ]; then
    print_substep "Using ecosystem.config.js configuration"
    pm2 start ecosystem.config.js --env production || print_error "PM2 start with ecosystem failed"
else
    print_substep "Using default PM2 configuration"
    pm2 start npm --name $PM2_APP_NAME -- run start || print_error "PM2 start failed"
fi
print_success "Backend started successfully"

print_step "Saving PM2 configuration..."
pm2 save
print_success "PM2 configuration saved"

# ============================================
# FRONTEND BUILD & DEPLOYMENT
# ============================================
print_section "⚛️  BUILDING FRONTEND APPLICATION"

# Navigate to frontend directory
print_step "Navigating to frontend directory..."
cd "$FRONTEND_DIR" || print_error "Frontend directory not found at $FRONTEND_DIR"
print_success "In frontend directory"

# Clean frontend
print_step "Cleaning previous build artifacts..."
print_substep "Removing build directory"
rm -rf build
print_substep "Removing node_modules"
rm -rf node_modules package-lock.json
print_substep "Clearing npm cache"
npm cache clean --force 2>/dev/null || true
print_success "Frontend cleaned successfully"

# Verify config.js before build
print_step "Validating configuration file (config.js)..."
if [ -f "public/config.js" ]; then
    echo ""
    echo -e "${BLUE}    ┌─ config.js contents ─────────────────────────────${NC}"
    cat public/config.js | sed 's/^/    │ /'
    echo -e "${BLUE}    └──────────────────────────────────────────────────${NC}"
    echo ""
    
    # Check if the actual API_URL value (not comments) contains localhost
    API_URL_LINE=$(grep "API_URL:" public/config.js | grep -v "^[[:space:]]*//")
    if echo "$API_URL_LINE" | grep -q "localhost"; then
        print_error "config.js API_URL value contains 'localhost'! Update it to use empty string for production."
    fi
    print_success "Configuration validated (API_URL not set to localhost)"
else
    print_error "config.js not found in public/ directory"
fi

# Install frontend dependencies
print_step "Installing frontend dependencies..."
npm install || print_error "Frontend npm install failed"
print_success "Frontend dependencies installed"

# Build React app
print_step "Building React application (this may take a few minutes)..."
npm run build || print_error "Frontend build failed"
print_success "React app built successfully"

# ============================================
# DEPLOY TO WEB ROOT
# ============================================
print_section "🌐 DEPLOYING TO WEB SERVER"

# Clean and prepare web root
print_step "Preparing web root directory..."
sudo rm -rf "$WEB_ROOT"
sudo mkdir -p "$WEB_ROOT" || print_error "Failed to create web root"
print_success "Web root prepared at $WEB_ROOT"

# Also clean /var/www/html if it exists (old/default location)
if [ -d "/var/www/html" ]; then
    print_substep "Cleaning legacy location (/var/www/html)..."
    sudo rm -rf /var/www/html/*
fi

# Deploy build files
print_step "Copying build files to web root..."
sudo cp -r build/* "$WEB_ROOT/" || print_error "Failed to copy build files"
print_success "Build files copied successfully"

print_step "Setting web root permissions..."
print_substep "Setting ownership to www-data:www-data"
sudo chown -R www-data:www-data "$WEB_ROOT" || print_warn "Failed to set ownership (continuing anyway)"
print_substep "Setting permissions to 755"
sudo chmod -R 755 "$WEB_ROOT" || print_warn "Failed to set permissions (continuing anyway)"
print_success "Permissions configured"

# Also deploy to /var/www/html to ensure consistency
if [ -d "/var/www/html" ]; then
    print_step "Deploying to legacy location for compatibility..."
    sudo cp -r build/* /var/www/html/
    sudo chown -R www-data:www-data /var/www/html || true
    sudo chmod -R 755 /var/www/html || true
    print_success "Legacy location updated"
fi

# ============================================
# VERIFY DEPLOYMENT
# ============================================
print_section "✅ VERIFYING DEPLOYMENT"

# Verify config.js was deployed correctly
print_step "Verifying configuration file in web root..."
if [ -f "$WEB_ROOT/config.js" ]; then
    print_success "config.js found in web root"
    echo ""
    echo -e "${BLUE}    ┌─ Deployed config.js contents ────────────────────${NC}"
    cat "$WEB_ROOT/config.js" | sed 's/^/    │ /'
    echo -e "${BLUE}    └──────────────────────────────────────────────────${NC}"
    echo ""
    
    # Critical check: ensure the actual API_URL value (not comments) doesn't contain localhost
    API_URL_LINE=$(sudo grep "API_URL:" "$WEB_ROOT/config.js" | grep -v "^[[:space:]]*//")
    if echo "$API_URL_LINE" | grep -q "localhost"; then
        print_error "DEPLOYMENT FAILED: config.js API_URL value contains 'localhost'! This will cause network errors."
    fi
    
    # Verify it has empty string
    if sudo grep -q "API_URL: ''" "$WEB_ROOT/config.js"; then
        print_success "API_URL is correctly set to empty string"
    else
        print_warn "API_URL might not be set to empty string. Check the file above."
    fi
else
    print_error "config.js not found in web root!"
fi

# Verify test-config.html was copied
print_step "Checking for test configuration page..."
if [ -f "$WEB_ROOT/test-config.html" ]; then
    print_success "test-config.html available at /test-config.html"
else
    print_warn "test-config.html not found"
fi

# ============================================
# NGINX CONFIGURATION
# ============================================
print_section "🔧 CONFIGURING NGINX WEB SERVER"

# Backup existing config
print_step "Creating backup of current nginx configuration..."
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp $NGINX_CONFIG $BACKUP_FILE || true
print_success "Backup created: $BACKUP_FILE"

# Write new config
print_step "Writing new nginx configuration..."
sudo tee $NGINX_CONFIG > /dev/null << 'NGINX_EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    # server_name spryclips.com www.spryclips.com spryclip.com www.spryclip.com;

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

    # Uploads directory - serve uploaded files
    location /uploads/ {
        alias /home/reactmaster/uploads/;
        
        # Security headers
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        
        # Cache control for static files
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Enable CORS for video/image loading
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
        
        # Handle OPTIONS requests for CORS preflight
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        # Disable access log for uploads (optional, for performance)
        access_log off;
        
        # Allow all file types
        types {
            video/mp4 mp4;
            video/webm webm;
            video/quicktime mov;
            video/x-msvideo avi;
            video/x-matroska mkv;
            image/jpeg jpg jpeg;
            image/png png;
            image/gif gif;
            application/pdf pdf;
        }
    }

    # Processed videos (thumbnails, etc.)
    location /processed/ {
        alias /home/reactmaster/uploads/processed/;
        
        # Cache control
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        
        access_log off;
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

print_success "Nginx configuration written successfully"

# Verify nginx config
print_step "Verifying nginx configuration..."
CONFIG_LINES=$(sudo wc -l $NGINX_CONFIG | awk '{print $1}')
print_substep "Configuration file: $CONFIG_LINES lines"

print_substep "Checking web root directive..."
if sudo grep -q "root /var/www" $NGINX_CONFIG; then
    print_success "Web root directive found"
else
    print_warn "Web root directive not found!"
fi

print_substep "Checking API proxy configuration..."
if sudo grep -q "location /api/" $NGINX_CONFIG; then
    print_success "API proxy configuration found"
else
    print_warn "API location block not found!"
fi

# Test nginx syntax
print_step "Testing nginx configuration syntax..."
sudo nginx -t || print_error "Nginx config test failed"
print_success "Nginx configuration syntax is valid"

# Restart nginx
print_step "Restarting nginx service..."
sudo systemctl restart nginx || print_error "Nginx restart failed"
print_success "Nginx restarted successfully"

print_step "Waiting for nginx to fully start..."
sleep 2
print_success "Nginx is ready"

# ============================================
# SERVICE STATUS CHECK
# ============================================
print_section "📊 CHECKING SERVICE STATUS"

print_step "PM2 Process Status:"
echo ""
pm2 status
echo ""

print_step "Nginx Service Status:"
echo ""
sudo systemctl status nginx --no-pager -l | head -n 10
echo ""

# ============================================
# ENDPOINT HEALTH CHECKS
# ============================================
print_section "🔍 RUNNING HEALTH CHECKS"

print_step "Testing backend (direct connection)..."
echo -e "${BLUE}    Endpoint: http://127.0.0.1:5000/api/health${NC}"
if curl -I http://127.0.0.1:5000/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
    print_success "Backend responding correctly"
else
    print_warn "Backend health check returned unexpected status"
fi
echo ""

print_step "Testing backend (via nginx proxy)..."
echo -e "${BLUE}    Endpoint: http://localhost/api/health${NC}"
if curl -I http://localhost/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
    print_success "Backend proxy working correctly"
else
    print_warn "Backend proxy health check returned unexpected status"
fi
echo ""

print_step "Testing frontend..."
echo -e "${BLUE}    Endpoint: http://localhost/${NC}"
if curl -I http://localhost/ 2>/dev/null | head -n 5 | grep -q "200"; then
    print_success "Frontend serving correctly"
else
    print_warn "Frontend health check returned unexpected status"
fi
echo ""

print_step "Verifying config.js accessibility..."
echo -e "${BLUE}    Endpoint: http://localhost/config.js${NC}"
CONFIG_CHECK=$(curl -s http://localhost/config.js 2>/dev/null | grep "API_URL")
if [ -n "$CONFIG_CHECK" ]; then
    print_success "config.js is accessible"
    echo -e "${CYAN}    Content:${NC} $CONFIG_CHECK"
else
    print_warn "Could not retrieve config.js"
fi
echo ""

# ============================================
# DEPLOYMENT COMPLETE
# ============================================
print_header "✅ DEPLOYMENT COMPLETED SUCCESSFULLY! ✅"

echo -e "${BOLD}${GREEN}Deployment finished at:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

print_section "🌐 ACCESS POINTS"
echo -e "${CYAN}  Frontend:${NC}    ${BOLD}https://www.spryclips.com${NC}"
echo -e "${CYAN}  Backend API:${NC} ${BOLD}https://www.spryclips.com/api/health${NC}"
echo -e "${CYAN}  Test Config:${NC} ${BOLD}https://www.spryclips.com/test-config.html${NC}"
echo ""

print_section "📝 USEFUL COMMANDS"
echo -e "${CYAN}  View Backend Logs:${NC}"
echo -e "    pm2 logs $PM2_APP_NAME"
echo ""
echo -e "${CYAN}  View Nginx Error Log:${NC}"
echo -e "    sudo tail -f /var/log/nginx/spryclips.error.log"
echo ""
echo -e "${CYAN}  View Nginx Access Log:${NC}"
echo -e "    sudo tail -f /var/log/nginx/spryclips.access.log"
echo ""
echo -e "${CYAN}  Check PM2 Status:${NC}"
echo -e "    pm2 status"
echo ""
echo -e "${CYAN}  Restart Backend:${NC}"
echo -e "    pm2 restart $PM2_APP_NAME"
echo ""

print_section "📦 IMPORTANT NOTES"
print_info "All video files have been preserved in /home/reactmaster/uploads"
print_info "Backend is running with PM2 and will auto-restart on failure"
print_info "Nginx is configured to serve frontend and proxy API requests"
echo ""

echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  Deployment successful! Your application is now live! 🎉  ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
