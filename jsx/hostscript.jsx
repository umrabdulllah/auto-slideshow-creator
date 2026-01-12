/**
 * Auto Slideshow Creator - ExtendScript Host Script
 * Premiere Pro CEP Extension
 *
 * This script handles all Premiere Pro API interactions:
 * - Folder selection and validation
 * - File import (images and audio)
 * - Timeline placement with alternating tracks
 * - Duration calculation and clip sizing
 */

// ============================================================
// DEBUG LOGGING
// ============================================================

var DEBUG_LOG_PATH = "/Users/umerabdullah/Documents/Projects/image-place-premiere/slideshow-debug.log";
var debugLogLines = [];

/**
 * Initialize debug log - clears previous log
 */
function debugLogInit() {
    debugLogLines = [];
    debugLogLines.push("=".repeat(80));
    debugLogLines.push("SLIDESHOW DEBUG LOG - " + new Date().toString());
    debugLogLines.push("=".repeat(80));
}

/**
 * Add a line to the debug log
 */
function debugLog(message) {
    debugLogLines.push(message);
}

/**
 * Write debug log to file
 */
function debugLogWrite() {
    try {
        var logFile = new File(DEBUG_LOG_PATH);
        logFile.encoding = "UTF-8";
        logFile.open("w");
        logFile.write(debugLogLines.join("\n"));
        logFile.close();
    } catch (e) {
        // Silently fail if can't write log
    }
}

/**
 * ES3 compatible string repeat
 */
String.prototype.repeat = function(count) {
    var result = "";
    for (var i = 0; i < count; i++) {
        result += this;
    }
    return result;
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if array contains a value (ES3 compatible)
 */
function arrayContains(arr, value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return true;
    }
    return false;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename) {
    var match = filename.toLowerCase().match(/\.[^\.]+$/);
    return match ? match[0] : '';
}

/**
 * Natural sort comparison for filenames
 */
function naturalSort(a, b) {
    var aName = a.name || a;
    var bName = b.name || b;

    var re = /(\d+)/g;
    var aParts = aName.split(re);
    var bParts = bName.split(re);

    for (var i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        var aPart = aParts[i];
        var bPart = bParts[i];

        // Check if both parts are numbers
        var aNum = parseInt(aPart, 10);
        var bNum = parseInt(bPart, 10);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            if (aNum !== bNum) return aNum - bNum;
        } else {
            if (aPart < bPart) return -1;
            if (aPart > bPart) return 1;
        }
    }

    return aName.length - bName.length;
}

/**
 * Create a bin if it doesn't already exist in the parent bin
 * @param {ProjectItem} parentBin - The parent bin to search/create in
 * @param {string} binName - Name of the bin to find or create
 * @returns {ProjectItem} The existing or newly created bin
 */
function createBinIfNotExists(parentBin, binName) {
    // Search for existing bin with matching name
    for (var i = 0; i < parentBin.children.numItems; i++) {
        var item = parentBin.children[i];
        if (item.type === 2 && item.name === binName) {
            return item;
        }
    }
    // Create new bin
    return parentBin.createBin(binName);
}

/**
 * Create bin hierarchy for organized slideshow media
 * Structure: Auto Slideshow / [Project Name] / Images, Voiceovers, Captions
 * @param {string} projectFolderName - Name of the project folder
 * @returns {object} Object with bin references
 */
function createSlideshowBins(projectFolderName) {
    var rootBin = app.project.rootItem;
    var autoSlideshowBin = createBinIfNotExists(rootBin, "Auto Slideshow");
    var projectBin = createBinIfNotExists(autoSlideshowBin, projectFolderName);
    var imagesBin = createBinIfNotExists(projectBin, "Images");
    var voiceoversBin = createBinIfNotExists(projectBin, "Voiceovers");
    var captionsBin = createBinIfNotExists(projectBin, "Captions");

    return {
        images: imagesBin,
        voiceovers: voiceoversBin,
        captions: captionsBin
    };
}

/**
 * Get sequence frame rate as a number
 * @param {Sequence} sequence - The active sequence
 * @returns {number} Frame rate (e.g., 29.97, 30, 60)
 */
function getSequenceFrameRate(sequence) {
    // sequence.timebase returns ticks per frame
    // 254016000000 ticks per second is Premiere's internal base
    var ticksPerSecond = 254016000000;
    var ticksPerFrame = sequence.timebase;
    return ticksPerSecond / ticksPerFrame;
}

/**
 * Calculate randomized durations using FRAME-BASED integer arithmetic
 * Returns frame counts (integers) to avoid floating-point accumulation errors
 * Guarantees: sum of all frame counts exactly equals total frames
 * @param {number} totalDuration - Total duration to fill (voice duration in seconds)
 * @param {number} imageCount - Number of images to distribute time across
 * @param {number} maxVariation - Maximum variation from base duration (e.g., 2 for ±2 seconds)
 * @param {number} frameRate - Sequence frame rate (e.g., 30, 29.97, 60)
 * @returns {Array} Array of frame counts (integers)
 */
function calculateRandomDurations(totalDuration, imageCount, maxVariation, frameRate) {
    // Convert total duration to frames (integer)
    var totalFrames = Math.round(totalDuration * frameRate);
    var baseFrames = Math.floor(totalFrames / imageCount);
    var extraFrames = totalFrames - (baseFrames * imageCount);

    // Start with base frames for all images
    var frameCounts = [];
    for (var i = 0; i < imageCount; i++) {
        frameCounts.push(baseFrames);
    }

    // Distribute extra frames evenly across first N images
    for (var e = 0; e < extraFrames; e++) {
        frameCounts[e]++;
    }

    // Calculate safe variation in frames
    var maxVarFrames = Math.round(maxVariation * frameRate);
    var minFrames = Math.max(Math.round(frameRate * 0.5), 1); // Min 0.5 seconds or 1 frame
    var safeMaxVarFrames = Math.min(maxVarFrames, baseFrames - minFrames);
    if (safeMaxVarFrames < 0) safeMaxVarFrames = 0;

    // Apply random variation if enabled and more than 1 image
    if (safeMaxVarFrames > 0 && imageCount > 1) {
        // Generate random offsets (integers)
        var offsets = [];
        var totalOffset = 0;
        for (var r = 0; r < imageCount; r++) {
            var offset = Math.round((Math.random() * 2 - 1) * safeMaxVarFrames);
            offsets.push(offset);
            totalOffset += offset;
        }

        // Subtract mean (rounded) to balance offsets
        var adjustment = Math.round(totalOffset / imageCount);
        for (var a = 0; a < imageCount; a++) {
            offsets[a] -= adjustment;
        }

        // Apply offsets and track new total
        var newTotal = 0;
        for (var t = 0; t < imageCount; t++) {
            frameCounts[t] += offsets[t];
            // Ensure no negative or zero frame counts
            if (frameCounts[t] < 1) frameCounts[t] = 1;
            newTotal += frameCounts[t];
        }

        // Correct last image to ensure exact total frames
        // This eliminates any remaining drift from rounding
        frameCounts[imageCount - 1] += (totalFrames - newTotal);
    }

    // Return frame counts (integers) - NOT converted to seconds
    // This avoids floating-point accumulation errors
    return frameCounts;
}

/**
 * Extract folder name from a full path
 * @param {string} folderPath - Full path to folder
 * @returns {string} Just the folder name
 */
function getFolderName(folderPath) {
    // Handle both forward and back slashes
    var parts = folderPath.split('/');
    if (parts.length === 1) {
        parts = folderPath.split('\\');
    }
    // Get last non-empty part
    for (var i = parts.length - 1; i >= 0; i--) {
        if (parts[i] && parts[i].length > 0) {
            return parts[i];
        }
    }
    return "Slideshow";
}

// ============================================================
// FOLDER AND FILE OPERATIONS
// ============================================================

/**
 * Open folder selection dialog
 * @returns {string|null} Selected folder path or null if cancelled
 */
function selectFolder() {
    var folder = Folder.selectDialog("Select project folder containing 'images' and 'voiceovers' subfolders");
    if (folder) {
        return folder.fsName;
    }
    return null;
}

/**
 * Validate folder structure has required subfolders
 * @param {string} folderPath - Path to project folder
 * @returns {string} JSON result with validation status
 */
function validateFolderStructure(folderPath) {
    var folder = new Folder(folderPath);
    var imagesFolder = new Folder(folderPath + "/images");
    var voiceoversFolder = new Folder(folderPath + "/voiceovers");

    var result = {
        valid: imagesFolder.exists && voiceoversFolder.exists,
        folderExists: folder.exists,
        imagesExists: imagesFolder.exists,
        voiceoversExists: voiceoversFolder.exists
    };

    if (!result.valid) {
        if (!imagesFolder.exists && !voiceoversFolder.exists) {
            result.error = "Missing both 'images' and 'voiceovers' folders";
        } else if (!imagesFolder.exists) {
            result.error = "Missing 'images' folder";
        } else {
            result.error = "Missing 'voiceovers' folder";
        }
    }

    return JSON.stringify(result);
}

/**
 * Get voice/audio file from voiceovers folder
 * @param {string} folderPath - Path to project folder
 * @returns {object|null} Voice file info or null
 */
function getVoiceFileInfo(folderPath) {
    var voiceoversFolder = new Folder(folderPath + "/voiceovers");
    if (!voiceoversFolder.exists) return null;

    var audioExtensions = [".mp3", ".wav", ".aac", ".m4a", ".aiff", ".aif", ".ogg", ".flac"];
    var files = voiceoversFolder.getFiles();

    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof File) {
            var ext = getFileExtension(files[i].name);
            if (arrayContains(audioExtensions, ext)) {
                return {
                    path: files[i].fsName,
                    name: files[i].name
                };
            }
        }
    }
    return null;
}

/**
 * Get SRT subtitle file from subtitles folder
 * @param {string} folderPath - Path to project folder
 * @returns {object|null} SRT file info or null
 */
function getSrtFileInfo(folderPath) {
    var subtitlesFolder = new Folder(folderPath + "/subtitles");
    if (!subtitlesFolder.exists) return null;

    var files = subtitlesFolder.getFiles("*.srt");
    if (files.length > 0 && files[0] instanceof File) {
        return {
            path: files[0].fsName,
            name: files[0].name
        };
    }
    return null;
}

/**
 * Get all image files from images folder
 * @param {string} folderPath - Path to project folder
 * @returns {Array} Array of image file paths (sorted)
 */
function getImageFiles(folderPath) {
    var imagesFolder = new Folder(folderPath + "/images");
    if (!imagesFolder.exists) return [];

    var imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".tif"];
    var files = imagesFolder.getFiles();
    var images = [];

    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof File) {
            var ext = getFileExtension(files[i].name);
            if (arrayContains(imageExtensions, ext)) {
                images.push(files[i]);
            }
        }
    }

    // Sort images naturally (1, 2, 10 not 1, 10, 2)
    images.sort(naturalSort);

    // Return just the paths
    var imagePaths = [];
    for (var j = 0; j < images.length; j++) {
        imagePaths.push(images[j].fsName);
    }

    return imagePaths;
}

/**
 * Get preview information for the selected folder
 * @param {string} folderPath - Path to project folder
 * @returns {string} JSON with preview info
 */
function getPreviewInfo(folderPath) {
    var result = {
        valid: false,
        voiceName: null,
        voicePath: null,
        imageCount: 0,
        imagePaths: [],
        srtName: null,
        srtPath: null,
        error: null
    };

    // Validate folder structure
    var validation = JSON.parse(validateFolderStructure(folderPath));
    if (!validation.valid) {
        result.error = validation.error;
        return JSON.stringify(result);
    }

    // Get voice file
    var voiceInfo = getVoiceFileInfo(folderPath);
    if (!voiceInfo) {
        result.error = "No audio file found in 'voices' folder";
        return JSON.stringify(result);
    }
    result.voiceName = voiceInfo.name;
    result.voicePath = voiceInfo.path;

    // Get images
    var imagePaths = getImageFiles(folderPath);
    if (imagePaths.length === 0) {
        result.error = "No image files found in 'images' folder";
        return JSON.stringify(result);
    }
    result.imageCount = imagePaths.length;
    result.imagePaths = imagePaths;

    // Get SRT file (optional)
    var srtInfo = getSrtFileInfo(folderPath);
    if (srtInfo) {
        result.srtName = srtInfo.name;
        result.srtPath = srtInfo.path;
    }

    result.valid = true;
    return JSON.stringify(result);
}

// ============================================================
// PROJECT ITEM OPERATIONS
// ============================================================

/**
 * Find a project item by its media path
 * @param {string} filePath - Full path to the media file
 * @returns {ProjectItem|null} The project item or null
 */
function findProjectItemByPath(filePath) {
    function searchInBin(bin) {
        for (var i = 0; i < bin.children.numItems; i++) {
            var item = bin.children[i];
            if (item.type === 2) { // Bin
                var found = searchInBin(item);
                if (found) return found;
            } else {
                try {
                    var mediaPath = item.getMediaPath();
                    if (mediaPath === filePath) {
                        return item;
                    }
                } catch (e) {
                    // Item might not have media path
                }
            }
        }
        return null;
    }

    return searchInBin(app.project.rootItem);
}

/**
 * Import files into the project
 * @param {Array} filePaths - Array of file paths to import
 * @returns {boolean} Success status
 */
function importFilesToProject(filePaths) {
    try {
        app.project.importFiles(filePaths, true, app.project.rootItem, false);
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
// MAIN SLIDESHOW CREATION
// ============================================================

/**
 * Create the slideshow on the timeline
 * @param {string} folderPath - Path to project folder
 * @param {number} maxVariation - Maximum duration variation in seconds (default: 2)
 * @param {number} preferredFrameRate - Fallback frame rate if sequence rate unavailable (default: 30)
 * @returns {string} JSON result
 */
function createSlideshow(folderPath, maxVariation, preferredFrameRate) {
    // Default to 2 seconds variation if not provided
    if (typeof maxVariation === 'undefined' || maxVariation === null) {
        maxVariation = 2;
    }
    // Default to 30fps if not provided
    if (typeof preferredFrameRate === 'undefined' || preferredFrameRate === null) {
        preferredFrameRate = 30;
    }
    var result = {
        success: false,
        voiceDuration: 0,
        imageCount: 0,
        secondsPerImage: 0,
        error: null
    };

    // Initialize debug logging
    debugLogInit();
    debugLog("createSlideshow() called");
    debugLog("folderPath: " + folderPath);
    debugLog("maxVariation: " + maxVariation);
    debugLog("preferredFrameRate: " + preferredFrameRate);
    debugLog("");

    try {
        // 1. Check for active sequence
        var sequence = app.project.activeSequence;
        if (!sequence) {
            result.error = "No active sequence. Please create or open a sequence first.";
            debugLog("ERROR: " + result.error);
            debugLogWrite();
            return JSON.stringify(result);
        }

        debugLog("Sequence: " + sequence.name);

        // 2. Check for at least 2 video tracks
        if (sequence.videoTracks.numTracks < 2) {
            result.error = "Sequence needs at least 2 video tracks. Please add another video track.";
            debugLog("ERROR: " + result.error);
            debugLogWrite();
            return JSON.stringify(result);
        }

        // 2b. Get sequence frame rate (use preferred as fallback)
        var frameRate = preferredFrameRate;
        try {
            frameRate = getSequenceFrameRate(sequence);
        } catch (e) {
            // Fall back to preferred frame rate
        }

        debugLog("");
        debugLog("SEQUENCE INFO:");
        debugLog("  frameRate: " + frameRate);
        debugLog("  timebase (ticksPerFrame): " + sequence.timebase);
        debugLog("  TICKS_PER_SECOND constant: 254016000000");

        // 3. Get preview info (validates folder and gets file lists)
        var previewInfo = JSON.parse(getPreviewInfo(folderPath));
        if (!previewInfo.valid) {
            result.error = previewInfo.error;
            return JSON.stringify(result);
        }

        // 4. Create bin hierarchy for organized media
        var projectFolderName = getFolderName(folderPath);
        var bins = createSlideshowBins(projectFolderName);

        // 5. Import files into their respective bins
        try {
            app.project.importFiles(previewInfo.imagePaths, true, bins.images, false);

            // Only import voiceover if not already imported (from preview phase)
            var existingVoice = findProjectItemByPath(previewInfo.voicePath);
            if (!existingVoice) {
                app.project.importFiles([previewInfo.voicePath], true, bins.voiceovers, false);
            }
        } catch (e) {
            result.error = "Failed to import files into project: " + e.toString();
            return JSON.stringify(result);
        }

        // Small delay to ensure import completes
        $.sleep(500);

        // 5. Find imported voice item
        var voiceItem = findProjectItemByPath(previewInfo.voicePath);
        if (!voiceItem) {
            result.error = "Could not find imported voice file in project.";
            return JSON.stringify(result);
        }

        // 6. Get voice duration
        var voiceOutPoint = voiceItem.getOutPoint();
        var voiceDuration = voiceOutPoint.seconds;
        debugLog("");
        debugLog("VOICE DURATION:");
        debugLog("  voiceOutPoint.seconds: " + voiceDuration);
        debugLog("  voiceOutPoint.ticks: " + voiceOutPoint.ticks);
        if (voiceDuration <= 0) {
            result.error = "Voice file has no duration or could not be read.";
            debugLog("ERROR: " + result.error);
            debugLogWrite();
            return JSON.stringify(result);
        }

        // 7. Find imported image items
        var imageItems = [];
        for (var i = 0; i < previewInfo.imagePaths.length; i++) {
            var imgItem = findProjectItemByPath(previewInfo.imagePaths[i]);
            if (imgItem) {
                imageItems.push(imgItem);
            }
        }

        if (imageItems.length === 0) {
            result.error = "Could not find imported images in project.";
            return JSON.stringify(result);
        }

        // 8. Calculate randomized frame counts for each image (integers)
        var frameCounts = calculateRandomDurations(voiceDuration, imageItems.length, maxVariation, frameRate);
        var secondsPerImage = voiceDuration / imageItems.length; // Keep average for response

        debugLog("");
        debugLog("FRAME COUNTS CALCULATED:");
        debugLog("  imageCount: " + imageItems.length);
        debugLog("  secondsPerImage (avg): " + secondsPerImage);
        var totalFrames = 0;
        for (var fc = 0; fc < frameCounts.length; fc++) {
            totalFrames += frameCounts[fc];
        }
        debugLog("  totalFrames: " + totalFrames);
        debugLog("  expectedFrames: " + Math.round(voiceDuration * frameRate));
        debugLog("  frameCounts: [" + frameCounts.join(", ") + "]");

        // 9. Place voice on audio track A1
        var audioTrack = sequence.audioTracks[0];
        audioTrack.overwriteClip(voiceItem, 0);

        // 10. Place images alternating between V1 and V2 with individual durations
        var videoTrack1 = sequence.videoTracks[0]; // V1 - odd images (1, 3, 5...)
        var videoTrack2 = sequence.videoTracks[1]; // V2 - even images (2, 4, 6...)

        // Use tick-based integer arithmetic to avoid floating-point accumulation errors
        // Premiere Pro uses 254016000000 ticks per second internally
        var TICKS_PER_SECOND = 254016000000;
        var ticksPerFrame = sequence.timebase; // Ticks per frame from sequence

        debugLog("");
        debugLog("PLACEMENT LOOP:");
        debugLog("  TICKS_PER_SECOND: " + TICKS_PER_SECOND);
        debugLog("  ticksPerFrame: " + ticksPerFrame);
        debugLog("");

        var currentTicks = 0; // Track position in ticks (integer) - no floating point error
        for (var j = 0; j < imageItems.length; j++) {
            var targetTrack = (j % 2 === 0) ? videoTrack1 : videoTrack2;
            var trackName = (j % 2 === 0) ? "V1" : "V2";
            var clipFrames = frameCounts[j];
            var clipTicks = clipFrames * ticksPerFrame;

            // Convert to seconds for setOutPoint API (second param 4 is mediaType, not time unit)
            var clipDurationSeconds = clipTicks / TICKS_PER_SECOND;

            // Calculate position in seconds for placement
            var positionSeconds = currentTicks / TICKS_PER_SECOND;

            debugLog("Image " + (j + 1) + " (" + imageItems[j].name + "):");
            debugLog("  track: " + trackName);
            debugLog("  clipFrames: " + clipFrames);
            debugLog("  clipTicks: " + clipTicks);
            debugLog("  clipDurationSeconds: " + clipDurationSeconds);
            debugLog("  currentTicks (before): " + currentTicks);
            debugLog("  positionSeconds: " + positionSeconds);

            // Convert ticks to EXACT frame-based seconds (avoid repeating decimals)
            // clipFrames / frameRate gives exact frame-aligned seconds
            var exactDurationSeconds = clipFrames / frameRate;
            var exactPositionFrames = currentTicks / ticksPerFrame;
            var exactPositionSeconds = exactPositionFrames / frameRate;

            debugLog("  exactDurationSeconds: " + exactDurationSeconds);
            debugLog("  exactPositionFrames: " + exactPositionFrames);
            debugLog("  exactPositionSeconds: " + exactPositionSeconds);

            // Set the source in/out points in seconds
            imageItems[j].setInPoint(0, 4);
            imageItems[j].setOutPoint(exactDurationSeconds, 4);

            // Place on timeline using frame-based seconds
            targetTrack.overwriteClip(imageItems[j], exactPositionSeconds);

            currentTicks += clipTicks; // Integer addition - no accumulation error

            debugLog("  currentTicks (after): " + currentTicks);
            debugLog("  expectedEndSeconds: " + (currentTicks / TICKS_PER_SECOND));
            debugLog("");
        }

        // ============================================================
        // POST-PLACEMENT GAP FIX
        // Extend each clip's end to exactly meet the next clip's start
        // This eliminates floating-point rounding gaps
        // ============================================================
        debugLog("");
        debugLog("POST-PLACEMENT GAP FIX:");

        // Small delay to ensure clips are fully placed
        $.sleep(100);

        // Collect all clips from both video tracks
        var allTimelineClips = [];
        for (var trackIdx = 0; trackIdx < 2; trackIdx++) {
            var vTrack = (trackIdx === 0) ? videoTrack1 : videoTrack2;
            for (var clipIdx = 0; clipIdx < vTrack.clips.numItems; clipIdx++) {
                allTimelineClips.push(vTrack.clips[clipIdx]);
            }
        }

        debugLog("  Found " + allTimelineClips.length + " clips");

        // Sort clips by start time (in ticks for precision)
        allTimelineClips.sort(function(a, b) {
            return a.start.ticks - b.start.ticks;
        });

        // Extend each clip's end to meet the next clip's start
        var gapsFixed = 0;
        for (var ci = 0; ci < allTimelineClips.length - 1; ci++) {
            var thisClip = allTimelineClips[ci];
            var nextClip = allTimelineClips[ci + 1];

            var thisEndTicks = thisClip.end.ticks;
            var nextStartTicks = nextClip.start.ticks;
            var gapTicks = nextStartTicks - thisEndTicks;

            debugLog("  Clip " + (ci + 1) + ": end=" + thisEndTicks +
                     ", next start=" + nextStartTicks + ", gap=" + gapTicks);

            if (gapTicks > 0) {
                // There's a gap - create new Time and extend clip
                var newEnd = new Time();
                newEnd.ticks = nextStartTicks;
                thisClip.end = newEnd;
                gapsFixed++;
                debugLog("    FIXED: extended to " + nextStartTicks);
            } else if (gapTicks < 0) {
                debugLog("    OVERLAP detected (will be handled by Premiere)");
            }
        }

        debugLog("  Total gaps fixed: " + gapsFixed);

        // 11. Place SRT as caption track (if exists)
        var srtInfo = getSrtFileInfo(folderPath);
        if (srtInfo) {
            // Import SRT file into Captions bin
            app.project.importFiles([srtInfo.path], true, bins.captions, false);
            $.sleep(300);

            // Find imported SRT item
            var srtItem = findProjectItemByPath(srtInfo.path);
            if (srtItem) {
                // Create caption track at position 0
                sequence.createCaptionTrack(srtItem, 0);
                result.hasCaptions = true;
            }
        }

        // Success!
        result.success = true;
        result.voiceDuration = voiceDuration;
        result.imageCount = imageItems.length;
        result.secondsPerImage = secondsPerImage;

        debugLog("");
        debugLog("SUCCESS!");
        debugLog("  voiceDuration: " + voiceDuration);
        debugLog("  imageCount: " + imageItems.length);
        debugLog("  finalTicks: " + currentTicks);
        debugLog("  finalSeconds: " + (currentTicks / TICKS_PER_SECOND));
        debugLog("");
        debugLog("Log file: " + DEBUG_LOG_PATH);
        debugLogWrite();

    } catch (e) {
        result.error = "Error: " + e.toString();
        debugLog("EXCEPTION: " + e.toString());
        debugLogWrite();
    }

    return JSON.stringify(result);
}

/**
 * Get the duration of an imported audio file (for preview)
 * Used to calculate seconds per image before creating slideshow
 * @param {string} voicePath - Path to the voice file
 * @param {string} folderPath - Path to the project folder (for creating proper bin structure)
 * @returns {string} JSON with duration info
 */
function getImportedAudioDuration(voicePath, folderPath) {
    var result = {
        success: false,
        duration: 0,
        error: null
    };

    try {
        // First check if already imported
        var voiceItem = findProjectItemByPath(voicePath);

        if (!voiceItem) {
            // Not imported yet - import to proper bin structure
            var projectFolderName = getFolderName(folderPath);
            var bins = createSlideshowBins(projectFolderName);
            app.project.importFiles([voicePath], true, bins.voiceovers, false);
            $.sleep(300);
            voiceItem = findProjectItemByPath(voicePath);
        }

        if (voiceItem) {
            var outPoint = voiceItem.getOutPoint();
            result.success = true;
            result.duration = outPoint.seconds;
        } else {
            result.error = "Could not find imported audio file";
        }
    } catch (e) {
        result.error = e.toString();
    }

    return JSON.stringify(result);
}

/**
 * Check if there's an active sequence
 * @returns {string} JSON with sequence info
 */
function checkActiveSequence() {
    var result = {
        hasSequence: false,
        sequenceName: null,
        videoTracks: 0,
        audioTracks: 0
    };

    var sequence = app.project.activeSequence;
    if (sequence) {
        result.hasSequence = true;
        result.sequenceName = sequence.name;
        result.videoTracks = sequence.videoTracks.numTracks;
        result.audioTracks = sequence.audioTracks.numTracks;
    }

    return JSON.stringify(result);
}
