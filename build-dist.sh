#!/bin/bash

# Auto Slideshow Creator - Distribution Build Script
# Run this script to create a distributable ZIP package

set -e  # Exit on error

# Get script directory (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=============================================="
echo "  Auto Slideshow Creator - Build Distribution"
echo "=============================================="
echo ""

# Extract version from manifest.xml
VERSION=$(grep 'ExtensionBundleVersion=' CSXS/manifest.xml | sed 's/.*ExtensionBundleVersion="\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "ERROR: Could not extract version from manifest.xml"
    exit 1
fi

echo "Building version: $VERSION"
echo ""

# Define paths
DIST_DIR="$SCRIPT_DIR/dist"
PACKAGE_NAME="AutoSlideshowCreator-v$VERSION"
PACKAGE_DIR="$DIST_DIR/$PACKAGE_NAME"
EXTENSION_DIR="$PACKAGE_DIR/AutoSlideshow"
ZIP_FILE="$DIST_DIR/$PACKAGE_NAME.zip"

# Step 1: Clean previous build
echo "[1/6] Cleaning previous build..."
rm -rf "$PACKAGE_DIR"
rm -f "$ZIP_FILE"

# Step 2: Create directory structure
echo "[2/6] Creating directory structure..."
mkdir -p "$EXTENSION_DIR/CSXS"
mkdir -p "$EXTENSION_DIR/js"
mkdir -p "$EXTENSION_DIR/jsx"

# Step 3: Copy extension files
echo "[3/6] Copying extension files..."
cp "$SCRIPT_DIR/index.html" "$EXTENSION_DIR/"
cp "$SCRIPT_DIR/.debug" "$EXTENSION_DIR/"
cp "$SCRIPT_DIR/CSXS/manifest.xml" "$EXTENSION_DIR/CSXS/"
cp "$SCRIPT_DIR/js/main.js" "$EXTENSION_DIR/js/"
cp "$SCRIPT_DIR/js/CSInterface.js" "$EXTENSION_DIR/js/"
cp "$SCRIPT_DIR/jsx/hostscript.jsx" "$EXTENSION_DIR/jsx/"

# Step 4: Copy installer scripts and documentation
echo "[4/6] Copying installer scripts..."
cp "$DIST_DIR/install-mac.command" "$PACKAGE_DIR/"
cp "$DIST_DIR/install-windows.bat" "$PACKAGE_DIR/"
cp "$DIST_DIR/README.txt" "$PACKAGE_DIR/"
cp "$DIST_DIR/UNINSTALL.txt" "$PACKAGE_DIR/"

# Step 5: Set permissions
echo "[5/6] Setting permissions..."
chmod +x "$PACKAGE_DIR/install-mac.command"

# Step 6: Create ZIP archive
echo "[6/6] Creating ZIP archive..."
cd "$DIST_DIR"
zip -r -q "$PACKAGE_NAME.zip" "$PACKAGE_NAME"
cd "$SCRIPT_DIR"

# Calculate ZIP size
ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)

echo ""
echo "=============================================="
echo "  BUILD SUCCESSFUL!"
echo "=============================================="
echo ""
echo "Output: $ZIP_FILE"
echo "Size:   $ZIP_SIZE"
echo ""
echo "To distribute:"
echo "  1. Share the ZIP file with users"
echo "  2. Users extract and run the installer for their OS"
echo ""
