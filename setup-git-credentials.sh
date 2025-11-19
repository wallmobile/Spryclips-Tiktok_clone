#!/bin/bash

# Git Credentials Setup Script
# ⚠️ RUN THIS ONCE ON THE SERVER, THEN DELETE THIS FILE
# This stores credentials in ~/.git-credentials (secure on your server)

set -e

echo "Setting up Git credentials..."

# Your GitHub username
GIT_USERNAME="srvfoods"

# Your GitHub token (replace with your NEW token after revoking the old one)
# ⚠️ REVOKE THE OLD TOKEN: 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
# Generate new token at: https://github.com/settings/tokens
GIT_TOKEN="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"

# Configure git credential helper
git config --global credential.helper store

# Set up the credentials file with proper format
echo "https://${GIT_USERNAME}:${GIT_TOKEN}@github.com" > ~/.git-credentials

# Set file permissions (owner read/write only)
chmod 600 ~/.git-credentials

# Set git user config
git config --global user.name "$GIT_USERNAME"
git config --global user.email "your-email@example.com"

echo "✓ Git credentials configured successfully!"
echo "✓ Credentials stored in: ~/.git-credentials"
echo ""
echo "⚠️ IMPORTANT: Delete this setup script now for security!"
echo "   Run: rm -f setup-git-credentials.sh"
echo ""
echo "Test with: cd ~/Tiktok_clone && git pull origin intial-code"
