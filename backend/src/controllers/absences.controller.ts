import { Request, Response } from 'express';
import * as absenceService from '../services/absences.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Crée une nouvelle absence.
 */
export const createAbsence = asyncHandler(async (req: Request, res: Response) => {
    const nouvelleAbsence = await absenceService.creerAbsence(req.body);
    res.status(201).json(nouvelleAbsence);
});

/**
 * Liste les absences avec filtres.
 */
export const listAbsences = asyncHandler(async (req: Request, res: Response) => {
    const filtre: any = {};

    if (req.query.personnel_id) {
        const pid = getIdParam(req.query.personnel_id as string);
        if (pid) {
            filtre.personnel_id = pid;
        }
    }

    if (req.query.statut) {
        filtre.statut = req.query.statut;
    }

    if (req.query.valide === 'true') {
        filtre.statut = 'VALIDEE';
    } else if (req.query.valide === 'null') {
        filtre.statut = 'EN_ATTENTE';
    }

    const absences = await absenceService.getAllAbsences(filtre);
    res.json(absences);
});

/**
 * Met à jour le statut d'une absence.
 */
export const updateAbsence = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const updated = await absenceService.mettreAJourStatut(id, req.body.statut);
    res.json(updated);
});

/**
 * Supprime une absence.
 */
export const deleteAbsence = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await absenceService.deleteAbsence(id);
    res.json({ message: 'Absence supprimée.' });
});
