import { Request, Response } from 'express';
import * as paiementService from '../services/paiements.service.js';
import * as receiptService from '../services/receipts.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Traite le paiement d'une commande.
 */
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
    const commandeId = getIdParam(req.params.commandeId);
    if (!commandeId) throw new ValidationError('ID Commande invalide.');

    const { montant, methode, pourboire } = req.body;
    const result = await paiementService.processPayment(commandeId, montant, methode, pourboire || 0);
    res.json(result);
});

/**
 * Calcule la répartition de l'addition (Split Bill).
 */
export const splitBill = asyncHandler(async (req: Request, res: Response) => {
    const commandeId = getIdParam(req.params.commandeId);
    if (!commandeId) throw new ValidationError('ID Commande invalide.');

    const { type, nbPersonnes, itemsSelected } = req.body;
    const result = await paiementService.splitBill(commandeId, type, nbPersonnes, itemsSelected);
    res.json(result);
});

/**
 * Génère et télécharge le reçu d'une commande.
 */
export const getReceipt = asyncHandler(async (req: Request, res: Response) => {
    const commandeId = getIdParam(req.params.commandeId);
    if (!commandeId) throw new ValidationError('ID Commande invalide.');

    const pdfBuffer = await receiptService.generateReceipt(commandeId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recu-${commandeId}.pdf`);
    res.send(pdfBuffer);
});
