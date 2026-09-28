# Étape 1: Builder React
FROM node:20-alpine AS builder

WORKDIR /app

# Arguments de build
ARG VITE_API_URL

# Définir l'URL de l'API pour Vite
ENV VITE_API_URL=$VITE_API_URL

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances avec legacy-peer-deps pour compenser le conflit React 19 / FullCalendar
RUN npm ci --legacy-peer-deps

# Copie du code source
COPY . .

# Construction de l'application
RUN npm run build

# Étape 2: Serveur Nginx
FROM nginx:alpine

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers statiques de React vers Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
