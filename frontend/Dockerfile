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

# Cria uma configuracao do Nginx para suportar as rotas do React (SPA fallback)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
