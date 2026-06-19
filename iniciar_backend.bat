@echo off
title BL Rastreamento - Django Backend
echo ===================================================
echo             INICIANDO DJANGO BACKEND               
echo ===================================================
echo.
cd backend
call .\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
pause
