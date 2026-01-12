/**
 * Auto Slideshow Creator - Main UI JavaScript
 * Handles user interactions and communicates with ExtendScript
 */

var csInterface = new CSInterface();
var currentFolderPath = null;
var previewInfo = null;

// DOM Elements
var selectFolderBtn = null;
var folderPathEl = null;
var folderNameEl = null;
var previewSection = null;
var voiceDurationEl = null;
var imageCountEl = null;
var secondsPerImageEl = null;
var srtIndicator = null;
var frameRateEl = null;
var frameRateDisplay = null;
var createBtn = null;
var statusEl = null;
var helpIcon = null;
var helpTooltip = null;
var settingsToggle = null;
var settingsContent = null;
var variationSlider = null;
var variationValue = null;
var variationDisplay = null;

/**
 * Initialize the extension when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    selectFolderBtn = document.getElementById('selectFolderBtn');
    folderPathEl = document.getElementById('folderPath');
    folderNameEl = document.getElementById('folderName');
    previewSection = document.getElementById('previewSection');
    voiceDurationEl = document.getElementById('voiceDuration');
    imageCountEl = document.getElementById('imageCount');
    secondsPerImageEl = document.getElementById('secondsPerImage');
    srtIndicator = document.getElementById('srtIndicator');
    frameRateEl = document.getElementById('frameRate');
    frameRateDisplay = document.getElementById('frameRateDisplay');
    createBtn = document.getElementById('createBtn');
    statusEl = document.getElementById('status');
    helpIcon = document.getElementById('helpIcon');
    helpTooltip = document.getElementById('helpTooltip');
    settingsToggle = document.getElementById('settingsToggle');
    settingsContent = document.getElementById('settingsContent');
    variationSlider = document.getElementById('variationSlider');
    variationValue = document.getElementById('variationValue');
    variationDisplay = document.getElementById('variationDisplay');

    // Attach event listeners
    selectFolderBtn.addEventListener('click', selectFolderHandler);
    createBtn.addEventListener('click', createSlideshowHandler);

    // Help tooltip toggle
    helpIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        helpTooltip.classList.toggle('show');
    });

    // Close tooltip when clicking elsewhere
    document.addEventListener('click', function() {
        helpTooltip.classList.remove('show');
    });

    // Settings toggle
    settingsToggle.addEventListener('click', function() {
        settingsToggle.classList.toggle('expanded');
        settingsContent.classList.toggle('show');
    });

    // Update frame rate display when changed
    frameRateEl.addEventListener('change', function() {
        frameRateDisplay.innerHTML = '<strong>' + this.value + '</strong> fps';
    });

    // Duration variation slider
    variationSlider.addEventListener('input', function() {
        var val = parseFloat(this.value);
        variationValue.textContent = '±' + val.toFixed(1) + 's';
        variationDisplay.innerHTML = '<strong>±' + val + '</strong>s';
        // Update preview if we have duration info
        updatePreviewWithVariation();
    });

    // Check if there's an active sequence
    checkSequence();
});

/**
 * Escape string for ExtendScript
 */
function escapeForScript(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
}

/**
 * Show status message
 */
function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}

/**
 * Clear status message
 */
function clearStatus() {
    statusEl.textContent = '';
    statusEl.className = 'status';
}

/**
 * Reset preview info display
 */
function resetPreview() {
    previewSection.style.display = 'none';
    voiceDurationEl.textContent = '-';
    imageCountEl.textContent = '-';
    secondsPerImageEl.textContent = '-';
    srtIndicator.textContent = '\u2715'; // X mark
    srtIndicator.className = 'srt-indicator';
    createBtn.disabled = true;
    previewInfo = null;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatDuration(seconds) {
    var hrs = Math.floor(seconds / 3600);
    var mins = Math.floor((seconds % 3600) / 60);
    var secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return hrs + ':' + padZero(mins) + ':' + padZero(secs);
    }
    return mins + ':' + padZero(secs);
}

function padZero(num) {
    return num < 10 ? '0' + num : num;
}

/**
 * Update preview display when variation slider changes
 */
function updatePreviewWithVariation() {
    if (previewInfo && previewInfo.secondsPerImage) {
        var variation = parseFloat(variationSlider.value);
        if (variation > 0) {
            secondsPerImageEl.textContent = previewInfo.secondsPerImage.toFixed(2) + 's (±' + variation + 's)';
        } else {
            secondsPerImageEl.textContent = previewInfo.secondsPerImage.toFixed(2) + 's';
        }
    }
}

/**
 * Extract folder name from full path
 */
function extractFolderName(fullPath) {
    // Handle both Unix and Windows paths
    var parts = fullPath.replace(/\\/g, '/').split('/');
    // Filter out empty parts and get last one
    var filtered = parts.filter(function(p) { return p.length > 0; });
    return filtered.length > 0 ? filtered[filtered.length - 1] : fullPath;
}

/**
 * Check if there's an active sequence
 */
function checkSequence() {
    csInterface.evalScript('checkActiveSequence()', function(result) {
        try {
            var info = JSON.parse(result);
            if (!info.hasSequence) {
                showStatus('Please create or open a sequence first.', 'info');
            } else if (info.videoTracks < 2) {
                showStatus('Sequence needs at least 2 video tracks.', 'info');
            }
        } catch (e) {
            // Ignore parse errors
        }
    });
}

/**
 * Handle folder selection
 * Uses CEP native dialog API for better Windows experience
 */
function selectFolderHandler() {
    clearStatus();
    resetPreview();

    // Use CEP's native file dialog API (better Windows experience)
    if (window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx) {
        var result = window.cep.fs.showOpenDialogEx(
            false,                    // allowMultipleSelection
            true,                     // chooseDirectory (folder mode)
            'Select Project Folder',  // title
            '',                       // initialPath (empty = last used)
            []                        // fileTypes (empty for folders)
        );

        if (result.err === 0 && result.data && result.data.length > 0) {
            var selectedPath = result.data[0];
            currentFolderPath = selectedPath;

            var folderName = extractFolderName(selectedPath);
            folderNameEl.textContent = folderName;
            folderPathEl.className = 'folder-path has-path';
            folderPathEl.title = selectedPath;

            validateFolder(selectedPath);
        }
        // err !== 0 means dialog was cancelled - no action needed
    } else {
        // Fallback to ExtendScript for older CEP versions
        csInterface.evalScript('selectFolder()', function(result) {
            if (result && result !== 'null' && result !== 'undefined') {
                currentFolderPath = result;
                var folderName = extractFolderName(result);
                folderNameEl.textContent = folderName;
                folderPathEl.className = 'folder-path has-path';
                folderPathEl.title = result;
                validateFolder(result);
            }
        });
    }
}

/**
 * Validate folder and get preview info
 */
function validateFolder(folderPath) {
    var escapedPath = escapeForScript(folderPath);

    csInterface.evalScript('getPreviewInfo("' + escapedPath + '")', function(result) {
        try {
            var info = JSON.parse(result);

            if (info.valid) {
                previewInfo = info;

                // Show preview section
                previewSection.style.display = 'block';

                imageCountEl.textContent = info.imageCount;

                // Update SRT indicator
                if (info.srtName) {
                    srtIndicator.textContent = '\u2713'; // Checkmark
                    srtIndicator.className = 'srt-indicator active';
                } else {
                    srtIndicator.textContent = '\u2715'; // X mark
                    srtIndicator.className = 'srt-indicator';
                }

                // Now we need to get the audio duration
                getAudioDurationForPreview(info.voicePath, info.imageCount, folderPath);

            } else {
                showStatus(info.error, 'error');
                resetPreview();
            }
        } catch (e) {
            showStatus('Error reading folder: ' + e.toString(), 'error');
            resetPreview();
        }
    });
}

/**
 * Get audio duration for preview (imports file to proper bin structure)
 */
function getAudioDurationForPreview(voicePath, imageCount, folderPath) {
    var escapedPath = escapeForScript(voicePath);
    var escapedFolderPath = escapeForScript(folderPath);

    csInterface.evalScript('getImportedAudioDuration("' + escapedPath + '", "' + escapedFolderPath + '")', function(result) {
        try {
            var info = JSON.parse(result);

            if (info.success) {
                var duration = info.duration;
                var secondsPerImage = duration / imageCount;

                voiceDurationEl.textContent = formatDuration(duration);

                // Show seconds per image with variation indicator
                var variation = parseFloat(variationSlider.value);
                if (variation > 0) {
                    secondsPerImageEl.textContent = secondsPerImage.toFixed(2) + 's (±' + variation + 's)';
                } else {
                    secondsPerImageEl.textContent = secondsPerImage.toFixed(2) + 's';
                }

                // Store duration for later
                if (previewInfo) {
                    previewInfo.voiceDuration = duration;
                    previewInfo.secondsPerImage = secondsPerImage;
                }

                // Enable create button
                createBtn.disabled = false;
                showStatus('Ready to create slideshow!', 'success');

            } else {
                showStatus('Could not get audio duration: ' + info.error, 'error');
            }
        } catch (e) {
            showStatus('Error reading audio: ' + e.toString(), 'error');
        }
    });
}

/**
 * Handle create slideshow button click
 */
function createSlideshowHandler() {
    if (!currentFolderPath) {
        showStatus('Please select a folder first.', 'error');
        return;
    }

    // Disable button while processing
    createBtn.disabled = true;
    showStatus('Creating slideshow...', 'info');

    var escapedPath = escapeForScript(currentFolderPath);
    var variation = parseFloat(variationSlider.value);
    var frameRate = parseFloat(frameRateEl.value);

    csInterface.evalScript(
        'createSlideshow("' + escapedPath + '", ' + variation + ', ' + frameRate + ')',
        function(result) {
            try {
                var response = JSON.parse(result);

                if (response.success) {
                    var message = 'Done! ' + response.imageCount + ' images at ';
                    message += response.secondsPerImage.toFixed(2) + 's each.';
                    showStatus(message, 'success');
                } else {
                    showStatus('Error: ' + response.error, 'error');
                }
            } catch (e) {
                showStatus('Error: ' + e.toString(), 'error');
            }

            // Re-enable button
            createBtn.disabled = false;
        }
    );
}
