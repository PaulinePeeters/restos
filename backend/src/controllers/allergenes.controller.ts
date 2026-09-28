import { Request, Response } from 'express';
import * as allergeneService from '../services/allergenes.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Récupère tous les allergènes.
 */
export const getAllergenes = asyncHandler(async (req: Request, res: Response) => {
    const allergenes = await allergeneService.getAllAllergenes();
    res.json(allergenes);
});
