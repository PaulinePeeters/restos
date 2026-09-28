import { Request, Response } from 'express';
import { notificationsService } from '../services/notifications.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Récupère les notifications non lues d'un rôle.
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.query;
    if (!role || typeof role !== 'string') throw new ValidationError('Role requis.');

    const notifs = await notificationsService.getUnreadNotifications(role);
    res.json(notifs);
});

/**
 * Marque une notification comme lue.
 */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await notificationsService.markAsRead(id);
    res.json({ success: true });
});

/**
 * Marque toutes les notifications d'un rôle comme lues.
 */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body;
    if (!role) throw new ValidationError('Role requis.');

    await notificationsService.markAllAsRead(role);
    res.json({ success: true });
});

/**
 * Crée une notification manuellement.
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
    const { type, message, role, data } = req.body;
    if (!message || !role) throw new ValidationError('Message et destinataire requis.');

    const notif = await notificationsService.createNotification(type, message, role, data);
    res.status(201).json(notif);
});
