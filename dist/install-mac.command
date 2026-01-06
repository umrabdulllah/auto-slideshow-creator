#!/bin/bash

# Auto Slideshow Creator - macOS Installer
# Double-click this file to install the extension

clear
echo "=============================================="
echo "  Auto Slideshow Creator - Installer"
echo "  Adobe Premiere Pro Extension"
echo "=============================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXTENSION_SOURCE="$SCRIPT_DIR/AutoSlideshow"

# Define target installation path
TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/AutoSlideshow"

echo "[1/4] Checking extension files..."
if [ ! -d "$EXTENSION_SOURCE" ]; then
    echo ""
    echo "ERROR: Extension folder not found!"
    echo "Expected location: $EXTENSION_SOURCE"
    echo ""
    echo "Make sure the 'AutoSlideshow' folder is in the same directory as this installer."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi
echo "      Extension files found."

echo "[2/4] Installing extension..."
# Create parent directories if they don't exist
mkdir -p "$(dirname "$TARGET_DIR")"

# Remove existing installation if present
if [ -d "$TARGET_DIR" ]; then
    echo "      Removing previous installation..."
    rm -rf "$TARGET_DIR"
fi

# Copy extension to target
cp -R "$EXTENSION_SOURCE" "$TARGET_DIR"

if [ $? -eq 0 ]; then
    echo "      Extension installed successfully."
else
    echo ""
    echo "ERROR: Failed to copy extension files."
    echo "Please check permissions and try again."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[3/4] Enabling extension loading..."
# Enable PlayerDebugMode for CSXS 11 and 12 (Premiere Pro 2021-2025)
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

# Refresh preferences cache
killall cfprefsd 2>/dev/null
echo "      Debug mode enabled for Adobe CEP."

echo "[4/4] Installation complete!"
echo ""
echo "=============================================="
echo "  SUCCESS!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Quit Adobe Premiere Pro if it's running"
echo "  2. Reopen Premiere Pro"
echo "  3. Go to: Window > Extensions > Auto Slideshow Creator"
echo ""
echo "If the extension doesn't appear, try restarting"
echo "your computer and reopening Premiere Pro."
echo ""
read -p "Press Enter to close this window..."
