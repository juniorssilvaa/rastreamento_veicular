@echo off
title BL Rastreamento - Iniciar Sistema
echo ===================================================
echo               INICIANDO BL RASTREAMENTO            
echo ===================================================
echo.

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
        start "Traccar Server" cmd /k "cd Traccar && java -jar tracker-server.jar conf/traccar.xml"
    )
)
echo.

:: 2. Iniciar Django Backend
echo [*] Iniciando Django Backend (porta 8000)...
start "Django Backend" cmd /k "cd backend && call .\venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"

:: 3. Iniciar React Frontend
echo [*] Iniciando React Frontend (Vite)...
start "React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo [OK] Todos os modulos foram iniciados!
echo      - Backend rodando em: http://localhost:8000
echo      - Frontend rodando em: http://localhost:5173
echo ===================================================
pause
