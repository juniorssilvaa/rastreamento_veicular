#!/bin/sh
set -e

echo "Aguardando PostgreSQL em ${POSTGRES_HOST:-localhost}:${POSTGRES_PORT:-5432}..."

python <<'PY'
import os
import sys
import time

host = os.environ.get("POSTGRES_HOST")
if not host:
    print("POSTGRES_HOST nao definido; pulando espera do banco.")
    sys.exit(0)

import psycopg2

db = os.environ.get("POSTGRES_DB", "blrastreamento")
user = os.environ.get("POSTGRES_USER", "admin")
password = os.environ.get("POSTGRES_PASSWORD", "admin")
port = os.environ.get("POSTGRES_PORT", "5432")

for attempt in range(1, 61):
    try:
        conn = psycopg2.connect(
            dbname=db,
            user=user,
            password=password,
            host=host,
            port=port,
            connect_timeout=3,
        )
        conn.close()
        print(f"PostgreSQL disponivel (tentativa {attempt}).")
        sys.exit(0)
    except Exception as exc:
        print(f"Tentativa {attempt}/60: aguardando Postgres... ({exc})")
        time.sleep(2)

print("ERRO: PostgreSQL nao ficou disponivel a tempo.")
sys.exit(1)
PY

echo "Aplicando migracoes..."
python manage.py migrate --noinput

echo "Garantindo superusuario..."
python <<'PY'
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@admin.com")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin")
if User.objects.filter(username=username).exists():
    print(f"Superusuario '{username}' ja existe.")
else:
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Superusuario '{username}' criado.")
PY

LOG_LEVEL="${LOG_LEVEL:-DEBUG}"
echo "Iniciando Gunicorn (log-level=${LOG_LEVEL})..."
exec gunicorn core.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-120}" \
  --access-logfile - \
  --error-logfile - \
  --capture-output \
  --enable-stdio-inheritance \
  --log-level "$(echo "$LOG_LEVEL" | tr '[:upper:]' '[:lower:]')"
