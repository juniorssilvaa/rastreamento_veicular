# Sistema de Rastreamento Moderno

Plataforma de rastreamento de veículos utilizando Traccar (motor de GPS), Django (Back-end) e React (Front-end).

## Stack Tecnológico

### 🎨 Frontend (Interface)
*   **React + Vite:** Toda a interface web, escolhido por ser extremamente rápido no desenvolvimento.
*   **JavaScript (JSX):** Linguagem principal do front-end.
*   **CSS Puro (Vanilla CSS):** Estilização visual (cores, botões, responsividade e modo escuro), garantindo performance sem depender de pesadas bibliotecas externas.
*   **Leaflet / React-Leaflet:** Biblioteca open-source para renderizar os mapas e os pinos de localização.
*   **Lucide React:** Biblioteca de ícones modernos.

### ⚙️ Backend (Servidor e Banco de Dados)
*   **Python + Django:** Servidor que processa as regras de negócio, gerencia os usuários, clientes e contratos.
*   **Django REST Framework:** Usado para criar a API que o React consome para buscar os veículos e os dados em tempo real.
*   **Traccar:** Motor de GPS robusto em Java que recebe diretamente os dados de telemetria dos rastreadores. O Django se comunica com ele para puxar status online/offline, velocidade e posições.

## Estrutura do Projeto

*   `/Traccar`: O motor principal responsável por receber dados dos dispositivos GPS.
*   `/backend`: API em Django para gerenciar regras de negócios, usuários, dispositivos e integrações com o Traccar.
*   `/frontend`: Dashboard moderno construído com React + Vite.

## Como Executar

### 1. Motor Traccar (Servidor GPS)

O Traccar é o coração do sistema. Para rodá-lo, você precisa ter o Java instalado e executar o arquivo `.jar` principal:

```bash
cd Traccar
java -jar tracker-server.jar conf/traccar.xml
```

O painel administrativo padrão do Traccar estará em `http://localhost:8082`.

### 2. Front-end (React)

Para rodar o front-end na sua máquina, abra um terminal e execute os seguintes comandos:

```bash
cd frontend
npm install   # (Caso seja a primeira vez clonando o projeto)
npm run dev
```

Após isso, o painel estará disponível em `http://localhost:5173`.

### Back-end (Django / API)

O back-end é responsável por fornecer as métricas e consolidar a comunicação com o banco de dados do Traccar. Para executá-lo, use os comandos:

```bash
cd E:\blrastreamento\backend
.\venv\Scripts\activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
# Rodar o servidor:
image.png
```

A API de testes estará disponível em `http://localhost:8000/api/traccar/devices/`.

---
*Desenvolvido para BL Rastreamento*
