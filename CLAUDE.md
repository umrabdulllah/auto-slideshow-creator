# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Auto Slideshow Creator is an Adobe Premiere Pro CEP (Common Extensibility Platform) extension that automatically creates slideshows from images synchronized to voiceover audio.

## Architecture

```
image-place-premiere/
├── CSXS/manifest.xml      # Extension metadata, version, host app config
├── jsx/hostscript.jsx     # ExtendScript - Premiere Pro API (ES3 JavaScript)
├── js/main.js             # Panel UI logic (modern JavaScript)
├── js/CSInterface.js      # Adobe CEP bridge for JS↔ExtendScript communication
├── index.html             # Panel UI (dark theme)
└── .debug                 # Debug port configuration
```

**Data Flow:** `index.html` → `main.js` → `CSInterface.evalScript()` → `hostscript.jsx` → Premiere Pro API

## Key Technical Constraints

- **ExtendScript (hostscript.jsx)**: ES3-based JavaScript - no `let`/`const`, no arrow functions, no template literals, no `JSON.parse()` (use `eval()` carefully)
- **Version sync required**: Update version in THREE places when releasing:
  1. `CSXS/manifest.xml` - `ExtensionBundleVersion` attribute
  2. `CSXS/manifest.xml` - `<Extension Version>` element
  3. `index.html` - `<span class="version">` display

## Installation & Testing

**IMPORTANT:** After making ANY code changes, always reinstall the extension by running:

```bash
cp -r /Users/umerabdullah/Documents/Projects/image-place-premiere/* \
  ~/Library/Application\ Support/Adobe/CEP/extensions/AutoSlideshow/
```

```bash
# Enable debug mode (required once)
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

# Restart Premiere Pro after installation
```

**Debug:** Open Chrome DevTools at `localhost:8093` (port from `.debug` file)

## Premiere Pro API Patterns

```javascript
// Get active sequence
var sequence = app.project.activeSequence;

// Place clip on timeline
videoTrack.overwriteClip(projectItem, timeInSeconds);

// Access Motion effect → Scale property
var motion = clip.components.getByName("Motion");
var scale = motion.properties.getByName("Scale");
scale.setValue([105, 105], true);  // 105% scale

// Import files
app.project.importFiles(filePathsArray, true, app.project.rootItem, false);
```

## Extension Workflow

1. User selects folder with `images/` and `voiceovers/` subfolders (optional: `subtitles/`)
2. Script reads voice duration and counts images
3. Calculates: `voiceDuration / imageCount = secondsPerImage`
4. Places images alternating V1↔V2 tracks, voice on A1
5. Sets each image scale to 105%

## Folder Structure

**Source folder (user selects):**
```
project-folder/
├── images/        # Required - image files
├── voiceovers/    # Required - audio file
└── subtitles/     # Optional - SRT file
```

**Premiere Pro Project Panel (after import):**
```
Auto Slideshow/
└── [project-folder]/
    ├── Images/
    ├── Voiceovers/
    └── Captions/
```
