@echo off
title Area Nobre - Corretora Daiane
cls

echo ========================================================
echo       AREA NOBRE - CORRETORA DAIANE CORREA
echo ========================================================
echo.

:: Verifica se a porta 3000 ja esta ativa
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [OK] O servidor ja esta em execucao!
    echo Abrindo o site no seu navegador...
    start http://localhost:3000
    exit /b 0
) else (
    echo [INFO] Iniciando o servidor local...
    echo O site sera aberto automaticamente em http://localhost:3000
    start "" cmd /c "ping -n 4 127.0.0.1 >nul && start http://localhost:3000"
    npm run dev
)
