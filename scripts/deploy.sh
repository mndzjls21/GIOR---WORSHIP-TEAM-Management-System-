#!/bin/bash

# Deployment / Setup Utility Script
# This shell script is provided as a utility for manual deployment or CI/CD pipelines.
# It does not affect the core application runtime.

echo "Starting deployment sequence..."

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "npm could not be found. Please install Node.js."
    exit 1
fi

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

echo "Deployment build completed successfully."
echo "Artifacts are ready in the dist/ directory."

# Optional: Add your custom server upload logic here
# scp -r dist/* user@server:/var/www/html/
