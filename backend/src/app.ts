import express, { Express, Request, Response, NextFunction } from 'express';
import { AppError } from './utils/AppError.js';
import { logger } from './utils/logger.js';
import { ALLOWED_ORIGINS } from './utils/config.js';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

import { checkNoShows } from './services/reservations.service.js';

const app: Express = express();
app.set('trust proxy', 1); 

// === Configuration ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Sécurité ===
app.use(helmet({ crossOriginResourcePolicy: false }));
// Protection contre les attaques par force brute et DDoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Trop de requêtes, veuillez réessayer plus tard.'
});
app.use(limiter);

// CORS configuré selon l'environnement
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Pas d'origin = requêtes internes (mobile, curl, Postman)
        if (!origin) return callback(null, true);

        // En dev, accepter localhost
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // En prod, vérifier la whitelist
        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('Non autorisé par CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// === Import des routes ===

// Menu & Catalogue
import platsRoutes from './routes/plats.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import allergenesRoutes from './routes/allergenes.routes.js';
import ingredientsRoutes from './routes/ingredients.routes.js';

// Stock & Fournisseurs
import stockRoutes from './routes/stock.routes.js';

// Authentification & Utilisateurs
import personnelRoutes from './routes/personnel.routes.js';
import clientsRoutes from './routes/clients.routes.js';

// Gestion RH
import absencesRoutes from './routes/absences.routes.js';
import horairesRoutes from './routes/horaires.routes.js';
import pointageRoutes from './routes/pointage.routes.js';
import typesCongeRoutes from './routes/typesconge.routes.js';

// Salle & Service
import tablesRoutes from './routes/tables.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import reservationsRoutes from './routes/reservations.routes.js';

// Commandes & Paiements
import commandesRoutes from './routes/commandes.routes.js';
import ligneCommandeRoutes from './routes/lignecommande.routes.js';
import paiementsRoutes from './routes/paiements.routes.js';
import chequesRoutes from './routes/cheques.routes.js';

// Marketing & Fidélité
import fideliteRoutes from './routes/fidelite.routes.js';
import eventsRoutes from './routes/events.routes.js';
import avisRoutes from './routes/avis.routes.js';

// Administration
import configurationRoutes from './routes/configuration.routes.js';
import statsRoutes from './routes/stats.routes.js';
import exportsRoutes from './routes/exports.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

// Utilitaires
import translationRoutes from './routes/translation.routes.js';
import contactRoutes from './routes/contact.routes.js';

// === Montage des routes ===

// Menu & Catalogue
app.use('/api/plats', platsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/allergenes', allergenesRoutes);
app.use('/api/ingredients', ingredientsRoutes);

// Stock
app.use('/api/stock', stockRoutes);

// Auth & Users
app.use('/api/personnels', personnelRoutes);
app.use('/api/clients', clientsRoutes);

// RH
app.use('/api/absences', absencesRoutes);
app.use('/api/horaires', horairesRoutes);
app.use('/api/pointage', pointageRoutes);
app.use('/api/types-conge', typesCongeRoutes);

// Salle & Service
app.use('/api/tables', tablesRoutes);
app.use('/api/session', sessionsRoutes);
app.use('/api/reservations', reservationsRoutes);

// Commandes & Paiements
app.use('/api/commandes', commandesRoutes);
app.use('/api/lignecommande', ligneCommandeRoutes);
app.use('/api/paiements', paiementsRoutes);
app.use('/api/cheques', chequesRoutes);

// Marketing
app.use('/api/fidelite', fideliteRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/avis', avisRoutes);

// Admin
app.use('/api/configuration', configurationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Utilitaires
app.use('/api/translate', translationRoutes);
app.use('/api/contact', contactRoutes);

// === Tâches planifiées (node-cron) ===
// Vérification des No-Shows toutes les 5 minutes
cron.schedule('*/5 * * * *', () => {
    checkNoShows().catch((err: any) => console.error('Erreur checkNoShows:', err));
});

// === Routes de base ===
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'API RestOS 🚀', status: 'online' });
});

// === Error Handler global ===
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }

    // --- Erreurs Multer (upload) ---
    if (err.name === 'MulterError') {
        return res.status(400).json({ code: 'UPLOAD_ERROR', error: `Erreur upload: ${err.message}` });
    }

    // --- Erreurs CORS ---
    if (err.message === 'Non autorisé par CORS') {
        return res.status(403).json({ code: 'CORS_ERROR', error: 'Origine non autorisée.' });
    }

    // --- Erreurs Prisma ---
    if (err.code === 'P2025') {
        return res.status(404).json({ code: 'NOT_FOUND', error: 'Ressource non trouvée.' });
    }
    if (err.code === 'P2002') {
        const field = err.meta?.target?.join(', ') || 'champ';
        return res.status(409).json({ code: 'CONFLICT', error: `Doublon détecté sur : ${field}.` });
    }
    if (err.code === 'P2003') {
        return res.status(409).json({ code: 'FK_CONSTRAINT', error: 'Suppression impossible : données liées existantes.' });
    }

    // --- Erreurs métier (AppError et sous-classes) ---
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ code: err.code, error: err.message });
    }

    // --- Erreurs inattendues ---
    logger.error('Unhandled error:', err.message, err.stack);
    res.status(500).json({
        code: 'INTERNAL_ERROR',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur inattendue.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

export default app;
