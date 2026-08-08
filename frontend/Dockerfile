# Estagio 1: Build da aplicacao React/Vite
FROM node:20-alpine as builder

WORKDIR /app

# Copia package.json e instala dependencias
COPY package*.json ./
RUN npm install

# Copia o resto dos arquivos e faz o build
COPY . .
RUN npm run build

# Estagio 2: Servidor Nginx para servir os arquivos estaticos
FROM nginx:alpine

# Copia o build gerado para a pasta padrao do nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA + arquivos estaticos de icones do mapa (/incon)
RUN printf '%s\n' \
  'server {' \
  '    listen 80;' \
  '    root /usr/share/nginx/html;' \
  '    index index.html index.htm;' \
  '' \
  '    location /incon/ {' \
  '        try_files $uri =404;' \
  '        expires 30d;' \
  '        add_header Cache-Control "public, immutable";' \
  '        access_log off;' \
  '    }' \
  '' \
  '    location / {' \
  '        try_files $uri $uri/ /index.html;' \
  '    }' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
