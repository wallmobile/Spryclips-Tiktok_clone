#!/bin/bash

# ============================================
# Rollback Script for Blue-Green Deployment
# ============================================
# Description: Quick rollback to previous environment
# Usage: ./rollback-deployment.sh
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BOLD}${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${RED}║${NC}  $1"
    echo -e "${BOLD}${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() { echo -e "${GREEN}  ▶${NC} $1"; }
print_success() { echo -e "${GREEN}  ✓${NC} $1"; }
print_warn() { echo -e "${YELLOW}  ⚠ WARNING:${NC} $1"; }
print_error() { echo -e "${RED}  ✗ ERROR:${NC} $1"; exit 1; }
print_info() { echo -e "${BLUE}  ℹ${NC} $1"; }

# Configuration
NGINX_CONFIG="/etc/nginx/sites-available/default"
STATE_FILE="$HOME/Tiktok_clone/.deployment-state"
PM2_APP_BLUE="spryclips-blue"
PM2_APP_GREEN="spryclips-green"
PORT_BLUE=5000
PORT_GREEN=5001

clear
print_header "⚠️  ROLLBACK TO PREVIOUS ENVIRONMENT ⚠️"

echo -e "${BOLD}Rollback initiated at:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
    print_error "State file not found. Cannot determine current environment."
fi

# Get current active environment
CURRENT_ENV=$(cat "$STATE_FILE")
print_info "Current active environment: ${BOLD}$CURRENT_ENV${NC}"

# Determine rollback target
if [ "$CURRENT_ENV" == "blue" ]; then
    ROLLBACK_TO="green"
    ROLLBACK_APP="$PM2_APP_GREEN"
    ROLLBACK_PORT=$PORT_GREEN
    CURRENT_APP="$PM2_APP_BLUE"
    CURRENT_PORT=$PORT_BLUE
else
    ROLLBACK_TO="blue"
    ROLLBACK_APP="$PM2_APP_BLUE"
    ROLLBACK_PORT=$PORT_BLUE
    CURRENT_APP="$PM2_APP_GREEN"
    CURRENT_PORT=$PORT_GREEN
fi

echo ""
print_warn "You are about to rollback to: ${BOLD}$ROLLBACK_TO${NC}"
print_warn "This will switch traffic from port $CURRENT_PORT to port $ROLLBACK_PORT"
echo ""

# Check if rollback target is running
print_step "Checking if $ROLLBACK_TO environment is running..."
if pm2 list | grep -q "$ROLLBACK_APP"; then
    print_success "$ROLLBACK_APP is running"
else
    print_error "$ROLLBACK_APP is not running. Cannot rollback to a stopped environment."
fi

# Health check on rollback target
print_step "Running health check on $ROLLBACK_TO (port $ROLLBACK_PORT)..."
if curl -I http://127.0.0.1:$ROLLBACK_PORT/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
    print_success "$ROLLBACK_TO environment is healthy"
else
    print_error "$ROLLBACK_TO environment health check failed. Cannot rollback to unhealthy environment."
fi

echo ""
read -p "$(echo -e ${YELLOW}Continue with rollback? [y/N]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Rollback cancelled by user"
    exit 0
fi

echo ""
print_step "Performing rollback..."

# Update nginx configuration
print_step "Updating nginx to point to port $ROLLBACK_PORT..."
sudo sed -i "s|proxy_pass http://127.0.0.1:$CURRENT_PORT|proxy_pass http://127.0.0.1:$ROLLBACK_PORT|g" $NGINX_CONFIG
print_success "Nginx configuration updated"

# Test nginx config
print_step "Testing nginx configuration..."
sudo nginx -t || print_error "Nginx config test failed"
print_success "Nginx configuration is valid"

# Reload nginx
print_step "Reloading nginx..."
sudo systemctl reload nginx || print_error "Nginx reload failed"
print_success "Nginx reloaded successfully"

# Update state file
echo "$ROLLBACK_TO" > "$STATE_FILE"
print_success "State file updated: $ROLLBACK_TO is now active"

# Verify the rollback
sleep 2
print_step "Verifying rollback..."
if curl -I http://localhost/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
    print_success "Rollback successful! Traffic is now being served by $ROLLBACK_TO"
else
    print_warn "Health check via nginx returned unexpected status"
fi

echo ""
print_header "✅ ROLLBACK COMPLETED"

echo -e "${BOLD}${GREEN}Rollback finished at:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
print_success "Active environment: ${BOLD}${GREEN}$ROLLBACK_TO${NC} (Port: $ROLLBACK_PORT)"
print_info "Previous environment: ${BOLD}$CURRENT_ENV${NC} (Port: $CURRENT_PORT) - still running"
echo ""
print_info "You can stop the previous environment with: pm2 stop $CURRENT_APP"
echo ""
