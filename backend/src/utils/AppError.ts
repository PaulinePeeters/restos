/**
 * Classes d'erreur.
 * Permettent au global error handler de répondre avec le bon status code
 * et un code machine pour l'internationalisation côté client.
 */

export class AppError extends Error {
    public statusCode: number;
    public code: string;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

/** 400 — Données invalides */
export class ValidationError extends AppError {
    constructor(message: string = 'Données invalides.') {
        super(400, 'VALIDATION_ERROR', message);
    }
}

/** 401 — Non authentifié */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Non authentifié.') {
        super(401, 'UNAUTHORIZED', message);
    }
}

/** 403 — Accès interdit */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Accès interdit.') {
        super(403, 'FORBIDDEN', message);
    }
}

/** 404 — Ressource non trouvée */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Ressource') {
        super(404, 'NOT_FOUND', `${resource} non trouvé(e).`);
    }
}

/** 409 — Conflit (doublon, contrainte violée) */
export class ConflictError extends AppError {
    constructor(message: string = 'Cette ressource existe déjà.') {
        super(409, 'CONFLICT', message);
    }
}

/** 422 — Erreur métier (stock insuffisant, état invalide, etc.) */
export class BusinessError extends AppError {
    constructor(code: string, message: string) {
        super(422, code, message);
    }
}
