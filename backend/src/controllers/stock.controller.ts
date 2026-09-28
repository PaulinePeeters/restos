import { Request, Response } from 'express';
import * as stockService from '../services/stock.service.js';
import * as suppliersService from '../services/suppliers.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

/**
 * Récupère tout le stock.
 */
export const getAllStock = asyncHandler(async (req: Request, res: Response) => {
    const stock = await stockService.getAllStock();
    res.status(200).json(stock);
});

/**
 * Récupère le stock d'un ingrédient spécifique.
 */
export const getStockByIngredientId = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID Ingrédient invalide.');

    const stock = await stockService.getStockByIngredientId(id);
    if (!stock) throw new NotFoundError('Stock');

    res.status(200).json(stock);
});

/**
 * Met à jour la quantité d'un ingrédient.
 */
export const updateStockQuantity = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID Ingrédient invalide.');

    const { stock_actuel, qt_dispo } = req.body;
    const quantity = stock_actuel !== undefined ? Number(stock_actuel) : (qt_dispo !== undefined ? Number(qt_dispo) : null);

    if (quantity === null || isNaN(quantity) || quantity < 0) {
        throw new ValidationError('Quantité invalide (doit être un nombre positif).');
    }

    const updated = await stockService.updateStockQuantity(id, quantity);

    // Vérifier le seuil et émettre une alerte si nécessaire
    if (Number(updated.seuil_alerte) > 0 && quantity < Number(updated.seuil_alerte)) {
        const alertMsg = `${updated.nom_ingredient} (Reste: ${updated.stock_actuel} ${updated.unite_ingredient})`;
        await stockService.emitStockAlerts([alertMsg], [updated.id]);
    }

    res.status(200).json(updated);
});

/**
 * Définit le stock et le seuil d'alerte d'un ingrédient existant.
 */
export const createStock = asyncHandler(async (req: Request, res: Response) => {
    const { ingredient_id, qt_dispo, seuil_alerte } = req.body;

    const id = Number(ingredient_id);
    const quantity = Number(qt_dispo);
    const threshold = Number(seuil_alerte);

    if (isNaN(id) || isNaN(quantity) || isNaN(threshold)) {
        throw new ValidationError('Données invalides (nombres attendus).');
    }
    if (quantity < 0 || threshold < 0) {
        throw new ValidationError('Les quantités ne peuvent pas être négatives.');
    }

    const created = await stockService.createStock(id, quantity, threshold);
    res.status(201).json(created);
});

/**
 * Remet le stock à 0.
 */
export const deleteStock = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID Ingrédient invalide.');

    const deleted = await stockService.deleteStock(id);
    res.status(200).json(deleted);
});

/**
 * Génère la liste de courses basée sur les seuils.
 */
export const getShoppingList = asyncHandler(async (req: Request, res: Response) => {
    const list = await suppliersService.generateShoppingList();
    res.json(list);
});

/**
 * Calcule le coût matière d'un plat.
 */
export const getFoodCost = asyncHandler(async (req: Request, res: Response) => {
    const platId = getIdParam(req.params.platId);
    if (!platId) throw new ValidationError('ID Plat invalide.');

    const cost = await suppliersService.calculateFoodCost(platId);
    res.json(cost);
});

/**
 * Met à jour le coût unitaire d'un ingrédient.
 */
export const updateIngredientCost = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID Ingrédient invalide.');

    const { cout } = req.body;
    const coutVal = Number(cout);
    if (isNaN(coutVal) || coutVal < 0) throw new ValidationError('Coût invalide.');

    const updated = await suppliersService.updateIngredientCost(id, coutVal);
    res.json(updated);
});

/**
 * Export regroupé pour compatibilité avec les routes.
 */
export const stockController = {
    getAllStock,
    getStockByIngredientId,
    updateStockQuantity,
    createStock,
    deleteStock,
    getShoppingList,
    getFoodCost,
    updateIngredientCost
};
