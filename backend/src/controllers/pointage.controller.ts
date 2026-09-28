import { Request, Response } from 'express';
import * as pointageService from '../services/pointage.service.js';
import { getIdParam } from '../utils/helpers.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Liste les pointages.
 */
export const listPointages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isManager = req.user?.role === 'manager' || req.user?.role === 'super_admin';
    const filtre: any = { ...req.query };

    // Les rôles "non-manager" peuvent seulement lire leur pointage
    if (!isManager && req.user?.id) {
        filtre.personnel_id = req.user.id;
    }

    const pointages = await pointageService.getPointages(filtre);
    res.json(pointages);
});

/**
 * Crée un pointage (Début de service).
 */
export const createPointage = asyncHandler(async (req: Request, res: Response) => {
    const pointage = await pointageService.createPointage(req.body);
    res.status(201).json(pointage);
});

/**
 * Met à jour un pointage.
 */
export const updatePointage = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const pointage = await pointageService.updatePointage(id, req.body);
    res.json(pointage);
});

/**
 * Valide ou refuse un pointage (Manager uniquement).
 */
export const validatePointage = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { validated } = req.body;
    if (typeof validated !== 'boolean') {
        throw new ValidationError("Le champ 'validated' doit être un booléen (true/false).");
    }

    const pointage = await pointageService.validerPointage(id, validated);
    res.json(pointage);
});
