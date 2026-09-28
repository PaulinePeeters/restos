/**
 * Setup global exécuté avant chaque fichier de test.
 * Définit les variables d'environnement requises par le code applicatif
 * (utils/config.ts lève une erreur au chargement si JWT_SECRET est absent).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
