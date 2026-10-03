@echo off
title BLDE-PRISM Research Portal Launcher
color 0B
echo =====================================================================
echo                BLDE-PRISM RESEARCH PORTAL LAUNCHER
echo          Publications & Research Impact Statistics Manager
echo =====================================================================
echo.

echo [1/4] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/4] Checking dependencies...
if not exist node_modules" (
 echo Installing node dependencies...
 call npm install
)

echo [3/4] Generating Prisma Client...
call npx prisma generate

echo [4/4] Launching BLDE-PRISM Portal on http://localhost:3000 ...
echo.
echo =====================================================================
echo Default Admin: admin@blde.ac.in / admin123
echo Default Faculty: mamatha.k@bldedu.ac.in / BLDE@faculty2026
echo Verifier: verifier@blde.ac.in / faculty123
echo =====================================================================
echo.
start http://localhost:3000
call npm run dev
pause
