#!/bin/bash

# SSH Config.js Cache Cleanup and Search Script
# This script will:
# 1. Search for all config.js files on the server
# 2. Show their contents
# 3. Clean npm/build caches
# 4. Force fresh deployment

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${GREEN}==>${NC} $1"; }
print_warn() { echo -e "${YELLOW}WARNING:${NC} $1"; }
print_error() { echo -e "${RED}ERROR:${NC} $1"; }
print_info() { echo -e "${BLUE}INFO:${NC} $1"; }

echo "========================================"
echo "🔍 SEARCHING FOR ALL config.js FILES"
echo "========================================"
echo ""

print_step "1. Searching entire server for config.js files..."
echo "This may take a moment..."
echo ""

# Search for all config.js files (excluding node_modules to speed up)
find / -name "config.js" -type f 2>/dev/null | while read -r file; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Found: $file"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if it contains APP_CONFIG
    if grep -q "APP_CONFIG" "$file" 2>/dev/null; then
        print_warn "⚠️  This file contains APP_CONFIG!"
        echo ""
        echo "Contents:"
        cat "$file"
        echo ""
        
        # Check if it has localhost
        if grep "API_URL" "$file" | grep -q "localhost" 2>/dev/null; then
            print_error "❌ PROBLEM: This file has localhost in API_URL!"
        else
            print_step "✓ This file looks correct (no localhost in API_URL)"
        fi
    fi
    echo ""
done

echo ""
print_step "2. Checking specific known locations..."
echo ""

# Check web root
if [ -f "/var/www/spryclips/config.js" ]; then
    print_info "Deployed config.js in /var/www/spryclips:"
    cat /var/www/spryclips/config.js
    echo ""
else
    print_warn "No config.js found in /var/www/spryclips"
fi

# Check source
if [ -f "$HOME/Tiktok_clone/frontend/public/config.js" ]; then
    print_info "Source config.js in ~/Tiktok_clone/frontend/public:"
    cat "$HOME/Tiktok_clone/frontend/public/config.js"
    echo ""
else
    print_warn "No config.js found in ~/Tiktok_clone/frontend/public"
fi

echo ""
print_step "3. Checking for any build artifacts..."
echo ""

# Check if build directory exists
if [ -d "$HOME/Tiktok_clone/frontend/build" ]; then
    print_info "Build directory exists"
    if [ -f "$HOME/Tiktok_clone/frontend/build/config.js" ]; then
        print_warn "config.js found in build directory:"
        cat "$HOME/Tiktok_clone/frontend/build/config.js"
        echo ""
    fi
    
    # Check build timestamp
    BUILD_TIME=$(stat -c %y "$HOME/Tiktok_clone/frontend/build" 2>/dev/null || stat -f "%Sm" "$HOME/Tiktok_clone/frontend/build" 2>/dev/null)
    echo "Build directory last modified: $BUILD_TIME"
else
    print_info "No build directory found"
fi

echo ""
echo "========================================"
echo "🧹 CACHE CLEANUP"
echo "========================================"
echo ""

print_step "4. Cleaning npm caches..."
cd "$HOME/Tiktok_clone/frontend" || exit 1

# Clear npm cache
npm cache clean --force 2>/dev/null && print_step "✓ npm cache cleaned" || print_warn "npm cache clean failed"

# Clear build directory
if [ -d "build" ]; then
    print_step "Removing old build directory..."
    rm -rf build
    print_step "✓ Build directory removed"
fi

# Clear node_modules
if [ -d "node_modules" ]; then
    print_step "Removing node_modules..."
    rm -rf node_modules
    print_step "✓ node_modules removed"
fi

echo ""
print_step "5. Verifying source config.js is correct..."
cd "$HOME/Tiktok_clone" || exit 1

# Show git status
git status frontend/public/config.js

# Show current content
echo ""
echo "Current source config.js content:"
cat frontend/public/config.js

# Check if it has the wrong value
if grep "API_URL:" frontend/public/config.js | grep -v "^[[:space:]]*//'" | grep -q "localhost"; then
    print_error "❌ Source file has localhost! Fetching correct version from git..."
    git fetch origin
    git checkout origin/intial-code -- frontend/public/config.js
    echo ""
    echo "Updated config.js content:"
    cat frontend/public/config.js
else
    print_step "✓ Source file looks correct"
fi

echo ""
echo "========================================"
echo "📊 SUMMARY"
echo "========================================"
echo ""
print_info "Cache cleanup complete!"
print_info "Next step: Run the deployment script to rebuild with clean cache"
echo ""
echo "Run this command:"
echo "  cd ~/Tiktok_clone && ./deploy-production.sh"
echo ""
