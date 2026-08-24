@echo off
title BL Rastreamento - Iniciar Sistema
echo ===================================================
echo               INICIANDO BL RASTREAMENTO            
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Verificar/Iniciar Traccar
echo [*] Verificando Servico Traccar...
sc query traccar | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] O servico Traccar ja esta rodando em segundo plano.
) else (
    echo [!] O servico Traccar nao esta rodando como Servico do Windows.
    echo [*] Deseja tentar iniciar o Traccar via terminal?
    echo [1] Sim (Iniciar via console em nova janela)
    echo [2] Nao (Ja esta rodando de outra forma ou nao quero iniciar)
    set /p opt="Opcao (1 ou 2): "
    if "%opt%"=="1" (
        start "Traccar Server" cmd /k "cd /d "%~dp0Traccar" && java -jar tracker-server.jar conf/traccar.xml"
    )
)
echo.

:: 2. Liberar porta 8000 se ocupada
echo [*] Verificando porta 8000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  echo [!] Porta 8000 em uso pelo PID %%P — encerrando...
  taskkill /PID %%P /F >nul 2>&1
)

:: 3. Iniciar Django Backend
echo [*] Iniciando Django Backend (porta 8000)...
start "Django Backend" cmd /k "cd /d "%~dp0backend" && call .\venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"

:: 4. Iniciar React Frontend
echo [*] Iniciando React Frontend (Vite)...
start "React Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo [OK] Todos os modulos foram iniciados!
echo      - Backend:  http://localhost:8000
echo      - Frontend: http://localhost:5173
echo      - Guia:     COMO_RODAR.md
echo ===================================================
pause
