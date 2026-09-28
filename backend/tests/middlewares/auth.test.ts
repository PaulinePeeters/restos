import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';

// --- Mock de la couche Prisma (évite toute connexion Postgres réelle) ---
// vi.hoisted : nécessaire car vi.mock est remonté en haut du fichier.
const { prismaMock } = vi.hoisted(() => ({
    prismaMock: {
        tpersonnel: { findUnique: vi.fn() },
        tclient: { findUnique: vi.fn() },
    },
}));
vi.mock('../../src/db.js', () => ({ prisma: prismaMock }));
// logger silencieux
vi.mock('../../src/utils/logger.js', () => ({
    logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
    authMiddleware,
    optionalAuthMiddleware,
    authorize,
    type AuthRequest,
} from '../../src/middlewares/auth.js';

const JWT_SECRET = process.env.JWT_SECRET as string;

function buildCtx(headers: Record<string, string> = {}) {
    const req = { headers } as unknown as AuthRequest;
    const res = { statusCode: 0, body: undefined as any } as Response & { statusCode: number; body: any };
    res.status = ((code: number) => { res.statusCode = code; return res; }) as any;
    res.json = ((data: any) => { res.body = data; return res; }) as any;
    const next = vi.fn() as unknown as NextFunction;
    return { req, res, next };
}

const bearer = (payload: object) => `Bearer ${jwt.sign(payload, JWT_SECRET)}`;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('authMiddleware', () => {
    it('renvoie 401 si le header Authorization est absent', async () => {
        const { req, res, next } = buildCtx();
        await authMiddleware(req, res, next);
        expect((res as any).statusCode).toBe(401);
        expect((res as any).body.code).toBe('UNAUTHORIZED');
        expect(next).not.toHaveBeenCalled();
    });

    it('renvoie 401 si le token est invalide', async () => {
        const { req, res, next } = buildCtx({ authorization: 'Bearer not-a-token' });
        await authMiddleware(req, res, next);
        expect((res as any).statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('authentifie un membre du personnel actif et peuple req.user', async () => {
        prismaMock.tpersonnel.findUnique.mockResolvedValue({
            id: 7, role_personnel: 'manager', nom_personnel: 'Doe',
            prenom_personnel: 'Jane', actif: true,
        });
        const { req, res, next } = buildCtx({ authorization: bearer({ id: 7, role: 'manager' }) });
        await authMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toMatchObject({ id: 7, role: 'manager', type: 'personnel', nom: 'Doe' });
    });

    it('renvoie 403 pour un personnel désactivé', async () => {
        prismaMock.tpersonnel.findUnique.mockResolvedValue({
            id: 7, role_personnel: 'serveur', nom_personnel: 'X', prenom_personnel: 'Y', actif: false,
        });
        const { req, res, next } = buildCtx({ authorization: bearer({ id: 7, role: 'serveur' }) });
        await authMiddleware(req, res, next);

        expect((res as any).statusCode).toBe(403);
        expect((res as any).body.code).toBe('FORBIDDEN');
        expect(next).not.toHaveBeenCalled();
    });

    it('renvoie 401 si le personnel n’existe pas', async () => {
        prismaMock.tpersonnel.findUnique.mockResolvedValue(null);
        const { req, res, next } = buildCtx({ authorization: bearer({ id: 99, role: 'manager' }) });
        await authMiddleware(req, res, next);

        expect((res as any).statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('authentifie un client (role=client) et peuple req.client', async () => {
        prismaMock.tclient.findUnique.mockResolvedValue({
            id_client: 3, nom_client: 'Client', email_client: 'c@test.io',
            tel_client: null, points_fidelite: 120,
        });
        const { req, res, next } = buildCtx({ authorization: bearer({ id: 3, role: 'client' }) });
        await authMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toMatchObject({ id: 3, role: 'client', type: 'client' });
        expect(req.client).toMatchObject({ id_client: 3, points_fidelite: 120 });
    });
});

describe('optionalAuthMiddleware', () => {
    it('laisse passer sans user si aucun header', async () => {
        const { req, res, next } = buildCtx();
        await optionalAuthMiddleware(req, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toBeUndefined();
    });

    it('laisse passer sans user si le token est invalide', async () => {
        const { req, res, next } = buildCtx({ authorization: 'Bearer garbage' });
        await optionalAuthMiddleware(req, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toBeUndefined();
    });

    it('peuple req.user pour un personnel actif valide', async () => {
        prismaMock.tpersonnel.findUnique.mockResolvedValue({
            id: 1, role_personnel: 'cuisinier', nom_personnel: 'N', prenom_personnel: 'P', actif: true,
        });
        const { req, res, next } = buildCtx({ authorization: bearer({ id: 1, role: 'cuisinier' }) });
        await optionalAuthMiddleware(req, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toMatchObject({ id: 1, role: 'cuisinier' });
    });
});

describe('authorize (RBAC)', () => {
    it('renvoie 401 si non authentifié', () => {
        const { req, res, next } = buildCtx();
        authorize(['manager'])(req, res, next);
        expect((res as any).statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('renvoie 403 si le rôle n’est pas autorisé', () => {
        const { req, res, next } = buildCtx();
        req.user = { id: 1, role: 'serveur', type: 'personnel' };
        authorize(['manager', 'super_admin'])(req, res, next);
        expect((res as any).statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('appelle next() si le rôle est autorisé', () => {
        const { req, res, next } = buildCtx();
        req.user = { id: 1, role: 'manager', type: 'personnel' };
        authorize(['manager'])(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('appelle next() si aucune restriction de rôle (liste vide)', () => {
        const { req, res, next } = buildCtx();
        req.user = { id: 1, role: 'serveur', type: 'personnel' };
        authorize()(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });
});
