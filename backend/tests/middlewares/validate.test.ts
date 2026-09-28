import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import validate from '../../src/middlewares/validate.js';

/** Construit des mocks Express minimaux pour un middleware. */
function buildCtx(payload: Partial<Request> = {}) {
    const req = { body: {}, query: {}, params: {}, ...payload } as Request;
    const res = { statusCode: 0, body: undefined as any } as Response & { statusCode: number; body: any };
    res.status = ((code: number) => { res.statusCode = code; return res; }) as any;
    res.json = ((data: any) => { res.body = data; return res; }) as any;
    const next = vi.fn() as unknown as NextFunction;
    return { req, res, next };
}

const schema = z.object({
    nom: z.string().min(2),
    age: z.coerce.number().positive(),
});

describe('validate middleware (body)', () => {
    it('appelle next() et transforme le body quand la validation réussit', async () => {
        const { req, res, next } = buildCtx({ body: { nom: 'Paul', age: '30' } });
        await validate(schema)(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        // z.coerce.number convertit la chaîne en nombre
        expect(req.body).toEqual({ nom: 'Paul', age: 30 });
    });

    it('renvoie 400 avec la liste des erreurs quand la validation échoue', async () => {
        const { req, res, next } = buildCtx({ body: { nom: 'P', age: -5 } });
        await validate(schema)(req, res, next as any);

        expect(next).not.toHaveBeenCalled();
        expect((res as any).statusCode).toBe(400);
        expect((res as any).body.message).toBe('Validation failed');
        const fields = (res as any).body.errors.map((e: any) => e.field);
        expect(fields).toContain('nom');
        expect(fields).toContain('age');
    });
});

describe('validate middleware (query / params)', () => {
    it('valide la source query', async () => {
        const qSchema = z.object({ page: z.coerce.number() });
        const { req, res, next } = buildCtx({ query: { page: '2' } as any });
        await validate(qSchema, 'query')(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(req.query).toEqual({ page: 2 });
    });

    it('valide la source params et rejette une valeur invalide', async () => {
        const pSchema = z.object({ id: z.coerce.number().int() });
        const { req, res, next } = buildCtx({ params: { id: 'abc' } as any });
        await validate(pSchema, 'params')(req, res, next as any);

        expect(next).not.toHaveBeenCalled();
        expect((res as any).statusCode).toBe(400);
    });
});
