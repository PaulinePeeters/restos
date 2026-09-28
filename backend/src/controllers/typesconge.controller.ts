import { Request, Response } from 'express';
import * as typesCongeService from '../services/typesconge.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Récupère tous les types de congé disponibles.
 */
export const listTypes = asyncHandler(async (req: Request, res: Response) => {
    const types = await typesCongeService.getAllTypes();
    res.json(types);
});
