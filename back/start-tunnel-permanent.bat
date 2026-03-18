@echo off
title ERP Analytics - Cloudflare Tunnel (NO CIERRES ESTA VENTANA)
cls

:start
echo.
echo ========================================
echo CLOUDFLARE TUNNEL - VENTANA PERMANENTE
echo ========================================
echo.
echo IMPORTANTE:
echo - No cierres esta ventana
echo - El tunnel mantendra su URL activa
echo - Puedes reiniciar el backend sin problemas
echo.

REM Renombrar config.yml si existe para evitar interferencia
if exist "%USERPROFILE%\.cloudflared\config.yml" (
  echo Moviendo config.yml para evitar conflictos...
  rename "%USERPROFILE%\.cloudflared\config.yml" config.yml.bak
)

echo Iniciando Cloudflare Tunnel...
echo.

"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5005

REM Si el tunnel se detiene, lo reinicia
pause
goto start
