import { Request, Response } from 'express';
import * as ligneService from '../services/lignecommande.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

/**
 * Met à jour une ligne de commande (statut, annulation, offert).
 */
export const updateLigneCommandeController = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const ligne = await ligneService.updateLigneCommande(id, req.body);
    if (!ligne) throw new NotFoundError('Ligne de commande');

    res.json(ligne);
});
