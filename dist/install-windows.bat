@echo off
setlocal enabledelayedexpansion

:: Auto Slideshow Creator - Windows Installer
:: Double-click this file to install the extension

title Auto Slideshow Creator - Installer

cls
echo ==============================================
echo   Auto Slideshow Creator - Installer
echo   Adobe Premiere Pro Extension
echo ==============================================
echo.

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "EXTENSION_SOURCE=%SCRIPT_DIR%AutoSlideshow"

:: Define target installation path
set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\AutoSlideshow"

echo [1/4] Checking extension files...
if not exist "%EXTENSION_SOURCE%" (
    echo.
    echo ERROR: Extension folder not found!
    echo Expected location: %EXTENSION_SOURCE%
    echo.
    echo Make sure the 'AutoSlideshow' folder is in the same directory as this installer.
    echo.
    pause
    exit /b 1
)
echo       Extension files found.

echo [2/4] Installing extension...

:: Create parent directories if they don't exist
if not exist "%APPDATA%\Adobe\CEP\extensions" (
    mkdir "%APPDATA%\Adobe\CEP\extensions"
)

:: Remove existing installation if present
if exist "%TARGET_DIR%" (
    echo       Removing previous installation...
    rmdir /s /q "%TARGET_DIR%"
)

:: Copy extension to target
xcopy "%EXTENSION_SOURCE%" "%TARGET_DIR%" /E /I /Y /Q >nul

if %ERRORLEVEL% equ 0 (
    echo       Extension installed successfully.
) else (
    echo.
    echo ERROR: Failed to copy extension files.
    echo Please check permissions and try again.
    echo.
    pause
    exit /b 1
)

echo [3/4] Enabling extension loading...

:: Enable PlayerDebugMode for CSXS 11 and 12 (Premiere Pro 2021-2025)
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo       Debug mode enabled for Adobe CEP.

echo [4/4] Installation complete!
echo.
echo ==============================================
echo   SUCCESS!
echo ==============================================
echo.
echo Next steps:
echo   1. Close Adobe Premiere Pro if it's running
echo   2. Reopen Premiere Pro
echo   3. Go to: Window ^> Extensions ^> Auto Slideshow Creator
echo.
echo If the extension doesn't appear, try restarting
echo your computer and reopening Premiere Pro.
echo.
pause
