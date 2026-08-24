# Como rodar o BL Rastreamento

## Opção rápida (Windows)

Na pasta do projeto, dê dois cliques ou execute:

```bat
iniciar_tudo.bat
```

Isso sobe Traccar (se necessário), backend e frontend.

Scripts individuais:

```bat
iniciar_backend.bat
iniciar_frontend.bat
```

---

## Manual (PowerShell / terminal)

Abra **3 terminais** na pasta `E:\blrastreamento`.

### 1. Backend (Django) — porta 8000

```powershell
cd E:\blrastreamento\backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

Se aparecer `Error: You don't have permission to access that port`, a porta **8000 já está em uso**. Libere assim:

```powershell
# Ver quem está usando a porta
netstat -ano | findstr :8000

# Encerrar o processo (troque PID pelo número da última coluna)
taskkill /PID <PID> /F
```

Depois rode o `runserver` de novo.

### 2. Frontend (React / Vite) — porta 5173

```powershell
cd E:\blrastreamento\frontend
npm install
npm run dev
```

### 3. Traccar (rastreamento) — porta 8082

Se o serviço Windows `traccar` não estiver rodando:

```powershell
cd E:\blrastreamento\Traccar
java -jar tracker-server.jar conf\traccar.xml
```

---

## URLs

| Serviço   | Endereço                  |
|-----------|---------------------------|
| Frontend  | http://localhost:5173     |
| Backend   | http://localhost:8000     |
| Traccar   | http://localhost:8082     |

---

## Primeira vez (se o venv ou o npm ainda não existirem)

```powershell
cd E:\blrastreamento\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

cd E:\blrastreamento\frontend
npm install
```

---

## Docker (produção / ambiente completo)

```powershell
cd E:\blrastreamento
docker compose up -d --build
```

Variáveis de exemplo em `.env.example`.
