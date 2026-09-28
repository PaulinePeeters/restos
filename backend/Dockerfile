# Étape 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Installation des dépendances
RUN npm ci --legacy-peer-deps

# Génération du client Prisma
RUN npx prisma generate

# Copie du code source
COPY src ./src/

# Build TypeScript
RUN npm run build

# Étape 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Définition de NODE_ENV
ENV NODE_ENV production

# Copie des dépendances uniquement nécessaires pour la prod (si possible, ici on garde toutes pour simplifier l'exécution prisma migrate etc.)
# Cependant npm ci --omit=dev pourrait être utilisé. Pour prisma CLI on en a besoin pour la migration.
COPY package*.json ./
RUN npm install --omit=dev && npm install prisma tsx


# Copie des fichiers nécessaires générés par l'étape builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY prisma.config.ts ./

# Créer les répertoires nécessaires (ex: dossier public/uploads)
RUN mkdir -p public/uploads

# Script de démarrage: applique les migrations sans perte de données, puis démarre l'API
CMD sh -c "npx prisma migrate deploy && npm start"
