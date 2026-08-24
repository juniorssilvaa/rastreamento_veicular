@echo off
title BL Rastreamento - Django Backend
echo ===================================================
echo             INICIANDO DJANGO BACKEND               
echo ===================================================
echo.

cd /d "%~dp0backend"
if not exist "venv\Scripts\activate.bat" (
  echo [ERRO] venv nao encontrado em backend\venv
  echo Crie com: python -m venv venv
  pause
  exit /b 1
)

:: Libera a porta 8000 se ja estiver ocupada (evita "permission to access that port")
echo [*] Verificando porta 8000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  echo [!] Porta 8000 em uso pelo PID %%P — encerrando...
  taskkill /PID %%P /F >nul 2>&1
)

call .\venv\Scripts\activate
echo [*] Subindo Django em http://localhost:8000
python manage.py runserver 0.0.0.0:8000
pause
