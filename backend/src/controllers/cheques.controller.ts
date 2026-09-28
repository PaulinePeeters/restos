import { Request, Response } from 'express';
import * as chequeService from '../services/cheques.service.js';
import { sendEmail } from '../utils/mailer.js';
import { giftCardEmail } from '../utils/emailTemplates.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

/**
 * Crée un chèque cadeau.
 */
export const createCheque = asyncHandler(async (req: Request, res: Response) => {
    const cheque = await chequeService.createCheque(req.body);
    res.status(201).json(cheque);
});

/**
 * Envoie un chèque cadeau par email.
 */
export const sendChequeEmail = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { email } = req.body;
    if (!email) throw new ValidationError('Email requis.');

    const cheque: any = await chequeService.getChequeById(id);
    if (!cheque) throw new NotFoundError('Chèque');

    const html = giftCardEmail(cheque.code, Number(cheque.montant_initial), cheque.date_expiration);

    const info = await sendEmail(email, 'Votre Chèque Cadeau Déclinaison', html);
    if (!info) {
        throw new Error("Erreur lors de l'envoi de l'email.");
    }

    res.json({ message: 'Email envoyé avec succès.' });
});

/**
 * Récupère tous les chèques cadeaux.
 */
export const getAllCheques = asyncHandler(async (req: Request, res: Response) => {
    const cheques = await chequeService.getAllCheques();
    res.json(cheques);
});

/**
 * Valide un chèque cadeau (vérifie s'il est actif et valide).
 */
export const validateCheque = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;
    const cheque = await chequeService.validateCheque(code);
    res.json(cheque);
});

/**
 * Utilise un montant sur un chèque cadeau.
 */
export const useCheque = asyncHandler(async (req: Request, res: Response) => {
    const { code, montant } = req.body;
    const result = await chequeService.useCheque(code, montant);
    res.json(result);
});

/**
 * Supprime un chèque cadeau.
 */
export const deleteCheque = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await chequeService.deleteCheque(id);
    res.json({ message: 'Chèque supprimé.' });
});
