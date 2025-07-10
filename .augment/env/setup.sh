#!/bin/bash

# Angular FAQ System Setup Script
set -e

echo "Setting up Angular FAQ System environment..."

# Update system packages
sudo apt-get update

# Install Node.js 18 (LTS) and npm
echo "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js and npm installation
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install Google Chrome for Karma testing
echo "Installing Google Chrome for testing..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install Angular CLI globally
echo "Installing Angular CLI..."
npm install -g @angular/cli@15.2.9

# Add npm global binaries to PATH
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> $HOME/.profile
echo 'export PATH="/usr/local/lib/node_modules/.bin:$PATH"' >> $HOME/.profile
export PATH="$HOME/.npm-global/bin:$PATH"
export PATH="/usr/local/lib/node_modules/.bin:$PATH"

# Configure npm to use a global directory in home
mkdir -p $HOME/.npm-global
npm config set prefix '$HOME/.npm-global'

# Navigate to workspace and install dependencies
cd /mnt/persist/workspace

echo "Installing project dependencies..."
npm ci

# Verify Angular CLI installation
echo "Angular CLI version: $(ng version --skip-git 2>/dev/null || echo 'Angular CLI installed')"

echo "Setup completed successfully!"
echo "Environment is ready for Angular development and testing."