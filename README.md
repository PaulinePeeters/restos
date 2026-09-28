# RestOS

Système de gestion de restaurant complet (SaaS) incluant une application de prise de commande, gestion de cuisine (KDS), et administration back-office.

## Stack Technique

### Frontend
- **Framework** : React 19 (TypeScript)
- **Design** : CSS Modules, React Icons
- **Visualisation** : Recharts (Stats), React Leaflet (Cartes), React Konva (Plans de salle)
- **Gestion de fichiers** : React FilePond
- **Temps Réel** : Socket.IO Client
- **Calendrier** : FullCalendar

### Backend
- **Runtime** : Node.js
- **Framework** : Express
- **Base de données** : PostgreSQL
- **ORM** : Prisma
- **Authentification** : JWT, Bcrypt
- **Validation** : Zod
- **Utilitaires** :
  - **PDF** : PDFKit (Factures)
  - **Emails** : Nodemailer
  - **QR Codes** : Node QRCode
  - **Uploads** : Multer
  - **Temps Réel** : Socket.IO Server

## Fonctionnalités Implémentées

### Gestion & Administration
- **Ressources Humaines** :
    - Gestion du personnel et des rôles (RBAC).
    - Planning et emplois du temps (Horaires).
    - Gestion des absences et types de congés.
    - Suivi du pointage.
- **Catalogue & Stock** :
    - Gestion des catégories et des plats.
    - Gestion des ingrédients et allergènes.
    - Suivi des stocks en temps réel.
- **Finance** :
    - Suivi des paiements et chèques.
    - Tableau de bord statistique (Ventes, popularité des plats).
    - Exports comptables.

### Opérationnel
- **Salle & Service** :
    - Plan de salle interactif (Tables).
    - Prise de commande.
    - Gestion des réservations.
- **Cuisine & Bar** :
    - Affichage des bons de commande en temps réel.
    - Gestion de l'état des commandes (KDS).
- **Client** :
    - Programme de fidélité.
    - Gestion des avis clients.
    - Notifications.

##  Installation

### Pré-requis
- Node.js (v20+)
- PostgreSQL
- npm ou yarn

### Backend
1. Naviguez dans le dossier backend :
   ```bash
   cd backend
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Configurez les variables d'environnement (`.env`) et la base de données.
4. Générez le client Prisma et lancez les migrations (si nécessaire) :
   ```bash
   npx prisma generate
   # npx prisma migrate dev
   ```
5. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

### Frontend
1. Naviguez dans le dossier frontend :
   ```bash
   cd frontend
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez l'application React :
   ```bash
   npm start
   ```

##  Architecture Backend

Structure "Layered Architecture" pour une meilleure maintenabilité :
- **Routes** (`src/routes`) : Définition des endpoints API.
- **Controllers** (`src/controllers`) : Logique de traitement des requêtes et réponses.
- **Services** (`src/services`) : Logique métier et interactions avec la base de données (Prisma).
- **Middlewares** (`src/middlewares`) : Gestion de l'authentification, des rôles et des erreurs.
