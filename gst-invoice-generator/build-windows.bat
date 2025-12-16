@echo off
echo ========================================
echo GST Invoice Generator - Windows Builder
echo ========================================
echo.

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Building Next.js application...
call npm run build:electron
if errorlevel 1 (
    echo Failed to build Next.js application!
    pause
    exit /b 1
)

echo.
echo Building Windows installer...
call npm run electron:build:win
if errorlevel 1 (
    echo Failed to build Windows installer!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo Installer location: dist-electron\GST Invoice Generator Setup 0.1.0.exe
echo ========================================
pause








