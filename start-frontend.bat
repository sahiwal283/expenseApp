@echo off
REM Trade Show Expense App - Frontend Only Startup

echo =========================================
echo Trade Show Expense App - Frontend Only
echo Version: 0.5.0-alpha (Pre-release)
echo =========================================
echo.

echo Starting frontend-only testing mode...
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
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
