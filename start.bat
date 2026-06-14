@echo off
title SaaS Optimizer v3.0
echo.
echo  ========================================
echo    SAAS OPTIMIZER v3.0
echo    App para Clientes
echo  ========================================
echo.
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js no esta instalado.
    echo  Descargalo de: https://nodejs.org/
    pause
    exit /b 1
)
echo  [OK] Node.js detectado
if not exist "node_modules" ( echo  Instalando dependencias... & call npm install --loglevel=error )
echo.
echo  --------------------------------
echo  App: http://localhost:3000
echo  Demo: demo@saasopt.com
echo  --------------------------------
echo.
node server.js
pause
