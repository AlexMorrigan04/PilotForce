#!/bin/bash

# Stop on first error
set -e

echo "Building PilotForce for production..."

# Ensure we're using the right Node.js version
if command -v nvm &> /dev/null; then
  nvm use 16
fi

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run security checks
echo "Running security checks..."
npm audit --production
npm run lint

# Run tests
echo "Running tests..."
CI=true npm test

# Build for production
echo "Building production bundle..."
npm run build:production

# Analyze bundle size
echo "Analyzing bundle size..."
npm run analyze

echo "Production build completed successfully!"
echo "The build artifacts are located in the 'build/' directory."
