import { Request, Response } from 'express';
import * as commandeService from '../services/commandes.service.js';
import { getIdParam } from '../utils/helpers.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Crée une nouvelle commande.
 */
export const creerCommande = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Injection de l'ID client si l'utilisateur est connecté mais que le body ne le contient pas
    if (req.user && req.user.type === 'client' && !req.body.client_id) {
        req.body.client_id = req.user.id;
    }

    const commandeCreee = await commandeService.creerCommandeService(req.body);
    res.status(201).json(commandeCreee);
});

/**
 * Récupère les commandes pour la cuisine (En attente ou En préparation).
 */
export const getCommandesCuisine = asyncHandler(async (req: Request, res: Response) => {
    const commandes = await commandeService.getCommandesCuisineService();
    res.json(commandes);
});

/**
 * Récupère les commandes actives (En attente, En préparation, Servie).
 */
export const getCommandesActives = asyncHandler(async (req: Request, res: Response) => {
    const commandes = await commandeService.getCommandesActivesService();
    res.json(commandes);
});

/**
 * Récupère les commandes en livraison.
 */
export const getLivraisons = asyncHandler(async (req: Request, res: Response) => {
    const livraisons = await commandeService.getLivraisonsService();
    res.json(livraisons);
});

/**
 * Ajoute un paiement à une commande.
 */
export const addPaiement = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { montant, methode } = req.body;
    const result = await commandeService.addPaiement(id, montant, methode);
    res.json(result);
});

/**
 * Annule une commande.
 */
export const annulerCommande = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { justification } = req.body;
    const result = await commandeService.annulerCommande(id, justification);
    res.json(result);
});

/**
 * Applique une réduction à une commande.
 */
export const appliquerReduction = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { type, valeur, isPourcentage } = req.body;
    const result = await commandeService.appliquerReduction(id, type, valeur, isPourcentage);
    res.json(result);
});

/**
 * Valide un paiement en ligne.
 */
export const validerPaiementEnLigne = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const result = await commandeService.validerPaiementEnLigne(id);
    res.json(result);
});

/**
 * Refuse un paiement en ligne.
 */
export const refuserPaiementEnLigne = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { justification } = req.body;
    const result = await commandeService.refuserPaiementEnLigne(id, justification);
    res.json(result);
});

/**
 * Paie une commande par chèque cadeau.
 */
export const payerParChequeCadeau = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { code } = req.body;
    const result = await commandeService.payerParChequeCadeau(id, code);
    res.json(result);
});

/**
 * Met à jour le statut d'une ligne de commande.
 */
export const updateLigneStatut = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id); // id de la ligne, pas de la commande
    if (!id) throw new ValidationError('ID invalide.');

    const { statut } = req.body;
    const result = await commandeService.updateLigneStatut(id, statut);
    res.json(result);
});

/**
 * Met à jour le statut global d'une commande.
 */
export const updateCommandeStatut = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const { statut } = req.body;
    const result = await commandeService.updateCommandeStatutService(id, statut);
    res.json(result);
});

/**
 * Modifie les lignes d'une commande existante.
 */
export const modifyCommandeLines = asyncHandler(async (req: Request, res: Response) => {
    const commandeId = getIdParam(req.params.id);
    if (!commandeId) throw new ValidationError('ID Commande invalide.');

    const { items } = req.body;
    if (!items || !Array.isArray(items)) throw new ValidationError('Items invalides.');

    const result = await commandeService.modifierLignesCommande(commandeId, items);
    res.json(result);
});
