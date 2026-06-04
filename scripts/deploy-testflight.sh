#!/bin/bash

# Deploy to TestFlight Script
# This script builds and submits the iOS app to TestFlight

set -e  # Exit on any error

echo "🚀 Starting TestFlight deployment..."
echo ""

# Check if we're on a clean git state
if [[ -n $(git status -s) ]]; then
  echo "⚠️  Warning: You have uncommitted changes."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
  fi
fi

# Get current version from app.json
VERSION=$(node -p "require('./app.json').expo.version")
BUILD_NUMBER=$(node -p "require('./app.json').expo.ios.buildNumber")
echo "📦 Current version: $VERSION (build $BUILD_NUMBER)"
echo ""

# Sync app.json version/build number into the native iOS project. EAS reads the
# build number from Info.plist (appVersionSource: local + committed ios/ dir),
# so without this an app.json bump is ignored and you resubmit a duplicate build.
echo "🔁 Syncing version to native project..."
npm run sync-version
echo ""

# Build the app
echo "🔨 Building iOS app..."
npx eas-cli build --platform ios --profile production --non-interactive

# Wait for build to complete and get build ID
echo ""
echo "⏳ Waiting for build to complete..."
BUILD_ID=$(npx eas-cli build:list --platform ios --limit 1 --json | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin').toString())[0].id")

echo "✅ Build completed: $BUILD_ID"
echo ""

# Submit to TestFlight
echo "📤 Submitting to TestFlight..."
npx eas-cli submit --platform ios --profile production --latest --non-interactive

echo ""
echo "✅ Successfully submitted to TestFlight!"
echo ""
echo "Next steps:"
echo "1. Go to https://appstoreconnect.apple.com"
echo "2. Navigate to your app → TestFlight tab"
echo "3. Wait for Apple to process the build (~5-15 minutes)"
echo "4. Add testers and start testing!"
echo ""
echo "🎉 Deployment complete!"
