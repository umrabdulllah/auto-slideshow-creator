===============================================
AUTO SLIDESHOW CREATOR
Adobe Premiere Pro Extension
Version 1.3.5
===============================================

REQUIREMENTS
------------
- Adobe Premiere Pro 2020 or later (version 15.0+)
- macOS or Windows

INSTALLATION
------------

macOS:
  1. Double-click "install-mac.command"
  2. If prompted with "cannot be opened because it is from an
     unidentified developer", right-click the file and select "Open"
  3. The installer will run in Terminal - follow the prompts
  4. Restart Premiere Pro

Windows:
  1. Double-click "install-windows.bat" (Run as Administrator if needed)
  2. If Windows SmartScreen appears, click "More info" then "Run anyway"
  3. The installer will auto-detect your Premiere Pro installation
  4. Restart Premiere Pro

MANUAL INSTALLATION (Windows)
-----------------------------
If the installer doesn't work, manually copy the extension files to
ONE of these locations:

  User-level (recommended, no admin needed):
    %APPDATA%\Adobe\CEP\extensions\AutoSlideshow\
    (Usually: C:\Users\YourName\AppData\Roaming\Adobe\CEP\extensions\AutoSlideshow\)

  System-level (inside Premiere Pro):
    C:\Program Files\Adobe\Adobe Premiere Pro 2024\CEP\extensions\AutoSlideshow\
    C:\Program Files\Adobe\Adobe Premiere Pro 2023\CEP\extensions\AutoSlideshow\

  Then enable debug mode by running this in Command Prompt:
    reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f

MANUAL INSTALLATION (macOS)
---------------------------
Copy extension files to:
  ~/Library/Application Support/Adobe/CEP/extensions/AutoSlideshow/

Then enable debug mode in Terminal:
  defaults write com.adobe.CSXS.12 PlayerDebugMode 1

ACCESSING THE EXTENSION
-----------------------
After installation:
  1. Open Adobe Premiere Pro
  2. Go to: Window > Extensions > Auto Slideshow Creator

HOW TO USE
----------
The extension automatically creates slideshows from images synchronized
to voiceover audio. Prepare a folder with this structure:

  your-project-folder/
  ├── images/        (Required - your image files)
  ├── voiceovers/    (Required - your audio file)
  └── subtitles/     (Optional - .srt subtitle file)

Supported formats:
  - Images: PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF
  - Audio: MP3, WAV, AAC, M4A, AIFF, OGG, FLAC
  - Subtitles: SRT

Steps:
  1. Click "Select Folder" and choose your project folder
  2. Preview the calculated timing
  3. Click "Create Slideshow" to generate

TROUBLESHOOTING
---------------

Extension doesn't appear in Window > Extensions:
  - Make sure you restarted Premiere Pro after installation
  - Try restarting your computer
  - Run the installer again

"Loading" message appears but nothing happens:
  - Make sure you have a sequence open in Premiere Pro
  - Check that your images and voiceovers folders exist

Images not importing:
  - Verify image files are in supported formats
  - Check file permissions

UNINSTALLATION
--------------
See UNINSTALL.txt for removal instructions.

SUPPORT
-------
For issues or feedback, contact the developer.

===============================================
