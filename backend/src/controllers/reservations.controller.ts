import { Request, Response } from 'express';
import * as reservationService from '../services/reservations.service.js';
import { sendEmail } from '../utils/mailer.js';
import { reservationEmail } from '../utils/emailTemplates.js';
import { getIdParam, parseDateTime } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, ForbiddenError, UnauthorizedError, ConflictError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Récupère toutes les réservations.
 * Permet de filtrer par date via query param (YYYY-MM-DD).
 */
export const getAllReservations = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.query;
    let reservations;
    if (date) {
        reservations = await reservationService.getReservationsByDate(date as string);
    } else {
        reservations = await reservationService.getAllReservations();
    }
    res.json(reservations);
});

/**
 * Récupère l'historique des réservations d'un client spécifique.
 */
export const getReservationsByClient = asyncHandler(async (req: Request, res: Response) => {
    const clientId = getIdParam(req.params.clientId);
    if (!clientId) throw new ValidationError('ID Client invalide.');

    const user = (req as any).user;
    if (user?.role === 'client' && Number(user.id) !== Number(clientId)) {
        throw new ForbiddenError('Accès interdit à cet historique de réservation.');
    }

    const reservations = await reservationService.getReservationsByClientId(clientId);
    res.json(reservations);
});

/**
 * Crée une nouvelle réservation.
 * Vérifie la validité de la date (futur) et envoie un email de confirmation.
 */
export const createReservation = asyncHandler(async (req: Request, res: Response) => {
    const { date_reservation, heure_reservation, nb_personnes, email_client, nom_client } = req.body;

    const now = new Date();
    const checkDate = parseDateTime(date_reservation, heure_reservation);

    if (!checkDate) {
        throw new ValidationError('Date ou heure invalide.');
    }

    if (checkDate < now) {
        throw new ValidationError('La date et l\'heure de réservation sont dans le passé.');
    }

    const newReservation = await reservationService.createReservation(req.body);

    const clientLinked = (newReservation as { tclient?: { email_client?: string, nom_client?: string } }).tclient;

    const emailDest = email_client || (clientLinked?.email_client) || null;
    const nomDest = nom_client || (clientLinked?.nom_client) || 'Client';

    if (emailDest) {
        const html = reservationEmail(nomDest, date_reservation, heure_reservation, Number(nb_personnes));
        sendEmail(emailDest, 'Confirmation de votre réservation - Déclinaison', html)
            .catch(err => logger.error('[ReservationsController] Erreur envoi email:', err));
    }

    res.status(201).json(newReservation);
});

/**
 * Met à jour une réservation existante.
 */
export const updateReservation = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const updatedReservation = await reservationService.updateReservation(id, req.body);
    res.json(updatedReservation);
});

/**
 * Supprime (annule) une réservation.
 */
export const deleteReservation = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await reservationService.deleteReservation(id);
    res.json({ message: 'Réservation supprimée.' });
});

/**
 * Annule une réservation (change statut à ANNULEE).
 * Un client peut annuler sa propre réservation via req.user.id.
 * Un manager peut annuler n'importe quelle réservation.
 */
export const cancelReservation = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const user = (req as any).user;
    if (!user) throw new UnauthorizedError('Non authentifié.');

    const userId = user.role === 'client' ? user.id : undefined;

    const cancelledReservation = await reservationService.cancelReservation(id, userId);
    res.json({ message: 'Réservation annulée.', reservation: cancelledReservation });
});
