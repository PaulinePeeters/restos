import { describe, it, expect } from 'vitest';
import {
    AppError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    BusinessError,
} from '../../src/utils/AppError.js';

describe('AppError', () => {
    it('est une instance d’Error avec statusCode, code et message', () => {
        const err = new AppError(418, 'TEAPOT', 'Je suis une théière');
        expect(err).toBeInstanceOf(Error);
        expect(err.statusCode).toBe(418);
        expect(err.code).toBe('TEAPOT');
        expect(err.message).toBe('Je suis une théière');
        expect(err.name).toBe('AppError');
    });
});

describe('Sous-classes d’erreur', () => {
    it('ValidationError -> 400 / VALIDATION_ERROR', () => {
        const err = new ValidationError();
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.message).toBe('Données invalides.');
    });

    it('ValidationError accepte un message personnalisé', () => {
        expect(new ValidationError('Champ requis').message).toBe('Champ requis');
    });

    it('UnauthorizedError -> 401 / UNAUTHORIZED', () => {
        const err = new UnauthorizedError();
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });

    it('ForbiddenError -> 403 / FORBIDDEN', () => {
        const err = new ForbiddenError();
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
    });

    it('NotFoundError -> 404 / NOT_FOUND avec ressource interpolée', () => {
        const err = new NotFoundError('Client');
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
        expect(err.message).toBe('Client non trouvé(e).');
    });

    it('NotFoundError utilise "Ressource" par défaut', () => {
        expect(new NotFoundError().message).toBe('Ressource non trouvé(e).');
    });

    it('ConflictError -> 409 / CONFLICT', () => {
        const err = new ConflictError();
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('CONFLICT');
    });

    it('BusinessError -> 422 avec code métier personnalisé', () => {
        const err = new BusinessError('STOCK_INSUFFISANT', 'Stock insuffisant');
        expect(err.statusCode).toBe(422);
        expect(err.code).toBe('STOCK_INSUFFISANT');
        expect(err.message).toBe('Stock insuffisant');
    });
});
