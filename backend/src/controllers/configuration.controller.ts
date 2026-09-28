import { Request, Response } from 'express';
import * as configService from '../services/configuration.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

/**
 * Récupère une configuration par sa clé.
 * Cache: 5 minutes.
 */
export const getConfig = asyncHandler(async (req: Request, res: Response) => {
    const { cle } = req.params;
    const valeur = await configService.getConfig(cle);

    if (valeur === null) {
        throw new NotFoundError(`Configuration '${cle}'`);
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ cle, valeur });
});

/**
 * Met à jour une configuration.
 */
export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
    const { cle, valeur } = req.body;
    const config = await configService.updateConfig(cle, valeur);
    res.json(config);
});

/**
 * Récupère toutes les configurations.
 * Cache: 5 minutes.
 */
export const getAllConfig = asyncHandler(async (req: Request, res: Response) => {
    const configs = await configService.getAllConfig();

    res.set('Cache-Control', 'public, max-age=300');
    res.json(configs);
});

/**
 * Met à jour plusieurs configurations en masse.
 */
export const updateConfigs = asyncHandler(async (req: Request, res: Response) => {
    const configs = req.body;
    if (!Array.isArray(configs)) throw new ValidationError('Format invalide : un tableau est attendu.');

    const result = await configService.updateConfigs(configs);
    res.json(result);
});
