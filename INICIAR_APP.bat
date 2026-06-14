@echo off
title SaaS Optimizer App
echo ============================================
echo   SaaS OPTIMIZER - Gestion de Suscripciones
echo ============================================
echo.
echo Instalando dependencias...
cd /d "%~dp0"
call npm install
echo.
echo Iniciando aplicacion...
echo Abre http://localhost:3000 en tu navegador
echo.
node server.js
pause
