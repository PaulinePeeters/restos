import { Request, Response } from 'express';
import * as fideliteService from '../services/fidelite.service.js';
import { AuthRequest } from '../middlewares/auth.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/AppError.js';

/**
 * Récupère seulement les offres actives.
 */
export const getOffres = asyncHandler(async (req: Request, res: Response) => {
    const offres = await fideliteService.getOffresActives();
    res.json(offres);
});

/**
 * Récupère toutes les offres.
 */
export const getAllOffres = asyncHandler(async (req: Request, res: Response) => {
    const offres = await fideliteService.getAllOffres();
    res.json(offres);
});

/**
 * Crée une nouvelle offre.
 */
export const createOffre = asyncHandler(async (req: Request, res: Response) => {
    const offre = await fideliteService.createOffre(req.body);
    res.status(201).json(offre);
});

/**
 * Supprime une offre.
 */
export const deleteOffre = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await fideliteService.deleteOffre(id);
    res.json({ message: 'Offre supprimée avec succès' });
});

/**
 * Récupère la table favorite d'un client.
 */
export const getFavoriteTable = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.client) throw new UnauthorizedError("Non authentifié.");

    const pref = await fideliteService.getTableFavorite(req.client.id_client);
    if (!pref) return res.json(null);

    res.json({
        table: pref.ttableresto,
        count: pref.nombre_reservations
    });
});

/**
 * Envoie une notification par email à tous les clients pour une offre donnée.
 */
export const notifyClientsEvent = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const offre = await fideliteService.getOffreById(id);
    if (!offre) throw new NotFoundError('Offre');

    const count = await fideliteService.broadcastOfferToClients(offre);
    res.json({ message: `Envoi d'emails lancé pour ${count} clients.` });
});

/**
 * Active ou désactive le statut VIP d'un client.
 */
export const toggleVip = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { est_vip } = req.body;
    if (typeof est_vip !== 'boolean') throw new ValidationError('Le champ est_vip doit être un booléen.');

    const client = await fideliteService.toggleVipStatus(id, est_vip);
    res.json({ message: 'Statut VIP mis à jour.', client });
});
