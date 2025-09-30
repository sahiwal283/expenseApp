@echo off
REM Trade Show Expense App - Frontend Only Startup

echo =========================================
echo Trade Show Expense App - Frontend Only
echo Version: 0.5.0-alpha (Pre-release)
echo =========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed
    echo.
    echo Please install Node.js v18 or higher from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed
    echo.
    echo npm should come with Node.js. Please reinstall Node.js from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Display versions
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detected
echo [OK] npm %NPM_VERSION% detected
echo.

echo Starting frontend-only testing mode...
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo =========================================
echo Frontend Ready for Testing!
echo =========================================
echo.
echo Note: This is frontend-only mode
echo Data is stored in browser localStorage
echo.
echo Opening at: http://localhost:5173
echo.
echo Demo Login Credentials:
echo   Admin:       admin / admin
echo   Coordinator: sarah / password
echo   Salesperson: mike / password
echo   Accountant:  lisa / password
echo.
echo Starting development server...
echo Press Ctrl+C to stop
echo.

REM Start frontend
call npm run dev
