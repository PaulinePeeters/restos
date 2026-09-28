import { Request, Response } from 'express';
import * as personnelService from '../services/personnel.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/AppError.js';

/**
 * Récupère la liste complète du personnel.
 */
export const getAllPersonnels = asyncHandler(async (req: Request, res: Response) => {
    const personnels = await personnelService.getAllPersonnels();
    res.json(personnels);
});

/**
 * Récupère uniquement les membres du personnel marqués comme "actifs".
 */
export const getPersonnelsActifs = asyncHandler(async (req: Request, res: Response) => {
    const actifs = await personnelService.getPersonnelsActifs();
    res.json(actifs);
});

/**
 * Récupère un membre du personnel par son ID.
 */
export const getPersonnelById = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const personnel = await personnelService.getPersonnelById(id);
    if (!personnel) throw new NotFoundError('Personnel');

    res.json(personnel);
});

/**
 * Crée un nouveau membre du personnel.
 */
export const createPersonnel = asyncHandler(async (req: Request, res: Response) => {
    const newPersonnel = await personnelService.createPersonnel(req.body);
    res.status(201).json(newPersonnel);
});

/**
 * Met à jour les informations d'un membre du personnel.
 */
export const updatePersonnel = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const updatedPersonnel = await personnelService.updatePersonnel(id, req.body);
    res.json(updatedPersonnel);
});

/**
 * Supprime un membre du personnel.
 */
export const deletePersonnel = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await personnelService.deletePersonnel(id);
    res.json({ message: 'Personnel supprimé.' });
});

/**
 * Connecte un membre du personnel et renvoie un token JWT.
 */
export const loginPersonnel = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { email_personnel, mot_de_passe } = req.body;
        const { token, personnel } = await personnelService.loginPersonnel(email_personnel, mot_de_passe);

        return res.json({
            token,
            personnel: {
                id_personnel: personnel.id,
                nom_personnel: personnel.nom_personnel,
                prenom_personnel: personnel.prenom_personnel,
                role_personnel: personnel.role_personnel,
                email_personnel: personnel.email_personnel
            }
        });
    } catch (error: any) {
        throw new UnauthorizedError("Email ou mot de passe incorrect.");
    }
});
