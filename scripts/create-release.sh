#!/bin/bash

# Obsidian Plugin Release Script
# This script automates the release process for Obsidian plugins
# It ensures the three required files (main.js, manifest.json, styles.css) are built and tagged correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Obsidian Plugin Release Script${NC}"
echo "================================"

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
  exit 1
fi

# Extract version from manifest.json
VERSION=$(node -p "require('./manifest.json').version")
echo -e "${YELLOW}Version from manifest.json: ${VERSION}${NC}"

# Confirm version
read -p "Create release for version ${VERSION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Release cancelled."
  exit 0
fi

# Run lint
echo -e "${GREEN}Running lint...${NC}"
npm run lint

# Build the plugin
echo -e "${GREEN}Building plugin...${NC}"
npm run build

# Verify required files exist
if [ ! -f "main.js" ] || [ ! -f "manifest.json" ] || [ ! -f "styles.css" ]; then
  echo -e "${RED}Error: Required files missing. Ensure main.js, manifest.json, and styles.css exist.${NC}"
  exit 1
fi

echo -e "${GREEN}All required files present:${NC}"
echo "  ✓ main.js ($(wc -c < main.js) bytes)"
echo "  ✓ manifest.json ($(wc -c < manifest.json) bytes)"
echo "  ✓ styles.css ($(wc -c < styles.css) bytes)"

# Check if tag already exists
if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo -e "${RED}Error: Tag ${VERSION} already exists.${NC}"
  echo "Please update the version in manifest.json and versions.json first."
  exit 1
fi

# Create and push tag (NO 'v' prefix - must match manifest.json exactly)
echo -e "${GREEN}Creating tag ${VERSION}...${NC}"
git tag "$VERSION"
git push origin "$VERSION"

echo -e "${GREEN}Release tag created and pushed!${NC}"
echo "GitHub Actions will now build and create the release automatically."
echo "The release will include: main.js, manifest.json, styles.css"
echo ""
echo -e "${YELLOW}View release at: https://github.com/$(git config --get remote.origin.url | sed 's/.*://; s/.git$//')/releases/tag/${VERSION}${NC}"
