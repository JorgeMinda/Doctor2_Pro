@echo off
title Doctor2 Pro - Servidor Local
echo ===================================================
echo           Iniciando Doctor2 Pro Enterprise
echo ===================================================
echo.
echo [1/2] Abriendo navegador en http://localhost:8000 ...
start http://localhost:8000
echo.
echo [2/2] Levantando servidor PHP en http://localhost:8000 ...
echo Presiona Ctrl + C para detener el servidor.
echo.
php -S localhost:8000
pause
