#!/bin/bash

# ============================================
# Fix Blue-Green Port Configuration
# ============================================
# This script stops and restarts both environments
# with correct port configurations
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Fixing Blue-Green Environment Ports${NC}"
echo ""

# Stop both environments
echo -e "${YELLOW}Stopping existing environments...${NC}"
pm2 stop spryclips-blue 2>/dev/null || true
pm2 stop spryclips-green 2>/dev/null || true
pm2 stop spryclips-backend 2>/dev/null || true
pm2 delete spryclips-blue 2>/dev/null || true
pm2 delete spryclips-green 2>/dev/null || true
pm2 delete spryclips-backend 2>/dev/null || true

cd ~/Tiktok_clone/backend

echo ""
echo -e "${GREEN}Starting Blue environment on port 5000...${NC}"
NODE_ENV=production \
PORT=5000 \
MONGODB_URI="mongodb+srv://admin:tR0hD8ODPxICuafh@ac-xotupu2.q6qrciv.mongodb.net/spryclips?retryWrites=true&w=majority" \
JWT_SECRET="spryclips-secret-key" \
FRONTEND_URL="https://spryclips.com" \
ALLOWED_ORIGINS="https://spryclips.com,https://www.spryclips.com,http://spryclips.com,http://www.spryclips.com,https://spryclip.com,https://www.spryclip.com" \
TRUST_PROXY="true" \
UPLOADS_DIR="/home/reactmaster/uploads" \
pm2 start index.js --name spryclips-blue --max-memory-restart 1G --update-env

echo ""
echo -e "${GREEN}Starting Green environment on port 5001...${NC}"
NODE_ENV=production \
PORT=5001 \
MONGODB_URI="mongodb+srv://admin:tR0hD8ODPxICuafh@ac-xotupu2.q6qrciv.mongodb.net/spryclips?retryWrites=true&w=majority" \
JWT_SECRET="spryclips-secret-key" \
FRONTEND_URL="https://spryclips.com" \
ALLOWED_ORIGINS="https://spryclips.com,https://www.spryclips.com,http://spryclips.com,http://www.spryclips.com,https://spryclip.com,https://www.spryclip.com" \
TRUST_PROXY="true" \
UPLOADS_DIR="/home/reactmaster/uploads" \
pm2 start index.js --name spryclips-green --max-memory-restart 1G --update-env

pm2 save

echo ""
echo -e "${GREEN}✓ Both environments started successfully!${NC}"
echo ""
echo "Testing..."
sleep 3
echo ""
echo "Blue (5000):"
curl -I http://127.0.0.1:5000/api/health 2>/dev/null | head -n 1
echo ""
echo "Green (5001):"
curl -I http://127.0.0.1:5001/api/health 2>/dev/null | head -n 1
echo ""
echo -e "${GREEN}Done! Check which port nginx is using and update .deployment-state accordingly.${NC}"
