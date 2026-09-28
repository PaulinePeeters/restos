import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper pour les controllers async Express.
 * Attrape automatiquement les erreurs et les passe au error handler global
 * via next(error).
 */
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
