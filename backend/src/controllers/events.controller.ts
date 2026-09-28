import { Request, Response } from 'express';
import * as eventService from '../services/events.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Récupère tous les événements.
 */
export const getAllEvents = asyncHandler(async (req: Request, res: Response) => {
    const events = await eventService.getAllEvents(req.query);
    res.json(events);
});

/**
 * Récupère l'événement actif (pour le site client).
 */
export const getActiveEvent = asyncHandler(async (req: Request, res: Response) => {
    const activeEvent = await eventService.getActiveEvent();
    res.json(activeEvent || null);
});

/**
 * Crée un nouvel événement.
 */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const event = await eventService.createEvent(req.body, image_url);
    res.status(201).json(event);
});

/**
 * Met à jour un événement existant.
 */
export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;
    const event = await eventService.updateEvent(id, req.body, image_url);
    res.json(event);
});

/**
 * Supprime un événement.
 */
export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await eventService.deleteEvent(id);
    res.json({ message: 'Événement supprimé avec succès.' });
});
