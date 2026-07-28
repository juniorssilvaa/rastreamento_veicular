FROM python:3.11-slim

WORKDIR /app

# Variaveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Dependencias do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Instala as dependencias do Python
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn psycopg2-binary

# Copia o código do projeto
COPY . /app/

# Pasta para armazenar o banco de dados sqlite para persistencia via volume (fallback)
RUN mkdir -p /app/data

# Script de inicializacao (espera Postgres, migra e sobe o Gunicorn)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Configura as portas
EXPOSE 8000

CMD ["/app/entrypoint.sh"]
