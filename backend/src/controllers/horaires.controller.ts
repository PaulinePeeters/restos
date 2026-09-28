import { Request, Response } from 'express';
import * as horaireService from '../services/horaires.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Récupère tous les horaires.
 */
export const getAllHoraires = asyncHandler(async (req: Request, res: Response) => {
    const horaires = await horaireService.getAllHoraires();
    res.json(horaires);
});

/**
 * Récupère les horaires d'un membre du personnel.
 */
export const getHorairesByPersonnel = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const horaires = await horaireService.getHorairesByPersonnelId(id);
    res.json(horaires);
});

/**
 * Crée un nouvel horaire.
 */
export const createHoraire = asyncHandler(async (req: Request, res: Response) => {
    const newHoraire = await horaireService.createHoraire(req.body);
    res.status(201).json(newHoraire);
});

/**
 * Met à jour un horaire existant.
 */
export const updateHoraire = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const updatedHoraire = await horaireService.updateHoraire(id, req.body);
    res.json(updatedHoraire);
});

/**
 * Supprime un horaire.
 */
export const deleteHoraire = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await horaireService.deleteHoraire(id);
    res.json({ message: 'Horaire supprimé.' });
});
