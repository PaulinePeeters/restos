import { Request, Response } from 'express';
import * as avisService from '../services/avis.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Crée un nouvel avis pour une commande.
 */
export const createAvis = asyncHandler(async (req: Request, res: Response) => {
    const { commandeId, note, commentaire } = req.body;
    const avis = await avisService.creerAvis(commandeId, note, commentaire);
    res.status(201).json(avis);
});

/**
 * Récupère les statistiques des avis.
 */
export const getStatsAvis = asyncHandler(async (req: Request, res: Response) => {
    const stats = await avisService.getMoyenneAvis();
    res.json(stats);
});
