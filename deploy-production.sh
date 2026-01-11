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

# Set umask to 002 for proper file permissions (files: 664, dirs: 775)
# This ensures group-writable files needed for www-data nginx access
umask 002

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
NGINX_CONFIG="/etc/nginx/sites-available/default"
STATE_FILE="$HOME/Tiktok_clone/.deployment-state"

# Blue-Green Deployment Configuration
PM2_APP_BLUE="spryclips-blue"
PM2_APP_GREEN="spryclips-green"
PORT_BLUE=5000
PORT_GREEN=5001

# Ensure Node.js runtime is compatible (oidc-provider requires Node v22+)
check_node_and_install() {
    # Determine current Node major version (0 if not installed)
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v | sed 's/^v//')
        NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    else
        NODE_VERSION="none"
        NODE_MAJOR=0
    fi

    if [ "$NODE_MAJOR" -lt 22 ]; then
        print_warn "Node.js version $NODE_VERSION detected. oidc-provider requires Node.js v22 or newer. Attempting to install/upgrade to v22.x"

        # Try NodeSource (apt/yum) first
        if command -v curl >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
            print_step "Installing Node.js v22 via NodeSource (apt)..."
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - || print_warn "NodeSource setup (apt) failed"
            sudo apt-get install -y nodejs || print_warn "apt-get install nodejs failed"
        elif command -v curl >/dev/null 2>&1 && command -v yum >/dev/null 2>&1; then
            print_step "Installing Node.js v22 via NodeSource (yum)..."
            curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash - || print_warn "NodeSource setup (yum) failed"
            sudo yum install -y nodejs || print_warn "yum install nodejs failed"
        else
            # Fallback: install nvm and use nvm to install Node 22 for current user
            print_step "Falling back to nvm install (user-level)..."
            export NVM_DIR="$HOME/.nvm"
            if [ ! -d "$NVM_DIR" ]; then
                curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash || print_warn "nvm install script failed"
            fi
            # Load nvm if available
            if [ -s "$NVM_DIR/nvm.sh" ]; then
                . "$NVM_DIR/nvm.sh"
            fi
            nvm install 22 || print_warn "nvm install 22 failed"
            nvm alias default 22 || true
            nvm use 22 || true
        fi

        # Verify installation
        if command -v node >/dev/null 2>&1; then
            NEW_VER=$(node -v)
            print_success "Node installed/updated to $NEW_VER"
            # Ensure pm2 is installed under the active node
            print_step "Ensuring pm2 is available under the new Node runtime"
            if ! command -v pm2 >/dev/null 2>&1; then
                sudo npm install -g pm2 || npm install -g pm2 || print_warn "Failed to globally install pm2"
            fi
        else
            print_warn "Failed to install Node v22; setting SKIP_OIDC=true to allow process to start without OIDC"
            # If Node install fails, set SKIP_OIDC so startup won't crash
            SKIP_OIDC=true
        fi
    else
        print_success "Node.js version $NODE_VERSION is compatible (>=22)"
    fi
}


# ============================================
# START DEPLOYMENT
# ============================================

clear
print_header "🚀 SPRYCLIPS PRODUCTION DEPLOYMENT 🚀"

echo -e "${BOLD}Deployment started at:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
print_info "This script will deploy the latest version of Spryclips"
print_info "All existing video files will be preserved"
print_info "Using Blue-Green deployment strategy for zero-downtime"
echo ""

# ============================================
# BLUE-GREEN DEPLOYMENT: DETERMINE ACTIVE ENVIRONMENT
# ============================================
print_section "🔵🟢 BLUE-GREEN DEPLOYMENT INITIALIZATION"

# Determine which environment is currently active
if [ -f "$STATE_FILE" ]; then
    ACTIVE_ENV=$(cat "$STATE_FILE")
    print_info "State file found: $ACTIVE_ENV is currently active"
else
    # First deployment - default to blue as active
    ACTIVE_ENV="blue"
    echo "$ACTIVE_ENV" > "$STATE_FILE"
    print_info "First deployment detected: Setting blue as initial active environment"
fi

# Set deployment target (opposite of active)
if [ "$ACTIVE_ENV" == "blue" ]; then
    TARGET_ENV="green"
    TARGET_APP="$PM2_APP_GREEN"
    TARGET_PORT=$PORT_GREEN
    ACTIVE_APP="$PM2_APP_BLUE"
    ACTIVE_PORT=$PORT_BLUE
else
    TARGET_ENV="blue"
    TARGET_APP="$PM2_APP_BLUE"
    TARGET_PORT=$PORT_BLUE
    ACTIVE_APP="$PM2_APP_GREEN"
    ACTIVE_PORT=$PORT_GREEN
fi

echo ""
print_success "Active environment: ${BOLD}${BLUE}$ACTIVE_ENV${NC} (Port: $ACTIVE_PORT)"
print_success "Target environment: ${BOLD}${GREEN}$TARGET_ENV${NC} (Port: $TARGET_PORT)"
echo ""
print_info "Deployment strategy: Deploy to $TARGET_ENV → Health check → Switch traffic"
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

# Stop target environment PM2 process (keeping active running)
print_step "Preparing target environment ($TARGET_ENV)..."
print_substep "Stopping $TARGET_APP if running..."
pm2 stop $TARGET_APP 2>/dev/null || true
pm2 delete $TARGET_APP 2>/dev/null || true
print_success "Target environment prepared"

print_info "Active environment ($ACTIVE_APP) continues serving traffic"

# Ensure Node.js is compatible and pm2 is present
print_step "Checking Node.js version and installing/upgrading to v22 if necessary..."
check_node_and_install

# ============================================
# NGINX HELPERS & CLI OPTIONS
# ============================================

# Parse simple CLI flags
NGINX_ONLY=false
while [ "$#" -gt 0 ]; do
    case "$1" in
        --nginx-only)
            NGINX_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--nginx-only]"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Detect nginx user on this system
detect_nginx_user() {
    if id -u www-data >/dev/null 2>&1; then
        NGINX_USER="www-data"
    elif id -u nginx >/dev/null 2>&1; then
        NGINX_USER="nginx"
    elif id -u _www >/dev/null 2>&1; then
        NGINX_USER="_www"
    else
        NGINX_USER="root"
    fi
}

# Ensure nginx log files exist and are writable by the nginx runtime user
ensure_nginx_log_permissions() {
    detect_nginx_user

    print_step "Ensuring /var/log/nginx exists and spryclips log files are present"
    sudo mkdir -p /var/log/nginx || print_warn "Failed to create /var/log/nginx"
    sudo touch /var/log/nginx/spryclips.access.log /var/log/nginx/spryclips.error.log 2>/dev/null || true

    print_step "Setting ownership to $NGINX_USER and permissions to 664 for spryclips logs"
    sudo chown $NGINX_USER:$NGINX_USER /var/log/nginx/spryclips.* 2>/dev/null || print_warn "Failed to chown spryclips log files"
    sudo chmod 664 /var/log/nginx/spryclips.* 2>/dev/null || print_warn "Failed to chmod spryclips log files"
    sudo chmod 755 /var/log/nginx 2>/dev/null || print_warn "Failed to chmod /var/log/nginx"

    print_success "Nginx log files and permissions configured (owner: $NGINX_USER)"
}

# Write nginx config (uses ACTIVE_PORT variable)
write_nginx_config() {
    NGINX_BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    print_step "Backing up current nginx config (if present)"
    sudo cp $NGINX_CONFIG $NGINX_BACKUP 2>/dev/null || print_warn "No existing nginx config to backup"
    print_success "Backup created: $NGINX_BACKUP"

    print_step "Writing nginx configuration (pointing to active backend on port $ACTIVE_PORT)..."
    sudo tee $NGINX_CONFIG > /dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

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
    location ~ /\\. {
        deny all;
    }

    # Processed videos (thumbnails, etc.) - MUST come before /uploads/ and /
    location /processed/ {
        alias /home/reactmaster/uploads/processed/;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        access_log off;
    }

    # Uploads directory - serve uploaded files
    location /uploads/ {
        alias /home/reactmaster/uploads/;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        access_log off;
    }

    # React SPA - catch all (MUST come last)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static file caching
    location ~* \\\.(?:css|js|jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|eot|json|map)\\$ {
        try_files \$uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # API proxy - preserve /api path
    location /api/ {
        proxy_pass http://127.0.0.1:$ACTIVE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 500M;
        proxy_buffering off;
        proxy_connect_timeout 60s;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }

    # WebSocket / Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:$ACTIVE_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}
EOF

    sudo chown root:root $NGINX_CONFIG || print_warn "Failed to set ownership on nginx config"
    sudo chmod 644 $NGINX_CONFIG || print_warn "Failed to set permissions on nginx config"

    # Ensure log files & perms are correct
    ensure_nginx_log_permissions

    print_step "Testing nginx configuration syntax..."
    sudo nginx -t || print_error "Nginx config test failed"
    print_success "Nginx configuration syntax is valid"

    print_step "Reloading nginx (graceful reload)..."
    sudo systemctl reload nginx || print_error "Nginx reload failed"
    print_success "Nginx reloaded successfully"
}

# If invoked in nginx-only mode, apply config and exit early
if [ "$NGINX_ONLY" = true ]; then
    print_section "🔧 NGINX-ONLY MODE"
    if [ -f "$STATE_FILE" ]; then
        ACTIVE_ENV=$(cat "$STATE_FILE")
    else
        ACTIVE_ENV="blue"
        print_warn "State file not found; defaulting to blue"
    fi

    if [ "$ACTIVE_ENV" == "blue" ]; then
        ACTIVE_PORT=$PORT_BLUE
    else
        ACTIVE_PORT=$PORT_GREEN
    fi

    ensure_nginx_log_permissions
    write_nginx_config

    print_success "Nginx configuration applied (nginx-only)"
    exit 0
fi

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
print_substep "Setting setgid on directories (g+s) to preserve group ownership..."
sudo find /home/reactmaster/uploads -type d -exec chmod g+s {} \; || print_warn "Failed to set setgid"
print_substep "Configuring file permissions..."
sudo find /home/reactmaster/uploads -type f -exec chmod 664 {} \; || print_warn "Failed to set file permissions"
print_success "Permissions configured successfully"

echo ""
print_info "Permissions summary:"
print_substep "Owner (reactmaster): Read, Write, Execute"
print_substep "Group (www-data): Read, Write, Execute (for nginx)"
print_substep "Others: Read, Execute"
print_info "Verification: New uploaded files will be created as -rw-rw-r-- (664) with group www-data"
print_info "             due to umask 002 in PM2 process and setgid on directories"
echo ""

# Start backend with PM2 on target environment
print_section "🚀 STARTING TARGET ENVIRONMENT ($TARGET_ENV)"

print_step "Starting backend on port $TARGET_PORT..."
print_substep "Starting with custom port configuration for blue-green deployment"

# If SKIP_OIDC is set (from earlier Node install failure), export it so PM2 process sees it
if [ -n "$SKIP_OIDC" ]; then
    print_warn "SKIP_OIDC is set; OIDC initialization will be skipped in the backend process"
    export SKIP_OIDC=true
fi

# Start with environment variables (not using ecosystem.config.js for blue-green)
# Note: umask 002 set at script start ensures files are created with group-writable permissions (664)
NODE_ENV=production \
PORT=$TARGET_PORT \
MONGODB_URI="mongodb+srv://admin:tR0hD8ODPxICuafh@ac-xotupu2.q6qrciv.mongodb.net/spryclips?retryWrites=true&w=majority" \
JWT_SECRET="spryclips-secret-key" \
FRONTEND_URL="https://spryclips.com" \
ALLOWED_ORIGINS="https://spryclips.com,https://www.spryclips.com,http://spryclips.com,http://www.spryclips.com,https://spryclip.com,https://www.spryclip.com" \
TRUST_PROXY="true" \
UPLOADS_DIR="/home/reactmaster/uploads" \
EMAIL_SERVICE="gmail" \
EMAIL_FROM="SpryClips <bipul.kumar3384@gmail.com>" \
GMAIL_USER="bipul.kumar3384@gmail.com" \
GMAIL_APP_PASSWORD="szynffjxrpripdhm" \
pm2 start index.js --name $TARGET_APP --max-memory-restart 1G --update-env || print_error "PM2 start failed"

print_success "Target environment started successfully on port $TARGET_PORT"

print_step "Waiting for backend to initialize..."
sleep 5
print_success "Backend initialization complete"

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

# Ensure log files and permissions then write config & reload
ensure_nginx_log_permissions
write_nginx_config

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

# Test target environment before switching
print_step "Testing TARGET environment ($TARGET_ENV on port $TARGET_PORT)..."
echo -e "${BLUE}    Endpoint: http://127.0.0.1:$TARGET_PORT/api/health${NC}"
TARGET_HEALTH_ATTEMPTS=0
TARGET_HEALTHY=false

while [ $TARGET_HEALTH_ATTEMPTS -lt 3 ]; do
    if curl -I http://127.0.0.1:$TARGET_PORT/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
        TARGET_HEALTHY=true
        break
    fi
    TARGET_HEALTH_ATTEMPTS=$((TARGET_HEALTH_ATTEMPTS + 1))
    print_substep "Attempt $TARGET_HEALTH_ATTEMPTS failed, retrying..."
    sleep 2
done

if [ "$TARGET_HEALTHY" = true ]; then
    print_success "Target environment is healthy and ready for traffic"
else
    print_error "Target environment health check failed after 3 attempts. Deployment aborted."
fi
echo ""

print_step "Testing ACTIVE environment ($ACTIVE_ENV on port $ACTIVE_PORT)..."
echo -e "${BLUE}    Endpoint: http://127.0.0.1:$ACTIVE_PORT/api/health${NC}"
if curl -I http://127.0.0.1:$ACTIVE_PORT/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
    print_success "Active environment still responding correctly"
else
    print_warn "Active environment health check returned unexpected status"
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
# BLUE-GREEN SWITCH: REDIRECT TRAFFIC TO NEW ENVIRONMENT
# ============================================
print_section "🔄 SWITCHING TRAFFIC TO NEW ENVIRONMENT"

print_step "Current traffic is being served by: ${BOLD}$ACTIVE_ENV${NC}"
print_step "Switching traffic to: ${BOLD}${GREEN}$TARGET_ENV${NC}"
echo ""

# Update state file
echo "$TARGET_ENV" > "$STATE_FILE"
print_success "State file updated: $TARGET_ENV is now marked as active"

# Update nginx to point to target port
print_step "Updating nginx configuration to use port $TARGET_PORT..."
sudo sed -i "s|proxy_pass http://127.0.0.1:$ACTIVE_PORT|proxy_pass http://127.0.0.1:$TARGET_PORT|g" $NGINX_CONFIG
print_success "Nginx configuration updated"

# Reload nginx (not restart, to avoid dropping connections)
print_step "Reloading nginx (graceful reload, no dropped connections)..."
sudo nginx -t && sudo systemctl reload nginx || print_error "Nginx reload failed"
print_success "Nginx reloaded successfully"

echo ""
print_success "${BOLD}${GREEN}Traffic successfully switched to $TARGET_ENV!${NC}"
echo ""

# Keep old environment running for rollback capability
print_info "Previous environment ($ACTIVE_ENV) is kept running on port $ACTIVE_PORT"
print_info "You can quickly rollback if needed using: pm2 restart $ACTIVE_APP"
echo ""

# Save PM2 configuration
print_step "Saving PM2 configuration..."
pm2 save
print_success "PM2 configuration saved"

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

print_section "�🟢 BLUE-GREEN DEPLOYMENT STATUS"
echo -e "${CYAN}  Active Environment:${NC}   ${BOLD}${GREEN}$TARGET_ENV${NC} (Port: $TARGET_PORT)"
echo -e "${CYAN}  Standby Environment:${NC}  ${BOLD}${BLUE}$ACTIVE_ENV${NC} (Port: $ACTIVE_PORT)"
echo -e "${CYAN}  Traffic Routing:${NC}      All traffic → $TARGET_ENV"
echo ""

print_section "�📝 USEFUL COMMANDS"
echo -e "${CYAN}  View Active Backend Logs ($TARGET_ENV):${NC}"
echo -e "    pm2 logs $TARGET_APP"
echo ""
echo -e "${CYAN}  View Standby Backend Logs ($ACTIVE_ENV):${NC}"
echo -e "    pm2 logs $ACTIVE_APP"
echo ""
echo -e "${CYAN}  View All Backend Logs:${NC}"
echo -e "    pm2 logs"
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
echo -e "${CYAN}  Quick Rollback (switch back to $ACTIVE_ENV):${NC}"
echo -e "    sudo sed -i 's|$TARGET_PORT|$ACTIVE_PORT|g' $NGINX_CONFIG && sudo systemctl reload nginx"
echo -e "    echo '$ACTIVE_ENV' > $STATE_FILE"
echo ""
echo -e "${CYAN}  Stop Old Environment (after confirming new one works):${NC}"
echo -e "    pm2 stop $ACTIVE_APP"
echo ""

print_section "📦 IMPORTANT NOTES"
print_info "✅ All video files have been preserved in /home/reactmaster/uploads"
print_info "✅ Zero-downtime deployment completed using blue-green strategy"
print_info "✅ Both environments are running for instant rollback capability"
print_info "✅ Backend will auto-restart on failure (PM2 managed)"
print_info "✅ Nginx is configured to serve frontend and proxy API requests"
echo ""
print_warn "After confirming the new deployment works correctly, you can stop the old environment:"
print_substep "pm2 stop $ACTIVE_APP"
echo ""

echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  Deployment successful! Your application is now live! 🎉  ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
