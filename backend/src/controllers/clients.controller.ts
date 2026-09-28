import { Request, Response } from 'express';
import * as clientService from '../services/clients.service.js';
import { sendEmail } from '../utils/mailer.js';
import { welcomeEmail } from '../utils/emailTemplates.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Inscrit un nouveau client.
 */
export const registerClient = asyncHandler(async (req: Request, res: Response) => {
    const result = await clientService.registerClient(req.body);

    // Envoi email de bienvenue
    if (result && result.client && result.client.email_client) {
        const html = welcomeEmail(result.client.nom_client);
        sendEmail(result.client.email_client, 'Bienvenue chez Déclinaison', html)
            .catch(err => logger.error("Erreur envoi email bienvenue:", err));
    }

    res.status(201).json(result);
});

/**
 * Connecte un client.
 */
export const loginClient = asyncHandler(async (req: Request, res: Response) => {
    const result = await clientService.loginClient(req.body);
    res.json(result);
});

/**
 * Récupère les infos du client connecté.
 */
export const getClientMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user || req.user.type !== 'client') {
        throw new UnauthorizedError("Non authentifié ou pas un client.");
    }

    const clientWithOrders = await clientService.getClientWithOrders(req.user.id);

    if (!clientWithOrders) throw new NotFoundError('Client');

    res.json({ client: clientWithOrders });
});

/**
 * Met à jour l'adresse d'un client.
 */
export const updateAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const clientId = req.user?.id;
    if (!clientId || req.user?.type !== 'client') throw new UnauthorizedError("Non authentifié ou pas un client.");

    const updatedAddress = await clientService.updateClientAddress(clientId, req.body);
    res.json({ message: "Adresse mise à jour", address: updatedAddress });
});

/**
 * Récupère tous les clients (pour le CRM Manager).
 */
export const getAllClients = asyncHandler(async (req: Request, res: Response) => {
    const clients = await clientService.getAllClients();
    res.json(clients);
});

/**
 * Met à jour le profil du client connecté (entreprise, tva, etc).
 */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const clientId = req.user?.id;
    if (!clientId || req.user?.type !== 'client') throw new UnauthorizedError("Non authentifié ou pas un client.");

    const updatedClient = await clientService.updateClientProfile(clientId, req.body);
    res.json({ message: "Profil mis à jour", client: updatedClient });
});

/**
 * Désactive un client.
 */
export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
        res.status(400).json({ message: "ID invalide" });
        return;
    }
    await clientService.deleteClient(clientId);
    res.json({ message: "Client désactivé avec succès" });
});
