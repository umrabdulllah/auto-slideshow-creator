@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Auto Slideshow Creator - Windows Installer
echo ============================================
echo.

:: Get the directory where this script is located
set "SOURCE_DIR=%~dp0"

:: Remove trailing backslash
if "%SOURCE_DIR:~-1%"=="\" set "SOURCE_DIR=%SOURCE_DIR:~0,-1%"

echo Source: %SOURCE_DIR%
echo.

:: Define possible installation locations
set "INSTALL_FOUND=0"
set "INSTALL_PATH="

:: Check AppData location first (user-level install, no admin needed)
set "APPDATA_PATH=%APPDATA%\Adobe\CEP\extensions\AutoSlideshow"
echo Checking: %APPDATA%\Adobe\CEP\extensions\
if exist "%APPDATA%\Adobe\CEP\extensions\" (
    set "INSTALL_PATH=%APPDATA_PATH%"
    set "INSTALL_FOUND=1"
    echo   Found AppData CEP folder
)

:: Check Program Files locations for Premiere Pro (2020-2025)
if "%INSTALL_FOUND%"=="0" (
    for %%Y in (2025 2024 2023 2022 2021 2020) do (
        set "PP_PATH=%ProgramFiles%\Adobe\Adobe Premiere Pro %%Y\CEP\extensions"
        echo Checking: !PP_PATH!
        if exist "!PP_PATH!" (
            set "INSTALL_PATH=!PP_PATH!\AutoSlideshow"
            set "INSTALL_FOUND=1"
            echo   Found Premiere Pro %%Y CEP folder
            goto :found
        )
    )
)

:found

:: If still not found, try to create AppData location
if "%INSTALL_FOUND%"=="0" (
    echo.
    echo No existing CEP folder found. Creating in AppData...
    set "INSTALL_PATH=%APPDATA%\Adobe\CEP\extensions\AutoSlideshow"
    mkdir "%APPDATA%\Adobe\CEP\extensions" 2>nul
    set "INSTALL_FOUND=1"
)

echo.
echo ============================================
echo   Installing to: %INSTALL_PATH%
echo ============================================
echo.

:: Create target directory
if exist "%INSTALL_PATH%" (
    echo Removing old installation...
    rmdir /s /q "%INSTALL_PATH%" 2>nul
)

mkdir "%INSTALL_PATH%" 2>nul

:: Copy files
echo Copying files...

:: Copy main files
copy "%SOURCE_DIR%\index.html" "%INSTALL_PATH%\" >nul 2>&1
copy "%SOURCE_DIR%\.debug" "%INSTALL_PATH%\" >nul 2>&1

:: Copy directories
xcopy "%SOURCE_DIR%\CSXS" "%INSTALL_PATH%\CSXS\" /E /I /Q >nul 2>&1
xcopy "%SOURCE_DIR%\js" "%INSTALL_PATH%\js\" /E /I /Q >nul 2>&1
xcopy "%SOURCE_DIR%\jsx" "%INSTALL_PATH%\jsx\" /E /I /Q >nul 2>&1

:: Enable debug mode in registry (required for unsigned extensions)
echo.
echo Enabling CEP debug mode...
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo Extension installed to:
echo   %INSTALL_PATH%
echo.
echo Next steps:
echo   1. Restart Adobe Premiere Pro
echo   2. Go to Window ^> Extensions ^> Auto Slideshow Creator
echo.
echo If the extension doesn't appear, make sure:
echo   - You're using Premiere Pro 2020 or later
echo   - You've restarted Premiere Pro completely
echo.
pause
