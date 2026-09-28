/**
 * Configuration centralisée des variables d'environnement critiques.
 * Le serveur refuse de démarrer si une variable obligatoire manque.
 */

if (!process.env.JWT_SECRET) {
    throw new Error
        'FATAL: JWT_SECRET non défini. Le serveur ne peut pas démarrer en toute sécurité.';
}

export const JWT_SECRET: string = process.env.JWT_SECRET;

export const FRONTEND_URL: string = process.env.FRONTEND_URL || 'http://localhost:3000';

export const ALLOWED_ORIGINS: string[] = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];
