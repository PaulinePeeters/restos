import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

/**
 * Middleware de validation Zod.
 * Vérifie que le corps de la requête (req.body) correspond au schéma défini.
 * Transforme et nettoie les données si le schéma le prévoit.
 * @param schema Schéma Zod à valider
 */
const validate = (schema: ZodType, source: 'body' | 'query' | 'params' = 'body') => async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (source === 'body') {
            req.body = await schema.parseAsync(req.body);
        } else if (source === 'query') {
            req.query = await schema.parseAsync(req.query) as any;
        } else if (source === 'params') {
            req.params = await schema.parseAsync(req.params) as any;
        }
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                })),
            });
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export default validate;
